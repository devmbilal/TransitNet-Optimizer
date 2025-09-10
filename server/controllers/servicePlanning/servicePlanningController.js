const ServicePlanningSession = require('../../models/servicePlanning/ServicePlanningSession');
const OptimizationSession = require('../../models/optimization/OptimizationSession');
const RouteRecommendation = require('../../models/optimization/RouteRecommendation');
const TransportFile = require('../../models/transportFile/TransportFile');

/**
 * Service Planning Controller
 * Provides decision support tools for transit authorities
 * Integrates with Route Optimization results for data-driven planning
 */

// Get service planning page
const getServicePlanningPage = async (req, res) => {
  try {
    const locals = {
      pageName: 'Interactive Service Planning'
    };

    // Get available regions from both transport files and optimization sessions
    const regions = await OptimizationSession.distinct('region', { status: 'completed' });
    
    console.log('Available regions with completed optimizations:', regions);

    res.render('pages/servicePlanning/servicePlanning', {
      locals,
      regions: regions || [],
      error: null
    });

  } catch (error) {
    console.error('Error loading service planning page:', error);
    const locals = { pageName: 'Interactive Service Planning' };
    
    res.render('pages/servicePlanning/servicePlanning', {
      locals,
      regions: [],
      error: error.message
    });
  }
};

// Load optimization data for service planning
const loadOptimizationData = async (req, res) => {
  try {
    const { optimizationSessionId } = req.query;

    if (!optimizationSessionId) {
      return res.json({ success: false, message: 'Optimization session ID is required' });
    }

    // Get optimization session details
    const optimizationSession = await OptimizationSession.findOne({
      sessionId: optimizationSessionId,
      userId: req.session.user?.userID,
      status: 'completed'
    });

    if (!optimizationSession) {
      return res.json({ success: false, message: 'Optimization session not found or not completed' });
    }

    // Get route recommendations
    const recommendations = await RouteRecommendation.find({
      sessionId: optimizationSessionId
    })
    .sort({ priority: 1 })
    .limit(20);

    // Get existing transport routes for the region
    const existingRoutes = await TransportFile.find({
      region: optimizationSession.region,
      type: 'transport'
    });

    // Prepare baseline metrics
    const baselineData = {
      optimizationSessionId: optimizationSession.sessionId,
      region: optimizationSession.region,
      completedAt: optimizationSession.completedAt,
      
      baselineMetrics: {
        totalDistance: optimizationSession.results.originalNetwork.totalDistance,
        totalMobility: optimizationSession.results.originalNetwork.totalMobility,
        networkEfficiency: optimizationSession.results.originalNetwork.networkEfficiency,
        totalRoutes: existingRoutes.length,
        
        // Calculate estimated costs
        estimatedCost: Math.round(
          optimizationSession.results.originalNetwork.totalDistance * 
          optimizationSession.algorithmParams.costPerKm
        ),
        
        optimizationImprovements: {
          distanceReduction: optimizationSession.results.improvements.distanceReduction,
          mobilityIncrease: optimizationSession.results.improvements.mobilityIncrease,
          efficiencyGain: optimizationSession.results.improvements.efficiencyGain
        }
      },
      
      optimizedMetrics: {
        totalDistance: optimizationSession.results.optimizedNetwork.totalDistance,
        totalMobility: optimizationSession.results.optimizedNetwork.totalMobility,
        networkEfficiency: optimizationSession.results.optimizedNetwork.networkEfficiency,
        totalRoutes: optimizationSession.results.optimizedRoutes.filter(r => r.mobility > 1).length,
        
        estimatedCost: Math.round(
          optimizationSession.results.optimizedNetwork.totalDistance * 
          optimizationSession.algorithmParams.costPerKm
        )
      },
      
      recommendations: recommendations.map(rec => ({
        id: rec._id,
        priority: rec.priority,
        actionType: rec.actionType,
        fromArea: rec.fromArea,
        toArea: rec.toArea,
        distance: rec.recommendedRoute.distance,
        mobility: rec.recommendedRoute.mobility,
        impactScore: rec.expectedImprovement.impactScore,
        estimatedCost: rec.implementationDetails.estimatedCost,
        difficulty: rec.implementationDetails.difficulty,
        timeframe: rec.implementationDetails.timeframe
      })),
      
      existingRoutes: existingRoutes.map(route => ({
        id: route._id,
        name: route.fileName,
        stops: route.data.length,
        region: route.region
      }))
    };

    res.json({ success: true, data: baselineData });

  } catch (error) {
    console.error('Error loading optimization data:', error);
    res.json({ success: false, message: error.message });
  }
};

// Create new service planning session
const createPlanningSession = async (req, res) => {
  try {
    const { optimizationSessionId, title, description } = req.body;

    if (!optimizationSessionId) {
      return res.json({ success: false, message: 'Optimization session ID is required' });
    }

    // Verify optimization session exists and is completed
    const optimizationSession = await OptimizationSession.findOne({
      sessionId: optimizationSessionId,
      userId: req.session.user?.userID,
      status: 'completed'
    });

    if (!optimizationSession) {
      return res.json({ success: false, message: 'Optimization session not found or not completed' });
    }

    // Create baseline metrics from optimization results
    const baselineMetrics = {
      totalDistance: optimizationSession.results.originalNetwork.totalDistance,
      totalMobility: optimizationSession.results.originalNetwork.totalMobility,
      networkEfficiency: optimizationSession.results.originalNetwork.networkEfficiency,
      totalRoutes: optimizationSession.results.optimizedRoutes.filter(r => r.mobility > 1).length,
      estimatedCost: Math.round(
        optimizationSession.results.originalNetwork.totalDistance * 
        optimizationSession.algorithmParams.costPerKm
      ),
      
      optimizationImprovements: {
        distanceReduction: optimizationSession.results.improvements.distanceReduction,
        mobilityIncrease: optimizationSession.results.improvements.mobilityIncrease,
        efficiencyGain: optimizationSession.results.improvements.efficiencyGain
      }
    };

    // Create baseline scenario
    const baselineScenario = {
      name: 'Baseline (Current + Optimized)',
      description: 'Current network with optimization recommendations applied',
      isBaseline: true,
      modifications: {
        routeChanges: [],
        scheduleAdjustments: [],
        capacityChanges: []
      },
      predictedImpacts: {
        metrics: {
          totalDistance: optimizationSession.results.optimizedNetwork.totalDistance,
          totalMobility: optimizationSession.results.optimizedNetwork.totalMobility,
          networkEfficiency: optimizationSession.results.optimizedNetwork.networkEfficiency,
          totalRoutes: optimizationSession.results.optimizedRoutes.filter(r => r.mobility > 1).length,
          estimatedCost: Math.round(
            optimizationSession.results.optimizedNetwork.totalDistance * 
            optimizationSession.algorithmParams.costPerKm
          ),
          ridership: Math.round(optimizationSession.results.optimizedNetwork.totalMobility * 1000)
        },
        improvements: {
          distanceChange: optimizationSession.results.improvements.distanceReduction,
          mobilityChange: optimizationSession.results.improvements.mobilityIncrease,
          efficiencyChange: optimizationSession.results.improvements.efficiencyGain,
          costChange: Math.round(
            (optimizationSession.results.optimizedNetwork.totalDistance - 
             optimizationSession.results.originalNetwork.totalDistance) * 
            optimizationSession.algorithmParams.costPerKm
          ),
          ridership: Math.round(
            (optimizationSession.results.optimizedNetwork.totalMobility - 
             optimizationSession.results.originalNetwork.totalMobility) * 1000
          )
        },
        risks: [],
        confidence: {
          overall: 85,
          ridership: 75,
          cost: 90,
          efficiency: 85
        }
      }
    };

    // Create new service planning session
    const planningSession = new ServicePlanningSession({
      userId: req.session.user?.userID,
      region: optimizationSession.region,
      optimizationSessionId: optimizationSessionId,
      title: title || 'Service Planning Session',
      description: description || '',
      status: 'draft',
      baselineMetrics,
      scenarios: [baselineScenario]
    });

    await planningSession.save();

    res.json({
      success: true,
      sessionId: planningSession.sessionId,
      message: 'Service planning session created successfully'
    });

  } catch (error) {
    console.error('Error creating service planning session:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get service planning session details
const getPlanningSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ServicePlanningSession.findOne({
      sessionId,
      userId: req.session.user?.userID
    });

    if (!session) {
      return res.json({ success: false, message: 'Service planning session not found' });
    }

    res.json({ success: true, session });

  } catch (error) {
    console.error('Error getting service planning session:', error);
    res.json({ success: false, message: error.message });
  }
};

// Add scenario to planning session
const addScenario = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const scenarioData = req.body;

    const session = await ServicePlanningSession.findOne({
      sessionId,
      userId: req.session.user?.userID
    });

    if (!session) {
      return res.json({ success: false, message: 'Service planning session not found' });
    }

    // Validate and prepare scenario data
    const scenario = {
      name: scenarioData.name || 'New Scenario',
      description: scenarioData.description || '',
      modifications: scenarioData.modifications || {
        routeChanges: [],
        scheduleAdjustments: [],
        capacityChanges: []
      }
    };

    // Calculate predicted impacts (simplified algorithm)
    scenario.predictedImpacts = await calculateScenarioImpacts(session, scenario.modifications);

    await session.addScenario(scenario);

    res.json({
      success: true,
      message: 'Scenario added successfully',
      scenario: session.scenarios[session.scenarios.length - 1]
    });

  } catch (error) {
    console.error('Error adding scenario:', error);
    res.json({ success: false, message: error.message });
  }
};

// Simulate scenario impacts
const simulateScenario = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { modifications } = req.body;

    const session = await ServicePlanningSession.findOne({
      sessionId,
      userId: req.session.user?.userID
    });

    if (!session) {
      return res.json({ success: false, message: 'Service planning session not found' });
    }

    // Calculate predicted impacts
    const predictedImpacts = await calculateScenarioImpacts(session, modifications);

    res.json({
      success: true,
      predictedImpacts
    });

  } catch (error) {
    console.error('Error simulating scenario:', error);
    res.json({ success: false, message: error.message });
  }
};

// Finalize decision
const finalizeDecision = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const decisionData = req.body;

    const session = await ServicePlanningSession.findOne({
      sessionId,
      userId: req.session.user?.userID
    });

    if (!session) {
      return res.json({ success: false, message: 'Service planning session not found' });
    }

    // Prepare decision data
    const decision = {
      approvedScenario: {
        scenarioId: decisionData.scenarioId,
        approvalDate: new Date(),
        approvedBy: req.session.user?.userID
      },
      implementationPlan: decisionData.implementationPlan || {},
      stakeholders: decisionData.stakeholders || [],
      decisionRationale: decisionData.rationale || '',
      alternativesConsidered: decisionData.alternativesConsidered || []
    };

    await session.finalizeDecision(decision);

    res.json({
      success: true,
      message: 'Decision finalized successfully'
    });

  } catch (error) {
    console.error('Error finalizing decision:', error);
    res.json({ success: false, message: error.message });
  }
};

// Export service planning data
const exportPlanningData = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { exportType = 'summary_report', format = 'csv' } = req.query;

    const session = await ServicePlanningSession.findOne({
      sessionId,
      userId: req.session.user?.userID
    });

    if (!session) {
      return res.json({ success: false, message: 'Service planning session not found' });
    }

    let csvContent = '';
    let filename = '';

    if (exportType === 'summary_report') {
      csvContent = generateSummaryCSV(session);
      filename = `service_planning_summary_${session.region}_${sessionId}.csv`;
    } else if (exportType === 'implementation_plan') {
      csvContent = generateImplementationCSV(session);
      filename = `implementation_plan_${session.region}_${sessionId}.csv`;
    } else if (exportType === 'scenarios_comparison') {
      csvContent = generateScenariosCSV(session);
      filename = `scenarios_comparison_${session.region}_${sessionId}.csv`;
    }

    // Record export
    session.exports.push({
      exportType,
      format,
      generatedAt: new Date(),
      generatedBy: req.session.user?.userID
    });
    await session.save();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting planning data:', error);
    res.json({ success: false, message: error.message });
  }
};

// Helper Functions

async function calculateScenarioImpacts(session, modifications) {
  console.log('Calculating scenario impacts for session:', session.sessionId);
  console.log('Modifications received:', JSON.stringify(modifications, null, 2));
  
  // Validate inputs
  if (!session || !session.baselineMetrics) {
    throw new Error('Invalid session or missing baseline metrics');
  }
  
  if (!modifications) {
    throw new Error('No modifications provided for impact calculation');
  }
  
  // Simplified impact calculation algorithm
  // In a real implementation, this would use more sophisticated modeling
  
  const baseline = session.baselineMetrics;
  let impacts = {
    metrics: { 
      ...baseline,
      totalDistance: baseline.totalDistance || 0,
      totalMobility: baseline.totalMobility || 0,
      networkEfficiency: baseline.networkEfficiency || 0,
      estimatedCost: baseline.estimatedCost || 0,
      totalRoutes: baseline.totalRoutes || 0,
      ridership: Math.round((baseline.totalMobility || 0) * 1000)
    },
    improvements: {
      distanceChange: 0,
      mobilityChange: 0,
      efficiencyChange: 0,
      costChange: 0,
      ridership: 0
    },
    risks: [],
    confidence: {
      overall: 70,
      ridership: 60,
      cost: 80,
      efficiency: 75
    }
  };
  
  console.log('Baseline metrics used:', baseline);
  console.log('Initial impact structure:', impacts);

  // Analyze route changes
  console.log('Analyzing route changes:', modifications.routeChanges?.length || 0);
  if (modifications.routeChanges && modifications.routeChanges.length > 0) {
    let totalDistanceChange = 0;
    let totalCostChange = 0;
    let routeCountChange = 0;
    let mobilityChangeTotal = 0;
    
    for (const change of modifications.routeChanges) {
      console.log('Processing route change:', change);
      
      try {
        const distance = (change.routeDetails?.distance || 0);
        const estimatedCost = (change.routeDetails?.estimatedCost || distance * 50000);
        
        if (change.action === 'add') {
          totalDistanceChange += distance;
          totalCostChange += estimatedCost;
          routeCountChange += 1;
          mobilityChangeTotal += 5; // Estimated mobility improvement
          
          console.log(`Added route ${change.routeName}: +${distance}km, +PKR ${estimatedCost}`);
          
          // Add financial risk for new routes
          impacts.risks.push({
            category: 'financial',
            level: 'medium',
            description: `New route ${change.routeName} requires significant capital investment of PKR ${estimatedCost.toLocaleString()}`,
            mitigation: 'Phase implementation and secure additional funding'
          });
          
        } else if (change.action === 'remove') {
          totalDistanceChange -= distance;
          totalCostChange -= estimatedCost;
          routeCountChange -= 1;
          mobilityChangeTotal -= 8; // Mobility reduction
          
          console.log(`Removed route ${change.routeName}: -${distance}km, -PKR ${estimatedCost}`);
          
          // Add social risk for route removal
          impacts.risks.push({
            category: 'social',
            level: 'high',
            description: `Removing route ${change.routeName} may impact accessibility for ${Math.round(distance * 100)} potential passengers`,
            mitigation: 'Provide alternative service or consultation with affected communities'
          });
          
        } else if (change.action === 'modify') {
          // For modifications, assume neutral cost but potential mobility improvement
          mobilityChangeTotal += 2;
          
          impacts.risks.push({
            category: 'operational',
            level: 'low',
            description: `Modifying route ${change.routeName} requires operational adjustments`,
            mitigation: 'Coordinate with operations team and provide adequate training'
          });
        }
      } catch (error) {
        console.error('Error processing route change:', error);
        impacts.risks.push({
          category: 'operational',
          level: 'medium',
          description: `Error processing route change for ${change.routeName || 'unnamed route'}`,
          mitigation: 'Review route change parameters and resubmit'
        });
      }
    }
    
    // Apply cumulative changes
    impacts.metrics.totalDistance += totalDistanceChange;
    impacts.metrics.estimatedCost += totalCostChange;
    impacts.metrics.totalRoutes += routeCountChange;
    impacts.improvements.mobilityChange = mobilityChangeTotal;
    impacts.improvements.costChange = totalCostChange;
    
    console.log(`Route changes summary: Distance change: ${totalDistanceChange}km, Cost change: PKR ${totalCostChange}, Route count change: ${routeCountChange}`);
  }

  // Analyze schedule adjustments
  console.log('Analyzing schedule adjustments:', modifications.scheduleAdjustments?.length || 0);
  if (modifications.scheduleAdjustments && modifications.scheduleAdjustments.length > 0) {
    let ridershipChange = 0;
    let operationalCostChange = 0;
    
    for (const adjustment of modifications.scheduleAdjustments) {
      console.log('Processing schedule adjustment:', adjustment);
      
      try {
        // Frequency changes impact ridership and costs
        const ridershipImpact = 100; // Estimated ridership change per adjustment
        const costImpact = 50000; // PKR operational cost change per adjustment
        
        ridershipChange += ridershipImpact;
        operationalCostChange += costImpact;
        
        impacts.risks.push({
          category: 'operational',
          level: 'low',
          description: `Schedule changes for ${adjustment.routeName} (${adjustment.currentFrequency} → ${adjustment.newFrequency}) require driver scheduling adjustments`,
          mitigation: 'Coordinate with operations team and provide adequate notice'
        });
      } catch (error) {
        console.error('Error processing schedule adjustment:', error);
        impacts.risks.push({
          category: 'operational',
          level: 'medium',
          description: `Error processing schedule adjustment for ${adjustment.routeName || 'unnamed route'}`,
          mitigation: 'Review adjustment parameters and resubmit'
        });
      }
    }
    
    impacts.improvements.ridership += ridershipChange;
    impacts.improvements.costChange += operationalCostChange;
    impacts.metrics.ridership += ridershipChange;
    
    console.log(`Schedule adjustments summary: Ridership change: +${ridershipChange}, Operational cost change: +PKR ${operationalCostChange}`);
  }

  // Calculate efficiency changes
  try {
    if (impacts.metrics.totalDistance > 0 && impacts.metrics.totalMobility >= 0) {
      const newEfficiency = impacts.metrics.totalMobility / impacts.metrics.totalDistance;
      impacts.metrics.networkEfficiency = newEfficiency;
      
      if (baseline.networkEfficiency > 0) {
        impacts.improvements.efficiencyChange = 
          ((newEfficiency - baseline.networkEfficiency) / baseline.networkEfficiency) * 100;
      }
      
      console.log(`Efficiency calculation: Old: ${baseline.networkEfficiency}, New: ${newEfficiency}, Change: ${impacts.improvements.efficiencyChange}%`);
    }
  } catch (error) {
    console.error('Error calculating efficiency changes:', error);
    impacts.improvements.efficiencyChange = 0;
  }
  
  // Calculate final percentage changes for improvements
  try {
    if (baseline.totalDistance > 0) {
      impacts.improvements.distanceChange = ((impacts.metrics.totalDistance - baseline.totalDistance) / baseline.totalDistance) * 100;
    }
    
    if (baseline.totalMobility > 0) {
      impacts.improvements.mobilityChange = ((impacts.metrics.totalMobility - baseline.totalMobility) / baseline.totalMobility) * 100;
    }
  } catch (error) {
    console.error('Error calculating percentage changes:', error);
  }
  
  console.log('Final impacts calculated:', {
    distanceChange: impacts.improvements.distanceChange,
    mobilityChange: impacts.improvements.mobilityChange,
    costChange: impacts.improvements.costChange,
    efficiencyChange: impacts.improvements.efficiencyChange,
    risksCount: impacts.risks.length
  });

  return impacts;
}

function generateSummaryCSV(session) {
  let csv = 'Category,Metric,Baseline Value,Current Value,Change,Unit\n';
  
  csv += `Network,Total Distance,${session.baselineMetrics.totalDistance},${session.baselineMetrics.totalDistance},0.0,km\n`;
  csv += `Network,Total Mobility,${session.baselineMetrics.totalMobility},${session.baselineMetrics.totalMobility},0.0,index\n`;
  csv += `Network,Network Efficiency,${session.baselineMetrics.networkEfficiency.toFixed(4)},${session.baselineMetrics.networkEfficiency.toFixed(4)},0.0,ratio\n`;
  csv += `Financial,Estimated Cost,${session.baselineMetrics.estimatedCost.toLocaleString()},${session.baselineMetrics.estimatedCost.toLocaleString()},0,PKR\n`;
  
  return csv;
}

function generateImplementationCSV(session) {
  let csv = 'Phase,Name,Description,Start Date,End Date,Budget (PKR),Status\n';
  
  if (session.decisions && session.decisions.implementationPlan) {
    session.decisions.implementationPlan.phases.forEach(phase => {
      csv += `${phase.phaseNumber},"${phase.name}","${phase.description}",${phase.startDate || 'TBD'},${phase.endDate || 'TBD'},${phase.budget || 0},Planned\n`;
    });
  }
  
  return csv;
}

function generateScenariosCSV(session) {
  let csv = 'Scenario,Distance (km),Mobility,Efficiency,Cost (PKR),Ridership,Confidence\n';
  
  session.scenarios.forEach(scenario => {
    if (scenario.predictedImpacts && scenario.predictedImpacts.metrics) {
      const metrics = scenario.predictedImpacts.metrics;
      csv += `"${scenario.name}",${metrics.totalDistance || 0},${metrics.totalMobility || 0},${metrics.networkEfficiency || 0},${metrics.estimatedCost || 0},${metrics.ridership || 0},${scenario.predictedImpacts.confidence?.overall || 0}\n`;
    }
  });
  
  return csv;
}

module.exports = {
  getServicePlanningPage,
  loadOptimizationData,
  createPlanningSession,
  getPlanningSession,
  addScenario,
  simulateScenario,
  finalizeDecision,
  exportPlanningData
};
