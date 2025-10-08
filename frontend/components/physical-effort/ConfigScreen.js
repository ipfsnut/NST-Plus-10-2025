import React from 'react';
import { useCamera } from '../common/DualCameraProvider';
import CameraView from '../shared/CameraView';

/**
 * ConfigScreen - Camera configuration interface for physical effort task
 * Adapted from face-capture ConfigScreen with integration improvements
 */
const ConfigScreen = ({ onClose }) => {
  const { 
    cameras, 
    camerasInitialized,
    selectedMainCamera, 
    selectedSecondCamera,
    setSelectedMainCamera,
    setSelectedSecondCamera 
  } = useCamera();
  
  const getParticipantCounter = () => {
    const lastNumber = parseInt(localStorage.getItem('nstplus_last_participant') || '0');
    return lastNumber + 1;
  };
  
  const nextParticipantNumber = getParticipantCounter();
  
  return (
    <div className="config-screen-overlay">
      <div className="config-screen-container">
        {/* Header */}
        <div className="config-header">
          <h1 className="config-title">Camera Configuration</h1>
          <button
            className="config-close-button"
            onClick={onClose}
            aria-label="Close configuration"
          >
            ✕
          </button>
        </div>

        {/* Camera Configuration Grid */}
        <div className="config-grid">
          {/* Main Camera Section */}
          <div className="camera-config-section">
            <h2 className="camera-section-title">Main Camera (Participant Face)</h2>
            
            <select
              className="camera-select"
              value={selectedMainCamera}
              onChange={(e) => setSelectedMainCamera(e.target.value)}
              disabled={!camerasInitialized}
            >
              <option value="">
                {camerasInitialized ? 'Select Camera' : 'Loading cameras...'}
              </option>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1} (${camera.deviceId.slice(0, 8)}...)`}
                </option>
              ))}
            </select>
            
            <div className="camera-preview-container">
              <CameraView 
                camera="main" 
                visible={true}
                className="camera-preview"
              />
              <div className="camera-overlay">
                <div className="camera-status">
                  {selectedMainCamera ? '✓ Connected' : '⚠ Not Selected'}
                </div>
              </div>
            </div>
          </div>

          {/* Second Camera Section */}
          <div className="camera-config-section">
            <h2 className="camera-section-title">Equipment Camera (Dynamometer View)</h2>
            
            <select
              className="camera-select"
              value={selectedSecondCamera}
              onChange={(e) => setSelectedSecondCamera(e.target.value)}
              disabled={!camerasInitialized}
            >
              <option value="">
                {camerasInitialized ? 'Select Camera (Optional)' : 'Loading cameras...'}
              </option>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1} (${camera.deviceId.slice(0, 8)}...)`}
                </option>
              ))}
            </select>
            
            <div className="camera-preview-container">
              <CameraView 
                camera="second" 
                visible={true}
                className="camera-preview"
              />
              <div className="camera-overlay">
                <div className="camera-status">
                  {selectedSecondCamera ? '✓ Connected' : '⚠ Not Selected'}
                </div>
              </div>
            </div>
            
            <div className="camera-note">
              <p><strong>Note:</strong> This camera should show the handgrip dynamometer and dial.</p>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="config-status">
          <h3 className="status-title">System Status</h3>
          
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Main Camera:</span>
              <span className={`status-value ${selectedMainCamera ? 'connected' : 'disconnected'}`}>
                {selectedMainCamera ? 'Connected' : 'Not Selected'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Equipment Camera:</span>
              <span className={`status-value ${selectedSecondCamera ? 'connected' : 'optional'}`}>
                {selectedSecondCamera ? 'Connected' : 'Optional'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Cameras Detected:</span>
              <span className="status-value">{cameras.length}</span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Next Participant ID:</span>
              <span className="status-value">#{nextParticipantNumber}</span>
            </div>
          </div>
          
          {/* Requirements Check */}
          <div className="requirements-check">
            <h4>Requirements:</h4>
            <div className="requirement-item">
              <span className={`requirement-status ${selectedMainCamera ? 'met' : 'unmet'}`}>
                {selectedMainCamera ? '✓' : '✗'}
              </span>
              <span>Main camera selected (required)</span>
            </div>
            <div className="requirement-item">
              <span className="requirement-status met">✓</span>
              <span>Equipment camera optional but recommended</span>
            </div>
          </div>
          
          {/* Camera Tips */}
          <div className="camera-tips">
            <h4>Camera Setup Tips:</h4>
            <ul>
              <li><strong>Main Camera:</strong> Position to capture participant's face clearly</li>
              <li><strong>Equipment Camera:</strong> Position to show the dynamometer dial</li>
              <li><strong>Lighting:</strong> Ensure adequate lighting for both cameras</li>
              <li><strong>Stability:</strong> Make sure cameras are mounted securely</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="config-actions">
          <button
            className="config-button secondary"
            onClick={() => {
              // Reset camera selections
              setSelectedMainCamera('');
              setSelectedSecondCamera('');
            }}
          >
            Reset Cameras
          </button>
          
          <button
            className="config-button primary"
            onClick={onClose}
            disabled={!selectedMainCamera}
          >
            {selectedMainCamera ? 'Apply Settings' : 'Select Main Camera First'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigScreen;