const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// --- Email & Password Registration ---
// This is the route that is currently missing or incorrect
router.post('/register', async (req, res) => {
    const { displayName, email, password } = req.body;

    // Basic validation
    if (!displayName || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User with that email already exists' });
        }

        const user = new User({ displayName, email, password });
        await user.save();

        // Log the user in directly after successful registration
        req.login(user, (err) => {
            if (err) {
                console.error('Login after registration error:', err);
                return res.status(500).json({ message: 'Error logging in after registration' });
            }
            res.status(201).json(user);
        });
    } catch (error) {
        console.error('Server registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// --- Email & Password Login ---
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.status(200).json(user);
        });
    })(req, res, next);
});

// --- Google OAuth Routes ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
    (req, res) => {
        res.redirect('http://localhost:3000/');
    }
);

// --- Logout & Current User ---
router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) { return next(err); }
        res.redirect('http://localhost:3000/login');
    });
});

router.get('/current_user', (req, res) => {
    res.send(req.user);
});

module.exports = router;