const express = require("express");
const isAuthenticated = require('../middleware/auth');
const userController = require("../controllers/user/userController");
const homeController = require("../controllers/home/homeController");
const aboutController = require("../controllers/about/aboutController");
const transportController = require("../controllers/transport/transportController");
const visualizationController = require("../controllers/visualization/visualizationController");

const router = express.Router();

//Public Routes
router.get('/', userController.login);
router.get('/signup', userController.signUp);
router.post('/signup', userController.postSignUp);
router.all('/login', userController.allLogin);
router.get('/logout', userController.logout);

//Protected Routes

//home
router.get('/home', isAuthenticated, homeController.homepage);
// About
router.get('/about', aboutController.about);

//Transport File Upload
router.get('/upload', isAuthenticated, transportController.getUploadPage);
router.get('/files', isAuthenticated, transportController.getFilesByRegion);
router.post('/upload',isAuthenticated, transportController.uploadFiles);
router.post('/delete/:region/:id',isAuthenticated, transportController.deleteFile);

//Visualization
router.get('/visualization',isAuthenticated, visualizationController.getVisualizationPage);
router.get('/visualization/files', isAuthenticated, visualizationController.getFilesByRegion);
router.get('/visualization/route',isAuthenticated, visualizationController.getRouteData);
router.get('/visualization/mobility',isAuthenticated, visualizationController.getMobilityData);


module.exports = router;
