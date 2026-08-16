const { verifyToken } = require('../utils/token');
const User = require('../models/User');

module.exports = {
    ensureAuth: async function (req, res, next) {
        // 1. Check Passport session cookie (desktop / same-origin)
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        // 2. Check Authorization Bearer token (mobile / cross-origin)
        // Note: req.query.token is intentionally NOT supported.
        // Tokens in URL query strings leak into access logs, browser history, and Referer headers.
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = null;

        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
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