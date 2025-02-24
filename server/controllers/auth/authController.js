const User = require("../../models/auth/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, userType, organization } = req.body;

    // Validate required fields
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if userType is valid
    if (!["PolicyMaker", "Engineer"].includes(userType)) {
      return res.status(400).json({ message: "Invalid userType" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique userID
    const userID = uuidv4(); 

    // Create new user
    user = new User({
      userID,
      name,
      email,
      password: hashedPassword,
      userType,
      organization: organization || "" 
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully", userID });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.userID, userType: user.userType }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      user: {
        userID: user.userID,
        name: user.name,
        email: user.email,
        userType: user.userType,
        organization: user.organization
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { registerUser, loginUser };
