import { SettingsManager } from "../../core/utils/SettingsManager.js";

export class AudioManager {
    static audioContext = null;
    static audioBuffers = new Map();
    static rawBuffers = new Map();
    static loadingPromises = new Map();
    static isUnlocked = false;

    static reverbNode = null;
    static useCaveEcho = false;

    static init() {
        if (this.isUnlocked) return;

        const unlock = () => {
            if (this.isUnlocked) return;
            
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();

            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }

            this.setupCaveReverb();

            this.isUnlocked = true;
            this.processPendingBuffers();

            document.removeEventListener("click", unlock, true);
            document.removeEventListener("keydown", unlock, true);
        };

        document.addEventListener("click", unlock, true);
        document.addEventListener("keydown", unlock, true);
    }

    static setupCaveReverb() {
        if (!this.audioContext) return;
        
        this.reverbNode = this.audioContext.createConvolver();
        
        const duration = 2.5; 
        const decay = 2.0;
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const multiplier = Math.pow(1 - i / length, decay);
            left[i] = (Math.random() * 2 - 1) * multiplier;
            right[i] = (Math.random() * 2 - 1) * multiplier;
        }
        
        this.reverbNode.buffer = impulse;
        
        const effectGain = this.audioContext.createGain();
        effectGain.gain.value = 0.8; 
        
        this.reverbNode.connect(effectGain);
        effectGain.connect(this.audioContext.destination);
    }

    static setCaveEcho(active) {
        this.useCaveEcho = active;
    }

    static async preloadSound(path) {
        if (!this.isUnlocked && !this.audioContext) {
            this.init();
        }

        if (this.audioBuffers.has(path)) return;

        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }

        const loadPromise = (async () => {
            try {
                let arrayBuffer = this.rawBuffers.get(path);

                if (!arrayBuffer) {
                    const response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`HTTP Error ${response.status} on ${path}`);
                    }
                    arrayBuffer = await response.arrayBuffer();
                }

                if (this.isUnlocked && this.audioContext) {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
                    this.audioBuffers.set(path, audioBuffer);
                    this.rawBuffers.delete(path);
                } else {
                    this.rawBuffers.set(path, arrayBuffer);
                }
            } catch (error) {
                console.error(error);
            } finally {
                this.loadingPromises.delete(path);
            }
        })();

        this.loadingPromises.set(path, loadPromise);
        return loadPromise;
    }

    static async processPendingBuffers() {
        if (!this.audioContext) return;

        const promises = [];
        for (const [path, arrayBuffer] of this.rawBuffers.entries()) {
            const decodeTask = (async () => {
                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
                    this.audioBuffers.set(path, audioBuffer);
                } catch (error) {
                    console.error(error);
                } finally {
                    this.loadingPromises.delete(path);
                }
            })();
            this.loadingPromises.set(path, decodeTask);
            promises.push(decodeTask);
        }
        
        this.rawBuffers.clear();
        await Promise.all(promises);
    }

    static playSFX(path, category, baseVolume = 1.0) {
        if (!this.isUnlocked || !this.audioContext) {
            return null;
        }

        if (!this.audioBuffers.has(path)) {
            this.preloadSound(path).then(() => {
                if (this.audioBuffers.has(path)) {
                    this.playSFX(path, category, baseVolume);
                }
            });
            return null;
        }

        const categoryVolume = SettingsManager.getVolume(category);
        const finalVolume = Math.max(0, baseVolume * categoryVolume);

        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = this.audioBuffers.get(path);

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = finalVolume;

        sourceNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (this.useCaveEcho && this.reverbNode) {
            gainNode.connect(this.reverbNode);
        }

        sourceNode.start(0);

        return sourceNode;
    }

    static createLoopingSFX(path, category, baseVolume = 1.0) {
        if (!this.isUnlocked || !this.audioContext || !this.audioBuffers.has(path)) {
            return null;
        }

        const categoryVolume = SettingsManager.getVolume(category);
        const finalVolume = Math.max(0, baseVolume * categoryVolume);

        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = this.audioBuffers.get(path);
        sourceNode.loop = true;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = finalVolume;

        let pannerNode = null;
        if (this.audioContext.createStereoPanner) {
            pannerNode = this.audioContext.createStereoPanner();
            pannerNode.pan.value = 0;
            sourceNode.connect(pannerNode);
            pannerNode.connect(gainNode);
        } else {
            sourceNode.connect(gainNode);
        }

        gainNode.connect(this.audioContext.destination);

        if (this.useCaveEcho && this.reverbNode) {
            gainNode.connect(this.reverbNode);
        }

        sourceNode.start(0);

        return {
            sourceNode,
            gainNode,
            pannerNode,
            baseVolume,
            category,
            stop: () => {
                try { sourceNode.stop(); } catch (e) {}
            }
        };
    }

    static playMusic(path, baseVolume = 1.0) {
        const audio = new Audio(path);
        audio.loop = true;

        const categoryVolume = SettingsManager.getVolume("music");
        audio.volume = Math.max(0, Math.min(1, baseVolume * categoryVolume));

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn(error));
        }

        const updateVolume = (event) => {
            const settings = event.detail;
            const globalVol = settings.volume?.global ?? 1.0;
            const musicVol = settings.volume?.music ?? 1.0;
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

    static playAmbiance(path, baseVolume = 1.0) {
        const audio = new Audio(path);
        audio.loop = true;

        const categoryVolume = SettingsManager.getVolume("environment");
        audio.volume = Math.max(0, Math.min(1, baseVolume * categoryVolume));

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn(error));
        }

        const updateVolume = (event) => {
            const settings = event.detail;
            const globalVol = settings.volume?.global ?? 1.0;
            const environmentVol = settings.volume?.environment ?? 1.0;
            audio.volume = Math.max(0, Math.min(1, baseVolume * globalVol * environmentVol));
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