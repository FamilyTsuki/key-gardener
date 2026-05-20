import * as THREE from "three";
import { WorldPhase } from "./WorldPhase.js";
import { IntroPhase } from "./IntroPhase.js";
import { SurvivePhase } from "./SurvivePhase.js";

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        if (!this.canvas) {
            throw new Error("Canvas element #game-canvas not found.");
        }

        this.scene = new THREE.Scene();
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
        this.renderer.setClearColor(0x434343, 1);

        this.isRunning = false;
        this.lastTime = 0;
        this.gamePhase = null;

        this.resize();

        window.addEventListener("resize", () => this.resize());
        window.addEventListener("keydown", (e) => {
            if (this.gamePhase) {
                this.gamePhase.handleKeyDown(e);
            }
        });
    }

    async init() {
        let initialPhaseName = "init";
        try {
            const savedData = localStorage.getItem("activeSaveData");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.phase) {
                    initialPhaseName = parsed.phase;
                }
            }
        } catch (e) {
            console.error("Failed to parse activeSaveData", e);
        }

        if (initialPhaseName === "game") {
            await this.setPhase(new WorldPhase(this));
        } else if (initialPhaseName === "survive") {
            await this.setPhase(new SurvivePhase(this));
        } else {
            await this.setPhase(new IntroPhase(this));
        }
    }

    async setPhase(newPhase) {
        if (this.gamePhase && this.gamePhase.cleanup) {
            this.gamePhase.cleanup();
        }
        
        this.gamePhase = newPhase;
        
        if (this.gamePhase.init) {
            await this.gamePhase.init();
        }
    }

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

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

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

    render() {
        if (!this.renderer || !this.scene) return;
        
        const activeCamera = (this.gamePhase && this.gamePhase.camera) ? this.gamePhase.camera : this.camera;
        
        if (!activeCamera) return;
        
        this.renderer.render(this.scene, activeCamera);
    }
}
