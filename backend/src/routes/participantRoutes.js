const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const Participant = require('../models/Participant');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/participants/register
 * Register a new participant and create their directory structure
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { gender, age } = req.body;
  
  // Validate input
  if (!gender || !age) {
    throw new AppError('Gender and age are required', 400);
  }
  
  if (!['M', 'F', 'O'].includes(gender)) {
    throw new AppError('Invalid gender. Must be M, F, or O', 400);
  }
  
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
    throw new AppError('Age must be between 18 and 100', 400);
  }
  
  try {
    // Get next participant number
    const participantNumber = await Participant.getNextParticipantNumber();
    
    // Generate participant ID
    const participantId = Participant.generateParticipantId(gender, ageNum, participantNumber);
    
    // Create task order (randomized)
    const taskOrder = Math.random() < 0.5 
      ? ['physical-effort', 'nst'] 
      : ['nst', 'physical-effort'];
    
    // Create participant record
    const participant = new Participant({
      participantId,
      participantNumber,
      gender,
      age: ageNum,
      taskOrder,
      dataDirectory: `data/${participantId}`,
      metadata: {
        browserInfo: req.headers['user-agent'],
        sessionId: req.sessionID
      }
    });
    
    await participant.save();
    
    // Create directory structure
    await createParticipantDirectories(participantId);
    
    logger.info(`Participant registered: ${participantId}`, {
      participantId,
      gender,
      age: ageNum,
      taskOrder
    });
    
    res.status(201).json({
      success: true,
      participant: {
        participantId: participant.participantId,
        participantNumber: participant.participantNumber,
        gender: participant.gender,
        age: participant.age,
        taskOrder: participant.taskOrder,
        registrationTime: participant.registrationTime,
        dataDirectory: participant.dataDirectory
      }
    });
    
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Participant ID already exists', 409);
    }
    throw error;
  }
}));

/**
 * POST /api/neutral-capture
 * Save neutral capture photos and metadata
 */
router.post('/neutral-capture', 
  upload.fields([
    { name: 'mainPhoto', maxCount: 1 },
    { name: 'equipmentPhoto', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const { participantId, timestamp } = req.body;
    
    if (!participantId) {
      throw new AppError('Participant ID is required', 400);
    }
    
    // Find participant
    const participant = await Participant.findOne({ participantId });
    if (!participant) {
      throw new AppError('Participant not found', 404);
    }
    
    const captureData = {
      timestamp: timestamp || new Date().toISOString(),
      files: {}
    };
    
    // Save uploaded files
    if (req.files.mainPhoto) {
      const mainPath = await saveFile(
        participantId, 
        'neutral', 
        'neutral-main.jpg', 
        req.files.mainPhoto[0].buffer
      );
      captureData.files.main = mainPath;
    }
    
    if (req.files.equipmentPhoto) {
      const equipmentPath = await saveFile(
        participantId, 
        'neutral', 
        'neutral-equipment.jpg', 
        req.files.equipmentPhoto[0].buffer
      );
      captureData.files.equipment = equipmentPath;
    }
    
    // Update participant record
    await participant.addCompletedTask('neutral-capture', captureData);
    
    logger.info(`Neutral capture saved for ${participantId}`, {
      participantId,
      filesCount: Object.keys(captureData.files).length
    });
    
    res.json({
      success: true,
      captureData,
      participant: {
        participantId: participant.participantId,
        status: participant.status,
        completionPercentage: participant.completionPercentage
      }
    });
  })
);

/**
 * POST /api/nst-capture
 * Save NST task capture photos and metadata
 */
router.post('/nst-capture',
  upload.fields([
    { name: 'mainPhoto', maxCount: 1 },
    { name: 'equipmentPhoto', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const { 
      participantId, 
      trialNumber, 
      digitIndex, 
      digit, 
      response, 
      responseTime,
      timestamp 
    } = req.body;
    
    if (!participantId) {
      throw new AppError('Participant ID is required', 400);
    }
    
    const captureData = {
      trialNumber: parseInt(trialNumber),
      digitIndex: parseInt(digitIndex),
      digit: parseInt(digit),
      response,
      responseTime: parseInt(responseTime),
      timestamp: timestamp || new Date().toISOString(),
      files: {}
    };
    
    // Save uploaded files
    if (req.files.mainPhoto) {
      const mainPath = await saveFile(
        participantId,
        'nst',
        `nst-main-t${trialNumber}-d${digitIndex}.jpg`,
        req.files.mainPhoto[0].buffer
      );
      captureData.files.main = mainPath;
    }
    
    if (req.files.equipmentPhoto) {
      const equipmentPath = await saveFile(
        participantId,
        'nst',
        `nst-equipment-t${trialNumber}-d${digitIndex}.jpg`,
        req.files.equipmentPhoto[0].buffer
      );
      captureData.files.equipment = equipmentPath;
    }
    
    // Save capture metadata
    await saveMetadata(participantId, 'nst', `capture-t${trialNumber}-d${digitIndex}.json`, captureData);
    
    res.json({
      success: true,
      captureData
    });
  })
);

/**
 * POST /api/physical-effort-capture
 * Save physical effort task capture photos and metadata
 */
router.post('/physical-effort-capture',
  upload.fields([
    { name: 'mainPhoto', maxCount: 1 },
    { name: 'equipmentPhoto', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const { participantId, trial, timestamp } = req.body;
    
    if (!participantId) {
      throw new AppError('Participant ID is required', 400);
    }
    
    const trialData = JSON.parse(trial);
    const captureData = {
      trial: trialData,
      timestamp: timestamp || new Date().toISOString(),
      files: {}
    };
    
    // Save uploaded files
    if (req.files.mainPhoto) {
      const mainPath = await saveFile(
        participantId,
        'physical-effort',
        `physical-effort-main-${trialData.trialId}.jpg`,
        req.files.mainPhoto[0].buffer
      );
      captureData.files.main = mainPath;
    }
    
    if (req.files.equipmentPhoto) {
      const equipmentPath = await saveFile(
        participantId,
        'physical-effort',
        `physical-effort-equipment-${trialData.trialId}.jpg`,
        req.files.equipmentPhoto[0].buffer
      );
      captureData.files.equipment = equipmentPath;
    }
    
    // Save capture metadata
    await saveMetadata(participantId, 'physical-effort', `capture-${trialData.trialId}.json`, captureData);
    
    res.json({
      success: true,
      captureData
    });
  })
);

/**
 * POST /api/nst-complete
 * Mark NST task as complete and save final results
 */
router.post('/nst-complete', asyncHandler(async (req, res) => {
  const { participantId, sessionData, completionTime } = req.body;
  
  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }
  
  const participant = await Participant.findOne({ participantId });
  if (!participant) {
    throw new AppError('Participant not found', 404);
  }
  
  // Save session results
  await saveMetadata(participantId, 'nst', 'session-results.json', {
    sessionData,
    completionTime,
    taskType: 'nst'
  });
  
  // Mark task as completed
  await participant.addCompletedTask('nst', {
    completionTime,
    trialsCompleted: sessionData?.totalTrials || 0
  });
  
  logger.info(`NST task completed for ${participantId}`);
  
  res.json({
    success: true,
    participant: {
      participantId: participant.participantId,
      status: participant.status,
      completionPercentage: participant.completionPercentage
    }
  });
}));

/**
 * POST /api/physical-effort-complete
 * Mark physical effort task as complete
 */
router.post('/physical-effort-complete', asyncHandler(async (req, res) => {
  const { participantId, totalTrials, capturedImages, completionTime } = req.body;
  
  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }
  
  const participant = await Participant.findOne({ participantId });
  if (!participant) {
    throw new AppError('Participant not found', 404);
  }
  
  // Save completion metadata
  await saveMetadata(participantId, 'physical-effort', 'task-completion.json', {
    totalTrials,
    capturedImages,
    completionTime,
    taskType: 'physical-effort'
  });
  
  // Mark task as completed
  await participant.addCompletedTask('physical-effort', {
    completionTime,
    totalTrials,
    capturedImages
  });
  
  logger.info(`Physical effort task completed for ${participantId}`);
  
  res.json({
    success: true,
    participant: {
      participantId: participant.participantId,
      status: participant.status,
      completionPercentage: participant.completionPercentage
    }
  });
}));

/**
 * Helper function to create participant directory structure
 */
async function createParticipantDirectories(participantId) {
  const baseDir = path.join(process.cwd(), 'data', participantId);
  
  const directories = [
    baseDir,
    path.join(baseDir, 'neutral'),
    path.join(baseDir, 'nst'),
    path.join(baseDir, 'physical-effort'),
    path.join(baseDir, 'metadata')
  ];
  
  for (const dir of directories) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Create participant info file
  await fs.writeFile(
    path.join(baseDir, 'participant-info.json'),
    JSON.stringify({
      participantId,
      createdAt: new Date().toISOString(),
      directoryStructure: directories.map(d => path.relative(baseDir, d))
    }, null, 2)
  );
}

/**
 * Helper function to save files
 */
async function saveFile(participantId, taskType, filename, buffer) {
  const filePath = path.join(process.cwd(), 'data', participantId, taskType, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Helper function to save metadata
 */
async function saveMetadata(participantId, taskType, filename, data) {
  const filePath = path.join(process.cwd(), 'data', participantId, 'metadata', filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

module.exports = router;