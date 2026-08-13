const express = require('express');
const passport = require('passport');

const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/token');

router.post('/register', async (req, res) => {
    const { displayName, email, password } = req.body;

    if (!displayName || !email || !password) {
        return res.status(400).json({
            message: 'Please enter all fields'
        });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            message: 'Please enter a valid email address'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters'
        });
    }

    try {
        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }

        const user = new User({
            displayName,
            email: email.toLowerCase(),
            password
        });

        await user.save();

        req.login(user, err => {
            if (err) {
                return res.status(500).json({
                    message: 'Login after registration failed'
                });
            }

            const token = generateToken(user);

            res.status(201).json({
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                image: user.image,
                theme: user.theme,
                preferences: user.preferences,
                territoryStats: user.territoryStats,
                token
            });
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {

        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(400).json({
                message: info ? info.message : 'Invalid credentials'
            });
        }

        req.logIn(user, err => {

            if (err) {
                return next(err);
            }

            const token = generateToken(user);

            return res.status(200).json({
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                image: user.image,
                theme: user.theme,
                preferences: user.preferences,
                territoryStats: user.territoryStats,
                token
            });
        });

    })(req, res, next);
});

router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get(
    '/google/callback',
    (req, res, next) => {
        const clientUrl = process.env.CLIENT_URL || 'https://green-route-seven.vercel.app' || 'http://localhost:5173';
        const cleanClientUrl = clientUrl.replace(/\/$/, '');
        passport.authenticate('google', {
            failureRedirect: `${cleanClientUrl}/login`
        })(req, res, next);
    },
    (req, res) => {
        const clientUrl = process.env.CLIENT_URL || 'https://green-route-seven.vercel.app' || 'http://localhost:5173';
        const cleanClientUrl = clientUrl.replace(/\/$/, '');
        
        // Generate mobile-friendly auth token for cross-domain OAuth on iOS/Safari/Android
        const token = generateToken(req.user);
        if (token) {
            return res.redirect(`${cleanClientUrl}/login?token=${token}&auth=google`);
        }
        res.redirect(cleanClientUrl);
    }
);

router.post('/logout', (req, res, next) => {
    req.logout(err => {

        if (err) {
            return next(err);
        }

        req.session.destroy(err => {

            if (err) {
                return res.status(500).json({
                    message: 'Logout failed'
                });
            }

            res.clearCookie('gr.sid');

            res.json({
                message: 'Logout successful'
            });
        });
    });
});

router.get('/current_user', async (req, res) => {
    // 1. Session user (desktop cookie)
    if (req.user) {
        return res.json({
            id: req.user._id,
            displayName: req.user.displayName,
            email: req.user.email,
            image: req.user.image,
            theme: req.user.theme,
            preferences: req.user.preferences,
            territoryStats: req.user.territoryStats
        });
    }

    // 2. Token header or query fallback (mobile / cross-domain)
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
                    return res.json({
                        id: user._id,
                        displayName: user.displayName,
                        email: user.email,
                        image: user.image,
                        theme: user.theme,
                        preferences: user.preferences,
                        territoryStats: user.territoryStats
                    });
                }
            } catch (err) {
                console.error('Error fetching current_user by token:', err);
            }
        }
    }

    res.json(null);
});

module.exports = router;