import React, { useState, useEffect } from 'react';
import { useCamera } from '../common/DualCameraProvider';

/**
 * NeutralCapture - Captures baseline facial expression before tasks begin
 */
const NeutralCapture = ({ participantId, onComplete }) => {
  const { 
    captureBothCameras, 
    camerasInitialized,
    mainVideoRef,
    secondVideoRef 
  } = useCamera();
  
  const [phase, setPhase] = useState('instructions'); // instructions, countdown, capturing, complete
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);

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
    if (!camerasInitialized) {
      setCaptureError('Cameras not ready. Please wait or check camera permissions.');
      return;
    }
    
    setPhase('countdown');
    setCountdown(3);
  };

  const startCapture = async () => {
    setPhase('capturing');
    setIsCapturing(true);
    setCaptureError(null);
    
    try {
      // Capture photos from both cameras
      const photos = await captureBothCameras('neutral-main', 'neutral-equipment');
      
      if (!photos.main && !photos.second) {
        throw new Error('Failed to capture from any camera');
      }
      
      // Prepare data for backend
      const neutralData = {
        participantId,
        timestamp: new Date().toISOString(),
        photos: {
          main: photos.main,
          equipment: photos.second
        }
      };
      
      // Send to backend
      await saveNeutralCapture(neutralData);
      
      // Show completion briefly then proceed
      setPhase('complete');
      setTimeout(() => {
        onComplete(neutralData);
      }, 2000);
      
    } catch (error) {
      console.error('Neutral capture error:', error);
      setCaptureError(error.message || 'Failed to capture photos');
      setPhase('instructions');
    } finally {
      setIsCapturing(false);
    }
  };

  const saveNeutralCapture = async (neutralData) => {
    const formData = new FormData();
    formData.append('participantId', neutralData.participantId);
    formData.append('timestamp', neutralData.timestamp);
    
    if (neutralData.photos.main) {
      formData.append('mainPhoto', neutralData.photos.main, 'neutral-main.jpg');
    }
    
    if (neutralData.photos.equipment) {
      formData.append('equipmentPhoto', neutralData.photos.equipment, 'neutral-equipment.jpg');
    }
    
    const response = await fetch('/api/neutral-capture', {
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
                  <li>Sit comfortably and look directly at the camera</li>
                  <li>Keep a relaxed, neutral expression</li>
                  <li>Hold still when the photo is taken</li>
                  <li>The photo will be taken automatically after a 3-second countdown</li>
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
          <div className="neutral-countdown">
            <div className="countdown-display">
              <h2>Get Ready</h2>
              <div className="countdown-number">{countdown}</div>
              <p>Look at the camera and maintain a neutral expression</p>
            </div>
            
            {/* Target indicator */}
            <div className="target-indicator">
              <div className="target-circle">
                <div className="target-center"></div>
              </div>
            </div>
          </div>
        );
        
      case 'capturing':
        return (
          <div className="neutral-capturing">
            <div className="capturing-display">
              <h2>Capturing...</h2>
              <div className="capture-spinner"></div>
              <p>Hold still - photo being taken</p>
            </div>
          </div>
        );
        
      case 'complete':
        return (
          <div className="neutral-complete">
            <div className="completion-display">
              <h2>✓ Baseline Captured</h2>
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