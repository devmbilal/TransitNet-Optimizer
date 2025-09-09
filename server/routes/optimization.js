const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimization/optimizationController');
const isAuthenticated = require('../middleware/auth');

// All routes require authentication
router.use(isAuthenticated);

// Main optimization page
router.get('/', optimizationController.getOptimizationPage);

// Data summary endpoint
router.get('/api/region-summary', optimizationController.getRegionDataSummary);

// Optimization process endpoints
router.post('/api/start', optimizationController.startOptimization);
router.get('/api/status/:sessionId', optimizationController.getOptimizationStatus);
router.get('/api/results/:sessionId', optimizationController.getOptimizationResults);

// Visualization data endpoint
router.get('/api/visualization/:sessionId', optimizationController.getVisualizationData);

// Session management endpoints
router.get('/api/sessions', optimizationController.getUserSessions);
router.delete('/api/sessions/:sessionId', optimizationController.deleteSession);

// Recommendation feedback endpoints
router.put('/api/recommendations/:recommendationId/feedback', optimizationController.updateRecommendationFeedback);

// Export endpoints
router.get('/api/export/:sessionId', optimizationController.exportResults);

module.exports = router;
