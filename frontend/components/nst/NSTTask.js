import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCamera } from '../common/DualCameraProvider';
import DigitDisplay from '../DigitDisplay';
import ResponseHandler from '../ResponseHandler';
import { 
  startExperiment, 
  nextDigit, 
  completeExperiment,
  recordResponse 
} from '../../redux/experimentSlice';

/**
 * NSTTask - Number Switching Task implementation with camera capture
 */
const NSTTask = ({ participantId, onComplete }) => {
  const dispatch = useDispatch();
  const { captureBothCameras } = useCamera();
  
  const experimentState = useSelector(state => state.experiment);
  const { isRunning, currentDigit, trialState, sessionData } = experimentState;
  
  const [taskPhase, setTaskPhase] = useState('instructions'); // instructions, running, complete
  const [captureQueue, setCaptureQueue] = useState([]);
  const [isProcessingCaptures, setIsProcessingCaptures] = useState(false);

  // NST Configuration - can be moved to config file later
  const nstConfig = {
    trialConfig: [
      { level: 6, trials: 1 },
      { level: 4, trials: 1 },
      { level: 2, trials: 1 }
    ],
    captureConfig: {
      firstCapture: 0,     // Start capturing from first digit
      interval: 3,         // Capture every 3rd digit
      quality: 'high'
    },
    digitDuration: 1500,   // ms each digit is shown
    interTrialDelay: 2000  // ms between trials
  };

  /**
   * Start the NST experiment
   */
  const startNSTExperiment = () => {
    dispatch(startExperiment({
      participantId,
      taskType: 'nst',
      config: nstConfig
    }));
    setTaskPhase('running');
  };

  /**
   * Handle participant response to a digit
   */
  const handleResponse = useCallback((response, responseTime) => {
    dispatch(recordResponse({
      response,
      responseTime,
      timestamp: Date.now()
    }));
    
    // Check if we should capture a photo
    const shouldCapture = checkShouldCapture();
    if (shouldCapture) {
      queueCapture(response, responseTime);
    }
    
    // Move to next digit or complete trial
    setTimeout(() => {
      dispatch(nextDigit());
    }, 100);
    
  }, [dispatch, trialState]);

  /**
   * Check if we should capture a photo based on current position
   */
  const checkShouldCapture = () => {
    const { digitIndex } = trialState;
    const { firstCapture, interval } = nstConfig.captureConfig;
    
    // Capture on first digit and then at intervals
    return digitIndex >= firstCapture && (digitIndex - firstCapture) % interval === 0;
  };

  /**
   * Queue a photo capture with context
   */
  const queueCapture = (response, responseTime) => {
    const captureData = {
      participantId,
      trialNumber: trialState.trialNumber,
      digitIndex: trialState.digitIndex,
      digit: currentDigit,
      response,
      responseTime,
      timestamp: Date.now(),
      taskType: 'nst'
    };
    
    setCaptureQueue(prev => [...prev, captureData]);
  };

  /**
   * Process queued captures
   */
  useEffect(() => {
    if (captureQueue.length > 0 && !isProcessingCaptures) {
      processNextCapture();
    }
  }, [captureQueue, isProcessingCaptures]);

  const processNextCapture = async () => {
    if (captureQueue.length === 0) return;
    
    setIsProcessingCaptures(true);
    const captureData = captureQueue[0];
    
    try {
      // Capture photos from both cameras
      const photos = await captureBothCameras(
        `nst-main-t${captureData.trialNumber}-d${captureData.digitIndex}`,
        `nst-equipment-t${captureData.trialNumber}-d${captureData.digitIndex}`
      );
      
      // Send to backend
      await saveNSTCapture({
        ...captureData,
        photos
      });
      
      // Remove from queue
      setCaptureQueue(prev => prev.slice(1));
      
    } catch (error) {
      console.error('NST capture error:', error);
      // Still remove from queue to prevent getting stuck
      setCaptureQueue(prev => prev.slice(1));
    } finally {
      setIsProcessingCaptures(false);
    }
  };

  /**
   * Save NST capture data to backend
   */
  const saveNSTCapture = async (captureData) => {
    const formData = new FormData();
    
    // Add metadata
    Object.keys(captureData).forEach(key => {
      if (key !== 'photos') {
        formData.append(key, captureData[key]);
      }
    });
    
    // Add photos
    if (captureData.photos.main) {
      formData.append('mainPhoto', captureData.photos.main, 
        `nst-main-t${captureData.trialNumber}-d${captureData.digitIndex}.jpg`);
    }
    
    if (captureData.photos.second) {
      formData.append('equipmentPhoto', captureData.photos.second, 
        `nst-equipment-t${captureData.trialNumber}-d${captureData.digitIndex}.jpg`);
    }
    
    const response = await fetch('/api/nst-capture', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response.json();
  };

  /**
   * Handle experiment completion
   */
  useEffect(() => {
    if (experimentState.isComplete) {
      // Wait for any remaining captures to process
      const waitForCaptures = () => {
        if (captureQueue.length === 0 && !isProcessingCaptures) {
          handleExperimentComplete();
        } else {
          setTimeout(waitForCaptures, 500);
        }
      };
      
      waitForCaptures();
    }
  }, [experimentState.isComplete, captureQueue.length, isProcessingCaptures]);

  const handleExperimentComplete = async () => {
    try {
      // Send final results to backend
      const response = await fetch('/api/nst-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantId,
          sessionData,
          completionTime: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save results');
      }
      
      const results = await response.json();
      setTaskPhase('complete');
      
      // Return to experiment controller
      setTimeout(() => {
        onComplete(results);
      }, 2000);
      
    } catch (error) {
      console.error('NST completion error:', error);
      // Still proceed to avoid getting stuck
      onComplete({ error: error.message });
    }
  };

  const renderTaskPhase = () => {
    switch (taskPhase) {
      case 'instructions':
        return (
          <div className="nst-instructions">
            <h2>Number Switching Task</h2>
            <div className="instruction-content">
              <p>You will see numbers appear on the screen one at a time.</p>
              <p>Identify each number as odd or even using the keys:</p>
              
              <div className="key-instructions">
                <div className="key-pair">
                  <kbd>F</kbd> <span>for ODD numbers</span>
                </div>
                <div className="key-pair">
                  <kbd>J</kbd> <span>for EVEN numbers</span>
                </div>
              </div>
              
              <p>Respond as quickly and accurately as possible.</p>
              <p>Your camera will capture images during the task.</p>
              
              <button 
                className="start-button"
                onClick={startNSTExperiment}
              >
                Start NST Task
              </button>
            </div>
          </div>
        );
        
      case 'running':
        return (
          <div className="nst-running">
            <div className="nst-display">
              <DigitDisplay 
                digit={currentDigit}
                isVisible={isRunning}
              />
              
              <ResponseHandler 
                onResponse={handleResponse}
                isActive={isRunning && currentDigit !== null}
              />
              
              {/* Trial progress */}
              <div className="trial-progress">
                <div className="progress-info">
                  Trial {trialState.trialNumber} - Digit {trialState.digitIndex + 1} of 15
                </div>
                
                {/* Capture indicator */}
                {isProcessingCaptures && (
                  <div className="capture-indicator">
                    📸 Capturing...
                  </div>
                )}
                
                {captureQueue.length > 0 && (
                  <div className="queue-indicator">
                    Queue: {captureQueue.length}
                  </div>
                )}
              </div>
              
              {/* Rest period display */}
              {!isRunning && !experimentState.isComplete && (
                <div className="rest-period">
                  <h3>Rest Period</h3>
                  <p>Next trial starting soon...</p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'complete':
        return (
          <div className="nst-complete">
            <h2>✓ NST Task Complete</h2>
            <p>All trials finished. Processing data...</p>
            <div className="completion-spinner"></div>
          </div>
        );
        
      default:
        return <div>Unknown phase: {taskPhase}</div>;
    }
  };

  return (
    <div className="nst-task-container">
      <div className="nst-content">
        {renderTaskPhase()}
      </div>
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && taskPhase === 'running' && (
        <div className="nst-debug">
          <h4>Debug Info</h4>
          <p>Current Digit: {currentDigit}</p>
          <p>Trial: {trialState.trialNumber}</p>
          <p>Digit Index: {trialState.digitIndex}</p>
          <p>Is Running: {isRunning.toString()}</p>
          <p>Capture Queue: {captureQueue.length}</p>
          <p>Processing: {isProcessingCaptures.toString()}</p>
        </div>
      )}
    </div>
  );
};

export default NSTTask;