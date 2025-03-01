const express = require("express");
const  userController = require("../controllers/user/userController");

const router = express.Router();


router.get('/', userController.login);
router.get('/signup', userController.signUp);
router.post('/signup', userController.postSignUp);
router.all('/login', userController.allLogin);
router.get('/logout', userController.logout);

module.exports = router;
