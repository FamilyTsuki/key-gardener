import { WorldEvent } from "./WorldEvent.js";
import { JumpWordState } from "./jumpWord/JumpWordState.js";
import { JumpWordUI } from "./jumpWord/JumpWordUI.js";
import { JumpWordAnimation } from "./jumpWord/JumpWordAnimation.js";

export class JumpWordEvent extends WorldEvent {
    constructor(config = {}) {
        super(config.gameEngine);
        this.tileDistance = config.tileDistance || 15;
        
        this.state = new JumpWordState(config.difficultyMultiplier || 1);
        this.ui = new JumpWordUI();
        this.animation = new JumpWordAnimation();

        this.isActive = false;
        this.isCompleted = false;
        this.hasTriggered = false;

        this.triggerX = 0;
        this.triggerY = 0;
        this.triggerTileIds = new Set();
        
        this.setupListeners();
    }

    /**
     * Css the files.
     */
    get cssFiles() {
        return ["/asset/css/bridgeEvent.css"];
    }

    /**
     * Initializes the listeners.
     */
    setupListeners() {
        this.state.on("gauge_updated", (percentage) => {
            this.ui.updateGaugeUI(percentage);
        });

        this.state.on("words_updated", (activeWords) => {
            if (this.isActive) {
                this.ui.updateWordDisplay(activeWords, this.state.currentWordId, this.state.currentTyped);
            }
        });

        this.state.on("jump_ready", () => {
            this.ui.cleanup();
            this.animation.startJumpSequence(this.currentWorldPhase, this.triggerY);
        });
    }

    /**
     * Modifies the layout.
     * @param {any} mapLayout - The mapLayout.
     */
    modifyLayout(mapLayout) {
        const d = this.tileDistance;
        mapLayout.forEach(tile => {
            if (tile.y <= -d && tile.y > -(d + 5)) {
                tile.renderMesh = false;
                tile.letter = null;
            }
            if (tile.y === -(d - 1)) {
                this.triggerTileIds.add(tile.id);
            }
        });
    }

    /**
     * Initializes the jump word event.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} scene - The scene.
     */
    async init(worldPhase, scene) {
        this.currentWorldPhase = worldPhase;
    }

    /**
     * Updates the jump word event state.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     */
    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap || this.isCompleted) return;

        if (this.animation.transitioningToEvent) {
            this.animation.handleCameraTransition(worldPhase, deltaTime, true, () => {
                this.isActive = true;
                this.ui.buildUI();
            });
            return;
        }

        if (this.animation.transitioningToWorld) {
            this.animation.handleCameraTransition(worldPhase, deltaTime, false, () => {
                this.isCompleted = true;
            });
            return;
        }

        if (this.animation.isJumping) {
            this.animation.updateJump(worldPhase, deltaTime);
            return;
        }

        if (this.animation.isLanding) {
            this.animation.updateLanding(worldPhase, deltaTime, () => {
                this.isCompleted = true;
                worldPhase.isTransitioning = false;
            });
            return;
        }

        if (this.animation.isWaitingToJump) {
            this.isActive = false;
            this.animation.updatePreJumpWait(worldPhase, deltaTime);
            return;
        }

        if (this.isActive) {
            this.animation.applyIdleCameraShake(worldPhase, this.state.percentage);
            this.state.update(deltaTime);
            return;
        }

        this.checkJumpTrigger(worldPhase);
    }

    /**
     * Checks the jump trigger.
     * @param {any} worldPhase - The worldPhase.
     */
    checkJumpTrigger(worldPhase) {
        if (!this.triggerTileIds || this.triggerTileIds.size === 0) return;

        const currentTile = worldPhase.worldMap.mapLayout.find(t =>
            Math.abs(t.rawPosition.x - worldPhase.player.x) < 0.1 &&
            Math.abs(t.rawPosition.y - worldPhase.player.y) < 0.1
        );

        if (currentTile && this.triggerTileIds.has(currentTile.id)) {
            if (!this.hasTriggered && !this.isActive && !this.animation.transitioningToEvent) {
                this.hasTriggered = true;
                this.triggerX = currentTile.rawPosition.x;
                this.triggerY = currentTile.rawPosition.y;
                worldPhase.player.mesh.rotation.y = Math.PI - Math.PI / 6;
                
                this.animation.startEventTransition(worldPhase, this.triggerY);
            }
        }
    }

    /**
     * Handles the key down event/action.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} event - The event.
     */
    handleKeyDown(worldPhase, event) {
        if (!this.isActive) {
            if (this.animation.transitioningToEvent || this.animation.transitioningToWorld) return true;
            return false;
        }

        if (event.key === "Backspace") {
            this.state.handleBackspace();
            return true;
        }

        const key = event.key.toUpperCase();
        if (key.length === 1 && key.match(/[A-Z]/)) {
            this.state.handleCharacter(key);
        }
        return true;
    }

    /**
     * Cleans up the jump word event resources.
     * @param {any} worldPhase - The worldPhase.
     */
    cleanup(worldPhase) {
        this.ui.cleanup();
    }
}
