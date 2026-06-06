export class SettingsManager {
    static DEFAULT_SETTINGS = {
        language: "en",
        volume: {
            global: 1.0,
            music: 1.0,
            environment: 1.0,
            enemy: 1.0,
            player: 1.0
        }
    };

    /**
     * Get all settings from local storage or defaults.
     * @returns {Object}
     */
    static getSettings() {
        try {
            const saved = localStorage.getItem("game_settings");
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    language: parsed.language || this.DEFAULT_SETTINGS.language,
                    volume: { ...this.DEFAULT_SETTINGS.volume, ...(parsed.volume || {}) }
                };
            }
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
        return this.DEFAULT_SETTINGS;
    }

    /**
     * Save new settings to local storage.
     * @param {Object} newSettings 
     */
    static saveSettings(newSettings) {
        const current = this.getSettings();
        const merged = {
            language: newSettings.language || current.language,
            volume: { ...current.volume, ...(newSettings.volume || {}) }
        };
        localStorage.setItem("game_settings", JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("settings_updated", { detail: merged }));
    }

    /**
     * Get the final volume for a specific category, multiplied by global volume.
     * @param {string} category - 'music', 'environment', 'enemy', 'player'
     * @returns {number} The calculated volume (0.0 to 1.0)
     */
    static getVolume(category) {
        const settings = this.getSettings();
        const globalVol = settings.volume.global ?? 1.0;
        const catVol = settings.volume[category] ?? 1.0;
        return Math.max(0, Math.min(1, globalVol * catVol));
    }
}
