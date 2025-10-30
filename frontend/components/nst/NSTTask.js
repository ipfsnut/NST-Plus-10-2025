import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCamera } from '../common/DualCameraProvider';
import ResponseHandler from '../ResponseHandler';
import { 
  startExperiment, 
  nextDigit, 
  completeExperiment,
  recordResponse,
  setKeyMapping,
  setTrials 
} from '../../redux/experimentSlice';

/**
 * NSTTask - Number Switching Task implementation with camera capture
 */
const NSTTask = ({ participantId, onComplete }) => {
  const dispatch = useDispatch();
  const { captureBothCameras } = useCamera();
  
  const experimentState = useSelector(state => state.experiment);
  const { 
    isRunning = false, 
    currentDigit = null, 
    trialState = {}, 
    sessionData = {}, 
    keyMapping = null 
  } = experimentState || {};
  
  const [taskPhase, setTaskPhase] = useState('instructions'); // instructions, training, running, complete
  const [trainingPhase, setTrainingPhase] = useState('ready'); // ready, active, feedback, complete
  const [trainingTrials, setTrainingTrials] = useState([]);
  const [currentTrainingTrial, setCurrentTrainingTrial] = useState(0);
  const [trainingAccuracy, setTrainingAccuracy] = useState(0);
  const [captureQueue, setCaptureQueue] = useState([]);
  const [isProcessingCaptures, setIsProcessingCaptures] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState(null);

  // Initialize key mapping if not already set
  useEffect(() => {
    if (!keyMapping) {
      // Randomly assign F/J to odd/even
      const randomizeKeys = Math.random() < 0.5;
      const mapping = randomizeKeys 
        ? { odd: 'f', even: 'j', responseStyle: 'f-odd' }
        : { odd: 'j', even: 'f', responseStyle: 'j-odd' };
      
      console.log('Setting random key mapping:', mapping);
      dispatch(setKeyMapping(mapping));
    }
  }, [keyMapping, dispatch]);

  // Keyboard event handling for training
  useEffect(() => {
    if (taskPhase !== 'training' || trainingPhase !== 'active') return;

    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase();
      if (!keyMapping) {
        console.warn('NST: Key mapping not initialized, ignoring key press');
        return;
      }
      if (key === keyMapping.odd || key === keyMapping.even) {
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
  const startTraining = async () => {
    setTaskPhase('training');
    setTrainingPhase('ready'); // Set to ready while generating trials
    await generateTrainingTrials(); // Wait for trials to be generated
    setTrainingPhase('active'); // Only activate after trials are ready
  };

  /**
   * Generate training trials using real NST number generation
   */
  const generateTrainingTrials = async () => {
    try {
      // Request a practice trial from the backend using real NST generation
      const response = await fetch('/api/generate-practice-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantId,
          taskType: 'nst-practice'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate practice trial');
      }
      
      const practiceData = await response.json();
      
      // Extract individual digits from the generated number sequence
      const trials = [];
      const numberSequence = practiceData.number; // e.g., "123456789123456"
      
      // Take first 10 digits for practice
      for (let i = 0; i < Math.min(10, numberSequence.length); i++) {
        const digit = parseInt(numberSequence[i]);
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
      console.log('Training trials generated:', trials.length, 'trials');
      
    } catch (error) {
      console.error('Failed to generate practice trials:', error);
      // Fallback to simple generation without 0
      const trials = [];
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
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
      console.log('Fallback training trials generated:', trials.length, 'trials');
    }
  };

  /**
   * Handle training trial response
   */
  const handleTrainingResponse = (key, responseTime) => {
    if (!keyMapping) {
      console.error('NST: Cannot handle training response - key mapping not initialized');
      return;
    }
    
    const response = key === keyMapping.odd ? 'odd' : 'even';
    if (!trainingTrials || trainingTrials.length === 0) {
      console.error('NST: Cannot handle training response - no training trials available');
      return;
    }
    
    const trial = trainingTrials[currentTrainingTrial];
    
    if (!trial) {
      console.error('NST: Cannot handle training response - no current trial', {
        currentTrainingTrial,
        trialsLength: trainingTrials.length
      });
      return;
    }
    
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
  const startNSTExperiment = async () => {
    try {
      // Call backend to start session and get trials
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantId,
          taskType: 'nst'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start NST session');
      }
      
      const sessionData = await response.json();
      console.log('NST session started:', sessionData);
      
      // Dispatch Redux action with session data
      dispatch(startExperiment({
        participantId,
        taskType: 'nst',
        config: nstConfig
      }));
      
      // Set trials in Redux state
      dispatch(setTrials(sessionData.trials));
      
      // Update trial state with first digit
      if (sessionData.trialState) {
        dispatch({ 
          type: 'experiment/updateTrialState', 
          payload: sessionData.trialState 
        });
      }
      
      setTaskPhase('running');
      
    } catch (error) {
      console.error('Failed to start NST experiment:', error);
      // Show error state or retry option
      alert('Failed to start experiment. Please try again.');
    }
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
    if (!trialState || typeof trialState.digitIndex !== 'number') {
      console.warn('NST: Cannot check capture - trial state not initialized');
      return false;
    }
    
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
            <h2>Cognitive Effort Task</h2>
            
            <div className="key-mapping-clean">
              <div className="key-group">
                <kbd className="key-f">{keyMapping?.odd?.toUpperCase() || 'F'}</kbd>
                <span className="key-label">ODD</span>
              </div>
              <div className="key-group">
                <kbd className="key-j">{keyMapping?.even?.toUpperCase() || 'J'}</kbd>
                <span className="key-label">EVEN</span>
              </div>
            </div>
            
            <p className="simple-instruction">
              Respond as quickly as possible while still labeling every digit accurately.
            </p>
            
            <button 
              className="start-button-clean"
              onClick={startTraining}
            >
              Start Practice
            </button>
          </div>
        );
        
      case 'training':
        return (
          <div className="nst-training">
            {trainingPhase === 'ready' && (
              <div className="training-ready">
                <h3>Preparing Practice Trials...</h3>
                <p>Generating practice numbers, please wait...</p>
              </div>
            )}
            
            {trainingPhase === 'active' && (
              <div className="training-active target-container">
                <div className="target-display">
                  <div className="target-element">
                    {trainingTrials[currentTrainingTrial]?.digit}
                  </div>
                </div>
                
                <div className="target-instructions">
                  Practice Trial {currentTrainingTrial + 1} of 10<br/>
                  <kbd>{keyMapping?.odd?.toUpperCase() || 'F'}</kbd> = ODD &nbsp;&nbsp;&nbsp; <kbd>{keyMapping?.even?.toUpperCase() || 'J'}</kbd> = EVEN
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
            <div className="target-container">
              <div className="target-display">
                <div className="target-element">
                  {currentDigit}
                </div>
              </div>
              
              <ResponseHandler 
                onResponse={handleResponse}
                isActive={isRunning && currentDigit !== null}
              />
              
              {/* Trial progress - hidden during active task */}
              {false && (
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
              )}
              
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
      
    </div>
  );
};

export default NSTTask;