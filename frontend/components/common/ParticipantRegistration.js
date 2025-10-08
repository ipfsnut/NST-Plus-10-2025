import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import '../../styles/experiment.css';

/**
 * ParticipantRegistration - Collects participant demographic information
 * and creates the participant directory structure
 */
const ParticipantRegistration = ({ onComplete }) => {
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    gender: '',
    age: '',
    participantNumber: null
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Get the next participant number from localStorage
   */
  const getNextParticipantNumber = () => {
    const lastNumber = parseInt(localStorage.getItem('nstplus_last_participant') || '0');
    const nextNumber = lastNumber + 1;
    localStorage.setItem('nstplus_last_participant', nextNumber.toString());
    return nextNumber;
  };

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }
    
    const ageNum = parseInt(formData.age);
    if (!formData.age) {
      newErrors.age = 'Please enter your age';
    } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      newErrors.age = 'Please enter a valid age between 18 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get participant number
      const participantNumber = getNextParticipantNumber();
      
      // Create participant data object
      const participantData = {
        gender: formData.gender,
        age: parseInt(formData.age),
        participantNumber,
        participantId: `${formData.gender}-${formData.age}-${participantNumber}`,
        registrationTime: new Date().toISOString(),
        taskOrder: Math.random() < 0.5 ? ['physical-effort', 'nst'] : ['nst', 'physical-effort']
      };
      
      // Send to backend to create directory structure
      const response = await fetch('/api/participants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(participantData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to register participant');
      }
      
      const result = await response.json();
      
      // Store participant info in Redux and localStorage
      dispatch({ 
        type: 'experiment/setParticipant', 
        payload: result.participant 
      });
      
      localStorage.setItem('nstplus_current_participant', JSON.stringify(result.participant));
      
      // Call completion callback with participant data
      onComplete(result.participant);
      
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Failed to register. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <h1 className="registration-title">Welcome to the NST Plus Study</h1>
        
        <p className="registration-instructions">
          This study consists of two tasks measuring cognitive and physical effort.
          Please provide the following information to begin.
        </p>
        
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Gender Selection */}
          <div className="form-group">
            <label className="form-label">Gender</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  checked={formData.gender === 'M'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  disabled={isSubmitting}
                />
                <span className="radio-text">Male</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  checked={formData.gender === 'F'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  disabled={isSubmitting}
                />
                <span className="radio-text">Female</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="O"
                  checked={formData.gender === 'O'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  disabled={isSubmitting}
                />
                <span className="radio-text">Other</span>
              </label>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>
          
          {/* Age Input */}
          <div className="form-group">
            <label htmlFor="age" className="form-label">Age (years)</label>
            <input
              type="number"
              id="age"
              min="18"
              max="100"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="form-input"
              placeholder="Enter your age"
              disabled={isSubmitting}
            />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Begin Experiment'}
          </button>
          
          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}
        </form>
        
        <div className="privacy-notice">
          <p>Your information will be kept confidential and used only for research purposes.</p>
        </div>
      </div>
    </div>
  );
};

export default ParticipantRegistration;