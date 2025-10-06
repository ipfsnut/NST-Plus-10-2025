const formatJSON = (results) => {
  const formattedResults = {
    metadata: {
      experimentId: results.sessionMetrics.experimentId,
      startTime: results.sessionMetrics.startTime,
      endTime: results.sessionMetrics.lastActivity,
      totalTrials: results.sessionMetrics.totalTrials,
      completedTrials: results.sessionMetrics.trialsCompleted
    },
    performance: {
      accuracyRate: results.performanceMetrics.accuracyRate,
      averageResponseTime: results.performanceMetrics.averageResponseTime,
      completionRate: results.performanceMetrics.completionRate
    },
    trials: results.trialDetails.map(trial => ({
      trialNumber: trial.trialNumber,
      sequence: trial.sequence,
      effortLevel: trial.effortLevel,
      responses: trial.response,
      timing: trial.timing,
      captures: results.captureData.filter(c => c.trialNumber === trial.trialNumber)
    }))
  };

  return JSON.stringify(formattedResults, null, 2);
};

const convertToCSV = (trialData) => {
  const headers = [
    'trialNumber',
    'effortLevel',
    'position',
    'digit',
    'responseKey',
    'responseType',
    'responseStyle',
    'isCorrect',
    'responseTime',
    'sequence'
  ];

  const rows = trialData.flatMap(trial => 
    trial.responses.map(response => ({
      trialNumber: trial.trialNumber,
      effortLevel: trial.effortLevel,
      position: response.position,
      digit: response.digit,
      responseKey: response.response || '',
      responseType: response.responseType || '',
      responseStyle: response.responseStyle || '',
      isCorrect: response.isCorrect,
      responseTime: response.timestamp,
      sequence: trial.sequence
    }))
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(header => row[header] ?? '').join(','))
  ].join('\n');

  return csvContent;
};

module.exports = {
  formatJSON,
  convertToCSV
};
