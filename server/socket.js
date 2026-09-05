const { Server } = require("socket.io");

const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
    'https://green-route-seven.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
].filter(Boolean);

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (e.g., server-to-server) or known origins
                if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Socket CORS: origin not allowed'));
                }
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    let devBypassWarned = false;

    // Middleware: authenticate socket connections via session OR auth token
    io.use((socket, next) => {
        const session = socket.request?.session;
        // 1. Check Passport session cookie (desktop / same-origin)
        if (session && session.passport && session.passport.user) {
            // Expose the authenticated user id so handlers can scope their
            // events to this user (same as the Bearer-token path below).
            socket.userId = String(session.passport.user);
            return next();
        }

        // 2. Check auth token in handshake (mobile / cross-origin)
        const token = socket.handshake?.auth?.token ||
            (socket.handshake?.headers?.authorization?.startsWith('Bearer ')
                ? socket.handshake.headers.authorization.slice(7).trim()
                : null);

        if (token) {
            const { verifyToken } = require('./utils/token');
            const decoded = verifyToken(token);
            if (decoded && decoded.id) {
                socket.userId = decoded.id;
                return next();
            }
        }

        // In development, allow all connections so local testing still works.
        // A loud one-time warning is printed so this is never silently active.
        if (process.env.NODE_ENV !== 'production') {
            if (!devBypassWarned) {
                devBypassWarned = true;
                console.warn('[SECURITY WARNING] Socket.io auth bypass is ACTIVE — unauthenticated connections are allowed. Do NOT use in production.');
            }
            return next();
        }
        next(new Error('Unauthorized: please log in first'));
    });

    io.on('connection', (socket) => {
        const interval = setInterval(() => {
            socket.emit('transitUpdate', {
                line: 'Metro Line 2',
                status: 'delayed',
                delay: '5 minutes',
            });
        }, 15000);

        socket.on('disconnect', () => {
            clearInterval(interval);
        });
    });

    return io;
};

module.exports = setupSocket;
