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
              <p>You need to respond as quickly and accurately as possible.</p>
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
        },
        {
          title: 'What to Expect',
          content: (
            <div>
              <p>Each trial will show a sequence of 15 numbers.</p>
              <p>Numbers will appear one at a time for a brief moment.</p>
              <p>Your camera will capture images during the task for analysis.</p>
              <p>There will be rest periods between trials.</p>
            </div>
          )
        },
        {
          title: 'Tips for Success',
          content: (
            <div>
              <p>• <strong>Stay focused</strong> on the center of the screen</p>
              <p>• <strong>Respond quickly</strong> but label the digits correctly</p>
              <p>• <strong>Keep your hands</strong> positioned on the keyboard</p>
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
              <p>In this task, you will use a handgrip dynamometer to exert physical effort.</p>
              <p>You'll be asked to squeeze the device to move the dial to specific target levels.</p>
            </div>
          )
        },
        {
          title: 'Equipment Setup',
          content: (
            <div>
              <p>The handgrip dynamometer is the device you'll squeeze.</p>
              <p>You'll see target dots (Dot 1, Dot 2, Dot 3, Dot 4) representing different effort levels.</p>
              <div className="effort-levels">
                <p>Each increasing Dot requires a little more force to reach.</p>
              </div>
            </div>
          )
        },
        {
          title: 'How It Works',
          content: (
            <div>
              <p>1. You'll see which target dot to aim for</p>
              <p>2. Squeeze the dynamometer to move the dial to that dot</p>
              <p>3. Hold the pressure at the target level until instructed to rest</p>
              <p>4. Rest between trials</p>
            </div>
          )
        },
        {
          title: 'Important Instructions',
          content: (
            <div>
              <p>• <strong>Look at the target</strong> indicator in the middle of the screen</p>
              <p>• <strong>Squeeze</strong> to reach the target dot</p>
              <p>• <strong>Hold steady</strong> when you reach the target</p>
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
          <p className="ready-message">
            Ready to begin? You can start the task or ask the researcher any questions.
          </p>
        </div>
      )}
    </div>
  );
};

export default Tutorial;