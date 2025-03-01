const express = require("express");
const isAuthenticated = require('../middleware/auth');
const userController = require("../controllers/user/userController");
const homeController = require("../controllers/home/homeController");
const aboutController = require("../controllers/about/aboutController");

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



module.exports = router;
