const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Service Planning Session Model
 * Tracks decision-making sessions for transit authorities
 * Integrates with Route Optimization results for data-driven planning
 */

const ServicePlanningSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: {
    type: String,
    default: () => `sp_${uuidv4()}`,
    unique: true,
    index: true
  },
  
  // User and region information
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  region: {
    type: String,
    required: true,
    index: true
  },
  
  // Source optimization session
  optimizationSessionId: {
    type: String,
    required: true
  },
  
  // Session metadata
  title: {
    type: String,
    required: true,
    default: 'Service Planning Session'
  },
  
  description: {
    type: String,
    default: ''
  },
  
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'review', 'finalized', 'implemented'],
    default: 'draft',
    index: true
  },
  
  // Baseline metrics from optimization
  baselineMetrics: {
    totalDistance: Number,
    totalMobility: Number,
    networkEfficiency: Number,
    totalRoutes: Number,
    estimatedCost: Number, // PKR
    
    // Original optimization improvements
    optimizationImprovements: {
      distanceReduction: Number,
      mobilityIncrease: Number,
      efficiencyGain: Number
    }
  },
  
  // Scenario configurations
  scenarios: [{
    scenarioId: {
      type: String,
      default: () => `scenario_${Date.now()}`
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    isBaseline: {
      type: Boolean,
      default: false
    },
    
    // Scenario modifications
    modifications: {
      routeChanges: [{
        action: {
          type: String,
          enum: ['add', 'remove', 'modify']
        },
        routeId: String,
        routeName: String,
        routeDetails: {
          fromArea: String,
          toArea: String,
          distance: Number,
          estimatedCost: Number, // PKR
          stops: [String],
          frequency: String, // e.g., "Every 15 minutes"
          operatingHours: String
        }
      }],
      
      scheduleAdjustments: [{
        routeId: String,
        routeName: String,
        currentFrequency: String,
        newFrequency: String,
        impactDescription: String
      }],
      
      capacityChanges: [{
        routeId: String,
        routeName: String,
        currentCapacity: Number,
        newCapacity: Number,
        vehicleType: String
      }]
    },
    
    // Predicted impacts
    predictedImpacts: {
      metrics: {
        totalDistance: Number,
        totalMobility: Number,
        networkEfficiency: Number,
        totalRoutes: Number,
        estimatedCost: Number, // PKR
        ridership: Number
      },
      
      improvements: {
        distanceChange: Number, // percentage
        mobilityChange: Number, // percentage  
        efficiencyChange: Number, // percentage
        costChange: Number, // PKR
        ridership: Number
      },
      
      // Risk assessments
      risks: [{
        category: {
          type: String,
          enum: ['financial', 'operational', 'social', 'environmental']
        },
        level: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        description: String,
        mitigation: String
      }],
      
      // Confidence levels
      confidence: {
        overall: Number, // 0-100
        ridership: Number,
        cost: Number,
        efficiency: Number
      }
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Final decisions
  decisions: {
    approvedScenario: {
      scenarioId: String,
      approvalDate: Date,
      approvedBy: String
    },
    
    implementationPlan: {
      phases: [{
        phaseNumber: Number,
        name: String,
        description: String,
        startDate: Date,
        endDate: Date,
        budget: Number, // PKR
        routes: [String],
        milestones: [String]
      }],
      
      totalBudget: Number, // PKR
      totalTimeframe: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      }
    },
    
    stakeholders: [{
      name: String,
      role: String,
      department: String,
      email: String,
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected']
      },
      comments: String,
      approvalDate: Date
    }],
    
    decisionRationale: String,
    alternativesConsidered: [String]
  },
  
  // Export and documentation
  exports: [{
    exportType: {
      type: String,
      enum: ['summary_report', 'detailed_analysis', 'implementation_plan', 'stakeholder_presentation']
    },
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'powerpoint']
    },
    generatedAt: Date,
    downloadPath: String,
    generatedBy: String
  }],
  
  // Collaboration
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'contributor', 'decision_maker']
    },
    permissions: [String],
    invitedAt: Date,
    lastActivity: Date
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  finalizedAt: Date,
  implementedAt: Date
});

// Indexes for performance
ServicePlanningSessionSchema.index({ userId: 1, region: 1 });
ServicePlanningSessionSchema.index({ optimizationSessionId: 1 });
ServicePlanningSessionSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware
ServicePlanningSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update scenario timestamps
  if (this.scenarios) {
    this.scenarios.forEach(scenario => {
      if (scenario.isModified()) {
        scenario.updatedAt = new Date();
      }
    });
  }
  
  next();
});

// Static methods
ServicePlanningSessionSchema.statics.generateSessionId = function() {
  return `sp_${uuidv4()}`;
};

// Find sessions by user and region
ServicePlanningSessionSchema.statics.findByUserAndRegion = function(userId, region) {
  return this.find({ userId, region }).sort({ createdAt: -1 });
};

// Find sessions based on optimization results
ServicePlanningSessionSchema.statics.findByOptimization = function(optimizationSessionId) {
  return this.find({ optimizationSessionId }).sort({ createdAt: -1 });
};

// Instance methods
ServicePlanningSessionSchema.methods.addScenario = function(scenarioData) {
  this.scenarios.push({
    ...scenarioData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

ServicePlanningSessionSchema.methods.updateScenario = function(scenarioId, updateData) {
  const scenario = this.scenarios.id(scenarioId);
  if (scenario) {
    Object.assign(scenario, updateData);
    scenario.updatedAt = new Date();
    return this.save();
  }
  throw new Error('Scenario not found');
};

ServicePlanningSessionSchema.methods.finalizeDecision = function(decisionData) {
  this.decisions = {
    ...this.decisions,
    ...decisionData
  };
  this.status = 'finalized';
  this.finalizedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ServicePlanningSession', ServicePlanningSessionSchema);
