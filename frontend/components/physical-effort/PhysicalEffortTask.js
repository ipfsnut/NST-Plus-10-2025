import React, { useState, useEffect } from 'react';
import { useCamera } from '../common/DualCameraProvider';
import ConfigScreen from './ConfigScreen';
import CameraView from '../shared/CameraView';
import '../../styles/TargetDisplay.css';
import '../../styles/PhysicalEffort.css';

/**
 * PhysicalEffortTask - Physical effort task using handgrip dynamometer
 * Adapted from face-capture app with proper integration into NST Plus
 */
const PhysicalEffortTask = ({ participantId, participantGender, onComplete }) => {
  const { 
    captureBothCameras,
    selectedMainCamera,
    selectedSecondCamera 
  } = useCamera();
  
  const [taskPhase, setTaskPhase] = useState('instructions'); // instructions, training, experiment, complete
  const [currentTrial, setCurrentTrial] = useState(0);
  const [targetDot, setTargetDot] = useState('');
  const [captureTimer, setCaptureTimer] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  
  // Effort levels based on gender - 3 dots per participant
  const effortLevels = {
    'M': { dots: ['Dot 2', 'Dot 3', 'Dot 4'] },
    'Male': { dots: ['Dot 2', 'Dot 3', 'Dot 4'] },
    'F': { dots: ['Dot 1', 'Dot 2', 'Dot 3'] },
    'Female': { dots: ['Dot 1', 'Dot 2', 'Dot 3'] },
    'O': { dots: ['Dot 1', 'Dot 2', 'Dot 3'] }, // Default for other/prefer not to say
    'Other': { dots: ['Dot 1', 'Dot 2', 'Dot 3'] },
    'Prefer not to say': { dots: ['Dot 1', 'Dot 2', 'Dot 3'] }
  };
  
  const totalRepetitions = 5;
  const restDuration = 10; // seconds
  
  // Training trials - now using participant's assigned dots
  const getTrainingTrials = () => {
    console.log('PhysicalEffortTask - participantGender:', participantGender);
    console.log('PhysicalEffortTask - effortLevels:', effortLevels);
    
    const participantDots = effortLevels[participantGender]?.dots || effortLevels['O'].dots;
    console.log('PhysicalEffortTask - selected dots:', participantDots);
    
    return [
      { effort: 'low', dot: participantDots[0], type: 'training' },
      { effort: 'high', dot: participantDots[2], type: 'training' }  // Use highest dot for training
    ];
  };

  /**
   * Start the physical effort task
   */
  const startTask = () => {
    setTaskPhase('training');
    runTrainingSequence();
  };

  /**
   * Run the training sequence
   */
  const runTrainingSequence = () => {
    const trainingTrials = getTrainingTrials();
    let trainingIndex = 0;
    
    const runTrainingTrial = () => {
      if (trainingIndex >= trainingTrials.length) {
        setTrainingComplete(true);
        return;
      }
      
      const trial = trainingTrials[trainingIndex];
      setTargetDot(trial.dot);
      
      // Training countdown
      setCaptureTimer(3);
      const interval = setInterval(() => {
        setCaptureTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCaptureTimer(null);
            
            // Move to next training trial
            trainingIndex++;
            if (trainingIndex < trainingTrials.length) {
              setTimeout(runTrainingTrial, 3000); // 3 second rest
            } else {
              setTrainingComplete(true);
            }
            
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };
    
    runTrainingTrial();
  };

  /**
   * Start the main experiment after training
   */
  const startExperiment = () => {
    setTaskPhase('experiment');
    setCurrentTrial(0);
    generateAndRunTrials();
  };

  /**
   * Generate and run experimental trials
   */
  const generateAndRunTrials = () => {
    console.log('generateAndRunTrials - participantGender:', participantGender);
    const participantDots = effortLevels[participantGender]?.dots || effortLevels['O'].dots;
    console.log('generateAndRunTrials - selected dots:', participantDots);
    
    // Create trials array - 5 repetitions of each of the 3 assigned dots (15 total trials)
    const trials = [];
    for (let i = 0; i < totalRepetitions; i++) {
      participantDots.forEach((dot, dotIndex) => {
        trials.push({ 
          dot: dot, 
          rep: i + 1,
          trialId: `${dot.toLowerCase().replace(' ', '-')}-${i + 1}`
        });
      });
    }
    
    // Randomize trial order
    for (let i = trials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trials[i], trials[j]] = [trials[j], trials[i]];
    }
    
    // Store trials and start first one
    window.physicalEffortTrials = trials;
    runNextTrial(0);
  };

  /**
   * Run the next experimental trial
   */
  const runNextTrial = (trialIndex) => {
    if (trialIndex >= totalRepetitions * 2) {
      completeTask();
      return;
    }
    
    const trial = window.physicalEffortTrials[trialIndex];
    setTargetDot(trial.dot);
    setCurrentTrial(trialIndex);
    
    // Start capture countdown
    setCaptureTimer(3);
    const captureInterval = setInterval(() => {
      setCaptureTimer(prev => {
        if (prev <= 1) {
          clearInterval(captureInterval);
          captureTrialPhoto(trial);
          setCaptureTimer(null);
          
          // Start rest period before next trial
          if (trialIndex < totalRepetitions * 2 - 1) {
            startRestPeriod(trialIndex + 1);
          } else {
            completeTask();
          }
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Capture photos during a trial
   */
  const captureTrialPhoto = async (trial) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const photos = await captureBothCameras(
        `physical-effort-main-${trial.trialId}`,
        `physical-effort-equipment-${trial.trialId}`
      );
      
      const captureData = {
        participantId,
        trial,
        timestamp,
        photos
      };
      
      // Save to backend
      await savePhysicalEffortCapture(captureData);
      
      // Store for local tracking
      setCapturedImages(prev => [...prev, {
        trial: trial.trialId,
        timestamp,
        photos
      }]);
      
    } catch (error) {
      console.error('Physical effort capture error:', error);
    }
  };

  /**
   * Save physical effort capture to backend
   */
  const savePhysicalEffortCapture = async (captureData) => {
    const formData = new FormData();
    
    // Add metadata
    formData.append('participantId', captureData.participantId);
    formData.append('trial', JSON.stringify(captureData.trial));
    formData.append('timestamp', captureData.timestamp);
    formData.append('taskType', 'physical-effort');
    
    // Add photos
    if (captureData.photos.main) {
      formData.append('mainPhoto', captureData.photos.main, 
        `physical-effort-main-${captureData.trial.trialId}.jpg`);
    }
    
    if (captureData.photos.second) {
      formData.append('equipmentPhoto', captureData.photos.second, 
        `physical-effort-equipment-${captureData.trial.trialId}.jpg`);
    }
    
    const response = await fetch('/api/physical-effort-capture', {
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
   * Start rest period between trials
   */
  const startRestPeriod = (nextTrialIndex) => {
    setRestTimer(restDuration);
    
    const restInterval = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(restInterval);
          setRestTimer(null);
          setTimeout(() => runNextTrial(nextTrialIndex), 1000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Complete the physical effort task
   */
  const completeTask = async () => {
    setTaskPhase('complete');
    
    try {
      // Send completion data to backend
      const completionData = {
        participantId,
        taskType: 'physical-effort',
        totalTrials: totalRepetitions * 2,
        capturedImages: capturedImages.length,
        completionTime: new Date().toISOString()
      };
      
      const response = await fetch('/api/physical-effort-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(completionData)
      });
      
      if (response.ok) {
        const results = await response.json();
        
        // Return to experiment controller after brief delay
        setTimeout(() => {
          onComplete(results);
        }, 2000);
      } else {
        throw new Error('Failed to save completion data');
      }
      
    } catch (error) {
      console.error('Physical effort completion error:', error);
      // Still proceed to avoid getting stuck
      onComplete({ error: error.message });
    }
  };

  const renderTaskPhase = () => {
    switch (taskPhase) {
      case 'instructions':
        return (
          <div className="physical-effort-instructions">
            <h2>Physical Effort Task</h2>
            <div className="instruction-content">
              <p>You will use the handgrip dynamometer to exert physical effort.</p>
              <p>Squeeze the device to move the dial to the specified target dot.</p>
              
              <div className="effort-explanation">
                <h3>Target Levels:</h3>
                <div className="effort-levels">
                  <div className="effort-level">
                    <strong>Dot 1</strong>
                  </div>
                  <div className="effort-level">
                    <strong>Dot 2</strong> 
                  </div>
                  <div className="effort-level">
                    <strong>Dot 3</strong> 
                  </div>
                  <div className="effort-level">
                    <strong>Dot 4</strong> 
                  </div>
                </div>
              </div>
              
              <p>We'll start with a practice session, then proceed to the main task.</p>
              <p>Your facial expressions will be captured during effort exertion.</p>
              
              <div className="task-controls">
                <button 
                  className="config-button"
                  onClick={() => setShowConfig(true)}
                >
                  ⚙️ Camera Settings
                </button>
                
                <button 
                  className="start-button"
                  onClick={startTask}
                >
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'training':
        return (
          <div className="physical-effort-experiment">
            {!trainingComplete ? (
              <div className="trial-display">
                {/* Dark background */}
                <div className="task-background"></div>
                
                {/* Circular Camera Feed in Center */}
                <div className="circular-camera-container">
                  <CameraView 
                    camera={selectedSecondCamera ? "second" : "main"}
                    visible={true}
                    className="circular-camera-feed"
                  />
                  
                  {/* Training Target Overlay */}
                  <div className="camera-dot-overlay">
                    <div className="target-dot-label">
                      {targetDot}
                    </div>
                    <div className="target-instruction">
                      Practice: Squeeze to reach this target
                    </div>
                  </div>
                </div>
                
                {/* Practice Progress */}
                {!captureTimer && (
                  <div className="trial-progress-overlay">
                    Practice Session
                  </div>
                )}
                
                {/* Training Timer */}
                {captureTimer && (
                  <div className="capture-timer-overlay">
                    {captureTimer}
                  </div>
                )}
              </div>
            ) : (
              <div className="training-complete">
                <h2>Practice Complete!</h2>
                <p>You've practiced all three effort levels successfully.</p>
                <p className="next-step">In the main task, you'll complete 5 trials.</p>
                <div className="assigned-dots">
                  <strong>Your assigned targets:</strong>
                  <ul>
                    {(effortLevels[participantGender]?.dots || effortLevels['O'].dots).map((dot, index) => (
                      <li key={index}>{dot}</li>
                    ))}
                  </ul>
                  <p>You'll complete 5 trials for each target (15 total trials).</p>
                </div>
                <div className="training-actions">
                  <button onClick={() => runTrainingSequence()}>
                    Practice Again
                  </button>
                  <button className="primary" onClick={startExperiment}>
                    Start Main Task
                  </button>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'experiment':
        return (
          <div className="physical-effort-experiment">
            {restTimer ? (
              <div className="rest-display">
                <div className="rest-message">
                  <h2>REST</h2>
                  <div className="rest-countdown">{restTimer}s</div>
                  <p>Relax</p>
                </div>
              </div>
            ) : (
              <div className="trial-display">
                {/* Dark background */}
                <div className="task-background"></div>
                
                {/* Circular Camera Feed in Center */}
                <div className="circular-camera-container">
                  <CameraView 
                    camera={selectedSecondCamera ? "second" : "main"}
                    visible={true}
                    className="circular-camera-feed"
                  />
                  
                  {/* Debug info for camera selection */}
                  {process.env.NODE_ENV === 'development' && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      padding: '5px',
                      fontSize: '12px',
                      borderRadius: '3px',
                      zIndex: 20
                    }}>
                      Using: {selectedSecondCamera ? "second" : "main"} camera<br/>
                      Second: {selectedSecondCamera || 'none'}<br/>
                      Main: {selectedMainCamera || 'none'}
                    </div>
                  )}
                  
                  {/* Target Dot Overlay on Camera */}
                  <div className="camera-dot-overlay">
                    <div className="target-dot-label">
                      {targetDot}
                    </div>
                    <div className="target-instruction">
                      Squeeze to reach this target
                    </div>
                  </div>
                </div>
                
                {/* Trial Progress - hidden during photo capture */}
                {!captureTimer && (
                  <div className="trial-progress-overlay">
                    Trial {currentTrial + 1} of {totalRepetitions * 2}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 'complete':
        return (
          <div className="physical-effort-complete">
            <h2>✓ Physical Effort Task Complete</h2>
            <p>All trials finished. Processing data...</p>
            <div className="completion-info">
              <p>Captured {capturedImages.length} images</p>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown phase: {taskPhase}</div>;
    }
  };

  if (showConfig) {
    return <ConfigScreen onClose={() => setShowConfig(false)} />;
  }

  return (
    <div className="physical-effort-task-container">
      <div className="physical-effort-content">
        {renderTaskPhase()}
      </div>
      
    </div>
  );
};

export default PhysicalEffortTask;