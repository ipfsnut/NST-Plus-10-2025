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
  const { captureBothCameras } = useCamera();
  
  const [taskPhase, setTaskPhase] = useState('instructions'); // instructions, training, experiment, complete
  const [currentTrial, setCurrentTrial] = useState(0);
  const [targetDot, setTargetDot] = useState('');
  const [captureTimer, setCaptureTimer] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  
  // Effort levels based on gender (from original face-capture app)
  const effortLevels = {
    'M': { low: 'Dot 2', high: 'Dot 3' },
    'F': { low: 'Dot 1', high: 'Dot 2' },
    'O': { low: 'Dot 1', high: 'Dot 2' } // Default for other
  };
  
  const totalRepetitions = 5;
  const restDuration = 10; // seconds
  
  // Training trials
  const trainingTrials = [
    { effort: 'low', dot: 'Dot 1', type: 'training' },
    { effort: 'high', dot: 'Dot 3', type: 'training' }
  ];

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
    const effortSet = effortLevels[participantGender] || effortLevels['O'];
    
    // Create trials array
    const trials = [];
    for (let i = 0; i < totalRepetitions; i++) {
      trials.push({ 
        effort: 'low', 
        dot: effortSet.low, 
        rep: i + 1,
        trialId: `low-${i + 1}`
      });
      trials.push({ 
        effort: 'high', 
        dot: effortSet.high, 
        rep: i + 1,
        trialId: `high-${i + 1}`
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
                    <strong>Dot 1:</strong> Low effort (light squeeze)
                  </div>
                  <div className="effort-level">
                    <strong>Dot 2:</strong> Medium effort (moderate squeeze)
                  </div>
                  <div className="effort-level">
                    <strong>Dot 3:</strong> High effort (strong squeeze)
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
          <div className="target-container">
            {!trainingComplete ? (
              <>
                <div className="target-display">
                  <div className="target-element">
                    {targetDot}
                  </div>
                </div>
                
                <div className="target-status">
                  Practice Session
                </div>
                
                <div className="target-instructions">
                  Squeeze the dynamometer to reach {targetDot}
                </div>
                
                <div className="equipment-view-overlay">
                  <p>Look at your dynamometer and squeeze to reach {targetDot}</p>
                </div>
                
                {captureTimer && (
                  <div className="target-secondary-status">
                    Hold for {captureTimer}...
                  </div>
                )}
              </>
            ) : (
              <div className="training-complete">
                <h2>Practice Complete!</h2>
                <p>You've practiced all three effort levels successfully.</p>
                <p className="next-step">In the main task, you'll complete 5 trials using dots assigned based on your profile.</p>
                <div className="assigned-dots">
                  <strong>Your assigned levels:</strong>
                  <ul>
                    <li>Lower effort: {effortLevels[participantGender]?.low || 'Dot 1'}</li>
                    <li>Higher effort: {effortLevels[participantGender]?.high || 'Dot 2'}</li>
                  </ul>
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
                  <p>Relax your hand completely</p>
                </div>
              </div>
            ) : (
              <div className="trial-display">
                {/* Equipment Camera Feed with Target Overlay */}
                <div className="equipment-camera-container">
                  <CameraView 
                    camera="second" 
                    visible={true}
                    className="equipment-camera-feed"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  
                  {/* Target Dot Overlay */}
                  <div className="dot-target-overlay">
                    <div className="target-dot-label">
                      {targetDot}
                    </div>
                    <div className="target-instruction">
                      Squeeze to reach this target
                    </div>
                  </div>
                  
                  {/* Trial Progress */}
                  <div className="trial-progress-overlay">
                    Trial {currentTrial + 1} of {totalRepetitions * 2}
                  </div>
                  
                  {/* Capture Timer */}
                  {captureTimer && (
                    <div className="capture-timer-overlay">
                      Photo in {captureTimer}...
                    </div>
                  )}
                </div>
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