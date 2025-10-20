import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import '../styles/TargetDisplay.css';

const DigitDisplay = memo(() => {
  const { currentDigit, phase } = useSelector(state => state.experiment.trialState);
  const { isCapturing } = useSelector(state => state.capture);
  const displayBlank = useSelector(state => state.experiment.displayBlank);
  const keyMapping = useSelector(state => state.experiment.keyMapping);

  console.log('Rendering digit display:', {
    currentDigit,
    phase,
    displayBlank,
    timestamp: Date.now()
  });

  // Generate instruction text based on key mapping
  const getInstructionText = () => {
    if (keyMapping) {
      return `Press '${keyMapping.odd}' for odd, '${keyMapping.even}' for even`;
    }
    return "Press 'f' for odd, 'j' for even"; // Fallback (shouldn't happen after experiment starts)
  };

  return (
    <div className="target-container">
      {!displayBlank ? (
        <>
          <div className="target-display">
            <div className="target-element">{currentDigit}</div>
          </div>
          
          <div className="target-instructions">{getInstructionText()}</div>
          
          {phase === 'awaiting-response' && (
            <div className="target-status">Awaiting Response...</div>
          )}
        </>
      ) : (
        // Empty div when display is blank - maintains spacing but shows nothing
        <div></div>
      )}
    </div>
  );
});

DigitDisplay.displayName = 'DigitDisplay';

export default DigitDisplay;