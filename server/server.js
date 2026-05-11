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
const apiRoutes  = require('./routes/api');

const app = express();

app.set('trust proxy', 1);

/* ── Security ── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://api.mapbox.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
        ],
        scriptSrc: [
          "'self'",
          "https://api.mapbox.com",
        ],
        workerSrc: [
          "'self'",
          "blob:",
        ],
        connectSrc: [
          "'self'",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
          // NOTE: OpenWeatherMap + WAQI are now called server-side only
          // so they do NOT need to be listed here anymore
          "http://localhost:5000",
          "http://localhost:3000",
          "ws://localhost:5000",   // WebSocket
          "ws://localhost:3000",   // React dev WS
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
        ],
        objectSrc: ["'none'"],
      },
    },
  })
);

app.use(mongoSanitize());

/* ── Rate limiting ── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth', authLimiter);

/* ── CORS ── */
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : 'http://localhost:3000',
    credentials: true,
  })
);

/* ── Body parsing ── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

/* ── Database ── */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

/* ── Session ── */
app.use(
  session({
    secret:            process.env.COOKIE_KEY,
    resave:            false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:    process.env.MONGO_URI,
      touchAfter:  24 * 3600,
    }),
    cookie: {
      secure:   process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge:   24 * 60 * 60 * 1000,
    },
  })
);

/* ── Passport ── */
app.use(passport.initialize());
app.use(passport.session());

/* ── Routes ── */
app.use('/api/auth', authRoutes);
app.use('/api',      apiRoutes);

/* ── Health check ── */
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'OK',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error:   process.env.NODE_ENV === 'production' ? {} : err.stack,
  });
});

/* ── 404 ── */
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ── Start ── */
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
setupSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

/* ── Graceful shutdown ── */
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app;
