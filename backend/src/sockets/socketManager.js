const DuelManager = require('./duelManager');

module.exports = (io) => {
    const duelManager = new DuelManager(io);

    io.on('connection', (socket) => {
        socket.on('disconnect', () => {
            duelManager.handleDisconnect(socket);
        });

        socket.on('register', (data) => {
            socket.userId = data.userId;
            socket.username = data.username;
        });

        socket.on('invite_duel', (data) => {
            const { targetUserId } = data;
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
            const { fromId } = data;
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === fromId);
            if (targetSocket) {
                duelManager.createDuel(targetSocket, socket);
            }
        });

        socket.on('decline_duel', (data) => {
            const { fromId } = data;
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === fromId);
            if (targetSocket) {
                targetSocket.emit('duel_declined', { fromUsername: socket.username });
            }
        });

        socket.on('cast_spell', (data) => {
            duelManager.handleCastSpell(socket, data);
        });

        socket.on('block_spell', (data) => {
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
