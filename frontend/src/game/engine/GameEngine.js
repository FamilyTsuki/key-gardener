import * as THREE from "three";
import { WorldPhase } from "./WorldPhase.js";
import { IntroPhase } from "./IntroPhase.js";
import { SurvivePhase } from "./SurvivePhase.js";
import { DoorEvent } from "../events/DoorEvent.js";
import { TempoEvent } from "../events/TempoEvent.js";
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
        this.lastTime = 0;
        this.gamePhase = null;
        this.currentLevel = 1;

        this.resize();

        window.addEventListener("resize", () => this.resize());
        window.addEventListener("keydown", (e) => {
            if (this.gamePhase) {
                this.gamePhase.handleKeyDown(e);
            }
        });
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

        if (initialPhaseName === "game") {
            await this.loadLevel(this.currentLevel);
        } else if (initialPhaseName === "survive") {
            await this.setPhase(new SurvivePhase(this));
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
        
        if (level === 1) {
            await this.setPhase(new WorldPhase(this, [new BridgeWordEvent()]));
        } else if (level === 2) {
            await this.setPhase(new WorldPhase(this, [new TempoEvent(), new DoorEvent()]));
        } else if (level === 3) {
            await this.setPhase(new WorldPhase(this, [new FlameWallEvent(), new DoorEvent()]));
        } else if (level >= 4) {
            await this.setPhase(new SurvivePhase(this));
        }
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
        if (this.gamePhase && this.gamePhase.cleanup) {
            this.gamePhase.cleanup();
        }

        this.gamePhase = newPhase;

        if (this.gamePhase.init) {
            await this.gamePhase.init();
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
     * The main game loop.
     * @param {number} currentTime - The current time in milliseconds.
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (this.gamePhase) {
            this.gamePhase.update(deltaTime);
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

        this.renderer.render(this.scene, activeCamera);
    }
}
