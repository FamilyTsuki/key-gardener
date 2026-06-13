import * as THREE from "three";
import { WorldPhase } from "../phases/WorldPhase.js";
import { IntroPhase } from "../phases/IntroPhase.js";
import { SurvivePhase } from "../phases/SurvivePhase.js";
import { InfiniteVoidPhase } from "../phases/InfiniteVoidPhase.js";
import { DuelPhase } from "../phases/DuelPhase.js";
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
        
        this.stats = new StatisticsManager();
        this.floatingTextManager = new FloatingTextManager();

        this.resize();

        this.onResize = () => this.resize();
        this.onKeyDown = (e) => {
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
            }
        } catch (e) {
            console.error("Failed to parse activeSaveData", e);
        }

        if (
            initialPhaseName === "world" ||
            initialPhaseName === "survive" ||
            initialPhaseName === "void"
        ) {
            await this.loadLevel(this.currentLevel);
        } else {
            await this.setPhase(new IntroPhase(this));
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

    async autoSave() {
        const token = AuthService.getToken();
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
            }
        }

        const currentGameState = {
            phase: phase,
            level: this.currentLevel,
            score: 0,
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
