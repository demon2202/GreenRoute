const { Server } = require("socket.io");

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
        },
    });
    
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        const interval = setInterval(() => {
            socket.emit('transitUpdate', {
                line: 'Metro Line 2',
                status: 'delayed',
                delay: '5 minutes',
            });
        }, 15000);

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            clearInterval(interval);
        });
    });

    return io;
};

module.exports = setupSocket;
