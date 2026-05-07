const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ 
            email: email.toLowerCase() 
        });

        if (!user) {
            return done(null, false, { message: 'No user found with that email address' });
        }

        if (!user.password) {
            return done(null, false, { message: 'Please sign in with Google or reset your password' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Google OAuth Strategy
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const existingUser = await User.findOne({ 
                $or: [
                    { googleId: profile.id },
                    { email: profile.emails[0].value.toLowerCase() }
                ]
            });

            if (existingUser) {
                if (!existingUser.googleId) {
                    existingUser.googleId = profile.id;
                    await existingUser.save();
                }
                return done(null, existingUser);
            }

            const user = await new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value.toLowerCase(),
                image: profile.photos[0].value
            }).save();
            
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    })
);
