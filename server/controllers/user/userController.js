const User = require('../../models/user/User');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const signUp = async (req, res) => {
    res.render('auth/signup.ejs', { layout: false, error: null });
}

const postSignUp = async (req, res) => {
    const { name, email, password, userType, organization } = req.body;

    if (!name || !email || !password || !userType) {
        return res.render("auth/signup", { 
            layout: false, 
            error: "Please provide all required fields" 
        });
    }

    if (password.length < 7) {
        return res.render("auth/signup", { 
            layout: false, 
            error: "Password must be at least 7 characters long" 
        });
    }

    if (!["PolicyMaker", "Engineer"].includes(userType)) {
        return res.render("auth/signup", { 
            layout: false, 
            error: "Invalid user type" 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("auth/signup", { 
                layout: false, 
                error: "User already exists" 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userID = uuidv4();

        const data = {
            userID,
            name,
            email,
            password: hashedPassword,
            userType,
            organization: organization || ""
        };

        await User.insertMany([data]);
        res.redirect(`/login`);
    } catch (error) {
        res.render("auth/signup", { 
            layout: false, 
            error: "Registration failed" 
        });
    }
}

const login = async (req, res) => {
    res.render('auth/login.ejs', { layout: false, error: null });
}

const allLogin = async (req, res) => {
    if (req.method === "GET") {
        res.render("auth/login", { layout: false, error: null });
    } else if (req.method === "POST") {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.render("auth/login", { 
                    layout: false, 
                    error: "Please provide email and password" 
                });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.render("auth/login", { 
                    layout: false, 
                    error: "Invalid credentials" 
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render("auth/login", { 
                    layout: false, 
                    error: "Wrong Password!" 
                });
            }

            const token = jwt.sign(
                { id: user.userID, userType: user.userType }, 
                process.env.JWT_SECRET, 
                { expiresIn: "1h" }
            );

            req.session.user = {
                userID: user.userID,
                name: user.name,
                email: user.email,
                userType: user.userType,
                organization: user.organization,
                token: token
            };

            res.redirect(`/home`);
        } catch {
            res.render("auth/login", { 
                layout: false, 
                error: "Wrong Details!" 
            });
        }
    }
}

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/home');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
}

module.exports = { 
    login,
    signUp,
    postSignUp,
    allLogin,
    logout
}