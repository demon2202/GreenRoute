const { verifyToken } = require('../utils/token');
const User = require('../models/User');

module.exports = {
    ensureAuth: async function (req, res, next) {
        // 1. Check Passport session cookie (desktop / same-origin)
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        // 2. Check Authorization Bearer token (mobile / cross-origin)
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = null;

        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (token) {
            const decoded = verifyToken(token);
            if (decoded && decoded.id) {
                try {
                    const user = await User.findById(decoded.id);
                    if (user) {
                        req.user = user;
                        return next();
                    }
                } catch (err) {
                    console.error('Error fetching user in ensureAuth:', err);
                }
            }
        }

        return res.status(401).json({ msg: 'User not authenticated' });
    },
};