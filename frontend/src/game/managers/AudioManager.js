import { SettingsManager } from "../../core/utils/SettingsManager.js";

/**
 * Manages audio instances and applies volume settings automatically.
 */
export class AudioManager {
    /**
     * Plays a sound effect with the appropriate volume for its category.
     * @param {string} path - The path to the audio file.
     * @param {string} category - The audio category (e.g., 'player', 'enemy', 'environment', 'music').
     * @param {number} [baseVolume=1.0] - A base volume modifier for this specific sound.
     * @returns {HTMLAudioElement} The Audio object that is playing.
     */
    static playSFX(path, category, baseVolume = 1.0) {
        const audio = new Audio(path);
        const categoryVolume = SettingsManager.getVolume(category);
        audio.volume = Math.max(0, Math.min(1, baseVolume * categoryVolume));
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn(`Autoplay prevented for ${path}:`, e));
        }
        
        return audio;
    }

    /**
     * Plays a looping background music.
     * @param {string} path - The path to the music file.
     * @param {number} [baseVolume=1.0] - A base volume modifier.
     * @returns {HTMLAudioElement}
     */
    static playMusic(path, baseVolume = 1.0) {
        const audio = new Audio(path);
        audio.loop = true;
        const categoryVolume = SettingsManager.getVolume('music');
        audio.volume = Math.max(0, Math.min(1, baseVolume * categoryVolume));
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn(`Autoplay prevented for music ${path}:`, e));
        }

        const updateVolume = (e) => {
            const settings = e.detail;
            const globalVol = settings.volume.global ?? 1.0;
            const musicVol = settings.volume.music ?? 1.0;
            audio.volume = Math.max(0, Math.min(1, baseVolume * globalVol * musicVol));
        };
        window.addEventListener("settings_updated", updateVolume);
        
        audio.stop = () => {
            audio.pause();
            audio.currentTime = 0;
            window.removeEventListener("settings_updated", updateVolume);
        };
        
        return audio;
    }
}
