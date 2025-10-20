import React, { useEffect, useRef } from 'react';
import { useCamera } from '../common/DualCameraProvider';

/**
 * CameraView - Reusable component for displaying camera streams
 * Can show either main or second camera with optional overlays
 */
const CameraView = ({ 
  camera = 'main', // 'main' or 'second'
  visible = true,
  className = '',
  style = {},
  showOverlay = false,
  overlayContent = null
}) => {
  const { 
    mainVideoRef, 
    secondVideoRef,
    selectedMainCamera,
    selectedSecondCamera
  } = useCamera();
  
  // Get the appropriate source video ref
  const sourceVideoRef = camera === 'main' ? mainVideoRef : secondVideoRef;
  const selectedCamera = camera === 'main' ? selectedMainCamera : selectedSecondCamera;
  
  // Create local video ref for our preview
  const localVideoRef = useRef(null);
  
  // Direct stream access - much simpler approach
  useEffect(() => {
    console.log(`CameraView ${camera}: Attempting to show stream, camera selected:`, selectedCamera);
    
    if (!sourceVideoRef?.current || !localVideoRef.current) {
      console.log(`CameraView ${camera}: Missing video elements`);
      return;
    }
    
    const sourceVideo = sourceVideoRef.current;
    const localVideo = localVideoRef.current;
    
    // Function to copy stream
    const updateLocalVideo = () => {
      if (sourceVideo.srcObject && selectedCamera) {
        console.log(`CameraView ${camera}: Copying stream to preview`);
        localVideo.srcObject = sourceVideo.srcObject;
        localVideo.play().catch(err => {
          console.warn(`CameraView ${camera}: Play failed:`, err);
        });
      } else {
        console.log(`CameraView ${camera}: No stream to copy`);
        localVideo.srcObject = null;
      }
    };
    
    // Initial update
    updateLocalVideo();
    
    // Listen for stream changes on source video
    const handleLoadedMetadata = () => {
      console.log(`CameraView ${camera}: Source video metadata loaded, updating preview`);
      updateLocalVideo();
    };
    
    sourceVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Periodic check for stream changes
    const checkInterval = setInterval(updateLocalVideo, 1000);
    
    return () => {
      sourceVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      clearInterval(checkInterval);
    };
  }, [selectedCamera, sourceVideoRef, camera]);
  
  if (!visible) {
    return null;
  }
  
  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    ...style
  };
  
  return (
    <div className={`camera-view ${className}`} style={{ position: 'relative' }}>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={videoStyle}
        onLoadedMetadata={(e) => {
          console.log(`${camera} camera view loaded:`, {
            width: e.target.videoWidth,
            height: e.target.videoHeight
          });
        }}
        onError={(e) => {
          console.error(`${camera} camera view error:`, e);
        }}
      />
      
      {/* Show placeholder when no camera selected */}
      {!selectedCamera && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00ff00',
          fontSize: '14px',
          border: '2px dashed #333'
        }}>
          Select {camera === 'main' ? 'main' : 'equipment'} camera
        </div>
      )}
      
      {/* Optional overlay content */}
      {showOverlay && (
        <div className="camera-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}>
          {overlayContent || (
            <div>
              {camera === 'main' ? 'Participant Camera' : 'Equipment Camera'}
            </div>
          )}
        </div>
      )}
      
      {/* Camera label for development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '2px 6px',
          fontSize: '12px',
          borderRadius: '3px'
        }}>
          {camera.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default CameraView;