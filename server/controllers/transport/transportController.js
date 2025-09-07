const TransportFile = require('../../models/transportFile/TransportFile');
const { parse } = require('csv-parse/sync');
const { enrichMobilityAreas } = require('../../services/enrichMobilityAreas');
const STATIC_REGIONS = ['Islamabad', 'Lahore', 'Karachi', 'Faisalabad'];

// Render upload page
exports.getUploadPage = async (req, res) => {
  const locals = { pageName: 'Upload Mobility and Transport Data' };

  try {
    res.render('pages/upload/upload', { locals, regions: STATIC_REGIONS, files: null, message: null, selectedRegion: null });
  } catch (error) {
    res.render('pages/upload/upload', { locals, regions: STATIC_REGIONS, files: null, message: 'Error loading page: ' + error.message, selectedRegion: null });
  }
};

// Handle region selection and file display
exports.getFilesByRegion = async (req, res) => {
  const locals = { pageName: 'Upload Mobility and Transport Data' };

  try {
    const { region } = req.query;
    if (!STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        locals,
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Invalid region selected.', 
        selectedRegion: null 
      });
    }

    const files = await TransportFile.find({ region }, 'fileName type _id');
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFiles = files.filter(f => f.type === 'mobility-matrix');
    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFiles }, 
      message: null, 
      selectedRegion: region 
    });
  } catch (error) {
    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: null, 
      message: 'Error fetching files: ' + error.message, 
      selectedRegion: null 
    });
  }
};

// Handle file upload
exports.uploadFiles = async (req, res) => {
  const locals = { pageName: 'Upload Mobility and Transport Data' };

  try {
    const { region } = req.body;
    if (!region || !STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        locals,
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Please select a valid region from the list.', 
        selectedRegion: null 
      });
    }

    if (!req.files || (!req.files.transportFiles && !req.files.mobilityAreaFile && !req.files.mobilityMatrixFiles)) {
      const files = await TransportFile.find({ region }, 'fileName type _id');
      const transportFiles = files.filter(f => f.type === 'transport');
      const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
      const mobilityMatrixFiles = files.filter(f => f.type === 'mobility-matrix');
      return res.render('pages/upload/upload', { 
        locals,
        regions: STATIC_REGIONS, 
        files: { transportFiles, mobilityAreaFile, mobilityMatrixFiles }, 
        message: 'No files uploaded.', 
        selectedRegion: region 
      });
    }


    const transportFiles = req.files.transportFiles ? 
      (Array.isArray(req.files.transportFiles) ? req.files.transportFiles : [req.files.transportFiles]) : [];
    const mobilityAreaFile = req.files.mobilityAreaFile;
    const mobilityMatrixFiles = req.files.mobilityMatrixFiles ? 
      (Array.isArray(req.files.mobilityMatrixFiles) ? req.files.mobilityMatrixFiles : [req.files.mobilityMatrixFiles]) : [];

    // Process transport files (unchanged)
    for (const file of transportFiles) {
      if (file.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type _id');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFilesList = files.filter(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFiles: mobilityMatrixFilesList }, 
          message: `Invalid file type for ${file.name}. Only CSV allowed.`, 
          selectedRegion: region 
        });
      }

      const csvData = parse(file.data.toString('utf8'), { columns: true, skip_empty_lines: true });
      const existingFile = await TransportFile.findOne({ fileName: file.name, type: 'transport', region });
      if (!existingFile) {
        await TransportFile.create({
          fileName: file.name,
          type: 'transport',
          region,
          data: csvData
        });
      }
    }

    // Process mobility area file (unchanged)
    if (mobilityAreaFile) {
      if (mobilityAreaFile.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type _id');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFilesList = files.filter(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFiles: mobilityMatrixFilesList }, 
          message: `Invalid file type for ${mobilityAreaFile.name}. Only CSV allowed.`, 
          selectedRegion: region 
        });
      }

      const csvData = parse(mobilityAreaFile.data.toString('utf8'), { columns: true, skip_empty_lines: true });
      const existingMobilityArea = await TransportFile.findOne({ type: 'mobility-area', region });
      if (existingMobilityArea) {
        existingMobilityArea.fileName = mobilityAreaFile.name;
        existingMobilityArea.data = csvData;
        existingMobilityArea.updatedAt = new Date();
        await existingMobilityArea.save();
      } else {
        await TransportFile.create({
          fileName: mobilityAreaFile.name,
          type: 'mobility-area',
          region,
          data: csvData
        });
      }
      
      // Trigger enrichment process asynchronously after mobility area upload/update
      console.log(`Triggering mobility area enrichment for ${region}`);
      enrichMobilityAreas(region).then(result => {
        console.log(`Mobility area enrichment completed for ${region}:`, result);
      }).catch(error => {
        console.error(`Error in mobility area enrichment for ${region}:`, error.message);
      });
    }

    // Process multiple mobility matrix files
    for (const file of mobilityMatrixFiles) {
      if (file.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type _id');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFilesList = files.filter(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFiles: mobilityMatrixFilesList }, 
          message: `Invalid file type for ${file.name}. Only CSV allowed.`, 
          selectedRegion: region 
        });
      }

      const csvData = parse(file.data.toString('utf8'), { columns: true, skip_empty_lines: true });
      const existingFile = await TransportFile.findOne({ fileName: file.name, type: 'mobility-matrix', region });
      if (!existingFile) {
        await TransportFile.create({
          fileName: file.name,
          type: 'mobility-matrix',
          region,
          data: csvData
        });
      } else {
        existingFile.data = csvData;
        existingFile.updatedAt = new Date();
        await existingFile.save();
      }
    }

    // Fetch updated files after upload
    const files = await TransportFile.find({ region }, 'fileName type _id');
    const transportFilesList = files.filter(f => f.type === 'transport');
    const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFilesList = files.filter(f => f.type === 'mobility-matrix');

    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFiles: mobilityMatrixFilesList }, 
      message: 'Files uploaded successfully!', 
      selectedRegion: region 
    });
  } catch (error) {
    const files = await TransportFile.find({ region }, 'fileName type _id').catch(() => []);
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFiles = files.filter(f => f.type === 'mobility-matrix');
    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFiles }, 
      message: 'Error uploading files: ' + error.message, 
      selectedRegion: region 
    });
  }
};

// Handle file deletion
exports.deleteFile = async (req, res) => {
  const locals = { pageName: 'Upload Mobility and Transport Data' };

  try {
    const { id, region } = req.params;
    if (!STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        locals,
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Invalid region selected.', 
        selectedRegion: null 
      });
    }

    await TransportFile.findByIdAndDelete(id);

    const files = await TransportFile.find({ region }, 'fileName type _id');
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFiles = files.filter(f => f.type === 'mobility-matrix');

    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFiles }, 
      message: 'File deleted successfully!', 
      selectedRegion: region 
    });
  } catch (error) {
    res.render('pages/upload/upload', { 
      locals,
      regions: STATIC_REGIONS, 
      files: null, 
      message: 'Error deleting file: ' + error.message, 
      selectedRegion: region 
    });
  }
};
