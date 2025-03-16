const User = require('../../models/user/User');
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const signUp = async (req, res) => {
    res.render('pages/auth/signup.ejs', { layout: false, error: null });
};

const postSignUp = async (req, res) => {
    const { name, email, password, userType, organization } = req.body;

    if (!name || !email || !password || !userType) {
        return res.render("pages/auth/signup", { 
            layout: false, 
            error: "Please provide all required fields" 
        });
    }

    if (password.length < 7) {
        return res.render("pages/auth/signup", { 
            layout: false, 
            error: "Password must be at least 7 characters long" 
        });
    }

    if (!["PolicyMaker", "Engineer"].includes(userType)) {
        return res.render("pages/auth/signup", { 
            layout: false, 
            error: "Invalid user type" 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("pages/auth/signup", { 
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
        console.error('Signup error:', error);
        res.render("pages/auth/signup", { 
            layout: false, 
            error: "Registration failed" 
        });
    }
};

const login = async (req, res) => {
    res.render('pages/auth/login.ejs', { layout: false, error: null });
};

const allLogin = async (req, res) => {
    if (req.method === "GET") {
        res.render("pages/auth/login", { layout: false, error: null });
    } else if (req.method === "POST") {
        try {
            const { email, password } = req.body;
        
            if (!email || !password) {
                return res.render("pages/auth/login", { 
                    layout: false, 
                    error: "Please provide email and password" 
                });
            }

            const user = await User.findOne({ email });

            if (!user) {
                return res.render("pages/auth/login", { 
                    layout: false, 
                    error: "Invalid email or user not found" 
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.render("pages/auth/login", { 
                    layout: false, 
                    error: "Incorrect password" 
                });
            }

            // Store user data in session
            req.session.user = {
                userID: user.userID,
                name: user.name,
                email: user.email,
                userType: user.userType,
                organization: user.organization
            };

            res.redirect(`/upload`);
        } catch (error) {
            
            res.render("pages/auth/login", { 
                layout: false, 
                error: "Login failed due to a server error" 
            });
        }
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/home');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};

module.exports = { 
    login,
    signUp,
    postSignUp,
    allLogin,
    logout
};