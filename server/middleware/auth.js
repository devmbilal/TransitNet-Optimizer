const jwt = require('jsonwebtoken');

const isAuthenticated = (req, res, next) => {
    const token = req.session.user?.token || req.headers['authorization']?.split(' ')[1]; // Extract token from session or header

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded user info to request
        next();
    } catch (error) {
        res.redirect('/login');
    }
};

module.exports = isAuthenticated;