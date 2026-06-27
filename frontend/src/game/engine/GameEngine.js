import * as THREE from "three";
import { WorldPhase } from "../phases/WorldPhase.js";
import { IntroPhase } from "../phases/IntroPhase.js";
import { SurvivePhase } from "../phases/SurvivePhase.js";
import { InfiniteVoidPhase } from "../phases/InfiniteVoidPhase.js";
import { DuelPhase } from "../phases/DuelPhase.js";
import { FallPhase } from "../phases/FallPhase.js";
import { TrainingPhase } from "../phases/TrainingPhase.js";
import { DoorEvent } from "../events/DoorEvent.js";
import { HoleEvent } from "../events/HoleEvent.js";
import { FlameWallEvent } from "../events/FlameWallEvent.js";
import { BridgeWordEvent } from "../events/BridgeWordEvent.js";
import { JumpWordEvent } from "../events/JumpWordEvent.js";
import { StatisticsManager } from "../managers/StatisticsManager.js";
import { StatisticsService } from "../../core/services/statistics.service.js";
import { SaveService } from "../../core/services/save.service.js";
import { AuthService } from "../../core/services/auth.service.js";
import { FloatingTextManager } from "../ui/FloatingTextManager.js";
import ModelLoader from "../../core/utils/ModelLoader.js";
import { PerformanceDetector } from "../../core/utils/PerformanceDetector.js";
import { AudioManager } from "../managers/AudioManager.js";
import ProjectilePool from "../models/ProjectilePool.js";

/**
 * Represents the main game engine that manages scenes, phases, and the render loop.
 */
export class GameEngine {
    /**
     * Creates an instance of GameEngine.
     * @param {string} startMode - 'normal' or 'duel'
     * @param {Object} startData - duel data if mode is 'duel'
     */
    constructor(startMode = "normal", startData = null) {
        this.startMode = startMode;
        this.startData = startData;
        this.canvas = document.getElementById("game-canvas");
        if (!this.canvas) {
            throw new Error("Canvas element #game-canvas not found.");
        }

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0c10, 40, 90);
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0c10, 1);

        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.gamePhase = null;
        this.currentLevel = 1;
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        
        this.skillPoints = 0;
        this.unlockedSpells = [];
        
        this.stats = new StatisticsManager();
        this.floatingTextManager = new FloatingTextManager();

        import("../managers/AudioManager.js").then(module => {
            module.AudioManager.init();
        });

        this.resize();

        this.onResize = () => this.resize();
        this.onKeyDown = (e) => {
            if (e.repeat) return;
            if (this.gamePhase && typeof this.gamePhase.handleKeyDown === "function" && !this.isPaused) {
                this.gamePhase.handleKeyDown(e);
            }
        };

        window.addEventListener("resize", this.onResize);
        window.addEventListener("keydown", this.onKeyDown);

        window.startShake = (intensity) => {
            this.shakeIntensity = intensity;
        };

        this.onSpawnFloatingText = (e) => {
            if (this.floatingTextManager) {
                this.floatingTextManager.add(e.detail.position, e.detail.text, e.detail.type);
            }
        };
        window.addEventListener("spawn_floating_text", this.onSpawnFloatingText);
    }

    /**
     * Initializes the game engine, loading saved data if available, and setting the initial phase.
     * @returns {Promise<void>}
     */
    async init() {
        if (this.startMode === "duel") {
            await this.setPhase(new DuelPhase(this, this.startData));
            return;
        }
        if (this.startMode === "training") {
            await this.setPhase(new TrainingPhase(this));
            return;
        }

        let initialPhaseName = "intro";
        try {
            const savedData = localStorage.getItem("activeSaveData");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.phase) {
                    initialPhaseName = parsed.phase;
                }
                if (parsed.level) {
                    this.currentLevel = parsed.level;
                }
                if (parsed.skillPoints !== undefined) {
                    this.skillPoints = parsed.skillPoints;
                }
                if (parsed.unlockedSpells !== undefined) {
                    this.unlockedSpells = parsed.unlockedSpells;
                }
            }
        } catch (e) {
            console.error("Failed to parse activeSaveData", e);
        }

        if (
            initialPhaseName === "world" ||
            initialPhaseName === "survive" ||
            initialPhaseName === "void" ||
            initialPhaseName === "fall" ||
            initialPhaseName === "training"
        ) {
            await this.loadLevel(this.currentLevel);
        } else {
            await this.setPhase(new IntroPhase(this));
            this.prefetchLevel(this.currentLevel);
        }
    }

    /**
     * Loads a specific level.
     * @param {number} level - The level to load.
     * @returns {Promise<void>}
     */
    async loadLevel(level) {
        await this.saveStats();
        this.currentLevel = level;
        
        try {
            const response = await fetch(`/api/levels/${level}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.config) {
                    const phaseType = data.config.phase_type;
                    const options = data.config.options || {};
                    
                    if (phaseType === "survive") {
                        await this.setPhase(new SurvivePhase(this, options));
                        return;
                    } else if (phaseType === "void") {
                        await this.setPhase(new InfiniteVoidPhase(this, options));
                        return;
                    } else if (phaseType === "fall") {
                        await this.setPhase(new FallPhase(this, options));
                        return;
                    } else if (phaseType === "training") {
                        await this.setPhase(new TrainingPhase(this, options));
                        return;
                    } else if (phaseType === "world") {
                        const eventMap = {
                            "BridgeWordEvent": BridgeWordEvent,
                            "JumpWordEvent": JumpWordEvent,
                            "DoorEvent": DoorEvent,
                            "HoleEvent": HoleEvent,
                            "FlameWallEvent": FlameWallEvent
                        };
                        const eventInstances = (options.events || []).map(evtConfig => {
                            const evtName = typeof evtConfig === 'string' ? evtConfig : evtConfig.type;
                            const EventClass = eventMap[evtName];
                            return EventClass ? new EventClass(evtConfig) : null;
                        }).filter(Boolean);
                        
                        options.events = eventInstances;
                        await this.setPhase(new WorldPhase(this, options));
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch level config, using defaults", e);
        }
        
        console.warn(`Level ${level} not found or failed to load. Halting progression.`);
    }

    /**
     * Advances to the next level.
     * @returns {Promise<void>}
     */
    async nextLevel() {
        this.currentLevel++;
        this.skillPoints++;
        await this.autoSave();
        await this.loadLevel(this.currentLevel);
    }

    /**
     * Sets a new game phase, cleaning up the current one if necessary.
     * @param {Object} newPhase - The new phase to set.
     * @returns {Promise<void>}
     */
    async setPhase(newPhase) {
        const loader = document.getElementById("global-loader");
        if (loader) loader.classList.remove("hidden");

        if (this.gamePhase && this.gamePhase.cleanup) {
            this.gamePhase.cleanup();
        }

        ProjectilePool.clear();

        this.gamePhase = newPhase;

        await this.autoSave();

        if (this.gamePhase.init) {
            await this.gamePhase.init();
        }

        if (this.floatingTextManager) {
            this.floatingTextManager.clear();
        }

        if (loader) loader.classList.add("hidden");

        this.lastTime = performance.now();

        if (newPhase.constructor.name !== "IntroPhase" && newPhase.constructor.name !== "DuelPhase") {
            this.prefetchLevel(this.currentLevel + 1);
        }
    }

    /**
     * Prefetchs the level.
 * @param {any} level - The level.
     */
    async prefetchLevel(level) {
        if (!PerformanceDetector.shouldPrefetch()) {
            return;
        }

        try {
            const response = await fetch(`/api/levels/${level}`);
            if (!response.ok) return;

            const data = await response.json();
            if (!data.success || !data.config) return;

            const phaseType = data.config.phase_type;
            const options = data.config.options || {};
            const assets = [];

            if (phaseType === "survive") {
                assets.push("/asset/game_assets/models/bug.glb");
                assets.push("/asset/game_assets/models/worms.glb");
                assets.push("/asset/game_assets/models/fireball.glb");
                assets.push("/asset/game_assets/models/player.glb");
            } else if (phaseType === "void") {
                assets.push("/asset/game_assets/models/bug.glb");
                assets.push("/asset/game_assets/models/worms.glb");
                assets.push("/asset/game_assets/models/fireball.glb");
                assets.push("/asset/game_assets/models/player.glb");
            } else if (phaseType === "fall") {
                assets.push("/asset/game_assets/models/player.glb");
            } else if (phaseType === "training") {
                assets.push("/asset/game_assets/models/player.glb");
                assets.push("/asset/game_assets/models/sempai.glb");
            } else if (phaseType === "world") {
                assets.push("/asset/game_assets/models/bug.glb");
                assets.push("/asset/game_assets/models/worms.glb");
                assets.push("/asset/game_assets/models/player.glb");
                assets.push("/asset/game_assets/models/fireball.glb");

                const hasBossEvent = (options.events || []).some(evtConfig => {
                    const evtName = typeof evtConfig === 'string' ? evtConfig : evtConfig.type;
                    return evtName && evtName.toLowerCase().includes("boss");
                });
                if (hasBossEvent || level % 5 === 0) {
                    assets.push("/asset/game_assets/models/yameter.glb");
                }
            }

            const sounds = [];
            if (phaseType === "fall") {
                sounds.push("/asset/game_assets/sounds/wind.wav");
                sounds.push("/asset/game_assets/sounds/cave.wav");
                sounds.push("/asset/game_assets/sounds/warn.wav");
            } else if (phaseType === "world") {
                sounds.push("/asset/game_assets/sounds/cave.wav");
                sounds.push("/asset/game_assets/sounds/jump.wav");
                sounds.push("/asset/game_assets/sounds/fall.wav");
                sounds.push("/asset/game_assets/sounds/impact.wav");
                sounds.push("/asset/game_assets/sounds/long-fall.wav");
                sounds.push("/asset/game_assets/sounds/fire_wall.wav");
                sounds.push("/asset/game_assets/sounds/big-jump.wav");
            } else if (phaseType === "survive" || phaseType === "void" || phaseType === "training") {
                sounds.push("/asset/game_assets/sounds/cave.wav");
                sounds.push("/asset/game_assets/sounds/jump.wav");
                sounds.push("/asset/game_assets/sounds/impact.wav");
                sounds.push("/asset/game_assets/sounds/fire.wav");
                sounds.push("/asset/game_assets/sounds/bonk.wav");
                sounds.push("/asset/game_assets/sounds/damage_1.wav");
                sounds.push("/asset/game_assets/sounds/damage_2.wav");
                sounds.push("/asset/game_assets/sounds/damage_3.wav");
            }

            for (const assetUrl of assets) {
                const loadModelTask = () => {
                    ModelLoader.loadAsync(assetUrl).then(gltf => {
                        if (gltf && gltf.scene && this.renderer && this.camera) {
                            this.renderer.compile(gltf.scene, this.camera);
                        }
                    }).catch(() => {});
                };

                if (window.requestIdleCallback) {
                    window.requestIdleCallback(loadModelTask);
                } else {
                    setTimeout(loadModelTask, 0);
                }
            }

            for (const soundUrl of sounds) {
                const loadSoundTask = () => {
                    AudioManager.preloadSound(soundUrl).catch(() => {});
                };

                if (window.requestIdleCallback) {
                    window.requestIdleCallback(loadSoundTask);
                } else {
                    setTimeout(loadSoundTask, 0);
                }
            }
        } catch (e) {
            console.warn("Prefetching level assets failed", e);
        }
    }

    /**
     * Handles window resize events, updating the camera and renderer.
     */
    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }

        if (this.gamePhase && typeof this.gamePhase.resize === "function") {
            this.gamePhase.resize();
            return;
        }

        const referenceWidth = 1200;
        const ratio = width / referenceWidth;

        if (ratio < 1) {
            const zoomOut = 1 / ratio;
            this.camera?.position.set(16, 15 * zoomOut, 10 * zoomOut);
        } else {
            this.camera?.position.set(16, 15, 10);
        }

        this.camera?.lookAt(16, 2, 2);
        console.log("Resizing canvas...");
    }

    /**
     * Starts the game loop.
     */
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    /**
     * Stops the game loop.
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Destroys the engine, removing event listeners and cleaning up phases.
     */
    destroy() {
        this.stop();
        this.saveStats();
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("spawn_floating_text", this.onSpawnFloatingText);
        if (window.startShake) {
            delete window.startShake;
        }
        if (this.gamePhase && this.gamePhase.cleanup) {
            this.gamePhase.cleanup();
        }
    }

    /**
     * Handles the key down.
 * @param {any} event - The event.
     */
    handleKeyDown(event) {
        if (!this.secretBuffer) this.secretBuffer = "";
        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.secretBuffer += event.key.toUpperCase();
            if (this.secretBuffer.length > 12) this.secretBuffer = this.secretBuffer.substring(this.secretBuffer.length - 12);
            if (this.secretBuffer === "ENTRAINEMENT" && (!this.gamePhase || this.gamePhase.constructor.name !== "TrainingPhase")) {
                this.teleportToTraining();
                this.secretBuffer = "";
                return;
            }
        } else {
            this.secretBuffer = "";
        }

        if (this.gamePhase && this.gamePhase.handleKeyDown) {
            this.gamePhase.handleKeyDown(event);
        }
    }

    /**
     * Teleports to training.
     */
    async teleportToTraining() {
        await this.setPhase(new TrainingPhase(this));
    }

    /**
     * Returns the from training.
     */
    async returnFromTraining() {
        if (this.currentLevel) {
            await this.loadLevel(this.currentLevel);
        } else {
            await this.setPhase(new IntroPhase(this));
        }
    }

    /**
     * Saves the stats.
     */
    async saveStats() {
        try {
            const data = this.stats.getStatsData();
            if (data.playtimeSeconds > 0 || data.wordsTyped > 0) {
                await StatisticsService.updateStats(data);
                this.stats = new StatisticsManager();
            }
        } catch (e) {
            console.error("Failed to save statistics:", e);
        }
    }

    /**
     * Autos the save.
     */
    async autoSave() {
        const activeSlot = localStorage.getItem("activeSaveSlot") || "1";

        let phase = "intro";
        if (this.gamePhase) {
            const phaseName = this.gamePhase.constructor.name;
            if (phaseName === "WorldPhase") {
                phase = "world";
            } else if (phaseName === "SurvivePhase") {
                phase = "survive";
            } else if (phaseName === "InfiniteVoidPhase") {
                phase = "void";
            } else if (phaseName === "FallPhase") {
                phase = "fall";
            } else if (phaseName === "TrainingPhase") {
                phase = "training";
            }
        }

        const currentGameState = {
            phase: phase,
            level: this.currentLevel,
            score: 0,
            skillPoints: this.skillPoints,
            unlockedSpells: this.unlockedSpells,
        };

        if (token) {
            try {
                await SaveService.saveGame(activeSlot, currentGameState);
            } catch (err) {
                console.error("Auto-save failed:", err);
            }
        }

        localStorage.setItem(
            "activeSaveData",
            JSON.stringify(currentGameState)
        );
    }

    /**
     * The main game loop.
     * @param {number} currentTime - The current time in milliseconds.
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (deltaTime > 0.1) {
            deltaTime = 0.1;
        }

        if (this.gamePhase) {
            if (!this.isPaused) {
                this.stats.addPlaytime(deltaTime);
                this.gamePhase.update(deltaTime);
            }
            this.gamePhase.draw();
        }

        this.render();

        const activeCamera = this.gamePhase && this.gamePhase.camera ? this.gamePhase.camera : this.camera;
        if (this.floatingTextManager) {
            this.floatingTextManager.update(activeCamera, deltaTime);
        }

        requestAnimationFrame((time) => this.loop(time));
    }

    /**
     * Renders the current scene using the active camera.
     */
    render() {
        if (!this.renderer || !this.scene) return;

        const activeCamera =
            this.gamePhase && this.gamePhase.camera
                ? this.gamePhase.camera
                : this.camera;

        if (!activeCamera) return;

        let savedPosition = null;
        if (this.shakeIntensity > 0.05) {
            savedPosition = activeCamera.position.clone();
            activeCamera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            activeCamera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
            activeCamera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
        }

        this.renderer.render(this.scene, activeCamera);

        if (savedPosition) {
            activeCamera.position.copy(savedPosition);
        }
    }
}
