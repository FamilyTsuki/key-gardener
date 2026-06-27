import { LanguageManager } from "../../../core/utils/LanguageManager.js";

export class DuelState {
    constructor(phase, duelData) {
        this.phase = phase;
        this.duelData = duelData;
        
        this.isDuelOver = false;
        this.isCountdownActive = true;
        this.duelStartTime = null;
        this.wpmUpdateTimer = 0;
        
        this.currentTypedSpell = "";
        this.currentTypedDefense = "";
        this.currentTypedJail = "";
        this.jailEscapeWord = "";
        
        this.successfulStrokesCount = 0;
        this.projectiles = [];
        this.slowZones = [];
        
        const localId = localStorage.getItem("userId");
        const currentUsername = (localStorage.getItem("username") || "Player").toLowerCase();
        
        let isLocalPlayer1 = false;
        if (localId) {
            isLocalPlayer1 = (duelData.player1.id == localId);
        } else {
            isLocalPlayer1 = (duelData.player1.username.toLowerCase() === currentUsername);
        }
        
        if (isLocalPlayer1) {
            this.localData = duelData.player1;
            this.remoteData = duelData.player2;
        } else {
            this.localData = duelData.player2;
            this.remoteData = duelData.player1;
        }

        this.baseWpm = this.localData.wpm || 30;
        this.availableSpells = [];
    }

    /**
     * Initializes the spells.
     */
    initSpells() {
        const baseLightLen = Math.max(3, Math.floor(this.baseWpm / 15));
        const baseRandomLen = Math.max(4, Math.floor(this.baseWpm / 12));
        const baseHeavyLen = Math.max(5, Math.floor(this.baseWpm / 10));

        this.availableSpells = [
            { type: 'heavy', wordLength: baseHeavyLen, word: this.getRandomWord(baseHeavyLen), cooldownDuration: 10000, cooldownRemaining: 0 },
            { type: 'light', wordLength: baseLightLen, word: this.getRandomWord(baseLightLen), cooldownDuration: 1000, cooldownRemaining: 0 },
            { type: 'random', wordLength: baseRandomLen, word: this.getRandomWord(baseRandomLen), cooldownDuration: 6000, cooldownRemaining: 0 }
        ];
    }

    /**
     * Get the random word.
     * @param {any} length - The length.
     */
    getRandomWord(length) {
        let words = LanguageManager.t("game.jumpWords");
        if (!Array.isArray(words)) {
            words = ["fire", "ice", "bolt", "storm", "blast", "strike", "burn"];
        }
        const filtered = words.filter(w => w.length === length || Math.abs(w.length - length) <= 1);
        if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
        return words[Math.floor(Math.random() * words.length)];
    }

    /**
     * Get the current wpm.
     */
    getCurrentWpm() {
        if (!this.duelStartTime) return this.baseWpm;
        const now = Date.now();
        const durationMinutes = (now - this.duelStartTime) / 60000;
        if (durationMinutes < 0.05) {
            return this.baseWpm;
        }
        const wpm = (this.successfulStrokesCount / 5) / durationMinutes;
        return Math.max(15, Math.min(120, Math.round(wpm)));
    }

    /**
     * Updates the cooldowns.
     * @param {any} deltaTime - The deltaTime.
     */
    updateCooldowns(deltaTime) {
        this.availableSpells.forEach(s => {
            if (s.cooldownRemaining > 0) {
                s.cooldownRemaining = Math.max(0, s.cooldownRemaining - deltaTime * 1000);
            }
        });
    }

    /**
     * Resets the spell.
     * @param {any} completedSpell - The completedSpell.
     */
    resetSpell(completedSpell) {
        const currentWpm = this.getCurrentWpm();
        let newLength = 5;
        if (completedSpell.type === 'light') newLength = Math.max(3, Math.floor(currentWpm / 15));
        else if (completedSpell.type === 'heavy') newLength = Math.max(5, Math.floor(currentWpm / 10));
        else if (completedSpell.type === 'random') newLength = Math.max(4, Math.floor(currentWpm / 12));

        completedSpell.wordLength = newLength;
        completedSpell.word = this.getRandomWord(newLength);
        completedSpell.cooldownRemaining = completedSpell.cooldownDuration;
    }
}
