const mongoose = require('mongoose');

/**
 * Participant model for NST Plus experiment
 * Stores participant demographics and experiment metadata
 */
const participantSchema = new mongoose.Schema({
  // Participant identification
  participantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  participantNumber: {
    type: Number,
    required: true
  },
  
  // Demographics
  gender: {
    type: String,
    required: true,
    enum: ['M', 'F', 'O'], // Male, Female, Other
    index: true
  },
  
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  
  // Experiment configuration
  taskOrder: [{
    type: String,
    enum: ['nst', 'physical-effort']
  }],
  
  // Timestamps
  registrationTime: {
    type: Date,
    default: Date.now
  },
  
  experimentStartTime: {
    type: Date
  },
  
  experimentEndTime: {
    type: Date
  },
  
  // Task completion status
  tasksCompleted: [{
    taskType: {
      type: String,
      enum: ['neutral-capture', 'nst', 'physical-effort']
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['completed', 'partial', 'failed'],
      default: 'completed'
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // File storage paths
  dataDirectory: {
    type: String,
    required: true
  },
  
  // Experiment metadata
  metadata: {
    browserInfo: String,
    screenResolution: String,
    sessionId: String,
    notes: String
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['registered', 'in-progress', 'completed', 'incomplete'],
    default: 'registered'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for experiment duration
participantSchema.virtual('experimentDuration').get(function() {
  if (this.experimentStartTime && this.experimentEndTime) {
    return this.experimentEndTime - this.experimentStartTime;
  }
  return null;
});

// Virtual for completion percentage
participantSchema.virtual('completionPercentage').get(function() {
  const totalTasks = 3; // neutral-capture, nst, physical-effort
  return Math.round((this.tasksCompleted.length / totalTasks) * 100);
});

// Index for efficient queries
participantSchema.index({ status: 1, registrationTime: -1 });
participantSchema.index({ gender: 1, participantNumber: 1 });

// Pre-save middleware to set data directory
participantSchema.pre('save', function(next) {
  if (this.isNew && !this.dataDirectory) {
    this.dataDirectory = `data/${this.participantId}`;
  }
  next();
});

// Instance method to add completed task
participantSchema.methods.addCompletedTask = function(taskType, metadata = {}) {
  this.tasksCompleted.push({
    taskType,
    metadata,
    completedAt: new Date()
  });
  
  // Update overall status
  if (this.tasksCompleted.length >= 3) {
    this.status = 'completed';
    this.experimentEndTime = new Date();
  } else if (this.tasksCompleted.length > 0) {
    this.status = 'in-progress';
    if (!this.experimentStartTime) {
      this.experimentStartTime = new Date();
    }
  }
  
  return this.save();
};

// Static method to get next participant number
participantSchema.statics.getNextParticipantNumber = async function() {
  const lastParticipant = await this.findOne()
    .sort({ participantNumber: -1 })
    .select('participantNumber');
  
  return lastParticipant ? lastParticipant.participantNumber + 1 : 1;
};

// Static method to generate participant ID
participantSchema.statics.generateParticipantId = function(gender, age, participantNumber) {
  return `${gender}-${age}-${participantNumber}`;
};

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;