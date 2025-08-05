require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Passport Config
require('./config/passport');

// Import Route Files
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// Core Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Session Middleware
app.use(session({
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if you are using https
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Use the Route Files
// This line creates the `/api/auth` prefix
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));