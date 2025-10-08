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
  const { mainStreamRef, secondStreamRef } = useCamera();
  const videoRef = useRef(null);
  
  // Get the appropriate stream based on camera prop
  const streamRef = camera === 'main' ? mainStreamRef : secondStreamRef;
  
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [streamRef.current]);
  
  // Update stream when it changes
  useEffect(() => {
    const updateStream = () => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => {
          console.warn('Failed to play video:', err);
        });
      }
    };
    
    // Initial setup
    updateStream();
    
    // Listen for stream changes (this is a simple approach)
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        updateStream();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [streamRef]);
  
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
        ref={videoRef}
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