const express = require('express');
const passport = require('passport');

const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
    const { displayName, email, password } = req.body;

    if (!displayName || !email || !password) {
        return res.status(400).json({
            message: 'Please enter all fields'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: 'Password must be at least 6 characters'
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
                message: info.message
            });
        }

        req.logIn(user, err => {

            if (err) {
                return next(err);
            }

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

router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL}/login`
    }),
    (req, res) => {
        res.redirect(process.env.CLIENT_URL);
    }
);

router.get('/logout', (req, res, next) => {
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

            res.clearCookie('connect.sid');

            res.json({
                message: 'Logout successful'
            });
        });
    });
});

router.get('/current_user', (req, res) => {

    if (!req.user) {
        return res.json(null);
    }

    res.json({
        id: req.user._id,
        displayName: req.user.displayName,
        email: req.user.email,
        image: req.user.image,
        theme: req.user.theme,
        preferences: req.user.preferences
    });
});

module.exports = router;
