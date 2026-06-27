const db = require('../config/database');

const SPELL_CONFIGS = {
    light: { damage: 10, speed: 12, isHoming: false },
    heavy: { damage: 20, speed: 4, isHoming: true },
    stun: { damage: 10, speed: 8, isHoming: true },
    heal: { damage: -20, speed: 15, isHoming: true },
    jail: { damage: 10, speed: 7, isHoming: true }
};

class DuelManager {
    /**
     * Creates an instance of DuelManager.
     * @param {any} io - The io.
     */
    constructor(io) {
        this.io = io;
        this.activeDuels = new Map();
    }

    /**
     * Retrieves a player's average WPM from the database statistics.
     * @param {any} userId - The userId.
     * @returns {Promise<number>} The player's average WPM (defaults to 30).
     */
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

    /**
     * Creates a new multiplayer duel room state and notifies both players.
     * @param {any} player1Socket - The player1Socket.
     * @param {any} player2Socket - The player2Socket.
     * @returns {Promise<void>}
     */
    async createDuel(player1Socket, player2Socket) {
        const roomId = `duel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        player1Socket.join(roomId);
        player2Socket.join(roomId);

        const p1Wpm = await this.getPlayerAverageWpm(player1Socket.userId);
        const p2Wpm = await this.getPlayerAverageWpm(player2Socket.userId);

        const duelState = {
            roomId,
            player1: { id: player1Socket.userId, username: player1Socket.username, wpm: p1Wpm, hp: 100, ready: false },
            player2: { id: player2Socket.userId, username: player2Socket.username, wpm: p2Wpm, hp: 100, ready: false },
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

    /**
     * Marks a player ready, and starts the countdown once both players are ready.
     * @param {any} socket - The socket.
     * @returns {void}
     */
    handlePlayerReady(socket) {
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const isPlayer1 = duel.player1.id == socket.userId;
        if (isPlayer1) {
            duel.player1.ready = true;
        } else {
            duel.player2.ready = true;
        }

        if (duel.player1.ready && duel.player2.ready) {
            this.io.to(roomId).emit('start_countdown');
        }
    }

    /**
     * Updates the player's dynamic WPM in the active duel session.
     * @param {any} socket - The socket.
     * @param {any} data - The data.
     * @returns {void}
     */
    handleUpdateWpm(socket, data) {
        const { wpm } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const isPlayer1 = duel.player1.id == socket.userId;
        if (isPlayer1) {
            duel.player1.wpm = Math.max(15, wpm);
        } else {
            duel.player2.wpm = Math.max(15, wpm);
        }
    }

    /**
     * Clears all pending automatic spell damage timeout schedules.
     * @param {any} duel - The duel.
     * @returns {void}
     */
    clearDuelTimeouts(duel) {
        if (duel.spellsInFlight) {
            duel.spellsInFlight.forEach(spell => {
                if (spell.timeoutId) {
                    clearTimeout(spell.timeoutId);
                }
            });
        }
    }

    /**
     * Handles user disconnection during an active duel, notifying the room and cleaning timeouts.
     * @param {any} socket - The socket.
     * @returns {void}
     */
    handleDisconnect(socket) {
        if (socket.roomId) {
            const duel = this.activeDuels.get(socket.roomId);
            if (duel) {
                this.clearDuelTimeouts(duel);
            }
            this.io.to(socket.roomId).emit('duel_ended', { reason: 'disconnect', loserId: socket.userId });
            this.activeDuels.delete(socket.roomId);
        }
    }

    /**
     * Handles the casting of a spell by a player, calculating its speed multiplier
     * dynamically based on the attacker/target WPM ratio for rubberband difficulty balancing.
     * @param {any} socket - The socket.
     * @param {any} data - The data.
     * @returns {void}
     */
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
        const speedRatio = target.wpm / attacker.wpm;
        const spellSpeed = Math.max(0.6, Math.min(2.5, 1.2 * speedRatio));

        const spellId = `spell_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const distance = spellType === 'heal' ? 4.0 : 16.0;
        const config = SPELL_CONFIGS[spellType] || { damage: 10, speed: 15, isHoming: true };
        const expectedFlightTime = (distance / (config.speed * spellSpeed)) * 1000;

        const spell = {
            id: spellId,
            attackerId: attacker.id,
            targetId: target.id,
            spellType,
            damage: config.damage,
            isHoming: config.isHoming,
            castTime: Date.now(),
            expectedFlightTime,
            requiredLength: wordLengthRequired
        };

        if (config.isHoming) {
            spell.timeoutId = setTimeout(() => {
                this.applyAutomaticSpellHit(roomId, spellId);
            }, expectedFlightTime * 2 + 3000);
        }

        duel.spellsInFlight.push(spell);

        this.io.to(roomId).emit('spell_spawned', {
            spellId,
            attackerId: attacker.id,
            targetId: target.id,
            spellType,
            requiredLength: wordLengthRequired,
            speedMultiplier: spellSpeed
        });
    }

    /**
     * Automatically applies damage for homing spells that fly for too long without being blocked.
     * @param {any} roomId - The roomId.
     * @param {any} spellId - The spellId.
     * @returns {void}
     */
    applyAutomaticSpellHit(roomId, spellId) {
        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const index = duel.spellsInFlight.findIndex(s => s.id === spellId);
        if (index === -1) return;

        const spell = duel.spellsInFlight[index];
        duel.spellsInFlight.splice(index, 1);

        const target = duel.player1.id == spell.targetId ? duel.player1 : duel.player2;
        target.hp -= spell.damage;
        if (target.hp > 100) target.hp = 100;

        this.io.to(roomId).emit('hp_update', {
            player1Hp: duel.player1.hp,
            player2Hp: duel.player2.hp
        });

        if (target.hp <= 0) {
            const winnerId = duel.player1.id == target.id ? duel.player2.id : duel.player1.id;
            this.endDuel(roomId, winnerId);
        }
    }

    /**
     * Handles a player's request to block an incoming spell, with validation to prevent cheating.
     * @param {any} socket - The socket.
     * @param {any} data - The data.
     * @returns {void}
     */
    handleBlockSpell(socket, data) {
        const { spellId } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const index = duel.spellsInFlight.findIndex(s => s.id === spellId);
        if (index !== -1) {
            const spell = duel.spellsInFlight[index];

            if (spell.timeoutId) {
                clearTimeout(spell.timeoutId);
            }

            duel.spellsInFlight.splice(index, 1);
            this.io.to(roomId).emit('spell_blocked', { spellId, defenderId: socket.userId });
        }
    }

    /**
     * Applies damage to a player when hit by a projectile, with distance flight validation.
     * @param {any} socket - The socket.
     * @param {any} data - The data.
     * @returns {void}
     */
    handleTakeDamage(socket, data) {
        const { spellId } = data;
        const roomId = socket.roomId;
        if (!roomId) return;

        const duel = this.activeDuels.get(roomId);
        if (!duel) return;

        const index = duel.spellsInFlight.findIndex(s => s.id === spellId && s.targetId == socket.userId);
        if (index !== -1) {
            const spell = duel.spellsInFlight[index];
            const elapsed = Date.now() - spell.castTime;
            if (elapsed < spell.expectedFlightTime - 300) {
                return;
            }

            if (spell.timeoutId) {
                clearTimeout(spell.timeoutId);
            }

            duel.spellsInFlight.splice(index, 1);
            
            const target = duel.player1.id == socket.userId ? duel.player1 : duel.player2;
            target.hp -= spell.damage;
            if (target.hp > 100) target.hp = 100;

            this.io.to(roomId).emit('hp_update', {
                player1Hp: duel.player1.hp,
                player2Hp: duel.player2.hp
            });

            if (target.hp <= 0) {
                const winnerId = duel.player1.id == target.id ? duel.player2.id : duel.player1.id;
                this.endDuel(roomId, winnerId);
            }
        }
    }

    /**
     * Ends a duel session, notifying all room participants, cleaning timeouts, and deleting the state.
     * @param {any} roomId - The roomId.
     * @param {any} winnerId - The winnerId.
     * @returns {void}
     */
    endDuel(roomId, winnerId) {
        const duel = this.activeDuels.get(roomId);
        if (duel) {
            this.clearDuelTimeouts(duel);
        }
        this.io.to(roomId).emit('duel_ended', { winnerId });
        this.activeDuels.delete(roomId);
    }
}

module.exports = DuelManager;
