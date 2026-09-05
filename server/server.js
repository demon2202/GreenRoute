const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
const cookieParser = require('cookie-parser');

const setupSocket = require('./socket');

require('./config/passport');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const territoryRoutes = require('./routes/territory');
const terraRoutes = require('./routes/terra');

const app = express();


const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_SECURE = process.env.COOKIE_SECURE !== 'false';
const ALLOW_SIMULATION = process.env.ALLOW_SIMULATION === 'true';

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
                    "'self'"
                ],
                connectSrc: [
                    "'self'",
                    'https://api.mapbox.com',
                    'https://events.mapbox.com',
                    process.env.CLIENT_URL,
                    process.env.SERVER_URL,
                    'https://api.openweathermap.org',
                    'https://api.waqi.info',
                    process.env.SERVER_URL ? process.env.SERVER_URL.replace(/^https/, 'wss') : null,
                    'ws://localhost:5000',
                    'ws://127.0.0.1:5000',
                ].filter(Boolean),
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
    // Roomier than a plain API cap: a single TERRA story-card render fetches a
    // dozen+ map tiles through /api/terra/tile, so 200/15min would throttle
    // genuine users mid-export. Auth stays tightly capped below.
    windowMs: 15 * 60 * 1000,
    max: 2400,
    message: 'Too many requests from this IP'
});

app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many login attempts, please try again later'
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google',   authLimiter);
app.use('/api/auth/exchange', authLimiter);

const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : null,
    'https://green-route-seven.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
].filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
            const err = new Error(`CORS: origin ${origin} not allowed`);
            err.status = 403;
            err.isCorsError = true;
            cb(err);
        },
        credentials: true
    })
);

const originGuard = (req, res, next) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) return next();

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return next();

    const origin = req.headers.origin;
    if (!origin) return next();

    if (!ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ message: 'Forbidden: cross-origin request rejected.' });
    }
    next();
};

app.use(express.json({ limit: '15mb' })); // base64 photo data URIs need extra room
app.use(express.urlencoded({
    extended: true,
    limit: '15mb'
}));
app.use(cookieParser());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
// Uploaded media is served statically. Files are named with 96-bit random
// hex (unguessable) and served with nosniff + no directory listing so a
// browser can never be tricked into executing an uploaded file.
app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
        index: false,
        dotfiles: 'deny',
        maxAge: '7d',
        setHeaders: (res) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    })
);

const mongooseConnectionPromise = mongoose.connect(process.env.MONGO_URI)
.then(m => {
    console.log('MongoDB connected successfully');
    return m.connection.getClient();
})
.catch(err => {
    console.error('MongoDB connection error on startup:', err);
    throw err;
});

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

app.use(
    session({
        secret: process.env.COOKIE_KEY,
        name: 'gr.sid',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            clientPromise: mongooseConnectionPromise,
            touchAfter: 24 * 3600
        }),
        cookie: {
            secure: COOKIE_SECURE,
            httpOnly: true,
            sameSite: IS_PROD ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());
app.use('/api', originGuard);

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/territory', territoryRoutes);
app.use('/api/terra', terraRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const SELF_URL = process.env.SERVER_URL;
if (IS_PROD && SELF_URL) {
  const https = require('https');
  const keepAlive = () => {
    https.get(`${SELF_URL}/health`, () => {}).on('error', () => {});
  };
  setTimeout(() => {
    keepAlive();
    setInterval(keepAlive, 13 * 60 * 1000);
  }, 5 * 60 * 1000);
}

app.use((err, req, res, next) => {
    if (err.isCorsError || (err.message && err.message.startsWith('CORS:'))) {
        return res.status(403).json({ message: 'Forbidden: origin not allowed.' });
    }

    if (!IS_PROD) {
        console.error(err.stack);
    } else {
        console.error(`[${new Date().toISOString()}] ${err.message}`);
    }

    res.status(err.status || 500).json({
        message: IS_PROD ? 'Internal server error' : err.message
    });
});

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = setupSocket(server);
app.set('io', io);

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