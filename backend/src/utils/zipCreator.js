const JSZip = require('jszip');
const fs = require('fs').promises;
const path = require('path');

const createAndDownloadZip = async (data) => {
  const zip = new JSZip();
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Ensure temp directory exists
  await fs.mkdir(tempDir, { recursive: true });
  
  const zipFileName = path.join(tempDir, `nst_export_${Date.now()}.zip`);

  // Add data files
  zip.file('data.csv', data['data.csv']);
  zip.file('data.json', data['data.json']);

  // Organize captures by effort level
  if (data.captures && data.captures.length > 0) {
    // Group captures by effort level
    const capturesByEffort = {};
    
    for (const capture of data.captures) {
      const effortLevel = capture.effortLevel || 0;
      if (!capturesByEffort[effortLevel]) {
        capturesByEffort[effortLevel] = [];
      }
      capturesByEffort[effortLevel].push(capture);
    }
    
    // Create directories for each effort level
    for (const [effortLevel, captures] of Object.entries(capturesByEffort)) {
      const effortFolder = zip.folder(`effort_level_${effortLevel}`);
      
      for (const capture of captures) {
        try {
          const imageData = await fs.readFile(capture.filepath);
          const filename = path.basename(capture.filepath);
          effortFolder.file(filename, imageData);
        } catch (error) {
          console.error(`Failed to read capture file: ${capture.filepath}`, error);
        }
      }
    }
  }

  // Generate and save zip file
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(zipFileName, content);

  return zipFileName;
};

module.exports = { createAndDownloadZip };