const mongoose = require('mongoose');

const TransportFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['transport', 'mobility'],
    required: true
  },
  region: {
    type: String,
    required: true
  },
  data: {
    type: Array, // Parsed CSV data as an array of objects
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

module.exports = mongoose.model('TransportFile', TransportFileSchema);