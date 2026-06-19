import { GamePhase } from "./GamePhase.js";
import Player from "../models/actors/Player.js";
import { AudioManager } from "../managers/AudioManager.js";

import { FallRenderer } from "./fall/FallRenderer.js";
import { FallObstacles } from "./fall/FallObstacles.js";
import { FallUI } from "./fall/FallUI.js";
import { FallInput } from "./fall/FallInput.js";
import { FallState } from "./fall/FallState.js";

export class FallPhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        this.options = options;
        this.decorType = typeof options === "string" ? options : (options.decorType || "default");
        
        this.state = new FallState(this);
        this.renderer = new FallRenderer(this);
        this.obstacles = new FallObstacles(this);
        this.ui = new FallUI(this);
        this.input = new FallInput(this);
        
        this.player = null;
    }

    async init() {
        const scene = this.gameEngine.scene;
        this.ui.init();
        this.renderer.init(scene, this.gameEngine.camera, this.decorType);

        AudioManager.preloadSound("/asset/game_assets/sounds/warn.wav");

        this.player = new Player(
            "Hero", 100, 100, { x: 0, y: 15, z: 5 }, { width: 0.4, height: 0.4 },
            this.renderer.worldGroup, null, null,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );

        this.player.allowSpeedUp = false;
        this.player.movementDuration = 35;

        this.obstacles.updateLanePositions();

        if (this.player.loadPromise) {
            await this.player.loadPromise;
            if (this.player.mesh) this.player.mesh.rotation.set(0, Math.PI, 0);
            if (this.player.renderer && this.player.renderer.playerModel) {
                this.player.renderer.baseRotationX = -Math.PI;
                this.player.renderer.playerModel.rotation.set(-Math.PI, 0, 0);
                this.player.renderer.playerModel.position.y = 0;
            }
        }

        this.windAmbiance = AudioManager.playAmbiance("/asset/game_assets/sounds/wind.wav", 0.8);
        this.caveAmbiance = AudioManager.playAmbiance("/asset/game_assets/sounds/cave.wav", 0.5);
        
        this.waitForLoader().then(() => {
            this.state.isReady = true;
        });
    }

    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            if (!loader) return resolve();
            
            const checkHidden = setInterval(() => {
                if (loader.classList.contains("hidden")) {
                    clearInterval(checkHidden);
                    setTimeout(resolve, 600);
                }
            }, 50);
        });
    }

    resize() {
        const camera = this.gameEngine.camera;
        if (camera) {
            camera.position.set(0, -10, 70);
            camera.lookAt(0, -10, 0);
        }
        this.updateLanePositions();
    }

    updateLanePositions() {
        const camera = this.gameEngine.camera;
        if (!camera) return;

        const playerZ = (this.player ? this.player.targetPosition.y : 15) * (this.player ? this.player.spacingZ : 3.2);
        const distance = Math.abs(camera.position.z - playerZ);
        const visibleHeight = 2 * distance * Math.tan((camera.fov * Math.PI) / 360);
        const visibleWidth = visibleHeight * camera.aspect;
        const laneXWidth = visibleWidth / 3;

        if (this.player) {
            this.player.spacingX = laneXWidth / 6;
            this.player.renderer.updatePosition(this.player.movement);
        }

        this.obstacles.updateLanePositions();
    }

    update(deltaTime) {
        const movementDelta = this.state.update(deltaTime);
        if (movementDelta === 0 && (!this.state.isReady || this.state.isPhaseEnded)) return;

        this.ui.updateDeep(this.state.deep);
        this.renderer.updateScrollingVisuals(movementDelta);
        this.obstacles.update(deltaTime, movementDelta, this.state.isTransitioningToNextLevel);

        if (this.player) {
            this.player.update(deltaTime, null);
            this.renderer.updatePlayerVisuals(this.player, deltaTime);
        }

        this.renderer.updateDecor(deltaTime);
    }

    draw() {}

    handleKeyDown(event) {
        this.input.handleKeyDown(event);
    }

    cleanup() {
        if (this.windAmbiance) {
            this.windAmbiance.stop();
            this.windAmbiance = null;
        }
        if (this.caveAmbiance) {
            this.caveAmbiance.stop();
            this.caveAmbiance = null;
        }

        if (this.player && this.player.mesh && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.player.mesh);
        }
        this.renderer.cleanup(this.gameEngine.scene);
        this.obstacles.cleanup();
        this.ui.cleanup();
    }
}