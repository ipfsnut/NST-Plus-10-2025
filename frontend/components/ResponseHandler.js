import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { queueResponse, setDisplayBlank } from '../redux/experimentSlice';
import { withResponseErrorHandling } from './ResponseErrorBoundary';

const ResponseHandler = ({ experimentId }) => {
  const dispatch = useDispatch();
  const { phase, currentDigit, digitIndex, trialNumber } = useSelector(
    state => state.experiment.trialState
  );
  const keyMapping = useSelector(state => state.experiment.keyMapping);
  
  const handleKeyPress = (event) => {
    // Only respond to f and j keys in running phase
    if ((event.key !== 'f' && event.key !== 'j') || phase !== 'running') return;
    
    // 1. Immediately blank the display
    dispatch(setDisplayBlank(true));
    
    // Prepare the response data using dynamic key mapping
    const isOdd = currentDigit % 2 === 1;
    const responseType = event.key === keyMapping?.odd ? 'odd' : 'even';
    const isCorrect = (responseType === 'odd' && isOdd) || (responseType === 'even' && !isOdd);
    
    const responseData = {
      experimentId,
      response: event.key,
      responseType,
      digit: currentDigit,
      isCorrect,
      timestamp: Date.now(),
      position: digitIndex,
      trialNumber,
      responseStyle: keyMapping?.responseStyle // Tag the response style
    };
    
    // 2. Queue response after delay to allow blank screen display
    setTimeout(() => {
      // Send the response
      dispatch(queueResponse(responseData));
      
      // 3. Show the next digit after a small additional delay to ensure state is updated
      setTimeout(() => {
        dispatch(setDisplayBlank(false));
      }, 50);
    }, 500);
  };

  React.useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [currentDigit, experimentId, phase, digitIndex, trialNumber]);

  // This component doesn't render anything
  return null;
};

export default withResponseErrorHandling(ResponseHandler);