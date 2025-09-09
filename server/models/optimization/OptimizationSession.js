const mongoose = require('mongoose');

const OptimizationSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  region: {
    type: String,
    required: true,
    enum: ['Islamabad', 'Lahore', 'Karachi', 'Faisalabad']
  },
  userId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  currentPhase: {
    type: String,
    enum: ['dataPreparation', 'networkConstruction', 'distanceFiltering', 'mobilityOptimization', 'resultsGeneration'],
    default: 'dataPreparation'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  algorithmParams: {
    distanceThreshold: {
      type: Number,
      default: null // Auto-calculated if null
    },
    mobilityConstant: {
      type: Number,
      default: 0.1
    },
    proximityRadius: {
      type: Number,
      default: 2000 // meters
    },
    mobilityMatrixFileId: {
      type: String,
      default: null // If null, use all mobility matrix files
    },
    // Cost estimation parameters
    costPerKm: {
      type: Number,
      default: 50000 // Cost per kilometer in currency units
    },
    // Recommendation filtering parameters
    recommendationFilters: {
      minMobility: {
        type: Number,
        default: 0.5 // Minimum mobility value for recommendations
      },
      maxDistance: {
        type: Number,
        default: 40 // Maximum route distance in km
      },
      minEfficiency: {
        type: Number,
        default: 0.01 // Minimum mobility/distance ratio
      },
      maxRecommendations: {
        type: Number,
        default: 20 // Maximum number of recommendations to generate
      }
    }
  },
  phases: {
    dataPreparation: {
      status: { type: String, default: 'pending' },
      startTime: Date,
      endTime: Date,
      mobilityNodesCount: Number,
      mobilityMatrixSize: Number,
      cachedDistancesCount: Number
    },
    networkConstruction: {
      status: { type: String, default: 'pending' },
      startTime: Date,
      endTime: Date,
      totalEdges: Number,
      connectedNodes: Number,
      graphDensity: Number
    },
    distanceFiltering: {
      status: { type: String, default: 'pending' },
      startTime: Date,
      endTime: Date,
      calculatedThreshold: Number,
      edgesBefore: Number,
      edgesAfter: Number,
      reductionPercentage: Number
    },
    mobilityOptimization: {
      status: { type: String, default: 'pending' },
      startTime: Date,
      endTime: Date,
      maxMobility: Number,
      pathsCalculated: Number,
      averagePathLength: Number
    },
    resultsGeneration: {
      status: { type: String, default: 'pending' },
      startTime: Date,
      endTime: Date,
      recommendationsCount: Number,
      totalDistanceImprovement: Number,
      mobilityImprovementPercentage: Number
    }
  },
  results: {
    originalNetwork: {
      totalDistance: Number,
      totalMobility: Number,
      networkEfficiency: Number,
      connectivityIndex: Number
    },
    optimizedNetwork: {
      totalDistance: Number,
      totalMobility: Number,
      networkEfficiency: Number,
      connectivityIndex: Number
    },
    improvements: {
      distanceReduction: Number,
      mobilityIncrease: Number,
      efficiencyGain: Number,
      connectivityImprovement: Number
    },
    optimizedRoutes: [{
      fromArea: String,
      toArea: String,
      distance: Number,
      mobility: Number,
      weight: Number,
      path: [String] // Array of area names in path
    }]
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  durationMs: {
    type: Number,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Index for efficient querying
OptimizationSessionSchema.index({ userId: 1, createdAt: -1 });
OptimizationSessionSchema.index({ region: 1, status: 1 });

// Static method to generate unique session ID
OptimizationSessionSchema.statics.generateSessionId = function() {
  return 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Method to update phase status
OptimizationSessionSchema.methods.updatePhase = async function(phaseName, phaseData) {
  this.phases[phaseName] = { ...this.phases[phaseName], ...phaseData };
  this.currentPhase = phaseName;
  return await this.save();
};

// Method to update progress
OptimizationSessionSchema.methods.updateProgress = async function(progress, status = null) {
  this.progress = progress;
  if (status) {
    this.status = status;
  }
  return await this.save();
};

module.exports = mongoose.model('OptimizationSession', OptimizationSessionSchema);
