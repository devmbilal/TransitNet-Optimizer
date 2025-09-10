const TransportFile = require('../../models/transportFile/TransportFile');
const OptimizationSession = require('../../models/optimization/OptimizationSession');
const RouteRecommendation = require('../../models/optimization/RouteRecommendation');
const RouteOptimizationService = require('../../services/routeOptimization');

/**
 * Route Optimization Controller
 * Handles all route optimization related requests
 */

// Get optimization page
exports.getOptimizationPage = async (req, res) => {
  try {
    const regions = await TransportFile.distinct('region');
    
    const locals = {
      pageName: 'Route Optimization'
    };

    // Get user's recent optimization sessions
    const recentSessions = await OptimizationSession.find({ 
      userId: req.session.user?.userID 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('sessionId region status progress createdAt completedAt');

    res.render('pages/optimization/optimization', { 
      locals, 
      regions, 
      recentSessions,
      error: null
    });
  } catch (error) {
    console.error('Error loading optimization page:', error);
    const locals = {
      pageName: 'Route Optimization'
    };

    res.render('pages/optimization/optimization', { 
      locals, 
      regions: [], 
      recentSessions: [],
      error: error.message 
    });
  }
};

// Get region data summary
exports.getRegionDataSummary = async (req, res) => {
  try {
    const { region } = req.query;
    
    if (!region) {
      return res.json({ success: false, message: 'Region is required' });
    }

    // Get mobility areas
    const mobilityAreasFile = await TransportFile.findOne({
      region,
      type: 'mobility-area'
    });

    // Get mobility matrix files
    const mobilityMatrixFiles = await TransportFile.find({
      region,
      type: 'mobility-matrix'
    });

    // Get existing transport routes
    const existingRoutes = await TransportFile.find({
      region,
      type: 'transport'
    });

    // Calculate summary statistics
    const summary = {
      mobilityAreas: {
        available: !!mobilityAreasFile,
        count: mobilityAreasFile ? mobilityAreasFile.data.length : 0,
        fileName: mobilityAreasFile ? mobilityAreasFile.fileName : null
      },
      mobilityMatrix: {
        available: mobilityMatrixFiles.length > 0,
        filesCount: mobilityMatrixFiles.length,
        totalRecords: mobilityMatrixFiles.reduce((sum, file) => sum + file.data.length, 0),
        files: mobilityMatrixFiles.map(f => ({
          _id: f._id,
          fileName: f.fileName.replace(/\.csv$/i, ''),
          recordCount: f.data.length,
          createdAt: f.createdAt
        }))
      },
      existingRoutes: {
        available: existingRoutes.length > 0,
        routesCount: existingRoutes.length,
        totalStops: existingRoutes.reduce((sum, route) => sum + route.data.length, 0),
        routeNames: existingRoutes.map(r => r.fileName)
      },
      readyForOptimization: !!mobilityAreasFile && mobilityMatrixFiles.length > 0
    };

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error getting region data summary:', error);
    res.json({ success: false, message: error.message });
  }
};

// Start optimization process
exports.startOptimization = async (req, res) => {
  try {
    const { region, algorithmParams, mobilityMatrixFileId } = req.body;
    
    if (!region) {
      return res.json({ success: false, message: 'Region is required' });
    }

    // Validate region has required data
    const mobilityAreasFile = await TransportFile.findOne({
      region,
      type: 'mobility-area'
    });

    let mobilityMatrixFiles;
    if (mobilityMatrixFileId) {
      // Use specific mobility matrix file
      const selectedFile = await TransportFile.findById(mobilityMatrixFileId);
      if (!selectedFile || selectedFile.region !== region || selectedFile.type !== 'mobility-matrix') {
        return res.json({ 
          success: false, 
          message: 'Selected mobility matrix file not found or invalid' 
        });
      }
      mobilityMatrixFiles = [selectedFile];
    } else {
      // Use all mobility matrix files for the region
      mobilityMatrixFiles = await TransportFile.find({
        region,
        type: 'mobility-matrix'
      });
    }

    if (!mobilityAreasFile) {
      return res.json({ 
        success: false, 
        message: 'No mobility areas data found for this region. Please upload mobility areas first.' 
      });
    }

    if (mobilityMatrixFiles.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No mobility matrix data found for this region. Please upload mobility matrix first.' 
      });
    }

    // Create new optimization session
    const sessionId = OptimizationSession.generateSessionId();
    
    const session = new OptimizationSession({
      sessionId: sessionId,
      region: region,
      userId: req.session.user?.userID,
      startedAt: new Date(),
      algorithmParams: {
        distanceThreshold: algorithmParams?.distanceThreshold || null,
        mobilityConstant: algorithmParams?.mobilityConstant || 0.1,
        proximityRadius: algorithmParams?.proximityRadius || 2000,
        mobilityMatrixFileId: mobilityMatrixFileId || null,
        costPerKm: algorithmParams?.costPerKm || 50000,
        recommendationFilters: algorithmParams?.recommendationFilters || {
          minMobility: 0.5,
          maxDistance: 40,
          minEfficiency: 0.01,
          maxRecommendations: 20
        }
      }
    });

    await session.save();

    // Start optimization process asynchronously
    RouteOptimizationService.optimize(sessionId).catch(error => {
      console.error('Optimization process failed:', error);
    });

    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Optimization started successfully'
    });

  } catch (error) {
    console.error('Error starting optimization:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get optimization status
exports.getOptimizationStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await OptimizationSession.findOne({ 
      sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Optimization session not found' });
    }

    // Prepare phase details for frontend
    const phaseDetails = {
      dataPreparation: {
        ...session.phases.dataPreparation,
        title: 'Data Preparation',
        description: 'Loading mobility areas, matrix data, and cached distances',
        progressRange: [0, 20]
      },
      networkConstruction: {
        ...session.phases.networkConstruction,
        title: 'Network Construction',
        description: 'Building complete graph with dual edge weights',
        progressRange: [20, 40]
      },
      distanceFiltering: {
        ...session.phases.distanceFiltering,
        title: 'Distance Filtering',
        description: 'Applying threshold to create sparse connected graph',
        progressRange: [40, 60]
      },
      mobilityOptimization: {
        ...session.phases.mobilityOptimization,
        title: 'Mobility Optimization',
        description: 'Finding optimal paths using Dijkstra\'s algorithm',
        progressRange: [60, 80]
      },
      resultsGeneration: {
        ...session.phases.resultsGeneration,
        title: 'Results Generation',
        description: 'Analyzing results and generating recommendations',
        progressRange: [80, 100]
      }
    };

    // Calculate elapsed time and estimated costs
    const elapsedTimeMs = session.startedAt ? Date.now() - session.startedAt.getTime() : 0;
    const duration = session.endedAt && session.startedAt ? 
      session.endedAt.getTime() - session.startedAt.getTime() : elapsedTimeMs;
    
    const response = {
      sessionId: session.sessionId,
      region: session.region,
      status: session.status,
      currentPhase: session.currentPhase,
      progress: session.progress,
      phases: phaseDetails,
      algorithmParams: session.algorithmParams,
      errorMessage: session.errorMessage,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      completedAt: session.completedAt,
      elapsedTimeMs: elapsedTimeMs,
      durationMs: duration
    };

    res.json({ success: true, session: response });
  } catch (error) {
    console.error('Error getting optimization status:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get optimization results
exports.getOptimizationResults = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await OptimizationSession.findOne({ 
      sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Optimization session not found' });
    }

    if (session.status !== 'completed') {
      return res.json({ 
        success: false, 
        message: 'Optimization is not completed yet',
        status: session.status,
        progress: session.progress
      });
    }

    // Get route recommendations
    const recommendations = await RouteRecommendation.find({ 
      sessionId 
    })
    .sort({ priority: 1, 'expectedImprovement.impactScore': -1 })
    .limit(20);

    const response = {
      sessionId: session.sessionId,
      region: session.region,
      results: session.results,
      recommendations: recommendations,
      completedAt: session.completedAt,
      phases: session.phases
    };

    res.json({ success: true, results: response });
  } catch (error) {
    console.error('Error getting optimization results:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get visualization data for optimized routes
exports.getVisualizationData = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await OptimizationSession.findOne({ 
      sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Optimization session not found' });
    }

    if (session.status !== 'completed') {
      return res.json({ 
        success: false, 
        message: 'Optimization results not available yet' 
      });
    }

    // Get mobility areas for node coordinates
    const mobilityAreasFile = await TransportFile.findOne({
      region: session.region,
      type: 'mobility-area'
    });

    const mobilityNodes = mobilityAreasFile ? mobilityAreasFile.data.map(area => ({
      name: area.AREA,
      latitude: parseFloat(area.LATITUDE),
      longitude: parseFloat(area.LONGITUDE)
    })) : [];

    // Get existing routes for comparison
    const existingRoutes = await TransportFile.find({
      region: session.region,
      type: 'transport'
    });

    const existingRoutesData = existingRoutes.map(route => ({
      name: route.fileName,
      stops: route.data.map(stop => ({
        name: stop['Stop Name'],
        latitude: parseFloat(stop.latitude),
        longitude: parseFloat(stop.longitude)
      }))
    }));

    // Format optimized routes for visualization
    const optimizedRoutesData = session.results.optimizedRoutes
      .filter(route => route.mobility > 1) // Filter meaningful routes
      .slice(0, 50) // Limit for performance
      .map(route => {
        // Get coordinates for each area in the path
        let pathCoordinates = [];
        
        if (route.path && route.path.length > 0) {
          // Use the full path from Dijkstra algorithm
          pathCoordinates = route.path.map(areaName => {
            const node = mobilityNodes.find(n => n.name === areaName);
            return node ? {
              name: areaName,
              latitude: node.latitude,
              longitude: node.longitude
            } : null;
          }).filter(coord => coord !== null);
        }
        
        // Fallback: if path is empty or has missing coordinates, create direct route
        if (pathCoordinates.length < 2) {
          console.log(`Creating direct route fallback for ${route.fromArea} → ${route.toArea}`);
          const fromNode = mobilityNodes.find(n => n.name === route.fromArea);
          const toNode = mobilityNodes.find(n => n.name === route.toArea);
          
          if (fromNode && toNode) {
            pathCoordinates = [
              {
                name: route.fromArea,
                latitude: fromNode.latitude,
                longitude: fromNode.longitude
              },
              {
                name: route.toArea,
                latitude: toNode.latitude,
                longitude: toNode.longitude
              }
            ];
          }
        }

        return {
          fromArea: route.fromArea,
          toArea: route.toArea,
          distance: route.distance,
          mobility: route.mobility,
          weight: route.weight,
          path: pathCoordinates,
          fullPath: route.path, // Include original path for debugging
          efficiency: route.mobility / route.distance
        };
      });

    const visualizationData = {
      mobilityNodes: mobilityNodes,
      existingRoutes: existingRoutesData,
      optimizedRoutes: optimizedRoutesData,
      networkMetrics: {
        original: session.results.originalNetwork,
        optimized: session.results.optimizedNetwork,
        improvements: session.results.improvements
      },
      region: session.region
    };

    res.json({ success: true, data: visualizationData });
  } catch (error) {
    console.error('Error getting visualization data:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get available regions
exports.getRegions = async (req, res) => {
  try {
    const regions = await TransportFile.distinct('region');
    res.json({ success: true, regions });
  } catch (error) {
    console.error('Error getting regions:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get user's optimization sessions
exports.getUserSessions = async (req, res) => {
  try {
    const { limit = 10, status = 'all', region } = req.query;
    
    let query = { userId: req.session.user?.userID };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (region) {
      query.region = region;
    }

    const sessions = await OptimizationSession.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('sessionId region status progress currentPhase createdAt completedAt errorMessage');

    // For service planning, we need to include the results data for completed sessions
    const populatedSessions = await Promise.all(
      sessions.map(async (session) => {
        const sessionObj = session.toObject();
        if (sessionObj.status === 'completed') {
          try {
            const fullSession = await OptimizationSession.findOne({ 
              sessionId: sessionObj.sessionId,
              userId: req.session.user?.userID 
            });
            if (fullSession && fullSession.results) {
              sessionObj.results = {
                improvements: fullSession.results.improvements
              };
            }
          } catch (error) {
            console.error('Error fetching session results:', error);
          }
        }
        return sessionObj;
      })
    );

    res.json({ success: true, sessions: populatedSessions });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.json({ success: false, message: error.message });
  }
};

// Delete optimization session
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find and delete session
    const session = await OptimizationSession.findOneAndDelete({ 
      sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    // Delete associated recommendations
    await RouteRecommendation.deleteMany({ sessionId });

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.json({ success: false, message: error.message });
  }
};

// Update recommendation feedback
exports.updateRecommendationFeedback = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { userRating, userComments, status } = req.body;

    const recommendation = await RouteRecommendation.findById(recommendationId);
    
    if (!recommendation) {
      return res.json({ success: false, message: 'Recommendation not found' });
    }

    // Verify user owns this session
    const session = await OptimizationSession.findOne({ 
      sessionId: recommendation.sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Unauthorized access to recommendation' });
    }

    // Update feedback
    if (userRating !== undefined) recommendation.feedback.userRating = userRating;
    if (userComments) recommendation.feedback.userComments = userComments;
    if (status) recommendation.status = status;

    await recommendation.save();

    res.json({ success: true, message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating recommendation feedback:', error);
    res.json({ success: false, message: error.message });
  }
};

// Export optimization results as CSV
exports.exportResults = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { format = 'recommendations' } = req.query; // 'recommendations' or 'routes'
    
    const session = await OptimizationSession.findOne({ 
      sessionId,
      userId: req.session.user?.userID 
    });

    if (!session) {
      return res.json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'completed') {
      return res.json({ success: false, message: 'Optimization not completed' });
    }

    let csvContent = '';
    let filename = '';

    if (format === 'recommendations') {
      const recommendations = await RouteRecommendation.find({ sessionId })
        .sort({ priority: 1 });

      csvContent = 'Priority,Action Type,From Area,To Area,Distance (km),Mobility (%),Impact Score,Estimated Cost (PKR),Difficulty,Timeframe,Status\n';
      
      for (const rec of recommendations) {
        csvContent += `${rec.priority},"${rec.actionType}","${rec.fromArea}","${rec.toArea}",${rec.recommendedRoute.distance},${rec.recommendedRoute.mobility},${rec.expectedImprovement.impactScore},"PKR ${rec.implementationDetails.estimatedCost.toLocaleString()}","${rec.implementationDetails.difficulty}","${rec.implementationDetails.timeframe}","${rec.status}"\n`;
      }
      
      filename = `route_recommendations_${session.region}_${sessionId}.csv`;
    } else {
      // Export optimized routes
      csvContent = 'From Area,To Area,Distance (km),Mobility (%),Weight,Path\n';
      
      for (const route of session.results.optimizedRoutes) {
        const pathStr = route.path.join(' → ');
        csvContent += `"${route.fromArea}","${route.toArea}",${route.distance},${route.mobility},${route.weight},"${pathStr}"\n`;
      }
      
      filename = `optimized_routes_${session.region}_${sessionId}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting results:', error);
    res.json({ success: false, message: error.message });
  }
};
