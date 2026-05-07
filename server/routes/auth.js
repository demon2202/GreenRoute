const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return done(null, false, { message: 'No user found with that email' });
            }

            const isMatch = await user.matchPassword(password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password' });
            }
        } catch (error) {
            return done(error);
        }
    }
));

router.post('/register', async (req, res) => {
    const { displayName, email, password } = req.body;

    // Basic validation
    if (!displayName || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User with that email already exists' });
        }

        const user = new User({ 
            displayName, 
            email: email.toLowerCase(), 
            password 
        });
        await user.save();

        req.login(user, (err) => {
            if (err) {
                console.error('Login after registration error:', err);
                return res.status(500).json({ message: 'Error logging in after registration' });
            }
            res.status(201).json({
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                image: user.image,
                theme: user.theme,
                preferences: user.preferences
            });
        });
    } catch (error) {
        console.error('Server registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.status(200).json({
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                image: user.image,
                theme: user.theme,
                preferences: user.preferences
            });
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
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Could not log out' });
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Logout successful' });
        });
    });
});

router.get('/current_user', (req, res) => {
    if (req.user) {
        res.json({
            id: req.user._id,
            displayName: req.user.displayName,
            email: req.user.email,
            image: req.user.image,
            theme: req.user.theme,
            preferences: req.user.preferences
        });
    } else {
        res.json(null);
    }
});

module.exports = router;
