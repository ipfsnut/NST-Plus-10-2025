import React, { useState } from 'react';

/**
 * Tutorial - Reusable tutorial component for different task types
 */
const Tutorial = ({ taskType, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Tutorial content for each task type
  const tutorialContent = {
    'nst': {
      title: 'Number Switching Task (Cognitive Effort)',
      steps: [
        {
          title: 'Task Overview',
          content: (
            <div>
              <p>In this task, you will see sequences of numbers appearing on the screen.</p>
              <p>Your job is to identify whether each number is <strong>odd</strong> or <strong>even</strong>.</p>
              <p>You need to respond as quickly and accurately as possible, while still labeling all of the digits <strong>correctly</strong>.</p>
            </div>
          )
        },
        {
          title: 'Controls',
          content: (
            <div>
              <p>Use these keys to respond:</p>
              <div className="key-instructions">
                <div className="key-pair">
                  <kbd>F</kbd> <span>for ODD numbers (1, 3, 5, 7, 9)</span>
                </div>
                <div className="key-pair">
                  <kbd>J</kbd> <span>for EVEN numbers (2, 4, 6, 8)</span>
                </div>
              </div>
              <p>Place your left index finger on F and right index finger on J.</p>
            </div>
          )
        }
      ]
    },
    'physical-effort': {
      title: 'Physical Effort Task',
      steps: [
        {
          title: 'Task Overview',
          content: (
            <div>
              <p>You will use the handgrip dynamometer to exert physical effort.</p>
              <p>Squeeze the device to move the dial to the specified target dot.</p>
              <p>Your facial expressions will be captured during effort exertion.</p>
            </div>
          )
        },
        {
          title: 'Target Levels',
          content: (
            <div>
              <h3>Target Levels:</h3>
              <div className="effort-levels">
                <div className="effort-level">
                  <strong>Dot 1</strong> - Lowest effort level
                </div>
                <div className="effort-level">
                  <strong>Dot 2</strong> - Low-medium effort level
                </div>
                <div className="effort-level">
                  <strong>Dot 3</strong> - Medium-high effort level
                </div>
                <div className="effort-level">
                  <strong>Dot 4</strong> - Highest effort level
                </div>
              </div>
              <p>We'll start with a practice session, then proceed to the main task.</p>
              <p>You'll be assigned specific target levels based on your demographics.</p>
            </div>
          )
        }
      ]
    }
  };

  const currentTutorial = tutorialContent[taskType];
  
  if (!currentTutorial) {
    return (
      <div className="tutorial-error">
        <h2>Tutorial not found for task: {taskType}</h2>
        <button onClick={onComplete}>Skip Tutorial</button>
      </div>
    );
  }

  const currentStepData = currentTutorial.steps[currentStep];
  const isLastStep = currentStep === currentTutorial.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="tutorial-container">
      <div className="tutorial-header">
        <h1 className="tutorial-title">{currentTutorial.title}</h1>
        <div className="tutorial-progress">
          Step {currentStep + 1} of {currentTutorial.steps.length}
        </div>
      </div>
      
      <div className="tutorial-content">
        <div className="tutorial-step">
          <h2 className="step-title">{currentStepData.title}</h2>
          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>
      </div>
      
      <div className="tutorial-navigation">
        <button 
          className="nav-button prev-button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </button>
        
        <div className="step-indicators">
          {currentTutorial.steps.map((_, index) => (
            <div
              key={index}
              className={`step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
        
        <button 
          className="nav-button next-button"
          onClick={handleNext}
        >
          {isLastStep ? 'Start Task' : 'Next'}
        </button>
      </div>
      
      {/* Practice/Skip options for last step */}
      {isLastStep && (
        <div className="tutorial-actions">
          
        </div>
      )}
    </div>
  );
};

export default Tutorial;