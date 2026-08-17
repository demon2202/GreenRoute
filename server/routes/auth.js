const express = require('express');
const passport = require('passport');
const crypto = require('crypto');

const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/token');

const sanitizeName = (s) =>
    String(s).replace(/[<>\x00-\x1F\x7F]/g, '').trim().slice(0, 50);

const exchangeCodes = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [code, entry] of exchangeCodes.entries()) {
        if (entry.expiresAt < now) {
            exchangeCodes.delete(code);
        }
    }
}, 60 * 1000).unref();

router.post('/register', async (req, res) => {
    const { displayName, email, password } = req.body;

    if (!displayName || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const safeDisplayName = sanitizeName(displayName);
        if (!safeDisplayName) {
            return res.status(400).json({ message: 'Display name must contain valid characters.' });
        }

        const user = new User({
            displayName: safeDisplayName,
            email: email.toLowerCase(),
            password
        });

        await user.save();

        req.session.regenerate(err => {
            if (err) {
                return res.status(500).json({ message: 'Session error during registration' });
            }

            req.login(user, loginErr => {
                if (loginErr) {
                    return res.status(500).json({ message: 'Login after registration failed' });
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
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return res.status(400).json({ message: info ? info.message : 'Invalid credentials' });
        }

        req.session.regenerate(regenErr => {
            if (regenErr) return next(regenErr);

            req.logIn(user, loginErr => {
                if (loginErr) return next(loginErr);

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
            failureRedirect: `${cleanClientUrl}/login?error=auth_failed`
        })(req, res, next);
    },
    (req, res) => {
        const clientUrl = process.env.CLIENT_URL || 'https://green-route-seven.vercel.app' || 'http://localhost:5173';
        const cleanClientUrl = clientUrl.replace(/\/$/, '');

        if (!req.user) {
            return res.redirect(`${cleanClientUrl}/login?error=auth_failed`);
        }

        const exchangeCode = crypto.randomBytes(32).toString('hex');
        exchangeCodes.set(exchangeCode, {
            userId: req.user._id,
            expiresAt: Date.now() + 30 * 1000
        });

        res.redirect(`${cleanClientUrl}/login?code=${exchangeCode}`);
    }
);

router.post('/exchange', async (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Authorization code is required' });
    }

    const entry = exchangeCodes.get(code);
    if (!entry) {
        return res.status(400).json({ message: 'Invalid or expired authorization code' });
    }

    exchangeCodes.delete(code);

    if (Date.now() > entry.expiresAt) {
        return res.status(400).json({ message: 'Authorization code has expired' });
    }

    try {
        const user = await User.findById(entry.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.session.regenerate(err => {
            if (err) {
                return res.status(500).json({ message: 'Session error during auth exchange' });
            }

            req.login(user, loginErr => {
                if (loginErr) {
                    return res.status(500).json({ message: 'Login failed during auth exchange' });
                }

                const token = generateToken(user);
                return res.json({
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
        });
    } catch (err) {
        console.error('Error during code exchange:', err);
        return res.status(500).json({ message: 'Internal server error during exchange' });
    }
});

router.post('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);

        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: 'Logout failed' });
            }

            res.clearCookie('gr.sid');
            res.json({ message: 'Logout successful' });
        });
    });
});

router.get('/current_user', async (req, res) => {
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
                    return res.json({
                        id: user._id,
                        displayName: user.displayName,
                        email: user.email,
                        image: user.image,
                        theme: user.theme,
                        preferences: user.preferences,
                        territoryStats: user.territoryStats,
                        token: token
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
