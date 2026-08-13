const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided, authorization denied.' });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
        }

        req.user = decoded;
        next();
    });
};

// For endpoints that are public but should still know who's asking (e.g. to
// filter out the logged-in user's own listings). Never rejects the request —
// req.user is simply left undefined when there's no/invalid token.
const attachUserIfPresent = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next();

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err && decoded) {
            req.user = decoded;
        }
        next();
    });
};

// Gate for every Admin API. Re-checks the caller's role against the User
// document on every request (not just what the JWT claims) so a role change
// (e.g. deactivation, demotion) takes effect immediately without needing a
// new token.
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided, authorization denied.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
        }

        try {
            const user = await User.findById(decoded.userId);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required.' });
            }

            req.user = decoded;
            req.adminUser = user;
            next();
        } catch (error) {
            return res.status(500).json({ message: 'Server Error', error: error.message });
        }
    });
};

module.exports = {
    isAuthenticated,
    attachUserIfPresent,
    requireAdmin,
};