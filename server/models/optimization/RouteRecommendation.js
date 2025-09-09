const mongoose = require('mongoose');

const RouteRecommendationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    ref: 'OptimizationSession'
  },
  priority: {
    type: Number,
    required: true,
    min: 1
  },
  actionType: {
    type: String,
    enum: ['add', 'modify', 'remove', 'reroute'],
    required: true
  },
  recommendationType: {
    type: String,
    enum: ['high_impact', 'cost_effective', 'quick_win', 'long_term'],
    required: true
  },
  fromArea: {
    type: String,
    required: true
  },
  toArea: {
    type: String,
    required: true
  },
  currentRoute: {
    exists: { type: Boolean, default: false },
    distance: { type: Number, default: null },
    mobility: { type: Number, default: null },
    routeNames: [String] // Names of existing routes serving this connection
  },
  recommendedRoute: {
    distance: {
      type: Number,
      required: true
    },
    mobility: {
      type: Number,
      required: true
    },
    weight: {
      type: Number,
      required: true
    },
    path: [{
      area: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      estimatedStops: [String] // Suggested stop names along the path
    }],
    estimatedTravelTime: Number, // in minutes
    frequency: String // Suggested service frequency (e.g., "every 15 mins")
  },
  expectedImprovement: {
    distanceSaved: {
      type: Number,
      default: 0
    },
    mobilityIncrease: {
      type: Number,
      default: 0
    },
    efficiencyGain: {
      type: Number,
      default: 0
    },
    peopleServed: {
      type: Number,
      default: 0
    },
    impactScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },
  implementationDetails: {
    estimatedCost: {
      type: Number,
      default: 0 // in currency units
    },
    difficulty: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    timeframe: {
      type: String,
      enum: ['immediate', 'short_term', 'medium_term', 'long_term'],
      default: 'medium_term'
    },
    prerequisites: [String], // Other recommendations that should be implemented first
    constraints: [String] // Potential implementation challenges
  },
  analysis: {
    mobilityDemand: {
      peakHours: Number,
      offPeakHours: Number,
      dailyAverage: Number
    },
    competingRoutes: [{
      routeName: String,
      overlap: Number, // Percentage of overlap with recommended route
      impact: String // 'complement', 'compete', 'neutral'
    }],
    areaCharacteristics: {
      fromArea: {
        type: String, // 'residential', 'commercial', 'industrial', 'mixed'
        population: Number,
        economicActivity: String
      },
      toArea: {
        type: String,
        population: Number,
        economicActivity: String
      }
    }
  },
  status: {
    type: String,
    enum: ['proposed', 'under_review', 'approved', 'implemented', 'rejected'],
    default: 'proposed'
  },
  feedback: {
    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    userComments: String,
    expertReview: String,
    implementationNotes: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
RouteRecommendationSchema.index({ sessionId: 1, priority: 1 });
RouteRecommendationSchema.index({ actionType: 1, recommendationType: 1 });
RouteRecommendationSchema.index({ 'expectedImprovement.impactScore': -1 });
RouteRecommendationSchema.index({ status: 1, createdAt: -1 });

// Update the updatedAt field before saving
RouteRecommendationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get recommendations by priority
RouteRecommendationSchema.statics.getByPriority = async function(sessionId, limit = 10) {
  return await this.find({ sessionId })
    .sort({ priority: 1, 'expectedImprovement.impactScore': -1 })
    .limit(limit);
};

// Static method to get recommendations by type
RouteRecommendationSchema.statics.getByType = async function(sessionId, recommendationType) {
  return await this.find({ sessionId, recommendationType })
    .sort({ 'expectedImprovement.impactScore': -1 });
};

// Method to calculate ROI
RouteRecommendationSchema.methods.calculateROI = function() {
  if (this.implementationDetails.estimatedCost === 0) return Infinity;
  
  const benefit = this.expectedImprovement.mobilityIncrease * 1000 + 
                 this.expectedImprovement.distanceSaved * 100 +
                 this.expectedImprovement.peopleServed * 10;
                 
  return benefit / this.implementationDetails.estimatedCost;
};

// Method to get implementation readiness score
RouteRecommendationSchema.methods.getReadinessScore = function() {
  let score = 50; // Base score
  
  // Adjust based on difficulty
  switch (this.implementationDetails.difficulty) {
    case 'low': score += 20; break;
    case 'medium': score += 10; break;
    case 'high': score -= 10; break;
  }
  
  // Adjust based on timeframe
  switch (this.implementationDetails.timeframe) {
    case 'immediate': score += 15; break;
    case 'short_term': score += 10; break;
    case 'medium_term': score += 5; break;
    case 'long_term': score -= 5; break;
  }
  
  // Adjust based on prerequisites
  score -= this.implementationDetails.prerequisites.length * 5;
  
  // Adjust based on constraints
  score -= this.implementationDetails.constraints.length * 3;
  
  return Math.max(0, Math.min(100, score));
};

module.exports = mongoose.model('RouteRecommendation', RouteRecommendationSchema);
