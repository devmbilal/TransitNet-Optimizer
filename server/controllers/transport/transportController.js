const TransportFile = require('../../models/transportFile/TransportFile');
const { parse } = require('csv-parse/sync');

// Static list of regions
const STATIC_REGIONS = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad'];

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
    const mobilityFile = files.find(f => f.type === 'mobility');
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityFile }, 
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

    if (!req.files || (!req.files.transportFiles && !req.files.mobilityFile)) {
      // If no files uploaded, show existing files for the region
      const files = await TransportFile.find({ region }, 'fileName type');
      const transportFiles = files.filter(f => f.type === 'transport');
      const mobilityFile = files.find(f => f.type === 'mobility');
      return res.render('pages/upload/upload', { 
        regions: STATIC_REGIONS, 
        files: { transportFiles, mobilityFile }, 
        message: 'No files uploaded.', 
        selectedRegion: region 
      });
    }

    const transportFiles = req.files.transportFiles ? 
      (Array.isArray(req.files.transportFiles) ? req.files.transportFiles : [req.files.transportFiles]) : [];
    const mobilityFile = req.files.mobilityFile;

    // Process transport files
    for (const file of transportFiles) {
      if (file.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityFileList = files.find(f => f.type === 'mobility');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityFile: mobilityFileList }, 
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

    // Process mobility file
    if (mobilityFile) {
      if (mobilityFile.mimetype !== 'text/csv') {
        const files = await TransportFile.find({ region }, 'fileName type');
        const transportFilesList = files.filter(f => f.type === 'transport');
        const mobilityFileList = files.find(f => f.type === 'mobility');
        return res.render('pages/upload/upload', { 
          regions: STATIC_REGIONS, 
          files: { transportFiles: transportFilesList, mobilityFile: mobilityFileList }, 
          message: `Invalid file type for ${mobilityFile.name}. Only CSV allowed.`, 
          selectedRegion: region 
        });
      }

      const csvData = parse(mobilityFile.data.toString('utf8'), { columns: true, skip_empty_lines: true });
      const existingMobility = await TransportFile.findOne({ type: 'mobility', region });
      if (existingMobility) {
        existingMobility.fileName = mobilityFile.name;
        existingMobility.data = csvData;
        existingMobility.updatedAt = new Date();
        await existingMobility.save();
      } else {
        await TransportFile.create({
          fileName: mobilityFile.name,
          type: 'mobility',
          region,
          data: csvData
        });
      }
    }

    // Fetch updated files after upload
    const files = await TransportFile.find({ region }, 'fileName type');
    const transportFilesList = files.filter(f => f.type === 'transport');
    const mobilityFileList = files.find(f => f.type === 'mobility');

    // Always render the "files exist" view with updated data
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles: transportFilesList, mobilityFile: mobilityFileList }, 
      message: 'Files uploaded successfully!', 
      selectedRegion: region 
    });
  } catch (error) {
    const files = await TransportFile.find({ region }, 'fileName type').catch(() => []);
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityFile = files.find(f => f.type === 'mobility');
    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityFile }, 
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
    const mobilityFile = files.find(f => f.type === 'mobility');

    res.render('pages/upload/upload', { 
      regions: STATIC_REGIONS, 
      files: { transportFiles, mobilityFile }, 
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