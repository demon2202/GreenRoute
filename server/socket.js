const { Server } = require("socket.io");

const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
    'https://green-route-seven.vercel.app'
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

    // Middleware: reject unauthenticated socket connections
    io.use((socket, next) => {
        const session = socket.request?.session;
        // Allow connection only if passport session has a user
        if (session && session.passport && session.passport.user) {
            return next();
        }
        // In development, allow all connections so local testing still works
        if (process.env.NODE_ENV !== 'production') {
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
