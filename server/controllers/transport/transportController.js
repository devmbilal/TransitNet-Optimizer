const TransportFile = require('../../models/transportFile/TransportFile');
const { parse } = require('csv-parse/sync');

const STATIC_REGIONS = ['Islamabad', 'Lahore', 'Karachi', 'Faisalabad'];

// Render upload page
exports.getUploadPage = async (req, res) => {
  try {
    res.render('pages/upload/upload', { regions: STATIC_REGIONS, files: null, message: null, selectedRegion: null });
  } catch (error) {
    res.render('pages/upload/upload', { regions: STATIC_REGIONS, files: null, message: 'Error loading page: ' + error.message, selectedRegion: null });
  }
};

// Handle region selection and file display
exports.getFilesByRegion = async (req, res) => {
  try {
    const { region } = req.query;
    if (!STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Invalid region selected.', 
        selectedRegion: null 
      });
    }

    const files = await TransportFile.find({ region }, 'fileName type');
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFile = files.find(f => f.type === 'mobility-matrix');
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFile }, 
      message: null, 
      selectedRegion: region 
    });
  } catch (error) {
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: null, 
      message: 'Error fetching files: ' + error.message, 
      selectedRegion: null 
    });
  }
};

// Handle file upload
exports.uploadFiles = async (req, res) => {
  try {
    const { region } = req.body;
    if (!region || !STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Please select a valid region from the list.', 
        selectedRegion: null 
      });
    }

    if (!req.files || (!req.files.transportFiles && !req.files.mobilityAreaFile && !req.files.mobilityMatrixFile)) {
      const files = await TransportFile.find({ region }, 'fileName type');
      const transportFiles = files.filter(f => f.type === 'transport');
      const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
      const mobilityMatrixFile = files.find(f => f.type === 'mobility-matrix');
      return res.render('pages/upload/upload', { 
        regions: STATIC_REGIONS, 
        files: { transportFiles, mobilityAreaFile, mobilityMatrixFile }, 
        message: 'No files uploaded.', 
        selectedRegion: region 
      });
    }

    const transportFiles = req.files.transportFiles ? 
      (Array.isArray(req.files.transportFiles) ? req.files.transportFiles : [req.files.transportFiles]) : [];
    const mobilityAreaFile = req.files.mobilityAreaFile;
    const mobilityMatrixFile = req.files.mobilityMatrixFile;

    // Process transport files (unchanged)
    for (const file of transportFiles) {
      if (file.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFileList = files.find(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFile: mobilityMatrixFileList }, 
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

    // Process mobility area file
    if (mobilityAreaFile) {
      if (mobilityAreaFile.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFileList = files.find(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFile: mobilityMatrixFileList }, 
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
    }

    // Process mobility matrix file
    if (mobilityMatrixFile) {
      if (mobilityMatrixFile.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
        const mobilityMatrixFileList = files.find(f => f.type === 'mobility-matrix');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFile: mobilityMatrixFileList }, 
          message: `Invalid file type for ${mobilityMatrixFile.name}. Only CSV allowed.`, 
          selectedRegion: region 
        });
      }

      const csvData = parse(mobilityMatrixFile.data.toString('utf8'), { columns: true, skip_empty_lines: true });
      const existingMobilityMatrix = await TransportFile.findOne({ type: 'mobility-matrix', region });
      if (existingMobilityMatrix) {
        existingMobilityMatrix.fileName = mobilityMatrixFile.name;
        existingMobilityMatrix.data = csvData;
        existingMobilityMatrix.updatedAt = new Date();
        await existingMobilityMatrix.save();
      } else {
        await TransportFile.create({
          fileName: mobilityMatrixFile.name,
          type: 'mobility-matrix',
          region,
          data: csvData
        });
      }
    }

    // Fetch updated files after upload
    const files = await TransportFile.find({ region }, 'fileName type');
    const transportFilesList = files.filter(f => f.type === 'transport');
    const mobilityAreaFileList = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFileList = files.find(f => f.type === 'mobility-matrix');

    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles: transportFilesList, mobilityAreaFile: mobilityAreaFileList, mobilityMatrixFile: mobilityMatrixFileList }, 
      message: 'Files uploaded successfully!', 
      selectedRegion: region 
    });
  } catch (error) {
    const files = await TransportFile.find({ region }, 'fileName type').catch(() => []);
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFile = files.find(f => f.type === 'mobility-matrix');
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFile }, 
      message: 'Error uploading files: ' + error.message, 
      selectedRegion: region 
    });
  }
};

// Handle file deletion
exports.deleteFile = async (req, res) => {
  try {
    const { id, region } = req.params;
    if (!STATIC_REGIONS.includes(region)) {
      return res.render('pages/upload/upload', { 
        regions: STATIC_REGIONS, 
        files: null, 
        message: 'Invalid region selected.', 
        selectedRegion: null 
      });
    }

    await TransportFile.findByIdAndDelete(id);

    const files = await TransportFile.find({ region }, 'fileName type');
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityAreaFile = files.find(f => f.type === 'mobility-area');
    const mobilityMatrixFile = files.find(f => f.type === 'mobility-matrix');

    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityAreaFile, mobilityMatrixFile }, 
      message: 'File deleted successfully!', 
      selectedRegion: region 
    });
  } catch (error) {
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: null, 
      message: 'Error deleting file: ' + error.message, 
      selectedRegion: region 
    });
  }
};