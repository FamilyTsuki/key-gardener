const db = require('../config/database');

class DuelManager {
    constructor(io) {
        this.io = io;
        this.activeDuels = new Map();
    }

    async getPlayerAverageWpm(userId) {
        try {
            const result = await db.query('SELECT average_wpm FROM user_statistics WHERE user_id = $1', [userId]);
            if (result.rows.length > 0) {
                return result.rows[0].average_wpm || 30;
            }
            return 30;
        } catch (e) {
            console.error('Error getting WPM:', e);
            return 30;
        }
    }

    async createDuel(player1Socket, player2Socket) {
        const roomId = `duel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        player1Socket.join(roomId);
        player2Socket.join(roomId);

        const p1Wpm = await this.getPlayerAverageWpm(player1Socket.userId);
        const p2Wpm = await this.getPlayerAverageWpm(player2Socket.userId);

        const duelState = {
            roomId,
            player1: { id: player1Socket.userId, username: player1Socket.username, wpm: p1Wpm, hp: 100 },
            player2: { id: player2Socket.userId, username: player2Socket.username, wpm: p2Wpm, hp: 100 },
            spellsInFlight: []
        };

        this.activeDuels.set(roomId, duelState);
        player1Socket.roomId = roomId;
        player2Socket.roomId = roomId;

        this.io.to(roomId).emit('duel_started', {
            roomId,
            player1: duelState.player1,
            player2: duelState.player2
        });
    }

    handleDisconnect(socket) {
        if (socket.roomId) {
            this.io.to(socket.roomId).emit('duel_ended', { reason: 'disconnect', loserId: socket.userId });
            this.activeDuels.delete(socket.roomId);
        }
    }

    handleCastSpell(socket, data) {
        const { spellType } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const isPlayer1 = duel.player1.id == socket.userId;
        const target = isPlayer1 ? duel.player2 : duel.player1;
        const attacker = isPlayer1 ? duel.player1 : duel.player2;

        const wordLengthRequired = Math.max(3, Math.floor(target.wpm / 10));
        const spellSpeed = Math.max(1, attacker.wpm / 40);

        const spellId = `spell_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        duel.spellsInFlight.push({
            id: spellId,
            attackerId: attacker.id,
            targetId: target.id,
            spellType
        });

        this.io.to(roomId).emit('spell_spawned', {
            spellId,
            attackerId: attacker.id,
            targetId: target.id,
            spellType,
            requiredLength: wordLengthRequired,
            speedMultiplier: spellSpeed
        });
    }

    handleBlockSpell(socket, data) {
        const { spellId } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const index = duel.spellsInFlight.findIndex(s => s.id === spellId);
        if (index !== -1) {
            duel.spellsInFlight.splice(index, 1);
            this.io.to(roomId).emit('spell_blocked', { spellId, defenderId: socket.userId });
        }
    }

    handleTakeDamage(socket, data) {
        const { spellId, damage } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const index = duel.spellsInFlight.findIndex(s => s.id === spellId && s.targetId == socket.userId);
        if (index !== -1) {
            duel.spellsInFlight.splice(index, 1);
            
            const isPlayer1 = duel.player1.id == socket.userId;
            if (isPlayer1) {
                duel.player1.hp -= damage;
                if (duel.player1.hp > 100) duel.player1.hp = 100;
                if (duel.player1.hp <= 0) this.endDuel(roomId, duel.player2.id);
            } else {
                duel.player2.hp -= damage;
                if (duel.player2.hp > 100) duel.player2.hp = 100;
                if (duel.player2.hp <= 0) this.endDuel(roomId, duel.player1.id);
            }

            this.io.to(roomId).emit('hp_update', {
                player1Hp: duel.player1.hp,
                player2Hp: duel.player2.hp
            });
        }
    }

    endDuel(roomId, winnerId) {
        this.io.to(roomId).emit('duel_ended', { winnerId });
        this.activeDuels.delete(roomId);
    }
}

module.exports = DuelManager;
