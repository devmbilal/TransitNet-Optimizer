const TransportFile = require('../../models/transportFile/TransportFile');
const distance = require('google-distance-matrix');

// Google Maps API key (replace with your own)
distance.key(process.env.GOOGLE_MAPS_API_KEY);

exports.getVisualizationPage = async (req, res) => {
  try {
    const regions = await TransportFile.distinct('region');
    res.render('pages/visualization/visualization', { regions, files: null });
  } catch (error) {
    res.render('pages/visualization/visualization', { regions: [], files: null, error: error.message });
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
    const mobilityFile = files.find(f => f.type === 'mobility');
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

exports.calculateDistance = async (req, res) => {
  try {
    const { fileName, region } = req.query;
    const file = await TransportFile.findOne({ fileName, region, type: 'transport' });
    if (!file || !file.data || file.data.length < 2) {
      return res.json({ success: false, message: 'Invalid route data' });
    }

    const origins = file.data.map(stop => `${stop.latitude},${stop.longitude}`);
    const destinations = origins.slice(1); // Exclude first stop as origin
    origins.pop(); // Exclude last stop as origin

    distance.matrix(origins, destinations, (err, distances) => {
      if (err) {
        return res.json({ success: false, message: err.message });
      }
      if (!distances || distances.status !== 'OK') {
        return res.json({ success: false, message: 'Distance calculation failed' });
      }

      let totalDistance = 0;
      distances.rows.forEach(row => {
        row.elements.forEach(element => {
          if (element.status === 'OK') {
            totalDistance += element.distance.value; // Distance in meters
          }
        });
      });
      res.json({ success: true, distance: totalDistance / 1000 }); // Convert to km
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};