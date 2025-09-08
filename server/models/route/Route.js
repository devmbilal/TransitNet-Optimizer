const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true,
    enum: ['Islamabad', 'Lahore', 'Karachi', 'Faisalabad']
  },
  stops: [{
    stopName: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  }],
  color: {
    type: String,
    default: '#3388ff' // Default blue color for route visualization
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

// Update the updatedAt field before saving
RouteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Route', RouteSchema);
