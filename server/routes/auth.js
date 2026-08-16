const express = require('express');
const passport = require('passport');

const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/token');

/**
 * Sanitize a user display name server-side:
 * - Strips < > and control characters (prevents HTML/XSS storage)
 * - Trims whitespace
 * - Caps at 50 chars (matches client-side escapeHtml + audit recommendation)
 */
const sanitizeName = (s) =>
    String(s).replace(/[<>\x00-\x1F\x7F]/g, '').trim().slice(0, 50);

const IS_PROD = process.env.NODE_ENV === 'production';

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

        // Sanitize displayName to strip HTML/control chars before storing.
        // This is the server-side defence that prevents XSS payloads reaching the DB.
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

        // Fix 12: Regenerate session ID on authentication to prevent session fixation.
        req.session.regenerate(err => {
            if (err) {
                return res.status(500).json({ message: 'Session error during registration' });
            }

            req.login(user, loginErr => {
                if (loginErr) {
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

        // Fix 12: Regenerate session ID before logging in to prevent session fixation.
        req.session.regenerate(regenErr => {
            if (regenErr) return next(regenErr);

            req.logIn(user, loginErr => {
                if (loginErr) {
                    return next(loginErr);
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

        // Fix 10: Do NOT put the JWT in the redirect URL (leaks into logs, Referer headers, browser history).
        // Instead, set a short-lived httpOnly cookie. The client exchanges it on the next /current_user call.
        const token = generateToken(req.user);
        if (token) {
            res.cookie('gr_oauth_token', token, {
                httpOnly: true,
                secure: IS_PROD,
                sameSite: IS_PROD ? 'none' : 'lax',
                maxAge: 2 * 60 * 1000  // 2 minutes â€” single-use, expires quickly
            });
        }
        // Redirect cleanly â€” no token in the URL
        res.redirect(`${cleanClientUrl}/login?auth=google`);
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
            res.clearCookie('gr_oauth_token');

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

    // 2. Check for the short-lived OAuth httpOnly cookie (Fix 10)
    // This is set by the Google callback and consumed exactly once.
    const oauthToken = req.cookies && req.cookies.gr_oauth_token;
    if (oauthToken) {
        // Clear it immediately â€” single-use
        res.clearCookie('gr_oauth_token');
        const decoded = verifyToken(oauthToken);
        if (decoded && decoded.id) {
            try {
                const user = await User.findById(decoded.id);
                if (user) {
                    // Establish a full session so subsequent requests use the session cookie
                    return req.session.regenerate(err => {
                        if (err) return res.json(null);
                        req.logIn(user, loginErr => {
                            if (loginErr) return res.json(null);
                            const newToken = generateToken(user);
                            return res.json({
                                id: user._id,
                                displayName: user.displayName,
                                email: user.email,
                                image: user.image,
                                theme: user.theme,
                                preferences: user.preferences,
                                territoryStats: user.territoryStats,
                                token: newToken
                            });
                        });
                    });
                }
            } catch (err) {
                console.error('Error fetching current_user by oauth cookie:', err);
            }
        }
    }

    // 3. Authorization Bearer token (mobile / cross-origin)
    // Note: req.query.token is intentionally NOT supported (Fix 10 â€” tokens in URLs leak).
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
