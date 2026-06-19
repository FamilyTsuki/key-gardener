import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { AudioManager } from "../../managers/AudioManager.js";

export class JumpWordState {
    constructor(difficultyMultiplier = 1) {
        const words = LanguageManager.t("game.jumpWords");
        this.wordDictionary = Array.isArray(words) ? words : [
            "JUMP", "LEAP", "BOOST", "FLY", "SOAR", "POWER", "FORCE", "ENERGY", "LAUNCH", "SPEED", "THRUST", 
            "ACTION", "HEIGHT", "FLIGHT", "VELOCITY", "MOMENTUM", "DYNAMICS", "IMPULSE", "SPRINT", "GRAVITY", 
            "VIGOR", "BOUNCE", "CHARGE", "STRENGTH"
        ];
        
        this.activeWords = [];
        this.baseSpawnDelay = 3.0;
        this.wordSpawnTimer = 0;
        this.nextWordId = 0;
        
        this.targetCompletedCount = Math.max(1, Math.floor(10 * difficultyMultiplier));
        this.completedCount = 0;
        
        this.currentTyped = "";
        this.currentWordId = null;
        
        this.errorKey = null;
        this.errorTimeout = null;

        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    get isReadyToJump() {
        return this.completedCount >= this.targetCompletedCount;
    }

    get percentage() {
        return Math.min(1.0, this.completedCount / this.targetCompletedCount);
    }

    update(deltaTime) {
        let needsUIUpdate = false;
        this.wordSpawnTimer -= deltaTime;
        
        if (this.wordSpawnTimer <= 0 && this.activeWords.length < 4) {
            this.spawnWord();
            this.wordSpawnTimer = this.baseSpawnDelay + Math.random() * 1.0;
            needsUIUpdate = true;
        }

        for (let i = this.activeWords.length - 1; i >= 0; i--) {
            const w = this.activeWords[i];
            w.age += deltaTime;

            if (w.phase === "growing") {
                w.scale = Math.min(1, w.age / 0.5);
                if (w.age >= 0.5) w.phase = "waiting";
            } else if (w.phase === "waiting") {
                if (w.age >= 8.5) w.phase = "disappearing";
            } else if (w.phase === "disappearing") {
                w.scale = Math.max(0, 1 - (w.age - 8.5) / 1.0);
                if (w.age >= 9.5) {
                    this.activeWords.splice(i, 1);
                    needsUIUpdate = true;
                    this.baseSpawnDelay = Math.min(5.0, this.baseSpawnDelay + 0.5);
                    if (this.currentWordId === w.id) {
                        this.currentTyped = "";
                        this.currentWordId = null;
                        this.clearError();
                    }
                }
            } else if (w.phase === "completed") {
                w.scale = 1 + (w.age / 0.3) * 0.2;
                w.opacity = Math.max(0, 1 - (w.age / 0.3));
                if (w.age >= 0.3) {
                    this.activeWords.splice(i, 1);
                    needsUIUpdate = true;
                }
            }
        }

        if (needsUIUpdate || this.activeWords.length > 0) this.emit("words_updated", this.activeWords);
    }

    spawnWord() {
        const wordStr = this.wordDictionary[Math.floor(Math.random() * this.wordDictionary.length)];
        let x, y;
        let validPosition = false;
        let attempts = 0;

        while (!validPosition && attempts < 50) {
            x = 15 + Math.random() * 70;
            y = 25 + Math.random() * 55;
            validPosition = true;

            for (const w of this.activeWords) {
                const dx = Math.abs(x - w.x);
                const dy = Math.abs(y - w.y);
                if (dx < 15 && dy < 10) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }

        this.activeWords.push({
            id: this.nextWordId++,
            word: wordStr,
            x: x,
            y: y,
            scale: 0,
            age: 0,
            phase: "growing",
            errorFlash: false
        });
    }

    handleBackspace() {
        if (this.errorKey) {
            this.clearError();
        } else {
            this.currentTyped = this.currentTyped.slice(0, -1);
            if (this.currentTyped === "") {
                this.currentWordId = null;
            }
        }
        this.emit("words_updated", this.activeWords);
    }

    handleCharacter(key) {
        if (this.errorKey) this.clearError();

        const nextTyped = this.currentTyped + key;
        let match = null;

        if (this.currentWordId !== null) {
            match = this.activeWords.find(w => w.id === this.currentWordId && w.word.startsWith(nextTyped) && w.phase !== "completed");
        }
        if (!match) {
            match = this.activeWords.find(w => w.word.startsWith(nextTyped) && w.phase !== "completed");
        }

        if (match) {
            this.currentWordId = match.id;
            this.currentTyped = nextTyped;
            
            if (match.word === nextTyped) {
                match.phase = "completed";
                match.age = 0;
                match.opacity = 1;

                this.baseSpawnDelay = Math.max(0.5, this.baseSpawnDelay - 0.4);
                this.wordSpawnTimer = 0;

                this.currentTyped = "";
                this.currentWordId = null;
                this.completedCount++;
                
                this.emit("gauge_updated", this.percentage);

                if (this.isReadyToJump) {
                    this.activeWords = [];
                    this.emit("jump_ready");
                }
            }
        } else {
            const newWordMatch = this.activeWords.find(w => w.word.startsWith(key) && w.phase !== "completed");
            if (newWordMatch) {
                this.currentWordId = newWordMatch.id;
                this.currentTyped = key;
            } else {
                this.triggerError(key);
            }
        }
        this.emit("words_updated", this.activeWords);
    }

    triggerError(key) {
        this.errorKey = key;
        this.baseSpawnDelay = Math.min(5.0, this.baseSpawnDelay + 0.1);
        if (this.currentWordId !== null) {
            const errorWord = this.activeWords.find(w => w.id === this.currentWordId);
            if (errorWord) errorWord.errorFlash = true;
        }

        if (this.errorTimeout) clearTimeout(this.errorTimeout);
        this.errorTimeout = setTimeout(() => {
            this.clearError();
            this.emit("words_updated", this.activeWords);
        }, 300);
    }

    clearError() {
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        this.errorKey = null;
        this.activeWords.forEach(w => w.errorFlash = false);
    }
}
