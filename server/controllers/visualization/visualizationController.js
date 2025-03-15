const TransportFile = require('../../models/transportFile/TransportFile');


exports.getVisualizationPage = async (req, res) => {
  try {
    const regions = await TransportFile.distinct('region');

    const locals = {
      pageName: 'Layered Visialization'
    };

    res.render('pages/visualization/visualization', { locals, regions, files: null });
  } catch (error) {
    const locals = {
      pageName: 'Data Visualization'
    };

    res.render('pages/visualization/visualization', { locals, regions: [], files: null, error: error.message });
  }
};


exports.getFilesByRegion = async (req, res) => {
  try {
    const { region } = req.query;
    if (!region) {
      return res.json({ success: false, message: 'Region is required' });
    }
    const files = await TransportFile.find({ region }, 'fileName type data');
    const transportFiles = files.filter(f => f.type === 'transport');
    const mobilityFile = files.find(f => f.type === 'mobility-area'); // Changed to mobility-area
    res.json({ success: true, files: { transportFiles, mobilityFile } });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.getRouteData = async (req, res) => {
  try {
    const { fileName, region } = req.query;
    const file = await TransportFile.findOne({ fileName, region, type: 'transport' });
    if (!file) {
      return res.json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, stops: file.data });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.getMobilityData = async (req, res) => {
  try {
    const { fileName, region } = req.query;
    const file = await TransportFile.findOne({ fileName, region, type: 'mobility-area' }); 
    if (!file) {
      return res.json({ success: false, message: 'Mobility file not found' });
    }
    // Assuming the data structure has AREA, LATITUDE, LONGITUDE as specified
    const nodes = file.data.map(item => ({
      area: item.AREA,
      latitude: item.LATITUDE,
      longitude: item.LONGITUDE
    }));
    res.json({ success: true, nodes });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
