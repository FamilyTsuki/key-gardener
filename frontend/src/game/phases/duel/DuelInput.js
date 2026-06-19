import SocketService from "../../../core/services/SocketService.js?v=1";

export class DuelInput {
    constructor(phase) {
        this.phase = phase;
    }

    handleKeyDown(event) {
        const state = this.phase.state;
        if (state.isDuelOver || state.isCountdownActive) return;

        const localPlayer = this.phase.localPlayer;
        if (localPlayer && (localPlayer.stunTimer > 0 || localPlayer.isJailed)) {
            if (localPlayer.isJailed) {
                this.handleJailTyping(event.key);
            }
            return;
        }

        if (event.key === "Backspace") {
            if (state.currentTypedDefense.length > 0) {
                state.currentTypedDefense = state.currentTypedDefense.slice(0, -1);
                this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
                return;
            } else if (state.currentTypedSpell.length > 0) {
                state.currentTypedSpell = state.currentTypedSpell.slice(0, -1);
                this.phase.ui.updateSpellsUI(state.availableSpells, state.currentTypedSpell);
                return;
            }
        }

        if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
            const char = event.key.toLowerCase();
            this.handlePlayerMovement(event.key.toUpperCase());
            this.handleDefenseTyping(char);
        }
    }

    handleJailTyping(key) {
        if (key.length === 1 && key.match(/[a-zA-Z]/)) {
            const char = key.toLowerCase();
            const state = this.phase.state;
            
            if (state.jailEscapeWord.toLowerCase().startsWith(state.currentTypedJail + char)) {
                state.successfulStrokesCount++;
            }
            state.currentTypedJail += char;
            this.phase.ui.updateJailUI(state.jailEscapeWord, state.currentTypedJail);
            
            if (state.currentTypedJail.toLowerCase() === state.jailEscapeWord.toLowerCase()) {
                this.phase.escapeJail();
            } else {
                if (!state.jailEscapeWord.toLowerCase().startsWith(state.currentTypedJail.toLowerCase())) {
                    setTimeout(() => {
                        state.currentTypedJail = "";
                        this.phase.ui.updateJailUI(state.jailEscapeWord, state.currentTypedJail);
                    }, 200);
                }
            }
        }
    }

    handlePlayerMovement(keyName) {
        const keyObj = this.phase.renderer.localKeyboard.find(keyName);
        if (keyObj && this.phase.localPlayer) {
            SocketService.emit('player_move', { key: keyName });
            this.phase.localPlayer.move({ x: keyObj.rawPosition.x, y: keyObj.rawPosition.y });
        }
    }

    handleDefenseTyping(char) {
        const state = this.phase.state;
        const incoming = state.projectiles.filter(p => p.targetId == state.localData.id);
        
        if (incoming.length > 0) {
            if (incoming.some(p => p.defenseWord.toLowerCase().startsWith(state.currentTypedDefense + char))) {
                state.successfulStrokesCount++;
            }
            state.currentTypedDefense += char;
            this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
            
            const targetDef = incoming.find(p => p.defenseWord.toLowerCase() === state.currentTypedDefense.toLowerCase());
            if (targetDef) {
                SocketService.emit('block_spell', { spellId: targetDef.id });
                state.currentTypedDefense = "";
                this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
            } else {
                let isValidPrefix = incoming.some(p => p.defenseWord.toLowerCase().startsWith(state.currentTypedDefense.toLowerCase()));
                if (!isValidPrefix) {
                    setTimeout(() => {
                        state.currentTypedDefense = "";
                        this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
                    }, 200);
                }
            }
            return;
        }

        this.handleSpellTyping(char);
    }

    handleSpellTyping(char) {
        const state = this.phase.state;
        if (state.availableSpells.some(s => s.cooldownRemaining === 0 && s.word.toLowerCase().startsWith(state.currentTypedSpell + char))) {
            state.successfulStrokesCount++;
        }
        state.currentTypedSpell += char;
        this.phase.ui.updateSpellsUI(state.availableSpells, state.currentTypedSpell);

        const completedSpell = state.availableSpells.find(s => s.cooldownRemaining === 0 && s.word.toLowerCase() === state.currentTypedSpell.toLowerCase());
        if (completedSpell) {
            let finalType = completedSpell.type;
            if (finalType === 'random') {
                const pool = ['stun', 'slow', 'heal', 'jail'];
                finalType = pool[Math.floor(Math.random() * pool.length)];
            }
            SocketService.emit('cast_spell', { spellType: finalType });
            
            state.resetSpell(completedSpell);
            state.currentTypedSpell = "";
            this.phase.ui.updateSpellsUI(state.availableSpells, state.currentTypedSpell);
        } else {
            let isValidPrefix = state.availableSpells.some(s => s.cooldownRemaining === 0 && s.word.toLowerCase().startsWith(state.currentTypedSpell.toLowerCase()));
            if (!isValidPrefix) {
                setTimeout(() => {
                    state.currentTypedSpell = "";
                    this.phase.ui.updateSpellsUI(state.availableSpells, state.currentTypedSpell);
                }, 200);
            }
        }
    }
}
