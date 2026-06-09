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
    max: 200,
    message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Auth limiter only on mutation endpoints — NOT on /current_user which fires every page load
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many login attempts, please try again later'
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google',   authLimiter);

const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
    'https://green-route-seven.vercel.app',
    // Allow localhost in development
    'http://localhost:3000',
    'http://localhost:3001',
].filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no origin (curl, Postman, same-origin)
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true
    })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '100kb'
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
        name: 'gr.sid',         // custom name hides framework fingerprint
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
  // Public endpoint — allow any origin so the frontend wake-up ping always works
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* ─── Keep-alive self-ping ──────────────────────────────────────────────────
   Render.com free tier shuts the server down after 15 min of inactivity.
   Pinging ourselves every 13 min keeps it warm at zero extra cost.
─────────────────────────────────────────────────────────────────────────── */
const SELF_URL = process.env.SERVER_URL;
if (SELF_URL && process.env.NODE_ENV === 'production') {
  const https = require('https');
  const keepAlive = () => {
    https.get(`${SELF_URL}/health`, (res) => {
      // success — server stays warm
    }).on('error', () => {
      // ignore errors from self-ping
    });
  };
  // Start pinging 5 min after boot, then every 13 min
  setTimeout(() => {
    keepAlive();
    setInterval(keepAlive, 13 * 60 * 1000);
  }, 5 * 60 * 1000);
}

app.use((err, req, res, next) => {

    // Only log stack in development; avoid leaking internals in production
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(`[${new Date().toISOString()}] ${err.message}`);
    }

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
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