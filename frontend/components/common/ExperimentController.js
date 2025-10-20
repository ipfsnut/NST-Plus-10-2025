import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ParticipantRegistration from './ParticipantRegistration';
import NeutralCapture from '../neutral/NeutralCapture';
import NSTTask from '../nst/NSTTask';
import PhysicalEffortTask from '../physical-effort/PhysicalEffortTask';
import Tutorial from './Tutorial';
import { DualCameraProvider } from './DualCameraProvider';
import GlobalCameraSettings from './GlobalCameraSettings';

/**
 * ExperimentController - Main orchestrator for the NST Plus experiment
 * Manages the complete flow: Registration → Neutral → Tasks (randomized order) → Export
 */
const ExperimentController = () => {
  const dispatch = useDispatch();
  const participant = useSelector(state => state.experiment?.participant);
  
  const [currentPhase, setCurrentPhase] = useState('registration');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [experimentData, setExperimentData] = useState({});

  // Experiment phases in order
  const phases = [
    'registration',      // Collect demographics
    'neutral-capture',   // Capture baseline facial expression
    'tutorial',          // Tutorial for first task
    'task',              // Execute current task
    'inter-task',        // Break between tasks (if applicable)
    'tutorial-2',        // Tutorial for second task (if applicable)
    'task-2',            // Execute second task (if applicable)
    'completion'         // Export and finish
  ];

  /**
   * Handle participant registration completion
   */
  const handleRegistrationComplete = (participantData) => {
    console.log('Participant registered:', participantData);
    
    // Store participant data
    setExperimentData(prev => ({
      ...prev,
      participant: participantData,
      startTime: new Date().toISOString(),
      taskOrder: participantData.taskOrder
    }));
    
    // Move to neutral capture
    setCurrentPhase('neutral-capture');
  };

  /**
   * Handle neutral capture completion
   */
  const handleNeutralCaptureComplete = (neutralData) => {
    console.log('Neutral capture completed:', neutralData);
    
    setExperimentData(prev => ({
      ...prev,
      neutralCapture: neutralData,
      neutralCaptureTime: new Date().toISOString()
    }));
    
    // Move to tutorial for first task
    setCurrentPhase('tutorial');
  };

  /**
   * Handle tutorial completion
   */
  const handleTutorialComplete = () => {
    console.log('Tutorial completed for task:', getCurrentTask());
    setCurrentPhase('task');
  };

  /**
   * Handle task completion
   */
  const handleTaskComplete = (taskData) => {
    const currentTask = getCurrentTask();
    console.log(`${currentTask} task completed:`, taskData);
    
    // Store task data
    setExperimentData(prev => ({
      ...prev,
      [currentTask]: taskData,
      [`${currentTask}CompletionTime`]: new Date().toISOString()
    }));
    
    // Mark task as completed
    setCompletedTasks(prev => [...prev, currentTask]);
    
    // Determine next phase
    if (currentTaskIndex < (participant?.taskOrder?.length || 0) - 1) {
      // More tasks to complete
      setCurrentTaskIndex(prev => prev + 1);
      setCurrentPhase('inter-task');
    } else {
      // All tasks completed
      setCurrentPhase('completion');
    }
  };

  /**
   * Handle inter-task break completion
   */
  const handleInterTaskComplete = () => {
    console.log('Inter-task break completed');
    setCurrentPhase('tutorial-2');
  };

  /**
   * Handle second tutorial completion
   */
  const handleSecondTutorialComplete = () => {
    console.log('Second tutorial completed');
    setCurrentPhase('task-2');
  };

  /**
   * Handle second task completion
   */
  const handleSecondTaskComplete = (taskData) => {
    const currentTask = getCurrentTask();
    console.log(`${currentTask} (second) task completed:`, taskData);
    
    setExperimentData(prev => ({
      ...prev,
      [currentTask]: taskData,
      [`${currentTask}CompletionTime`]: new Date().toISOString()
    }));
    
    setCompletedTasks(prev => [...prev, currentTask]);
    setCurrentPhase('completion');
  };

  /**
   * Get the current task based on task order and index
   */
  const getCurrentTask = () => {
    if (!participant?.taskOrder || currentTaskIndex >= participant.taskOrder.length) {
      return null;
    }
    return participant.taskOrder[currentTaskIndex];
  };

  /**
   * Export experiment data
   */
  const handleExportData = async () => {
    try {
      const finalData = {
        ...experimentData,
        completionTime: new Date().toISOString(),
        totalDuration: new Date() - new Date(experimentData.startTime),
        completedTasks
      };
      
      const response = await fetch('/api/experiments/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantId: participant.participantId,
          data: finalData
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Download the exported data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${participant.participantId}-experiment-data.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Experiment data exported successfully');
      
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Render current phase
  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'registration':
        return <ParticipantRegistration onComplete={handleRegistrationComplete} />;
        
      case 'neutral-capture':
        return (
          <NeutralCapture 
            participantId={participant?.participantId}
            onComplete={handleNeutralCaptureComplete} 
          />
        );
        
      case 'tutorial':
        return (
          <Tutorial 
            taskType={getCurrentTask()}
            onComplete={handleTutorialComplete}
          />
        );
        
      case 'task':
        return renderTask(getCurrentTask(), handleTaskComplete);
        
      case 'inter-task':
        return (
          <div className="inter-task-break">
            <h2>Task 1 Complete!</h2>
            <p>Take a short break. Click continue when ready for the next task.</p>
            <button 
              className="continue-button"
              onClick={handleInterTaskComplete}
            >
              Continue to Next Task
            </button>
          </div>
        );
        
      case 'tutorial-2':
        return (
          <Tutorial 
            taskType={getCurrentTask()}
            onComplete={handleSecondTutorialComplete}
          />
        );
        
      case 'task-2':
        return renderTask(getCurrentTask(), handleSecondTaskComplete);
        
      case 'completion':
        return (
          <div className="experiment-completion">
            <h2>Experiment Complete!</h2>
            <p>Thank you for participating. Your data has been collected successfully.</p>
            <button 
              className="export-button"
              onClick={handleExportData}
            >
              Download Data
            </button>
          </div>
        );
        
      default:
        return <div>Unknown phase: {currentPhase}</div>;
    }
  };

  /**
   * Render the appropriate task component
   */
  const renderTask = (taskType, onComplete) => {
    if (!taskType) return <div>No task specified</div>;
    
    switch (taskType) {
      case 'nst':
        return (
          <NSTTask 
            participantId={participant?.participantId}
            onComplete={onComplete}
          />
        );
        
      case 'physical-effort':
        return (
          <PhysicalEffortTask 
            participantId={participant?.participantId}
            participantGender={participant?.gender}
            onComplete={onComplete}
          />
        );
        
      default:
        return <div>Unknown task type: {taskType}</div>;
    }
  };

  // Hide UI elements during active tasks
  const isActiveTask = currentPhase === 'task' || currentPhase === 'task-2';
  const currentTask = getCurrentTask();
  const isNSTOrPhysicalEffort = currentTask === 'nst' || currentTask === 'physical-effort';
  const shouldHideUI = isActiveTask && isNSTOrPhysicalEffort;

  return (
    <DualCameraProvider>
      <div className="experiment-container">
        {/* Global Camera Settings - hidden during active NST/Physical Effort tasks */}
        <GlobalCameraSettings hideButton={shouldHideUI} />
        
        {/* Progress indicator - hidden during active NST/Physical Effort tasks */}
        {participant && !shouldHideUI && (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${((phases.indexOf(currentPhase) + 1) / phases.length) * 100}%` 
                }}
              />
            </div>
            <div className="progress-text">
              Phase {phases.indexOf(currentPhase) + 1} of {phases.length}
            </div>
          </div>
        )}
        
        {/* Current phase content */}
        <div className="phase-content">
          {renderCurrentPhase()}
        </div>
        
      </div>
    </DualCameraProvider>
  );
};

export default ExperimentController;