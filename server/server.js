require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');

const setupSocket = require('./socket');

require('./config/passport');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

app.set('trust proxy', 1);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com',
                    'https://api.mapbox.com'
                ],

                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com'
                ],

                scriptSrc: [
                    "'self'",
                    'https://api.mapbox.com'
                ],

                connectSrc: [
                    "'self'",
                    'https://api.mapbox.com',
                    'https://events.mapbox.com',
                    process.env.CLIENT_URL,
                    process.env.SERVER_URL,
                    'https:',
                    'wss:'
                ],

                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    'https:'
                ],

                workerSrc: [
                    "'self'",
                    'blob:'
                ],

                objectSrc: ["'none'"]
            }
        }
    })
);

app.use(mongoSanitize());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});

app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts'
});

app.use('/api/auth', authLimiter);

app.use(
    cors({
        origin: [
            process.env.CLIENT_URL,
            'https://green-route-seven.vercel.app'
        ],
        credentials: true
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB connected successfully');
})
.catch(err => {
    console.error('MongoDB connection error:', err);
});

app.use(
    session({
        secret: process.env.COOKIE_KEY,

        resave: false,
        saveUninitialized: false,

        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            touchAfter: 24 * 3600
        }),

        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',

            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        message: 'Internal server error'
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

process.on('SIGTERM', () => {

    console.log('SIGTERM received');

    server.close(() => {

        mongoose.connection.close();

        console.log('Server closed');
    });
});

module.exports = app;
