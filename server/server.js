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
const cookieParser = require('cookie-parser');

const setupSocket = require('./socket');

require('./config/passport');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const territoryRoutes = require('./routes/territory');

const app = express();

/* â”€â”€â”€ Startup configuration assertions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   IS_PROD is the single authoritative flag â€” computed once and asserted.
   Security controls must never silently change because NODE_ENV drifted.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const IS_PROD = process.env.NODE_ENV === 'production';

// COOKIE_SECURE defaults to true (safe). Set COOKIE_SECURE=false only for
// local HTTP dev where https is unavailable.
const COOKIE_SECURE = process.env.COOKIE_SECURE !== 'false';

// ALLOW_SIMULATION: set to 'true' only in dedicated testing/staging environments.
// Defaults to false. Never true in production.
const ALLOW_SIMULATION = process.env.ALLOW_SIMULATION === 'true';

console.log(`[startup] IS_PROD=${IS_PROD} | COOKIE_SECURE=${COOKIE_SECURE} | ALLOW_SIMULATION=${ALLOW_SIMULATION}`);

if (!IS_PROD) {
    console.warn('[SECURITY WARNING] Running in NON-PRODUCTION mode. Auth and security controls are relaxed.');
}

app.set('trust proxy', 1);

/* â”€â”€â”€ CSP: list exact hosts â€” no wildcards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Removed: 'https:' and 'wss:' wildcards from connectSrc (allowed any host).
   Removed: https://api.mapbox.com from scriptSrc (Mapbox GL is bundled via npm).
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

                // Mapbox GL JS is bundled via npm â€” 'self' is sufficient.
                // Do NOT add https://api.mapbox.com here (removed per audit Â§4.4).
                scriptSrc: [
                    "'self'",
                ],

                // Exact hosts only â€” no 'https:' or 'wss:' wildcards.
                connectSrc: [
                    "'self'",
                    'https://api.mapbox.com',
                    'https://events.mapbox.com',
                    process.env.CLIENT_URL,
                    process.env.SERVER_URL,
                    'https://api.openweathermap.org',
                    'https://api.waqi.info',
                    // WebSocket for socket.io â€” exact host only
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
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Auth limiter only on mutation endpoints â€” NOT on /current_user which fires every page load
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
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
].filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no origin (curl, Postman, same-origin)
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
            const err = new Error(`CORS: origin ${origin} not allowed`);
            err.status = 403;
            err.isCorsError = true;
            cb(err);
        },
        credentials: true
    })
);

/* â”€â”€â”€ CSRF: Origin / Referer guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   State-changing routes authenticated via session cookie are vulnerable to
   CSRF because the browser sends cookies cross-site (sameSite:none in prod).
   This middleware rejects requests whose Origin header is present but not in
   the allow-list. Bearer-token requests are inherently CSRF-safe and skip it.
   Ref: GreenRoute_Security_Audit.md Â§3.3
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const originGuard = (req, res, next) => {
    // Only applies to state-changing methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) return next();

    // If the request has an Authorization Bearer token it is CSRF-safe
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return next();

    const origin = req.headers.origin;
    // No origin header = same-origin or non-browser (curl/Postman/server-to-server) â€” allow
    if (!origin) return next();

    if (!ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ message: 'Forbidden: cross-origin request rejected.' });
    }
    next();
};

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '100kb'
}));
// cookie-parser must come before session/passport so req.cookies is populated
// for the gr_oauth_token httpOnly cookie set by the Google OAuth callback.
app.use(cookieParser());

app.use('/uploads', express.static('uploads'));

// Start Mongoose connection promise to reuse client connection
const mongooseConnectionPromise = mongoose.connect(process.env.MONGO_URI)
.then(m => {
    console.log('MongoDB connected successfully');
    return m.connection.getClient();
})
.catch(err => {
    console.error('MongoDB connection error on startup:', err);
    throw err;
});

// Handle post-connection errors
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

app.use(
    session({
        secret: process.env.COOKIE_KEY,
        name: 'gr.sid',         // custom name hides framework fingerprint
        resave: false,
        saveUninitialized: false,

        store: MongoStore.create({
            clientPromise: mongooseConnectionPromise,
            touchAfter: 24 * 3600
        }),

        cookie: {
            // COOKIE_SECURE defaults to true. Override with COOKIE_SECURE=false for local HTTP dev.
            secure: COOKIE_SECURE,
            httpOnly: true,
            // sameSite:none is required for the Vercelâ†’Render cross-origin setup.
            // It is mitigated by the originGuard CSRF middleware above.
            sameSite: IS_PROD ? 'none' : 'lax',

            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Apply CSRF origin guard to all API state-changing routes
app.use('/api', originGuard);

// Process-wide crash prevention handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/territory', territoryRoutes);

// /health â€” public endpoint, handled by global CORS middleware.
// Do NOT add manual Access-Control-Allow-Origin:* here (causes conflict with credentials:true).
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* â”€â”€â”€ Keep-alive self-ping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Render.com free tier shuts the server down after 15 min of inactivity.
   Pinging ourselves every 13 min keeps it warm at zero extra cost.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SELF_URL = process.env.SERVER_URL;
if (IS_PROD) {
  if (SELF_URL) {
    const https = require('https');
    const keepAlive = () => {
      https.get(`${SELF_URL}/health`, (res) => {
        // success â€” server stays warm
      }).on('error', () => {
        // ignore errors from self-ping
      });
    };
    // Start pinging 5 min after boot, then every 13 min
    setTimeout(() => {
      keepAlive();
      setInterval(keepAlive, 13 * 60 * 1000);
    }, 5 * 60 * 1000);
  } else {
    console.warn('WARNING: SERVER_URL environment variable is not defined. Self-ping keep-alive is disabled. The server will spin down after 15 minutes of inactivity.');
  }
}

/* â”€â”€â”€ Error handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CORS errors return 403 (not 500) per audit Â§5.4.
   Production errors hide stack traces.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.use((err, req, res, next) => {

    // CORS rejection â†’ 403 with a clear message, not a noisy 500
    if (err.isCorsError || (err.message && err.message.startsWith('CORS:'))) {
        return res.status(403).json({ message: 'Forbidden: origin not allowed.' });
    }

    // Only log stack in development; avoid leaking internals in production
    if (!IS_PROD) {
        console.error(err.stack);
    } else {
        console.error(`[${new Date().toISOString()}] ${err.message}`);
    }

    res.status(err.status || 500).json({
        message: IS_PROD ? 'Internal server error' : err.message
    });
});

app.use('*', (req, res) => {
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

