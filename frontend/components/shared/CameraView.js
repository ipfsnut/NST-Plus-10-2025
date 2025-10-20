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
    mainStreamRef, 
    secondStreamRef,
    selectedMainCamera,
    selectedSecondCamera
  } = useCamera();
  
  // Get the appropriate refs based on camera prop
  const sourceVideoRef = camera === 'main' ? mainVideoRef : secondVideoRef;
  const streamRef = camera === 'main' ? mainStreamRef : secondStreamRef;
  const selectedCamera = camera === 'main' ? selectedMainCamera : selectedSecondCamera;
  
  const localVideoRef = useRef(null);
  
  // Clone the stream from the source video to our local video element
  useEffect(() => {
    console.log(`CameraView ${camera} effect triggered:`, {
      hasLocalRef: !!localVideoRef.current,
      hasSourceRef: !!sourceVideoRef?.current,
      selectedCamera,
      hasStream: !!streamRef?.current
    });
    
    if (!localVideoRef.current || !sourceVideoRef?.current) {
      console.log(`CameraView ${camera}: Missing refs`);
      return;
    }
    
    const sourceVideo = sourceVideoRef.current;
    const localVideo = localVideoRef.current;
    
    // Copy the stream if available
    if (sourceVideo.srcObject && selectedCamera) {
      console.log(`CameraView ${camera}: Setting stream from source`);
      localVideo.srcObject = sourceVideo.srcObject;
      localVideo.play().catch(err => {
        console.warn(`Failed to play ${camera} video:`, err);
      });
    } else {
      console.log(`CameraView ${camera}: No stream or camera selected`);
      localVideo.srcObject = null;
    }
  }, [selectedCamera, streamRef?.current, sourceVideoRef]);
  
  // Monitor for stream changes
  useEffect(() => {
    if (!sourceVideoRef?.current || !localVideoRef.current) return;
    
    const checkForUpdates = () => {
      const sourceVideo = sourceVideoRef.current;
      const localVideo = localVideoRef.current;
      
      if (sourceVideo?.srcObject && selectedCamera) {
        if (localVideo.srcObject !== sourceVideo.srcObject) {
          localVideo.srcObject = sourceVideo.srcObject;
          localVideo.play().catch(err => {
            console.warn(`Failed to update ${camera} video:`, err);
          });
        }
      }
    };
    
    const interval = setInterval(checkForUpdates, 500);
    return () => clearInterval(interval);
  }, [selectedCamera, camera, sourceVideoRef]);
  
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