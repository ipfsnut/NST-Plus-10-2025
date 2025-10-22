import React, { useState } from 'react';

/**
 * DevPanel - Development panel for jumping between screens
 * Only appears in development mode
 */
const DevPanel = ({ onScreenChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const screens = [
    { id: 'registration', label: 'Registration' },
    { id: 'neutral-instructions', label: 'Neutral Instructions' },
    { id: 'neutral-capture', label: 'Neutral Capture' },
    { id: 'nst-instructions', label: 'Cognitive Effort Instructions' },
    { id: 'nst-practice', label: 'Cognitive Effort Practice' },
    { id: 'nst-running', label: 'Cognitive Effort Running' },
    { id: 'physical-instructions', label: 'Physical Effort Instructions' },
    { id: 'physical-practice', label: 'Physical Effort Practice' },
    { id: 'physical-experiment', label: 'Physical Effort Experiment' },
    { id: 'camera-config', label: 'Camera Config' }
  ];

  const handleScreenSelect = (screenId) => {
    onScreenChange(screenId);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '80px', // Position next to camera button
          background: '#ff6600',
          color: '#000',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '18px',
          cursor: 'pointer',
          zIndex: 9998,
          boxShadow: '0 0 10px rgba(255, 102, 0, 0.5)'
        }}
        title="Dev Panel - Jump to Screen"
      >
        🔧
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #ff6600',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 9998,
      minWidth: '250px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          color: '#ff6600', 
          margin: 0, 
          fontSize: '16px',
          fontFamily: 'monospace'
        }}>
          DEV PANEL
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            color: '#ff6600',
            border: '1px solid #ff6600',
            borderRadius: '50%',
            width: '25px',
            height: '25px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        display: 'grid',
        gap: '8px'
      }}>
        {screens.map(screen => (
          <button
            key={screen.id}
            onClick={() => handleScreenSelect(screen.id)}
            style={{
              background: 'transparent',
              color: '#ff6600',
              border: '1px solid #ff6600',
              borderRadius: '5px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff6600';
              e.target.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#ff6600';
            }}
          >
            {screen.label}
          </button>
        ))}
      </div>

      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(255, 102, 0, 0.1)',
        borderRadius: '5px',
        fontSize: '11px',
        color: '#ff6600',
        fontFamily: 'monospace'
      }}>
        ⚠️ Development mode only<br/>
        Jump to any screen instantly
      </div>
    </div>
  );
};

export default DevPanel;