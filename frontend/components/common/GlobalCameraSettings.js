import React, { useState } from 'react';
import { useCamera } from './DualCameraProvider';
import CameraView from '../shared/CameraView';

/**
 * GlobalCameraSettings - Floating camera configuration accessible from anywhere
 */
const GlobalCameraSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    cameras, 
    camerasInitialized,
    selectedMainCamera, 
    selectedSecondCamera,
    setSelectedMainCamera,
    setSelectedSecondCamera 
  } = useCamera();

  if (!isOpen) {
    return (
      <button
        className="global-camera-button"
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#00ff00',
          color: '#000',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '18px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
        }}
        title="Camera Settings"
      >
        📹
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '2px solid #00ff00',
        borderRadius: '10px',
        padding: '30px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h2 style={{ color: '#00ff00', margin: 0 }}>Camera Configuration</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              color: '#00ff00',
              border: '1px solid #00ff00',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera Status */}
        <div style={{ marginBottom: '20px', color: '#00ff00' }}>
          <p>Cameras detected: {cameras.length}</p>
          {!camerasInitialized && <p>Initializing cameras...</p>}
        </div>

        {/* Camera Configuration Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '30px' 
        }}>
          {/* Main Camera */}
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '10px' }}>
              Main Camera (Participant Face)
            </h3>
            
            <select
              value={selectedMainCamera}
              onChange={(e) => setSelectedMainCamera(e.target.value)}
              disabled={!camerasInitialized}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                background: '#333',
                color: '#00ff00',
                border: '1px solid #00ff00',
                borderRadius: '5px'
              }}
            >
              <option value="">
                {camerasInitialized ? 'Select Main Camera' : 'Loading...'}
              </option>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
            
            <div style={{
              border: '2px solid #333',
              borderRadius: '5px',
              height: '240px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CameraView camera="main" visible={true} />
            </div>
            
            <p style={{ 
              color: selectedMainCamera ? '#00ff00' : '#ff6600', 
              fontSize: '14px',
              margin: '10px 0 0 0'
            }}>
              Status: {selectedMainCamera ? '✓ Connected' : '⚠ Not Selected'}
            </p>
          </div>

          {/* Second Camera */}
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '10px' }}>
              Equipment Camera (Dynamometer)
            </h3>
            
            <select
              value={selectedSecondCamera}
              onChange={(e) => setSelectedSecondCamera(e.target.value)}
              disabled={!camerasInitialized}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                background: '#333',
                color: '#00ff00',
                border: '1px solid #00ff00',
                borderRadius: '5px'
              }}
            >
              <option value="">
                {camerasInitialized ? 'Select Equipment Camera (Optional)' : 'Loading...'}
              </option>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
            
            <div style={{
              border: '2px solid #333',
              borderRadius: '5px',
              height: '240px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CameraView camera="second" visible={true} />
            </div>
            
            <p style={{ 
              color: selectedSecondCamera ? '#00ff00' : '#666', 
              fontSize: '14px',
              margin: '10px 0 0 0'
            }}>
              Status: {selectedSecondCamera ? '✓ Connected' : 'Optional'}
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: '#333', 
          borderRadius: '5px',
          color: '#00ff00',
          fontSize: '12px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Debug Info:</h4>
          <p>Cameras initialized: {camerasInitialized.toString()}</p>
          <p>Main camera selected: {selectedMainCamera || 'None'}</p>
          <p>Second camera selected: {selectedSecondCamera || 'None'}</p>
          <p>Available cameras:</p>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {cameras.map((camera, index) => (
              <li key={camera.deviceId}>
                Camera {index + 1}: {camera.label || camera.deviceId}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          justifyContent: 'space-between' 
        }}>
          <button
            onClick={() => {
              setSelectedMainCamera('');
              setSelectedSecondCamera('');
            }}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#00ff00',
              border: '1px solid #00ff00',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reset Cameras
          </button>
          
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '10px 20px',
              background: '#00ff00',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalCameraSettings;