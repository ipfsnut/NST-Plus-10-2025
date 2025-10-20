import React, { useState, useEffect } from 'react';
import { useCamera } from '../common/DualCameraProvider';
import '../../styles/NeutralCapture.css';
import '../../styles/TargetDisplay.css';

/**
 * NeutralCapture - Captures baseline facial expression before tasks begin
 */
const NeutralCapture = ({ participantId, onComplete }) => {
  const { 
    captureBothCameras, 
    camerasInitialized,
    cameras,
    mainVideoRef,
    secondVideoRef 
  } = useCamera();
  
  const [phase, setPhase] = useState('instructions'); // instructions, countdown, capturing, complete
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const TOTAL_CAPTURES = 5;
  const CAPTURE_INTERVAL = 2000; // 2 seconds between captures

  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      startCapture();
    }
  }, [phase, countdown]);

  const startCountdown = () => {
    // Allow capture even without cameras (will use mock capture)
    if (!camerasInitialized) {
      setCaptureError('Cameras not initialized yet. Please wait...');
      return;
    }
    
    setCaptureError(null);
    setPhase('countdown');
    setCountdown(3);
  };

  const startCapture = async () => {
    setPhase('capturing');
    setIsCapturing(true);
    setCaptureError(null);
    setCaptureCount(0);
    
    // Perform multiple captures
    await performMultipleCaptures();
  };

  const performMultipleCaptures = async () => {
    const captures = [];
    
    for (let i = 0; i < TOTAL_CAPTURES; i++) {
      try {
        setCaptureCount(i + 1);
        
        // Capture photos from both cameras
        const photos = await captureBothCameras(`neutral-main-${i+1}`, `neutral-equipment-${i+1}`);
        
        if (!photos.main && !photos.second) {
          throw new Error('Failed to capture from any camera');
        }
        
        captures.push({
          captureNumber: i + 1,
          timestamp: new Date().toISOString(),
          photos: {
            main: photos.main,
            equipment: photos.second
          }
        });
        
        // Wait between captures (except after last one)
        if (i < TOTAL_CAPTURES - 1) {
          await new Promise(resolve => setTimeout(resolve, CAPTURE_INTERVAL));
        }
        
      } catch (error) {
        console.error(`Neutral capture ${i+1} error:`, error);
        // Continue with remaining captures even if one fails
      }
    }
    
    if (captures.length === 0) {
      setCaptureError('Failed to capture any photos');
      setPhase('instructions');
      setIsCapturing(false);
      return;
    }
    
    try {
      // Send all captures to backend
      const neutralData = {
        participantId,
        timestamp: new Date().toISOString(),
        captures: captures,
        totalCaptures: captures.length
      };
      
      await saveNeutralCaptures(neutralData);
      
      // Show completion briefly then proceed
      setPhase('complete');
      setTimeout(() => {
        onComplete(neutralData);
      }, 2000);
      
    } catch (error) {
      console.error('Error saving neutral captures:', error);
      setCaptureError(error.message || 'Failed to save captures');
      setPhase('instructions');
    } finally {
      setIsCapturing(false);
    }
  };

  const saveNeutralCaptures = async (neutralData) => {
    const formData = new FormData();
    formData.append('participantId', neutralData.participantId);
    formData.append('timestamp', neutralData.timestamp);
    formData.append('totalCaptures', neutralData.totalCaptures.toString());
    
    // Append all captures
    neutralData.captures.forEach((capture, index) => {
      if (capture.photos.main) {
        formData.append(`mainPhoto_${index + 1}`, capture.photos.main, `neutral-main-${index + 1}.jpg`);
      }
      if (capture.photos.equipment) {
        formData.append(`equipmentPhoto_${index + 1}`, capture.photos.equipment, `neutral-equipment-${index + 1}.jpg`);
      }
      formData.append(`timestamp_${index + 1}`, capture.timestamp);
    });
    
    const response = await fetch('/api/participants/neutral-capture', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response.json();
  };

  const renderPhase = () => {
    switch (phase) {
      case 'instructions':
        return (
          <div className="neutral-instructions">
            <h2>Baseline Capture</h2>
            <div className="instruction-content">
              <p>We will now capture your neutral facial expression.</p>
              <p>This will serve as a baseline for comparing your expressions during the tasks.</p>
              
              <div className="instruction-steps">
                <h3>Instructions:</h3>
                <ul>
                  <li>Look at the center cross on the screen</li>
                  <li>Keep a relaxed, neutral expression</li>
                  <li>Hold still during each capture</li>
                  <li>We will take 5 photos with 2-second intervals</li>
                  <li>The captures will begin after a 3-second countdown</li>
                </ul>
              </div>
              
              {captureError && (
                <div className="error-message">
                  Error: {captureError}
                </div>
              )}
              
              <button 
                className="start-capture-button"
                onClick={startCountdown}
                disabled={!camerasInitialized || isCapturing}
              >
                {!camerasInitialized ? 'Initializing Cameras...' : 'Ready - Start Capture'}
              </button>
            </div>
          </div>
        );
        
      case 'countdown':
        return (
          <div className="target-container">
            <div className="target-display">
              <div className="fixation-cross">
                <div className="cross-horizontal"></div>
                <div className="cross-vertical"></div>
              </div>
            </div>
            
            <div className="target-status">
              Get Ready - {countdown}
            </div>
            
            <div className="target-instructions">
              Look at the center cross and maintain a neutral expression
            </div>
          </div>
        );
        
      case 'capturing':
        return (
          <div className="target-container target-capturing">
            <div className="target-display">
              <div className="fixation-cross">
                <div className="cross-horizontal"></div>
                <div className="cross-vertical"></div>
              </div>
            </div>
            
            <div className="target-status">
              Capturing {captureCount} of {TOTAL_CAPTURES}
            </div>
            
            <div className="target-secondary-status">
              <div className="capture-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(captureCount / TOTAL_CAPTURES) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="target-instructions">
              Keep looking at the center cross - hold still
            </div>
          </div>
        );
        
      case 'complete':
        return (
          <div className="neutral-complete">
            <div className="completion-display">
              <h2>✓ Baseline Captured</h2>
              <p>{captureCount} photos captured successfully</p>
              <p>Proceeding to experiment tasks...</p>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown phase: {phase}</div>;
    }
  };

  return (
    <div className="neutral-capture-container">
      <div className="neutral-content">
        {renderPhase()}
      </div>
      
      {/* Camera status indicator */}
      <div className="camera-status">
        <div className={`status-indicator ${camerasInitialized ? 'ready' : 'not-ready'}`}>
          Camera: {camerasInitialized ? 'Ready' : 'Initializing...'}
        </div>
      </div>
      
      {/* Development: Show camera previews */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-camera-preview">
          <div className="preview-camera">
            <h4>Main Camera</h4>
            <video
              ref={mainVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '200px', height: '150px', border: '1px solid #ccc' }}
            />
          </div>
          <div className="preview-camera">
            <h4>Equipment Camera</h4>
            <video
              ref={secondVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '200px', height: '150px', border: '1px solid #ccc' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NeutralCapture;