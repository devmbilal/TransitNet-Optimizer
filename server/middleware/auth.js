const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        // User is authenticated via session
        return next();
    }
    // If not authenticated, redirect to login
    res.redirect('/login');
};

module.exports = isAuthenticated;