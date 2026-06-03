import * as THREE from "three";
import { WorldPhase } from "../phases/WorldPhase.js";
import { IntroPhase } from "../phases/IntroPhase.js";
import { SurvivePhase } from "../phases/SurvivePhase.js";
import { DoorEvent } from "../events/DoorEvent.js";
import { HoleEvent } from "../events/HoleEvent.js";
import { FlameWallEvent } from "../events/FlameWallEvent.js";
import { BridgeWordEvent } from "../events/BridgeWordEvent.js";

/**
 * Represents the main game engine that manages scenes, phases, and the render loop.
 */
export class GameEngine {
    /**
     * Creates an instance of GameEngine.
     */
    constructor() {
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
    }

    /**
     * Initializes the game engine, loading saved data if available, and setting the initial phase.
     * @returns {Promise<void>}
     */
    async init() {
        let initialPhaseName = "init";
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

        if (initialPhaseName === "game" || initialPhaseName === "survive") {
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
                    } else if (phaseType === "world") {
                        const eventMap = {
                            "BridgeWordEvent": BridgeWordEvent,
                            "DoorEvent": DoorEvent,
                            "HoleEvent": HoleEvent,
                            "FlameWallEvent": FlameWallEvent
                        };
                        const eventInstances = (options.events || []).map(evtName => {
                            const EventClass = eventMap[evtName];
                            return EventClass ? new EventClass() : null;
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

        if (this.gamePhase.init) {
            await this.gamePhase.init();
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
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("keydown", this.onKeyDown);
        if (window.startShake) {
            delete window.startShake;
        }
        if (this.gamePhase && this.gamePhase.cleanup) {
            this.gamePhase.cleanup();
        }
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
                this.gamePhase.update(deltaTime);
            }
            this.gamePhase.draw();
        }

        this.render();

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
