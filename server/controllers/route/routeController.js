const TransportFile = require('../../models/transportFile/TransportFile');

exports.getRouteCreationPage = async (req, res) => {
  try {
    const regions = await TransportFile.distinct('region');
    
    const locals = {
      pageName: 'Route Creation'
    };

    res.render('pages/route/routeCreation', { locals, regions });
  } catch (error) {
    const locals = {
      pageName: 'Route Creation'
    };

    res.render('pages/route/routeCreation', { locals, regions: [], error: error.message });
  }
};

exports.getRoutesByRegion = async (req, res) => {
  try {
    const { region } = req.query;
    if (!region) {
      return res.json({ success: false, message: 'Region is required' });
    }

    const routes = await TransportFile.find({ 
      region, 
      type: 'transport' 
    }, 'fileName data createdAt').sort({ createdAt: -1 });

    const formattedRoutes = routes.map(route => ({
      _id: route._id,
      fileName: route.fileName.replace('.csv', ''),
      stopCount: route.data ? route.data.length : 0,
      data: route.data || [],
      createdAt: route.createdAt
    }));

    res.json({ success: true, routes: formattedRoutes });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const route = await TransportFile.findById(id);
    
    if (!route) {
      return res.json({ success: false, message: 'Route not found' });
    }

    res.json({ 
      success: true, 
      route: {
        _id: route._id,
        fileName: route.fileName.replace('.csv', ''),
        region: route.region,
        data: route.data || []
      }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const { fileName, region, stops } = req.body;
    
    if (!fileName || !region || !stops || !Array.isArray(stops)) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    // Check if route name already exists in the region
    const existingRoute = await TransportFile.findOne({
      fileName: fileName + '.csv',
      region: region,
      type: 'transport'
    });

    if (existingRoute) {
      return res.json({ success: false, message: 'A route with this name already exists in the selected region' });
    }

    // Format stops data
    const formattedStops = stops.map(stop => ({
      'Stop Name': stop.name || stop['Stop Name'],
      'latitude': parseFloat(stop.latitude),
      'longitude': parseFloat(stop.longitude)
    }));

    const newRoute = await TransportFile.create({
      fileName: fileName + '.csv',
      region: region,
      type: 'transport',
      data: formattedStops
    });

    res.json({ 
      success: true, 
      message: 'Route created successfully',
      route: {
        _id: newRoute._id,
        fileName: fileName,
        region: region,
        stopCount: formattedStops.length
      }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, stops } = req.body;
    
    if (!fileName || !stops || !Array.isArray(stops)) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const route = await TransportFile.findById(id);
    if (!route) {
      return res.json({ success: false, message: 'Route not found' });
    }

    // Check if new fileName conflicts with existing routes (excluding current route)
    if (fileName !== route.fileName.replace('.csv', '')) {
      const existingRoute = await TransportFile.findOne({
        fileName: fileName + '.csv',
        region: route.region,
        type: 'transport',
        _id: { $ne: id }
      });

      if (existingRoute) {
        return res.json({ success: false, message: 'A route with this name already exists in this region' });
      }
    }

    // Format stops data
    const formattedStops = stops.map(stop => ({
      'Stop Name': stop.name || stop['Stop Name'],
      'latitude': parseFloat(stop.latitude),
      'longitude': parseFloat(stop.longitude)
    }));

    await TransportFile.findByIdAndUpdate(id, {
      fileName: fileName + '.csv',
      data: formattedStops
    });

    res.json({ 
      success: true, 
      message: 'Route updated successfully',
      route: {
        _id: id,
        fileName: fileName,
        stopCount: formattedStops.length
      }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.duplicateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.json({ success: false, message: 'New route name is required' });
    }

    const originalRoute = await TransportFile.findById(id);
    if (!originalRoute) {
      return res.json({ success: false, message: 'Original route not found' });
    }

    // Check if new fileName already exists
    const existingRoute = await TransportFile.findOne({
      fileName: fileName + '.csv',
      region: originalRoute.region,
      type: 'transport'
    });

    if (existingRoute) {
      return res.json({ success: false, message: 'A route with this name already exists in this region' });
    }

    const duplicatedRoute = await TransportFile.create({
      fileName: fileName + '.csv',
      region: originalRoute.region,
      type: 'transport',
      data: originalRoute.data
    });

    res.json({ 
      success: true, 
      message: 'Route duplicated successfully',
      route: {
        _id: duplicatedRoute._id,
        fileName: fileName,
        region: originalRoute.region,
        stopCount: originalRoute.data ? originalRoute.data.length : 0
      }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    
    const route = await TransportFile.findById(id);
    if (!route) {
      return res.json({ success: false, message: 'Route not found' });
    }

    await TransportFile.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'Route deleted successfully' 
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.exportRouteAsCSV = async (req, res) => {
  try {
    const { id } = req.params;
    
    const route = await TransportFile.findById(id);
    if (!route) {
      return res.json({ success: false, message: 'Route not found' });
    }

    // Generate CSV content
    let csvContent = 'Stop Name,latitude,longitude\n';
    route.data.forEach(stop => {
      csvContent += `"${stop['Stop Name']}",${stop.latitude},${stop.longitude}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${route.fileName}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
