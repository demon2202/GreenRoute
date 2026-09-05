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
            return done(null, false, { message: 'Invalid email or password.' });
        }

        if (!user.password) {
            // Generic message — don't reveal the auth provider
            return done(null, false, { message: 'Invalid email or password.' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password.' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Google OAuth Strategy
// Only registered when credentials exist — otherwise the server would be
// unable to start at all for local/dev environments that never use Google
// sign-in (email/password auth is always available).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Safely parse email and handle cases where profile.emails is undefined or empty
            const email = profile.emails && profile.emails[0] && profile.emails[0].value
                ? profile.emails[0].value.toLowerCase()
                : null;

            const searchConditions = [{ googleId: profile.id }];
            if (email) {
                searchConditions.push({ email });
            }

            const existingUser = await User.findOne({ 
                $or: searchConditions
            });

            if (existingUser) {
                if (!existingUser.googleId) {
                    existingUser.googleId = profile.id;
                    await existingUser.save();
                }
                return done(null, existingUser);
            }

            // Fallback unique email if Google profile has no email associated
            const userEmail = email || `google-${profile.id}@greenroute.local`;

            const user = await new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: userEmail,
                image: profile.photos?.[0]?.value || ''
            }).save();
            
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    })
  );
}
