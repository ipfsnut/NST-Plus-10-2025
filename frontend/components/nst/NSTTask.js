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
  const { isRunning, currentDigit, trialState, sessionData } = experimentState || {};
  
  const [taskPhase, setTaskPhase] = useState('instructions'); // instructions, training, running, complete
  const [trainingPhase, setTrainingPhase] = useState('ready'); // ready, active, feedback, complete
  const [trainingTrials, setTrainingTrials] = useState([]);
  const [currentTrainingTrial, setCurrentTrainingTrial] = useState(0);
  const [trainingAccuracy, setTrainingAccuracy] = useState(0);
  const [captureQueue, setCaptureQueue] = useState([]);
  const [isProcessingCaptures, setIsProcessingCaptures] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState(null);

  // Keyboard event handling for training
  useEffect(() => {
    if (taskPhase !== 'training' || trainingPhase !== 'active') return;

    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'f' || key === 'j') {
        const responseTime = Date.now() - trainingStartTime;
        handleTrainingResponse(key, responseTime);
      }
    };

    // Set start time when trial becomes active
    setTrainingStartTime(Date.now());

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [taskPhase, trainingPhase, currentTrainingTrial, trainingStartTime]);

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
   * Start NST training phase
   */
  const startTraining = () => {
    setTaskPhase('training');
    setTrainingPhase('active');
    generateTrainingTrials();
  };

  /**
   * Generate training trials with feedback
   */
  const generateTrainingTrials = () => {
    const trials = [];
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    // Shuffle and take 10 practice digits
    const shuffled = [...digits].sort(() => Math.random() - 0.5);
    for (let digit of shuffled) {
      trials.push({
        digit,
        correctAnswer: digit % 2 === 0 ? 'even' : 'odd',
        userResponse: null,
        responseTime: null,
        correct: null
      });
    }
    setTrainingTrials(trials);
    setCurrentTrainingTrial(0);
  };

  /**
   * Handle training trial response
   */
  const handleTrainingResponse = (key, responseTime) => {
    const response = key === 'f' ? 'odd' : 'even';
    const trial = trainingTrials[currentTrainingTrial];
    const isCorrect = response === trial.correctAnswer;
    
    // Update trial with response
    const updatedTrials = [...trainingTrials];
    updatedTrials[currentTrainingTrial] = {
      ...trial,
      userResponse: response,
      responseTime,
      correct: isCorrect
    };
    setTrainingTrials(updatedTrials);
    
    // Show feedback
    setTrainingPhase('feedback');
    
    setTimeout(() => {
      if (currentTrainingTrial < trainingTrials.length - 1) {
        setCurrentTrainingTrial(prev => prev + 1);
        setTrainingPhase('active');
      } else {
        // Training complete - calculate accuracy
        const correctCount = updatedTrials.filter(t => t.correct).length;
        const accuracy = (correctCount / updatedTrials.length) * 100;
        setTrainingAccuracy(accuracy);
        setTrainingPhase('complete');
      }
    }, 1500);
  };

  /**
   * Start the NST experiment after training
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
              <p>In this task, you will categorize numbers as odd or even.</p>
              <p>Numbers will appear one at a time in the center of the screen.</p>
              
              <div className="key-instructions">
                <h3>Response Keys:</h3>
                <div className="key-mapping">
                  <div className="key-pair">
                    <kbd>F</kbd>
                    <span className="arrow">←</span>
                    <span className="category odd">ODD</span>
                    <span className="examples">(1, 3, 5, 7, 9)</span>
                  </div>
                  <div className="key-pair">
                    <span className="category even">EVEN</span>
                    <span className="examples">(0, 2, 4, 6, 8)</span>
                    <span className="arrow">→</span>
                    <kbd>J</kbd>
                  </div>
                </div>
              </div>
              
              <div className="task-details">
                <h3>Important:</h3>
                <ul>
                  <li>Respond as quickly as possible while staying accurate</li>
                  <li>Keep your eyes on the center throughout the task</li>
                  <li>Your facial expressions will be photographed during some responses</li>
                  <li>Each digit appears for 1.5 seconds</li>
                </ul>
              </div>
              
              <p className="training-note">
                We'll start with 10 practice trials with feedback before the main task.
              </p>
              
              <button 
                className="start-button"
                onClick={startTraining}
              >
                Start Practice Trials
              </button>
            </div>
          </div>
        );
        
      case 'training':
        return (
          <div className="nst-training">
            {trainingPhase === 'active' && (
              <div className="training-active">
                <h3>Practice Trial {currentTrainingTrial + 1} of 10</h3>
                <div className="digit-display training">
                  {trainingTrials[currentTrainingTrial]?.digit}
                </div>
                <div className="key-reminder">
                  <span><kbd>F</kbd> = ODD</span>
                  <span><kbd>J</kbd> = EVEN</span>
                </div>
              </div>
            )}
            
            {trainingPhase === 'feedback' && (
              <div className="training-feedback">
                <div className={`feedback-message ${trainingTrials[currentTrainingTrial]?.correct ? 'correct' : 'incorrect'}`}>
                  {trainingTrials[currentTrainingTrial]?.correct ? (
                    <>
                      <span className="feedback-icon">✓</span>
                      <span>Correct!</span>
                      <span className="response-time">
                        Response time: {trainingTrials[currentTrainingTrial]?.responseTime}ms
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="feedback-icon">✗</span>
                      <span>Incorrect</span>
                      <span className="correction">
                        {trainingTrials[currentTrainingTrial]?.digit} is {trainingTrials[currentTrainingTrial]?.correctAnswer}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {trainingPhase === 'complete' && (
              <div className="training-complete">
                <h3>Practice Complete!</h3>
                <div className="training-results">
                  <p>Accuracy: {trainingAccuracy.toFixed(1)}%</p>
                  <p>Average response time: {
                    (trainingTrials.reduce((sum, t) => sum + (t.responseTime || 0), 0) / 
                     trainingTrials.filter(t => t.responseTime).length).toFixed(0)
                  }ms</p>
                </div>
                
                {trainingAccuracy >= 80 ? (
                  <>
                    <p className="success-message">Great job! You're ready for the main task.</p>
                    <button className="start-button" onClick={startNSTExperiment}>
                      Start Main Task
                    </button>
                  </>
                ) : (
                  <>
                    <p className="retry-message">
                      Please practice again to achieve at least 80% accuracy.
                    </p>
                    <button className="retry-button" onClick={startTraining}>
                      Retry Practice
                    </button>
                  </>
                )}
              </div>
            )}
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