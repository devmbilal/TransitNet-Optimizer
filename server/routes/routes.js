const express = require("express");
const isAuthenticated = require('../middleware/auth');
const  userController = require("../controllers/user/userController");

const router = express.Router();

//Public Routes
router.get('/', userController.login);
router.get('/signup', userController.signUp);
router.post('/signup', userController.postSignUp);
router.all('/login', userController.allLogin);
router.get('/logout', userController.logout);

//Protected Routes



module.exports = router;
