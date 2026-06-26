const DuelManager = require('./duelManager');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&#39;';
            case '"': return '&quot;';
        }
    });
};

const parseCookies = (cookieString) => {
    if (!cookieString) return {};
    return cookieString.split(';').reduce((res, item) => {
        const data = item.trim().split('=');
        return { ...res, [data[0]]: data[1] };
    }, {});
};

module.exports = (io) => {
    const duelManager = new DuelManager(io);

    io.use((socket, next) => {
        const cookies = parseCookies(socket.request.headers.cookie);
        const token = cookies.jwt || socket.handshake.auth?.token;
        
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return next(new Error("Authentication error: Invalid token"));
            }
            try {
                const user = await User.findById(decoded.id);
                if (!user) {
                    return next(new Error("Authentication error: User not found"));
                }
                socket.userId = user.id;
                socket.username = user.username;
                next();
            } catch (error) {
                next(new Error("Authentication error: Server error"));
            }
        });
    });

    io.on('connection', (socket) => {
        socket.on('disconnect', () => {
            duelManager.handleDisconnect(socket);
        });

        socket.on('invite_duel', (data) => {
            const targetUserId = typeof data.targetUserId === 'string' ? sanitize(data.targetUserId) : data.targetUserId;
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetUserId);
            if (targetSocket) {
                targetSocket.emit('duel_invitation', { 
                    fromId: socket.userId, 
                    fromUsername: socket.username 
                });
            } else {
                socket.emit('duel_error', { message: 'User is not connected.' });
            }
        });

        socket.on('accept_duel', (data) => {
            const fromId = typeof data.fromId === 'string' ? sanitize(data.fromId) : data.fromId;
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === fromId);
            if (targetSocket) {
                duelManager.createDuel(targetSocket, socket);
            }
        });

        socket.on('decline_duel', (data) => {
            const fromId = typeof data.fromId === 'string' ? sanitize(data.fromId) : data.fromId;
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === fromId);
            if (targetSocket) {
                targetSocket.emit('duel_declined', { fromUsername: socket.username });
            }
        });

        socket.on('cast_spell', (data) => {
            if (data && typeof data.spell === 'string') data.spell = sanitize(data.spell);
            duelManager.handleCastSpell(socket, data);
        });

        socket.on('block_spell', (data) => {
            if (data && typeof data.spell === 'string') data.spell = sanitize(data.spell);
            duelManager.handleBlockSpell(socket, data);
        });

        socket.on('take_damage', (data) => {
            duelManager.handleTakeDamage(socket, data);
        });

        socket.on('player_ready', () => {
            duelManager.handlePlayerReady(socket);
        });

        socket.on('update_wpm', (data) => {
            duelManager.handleUpdateWpm(socket, data);
        });

        socket.on('player_move', (data) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('opponent_move', data);
            }
        });
    });
};
