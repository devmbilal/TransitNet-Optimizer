const express = require('express');
const router = express.Router();
const servicePlanningController = require('../controllers/servicePlanning/servicePlanningController');
const isAuthenticated = require('../middleware/auth');

// All routes require authentication
router.use(isAuthenticated);

// Main service planning page
router.get('/', servicePlanningController.getServicePlanningPage);

// Data loading and session management
router.get('/api/optimization-data', servicePlanningController.loadOptimizationData);
router.post('/api/sessions', servicePlanningController.createPlanningSession);
router.get('/api/sessions/:sessionId', servicePlanningController.getPlanningSession);

// Scenario management
router.post('/api/sessions/:sessionId/scenarios', servicePlanningController.addScenario);
router.post('/api/sessions/:sessionId/simulate', servicePlanningController.simulateScenario);

// Decision finalization
router.post('/api/sessions/:sessionId/finalize', servicePlanningController.finalizeDecision);

// Export functionality
router.get('/api/sessions/:sessionId/export', servicePlanningController.exportPlanningData);

module.exports = router;
