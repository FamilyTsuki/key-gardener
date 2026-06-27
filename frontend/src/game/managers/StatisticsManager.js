export class StatisticsManager {
    constructor() {
        this.correctKeystrokes = 0;
        this.incorrectKeystrokes = 0;
        this.wordsTyped = 0;
        this.enemiesDefeated = 0;
        this.bossesDefeated = 0;
        this.playtimeSeconds = 0;
    }

    /**
     * Records the keystroke.
     * @param {any} isValid - The isValid.
     */
    recordKeystroke(isValid) {
        if (isValid) {
            this.correctKeystrokes++;
        } else {
            this.incorrectKeystrokes++;
        }
    }

    /**
     * Records the word typed.
     */
    recordWordTyped() {
        this.wordsTyped++;
    }

    /**
     * Records the enemy defeated.
     * @param {any} isBoss - The isBoss.
     */
    recordEnemyDefeated(isBoss = false) {
        this.enemiesDefeated++;
        if (isBoss) {
            this.bossesDefeated++;
        }
    }

    /**
     * Adds the playtime.
     * @param {any} seconds - The seconds.
     */
    addPlaytime(seconds) {
        this.playtimeSeconds += seconds;
    }

    /**
     * Get the stats data.
     */
    getStatsData() {
        const totalKeys = this.correctKeystrokes + this.incorrectKeystrokes;
        const accuracy = totalKeys > 0 ? (this.correctKeystrokes / totalKeys) * 100 : 0;
        const playtimeMinutes = this.playtimeSeconds / 60;
        const wpm = playtimeMinutes > 0 ? Math.round((this.correctKeystrokes / 5) / playtimeMinutes) : 0;

        return {
            wpm,
            accuracy: parseFloat(accuracy.toFixed(2)),
            wordsTyped: this.wordsTyped,
            enemiesDefeated: this.enemiesDefeated,
            bossesDefeated: this.bossesDefeated,
            playtimeSeconds: Math.floor(this.playtimeSeconds)
        };
    }
}
