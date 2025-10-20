import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTrialState } from '../redux/experimentSlice';
import { checkCameraAvailability } from './CameraCapture';

const StartScreen = () => {
  const dispatch = useDispatch();
  const deviceStatus = useSelector(state => state.capture.deviceStatus);
  const keyMapping = useSelector(state => state.experiment.keyMapping);

  useEffect(() => {
    checkCameraAvailability(dispatch);
  }, [dispatch]);

  const handleKeyPress = (event) => {
    if (event.key === 'f' || event.key === 'j') {
      dispatch(updateTrialState({
        phase: 'initializing',
        transitionType: 'user-start'
      }));
    }
  };

  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // Display instructions based on key mapping (if already loaded) or default instructions
  const getInstructions = () => {
    if (keyMapping) {
      return (
        <>
          <p>Press '{keyMapping.odd}' for odd numbers</p>
          <p>Press '{keyMapping.even}' for even numbers</p>
        </>
      );
    } else {
      // Show generic instructions before experiment starts
      return (
        <>
          <p>You will be shown numbers one at a time</p>
          <p>Press the correct key based on whether the number is odd or even</p>
          <p>Instructions will be shown after you start</p>
        </>
      );
    }
  };

  const captureError = useSelector(state => state.capture.error);

  return (
    <div className="start-screen">
      <h1>Number Switching Task</h1>
      {getInstructions()}
      
      {/* Camera Status Display */}
      <div className="matrix-status-container matrix-mt-lg">
        {deviceStatus === 'ready' ? (
          <div className="matrix-status matrix-status-ready">
            <span className="matrix-status-dot"></span>
            Camera Ready
          </div>
        ) : (
          <div className="matrix-status matrix-status-warning">
            <span className="matrix-status-dot"></span>
            No Camera Mode
          </div>
        )}
        
        {captureError && (
          <div className="matrix-text-sm matrix-text-yellow matrix-mt-sm matrix-text-center">
            {captureError}
          </div>
        )}
      </div>
      
      <div className="start-instruction matrix-mt-lg">
        <div className="matrix-text-lg matrix-text-bright">Press 'f' or 'j' to begin</div>
        <div className="matrix-text-sm matrix-text-dim matrix-mt-sm">
          {deviceStatus === 'ready' 
            ? 'Experiment will capture images during trials' 
            : 'Experiment will run without video capture'}
        </div>
      </div>
    </div>
  );
};

export default StartScreen;