const mongoose = require('mongoose');

const RoadDistanceCacheSchema = new mongoose.Schema({
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  road_distance_km: {
    type: Number,
    required: false // Can be null if API call failed
  },
  api_source: {
    type: String,
    enum: ['ORS', 'Google'],
    default: 'ORS'
  },
  cached_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast lookups
RoadDistanceCacheSchema.index({ origin: 1, destination: 1, region: 1 }, { unique: true });

// Static method to get cached road distance
RoadDistanceCacheSchema.statics.getCachedDistance = async function(origin, destination, region) {
  return await this.findOne({ 
    origin: origin.trim(), 
    destination: destination.trim(), 
    region: region.trim() 
  });
};

// Static method to cache road distance
RoadDistanceCacheSchema.statics.cacheDistance = async function(origin, destination, region, distance, source = 'ORS') {
  try {
    const result = await this.findOneAndUpdate(
      { 
        origin: origin.trim(), 
        destination: destination.trim(), 
        region: region.trim() 
      },
      {
        road_distance_km: distance,
        api_source: source,
        cached_at: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    return result;
  } catch (error) {
    console.error('Error caching distance:', error.message);
    throw error;
  }
};

module.exports = mongoose.model('RoadDistanceCache', RoadDistanceCacheSchema);
