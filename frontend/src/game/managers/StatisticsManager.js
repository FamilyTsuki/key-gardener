export class StatisticsManager {
    constructor() {
        this.correctKeystrokes = 0;
        this.incorrectKeystrokes = 0;
        this.wordsTyped = 0;
        this.enemiesDefeated = 0;
        this.bossesDefeated = 0;
        this.playtimeSeconds = 0;
    }

    recordKeystroke(isValid) {
        if (isValid) {
            this.correctKeystrokes++;
        } else {
            this.incorrectKeystrokes++;
        }
    }

    recordWordTyped() {
        this.wordsTyped++;
    }

    recordEnemyDefeated(isBoss = false) {
        this.enemiesDefeated++;
        if (isBoss) {
            this.bossesDefeated++;
        }
    }

    addPlaytime(seconds) {
        this.playtimeSeconds += seconds;
    }

    getStatsData() {
        const totalKeys = this.correctKeystrokes + this.incorrectKeystrokes;
        const accuracy = totalKeys > 0 ? (this.correctKeystrokes / totalKeys) * 100 : 0;
        const playtimeMinutes = this.playtimeSeconds / 60;
        // WPM: (correct keystrokes / 5) / minutes
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
