import { WorldEvent } from "./WorldEvent.js";
import { BridgeWordState } from "./bridgeWord/BridgeWordState.js";
import { BridgeWordUI } from "./bridgeWord/BridgeWordUI.js";
import { BridgeWordAnimation } from "./bridgeWord/BridgeWordAnimation.js";

export class BridgeWordEvent extends WorldEvent {
    constructor(config = {}) {
        super(config.gameEngine);
        this.tileDistance = config.tileDistance || 15;
        this.scenarioType = config.scenarioType;
        
        this.state = new BridgeWordState(config.difficultyMultiplier || 1);
        this.ui = new BridgeWordUI();
        this.animation = new BridgeWordAnimation();

        this.isActive = false;
        this.isCompleted = false;

        this.triggerX = 0;
        this.triggerY = 0;
        this.triggerTileId = null;

        this.setupListeners();
    }

    get cssFiles() {
        return ["/asset/css/bridgeEvent.css"];
    }

    setupListeners() {
        this.state.on("words_updated", (activeWords) => {
            if (this.isActive) {
                this.ui.updateWordDisplay(activeWords, this.state.currentWordId, this.state.currentTyped);
            }
        });

        this.state.on("word_completed", () => {
            this.animation.addBridgePiece(this.currentWorldPhase, this.state.targetCompletedCount, this.state.completedCount);
        });

        this.state.on("bridge_completed", () => {
            this.isActive = false;
            this.ui.cleanup();
            this.animation.finishEvent(this.currentWorldPhase);
        });
    }

    modifyLayout(mapLayout) {
        const d = this.tileDistance;
        mapLayout.forEach(tile => {
            if (tile.y <= -d && tile.y > -(d + 5)) {
                tile.renderMesh = false;
                tile.letter = null;
            }
            if (tile.y === -(d - 1)) {
                this.triggerTileId = tile.id;
            }
        });
    }

    async init(worldPhase, scene) {
        this.currentWorldPhase = worldPhase;
    }

    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap) return;

        if (this.isCompleted) return;

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

        if (this.isActive) {
            worldPhase.camera.position.copy(this.animation.eventCameraPos);
            worldPhase.camera.lookAt(this.animation.eventCameraLookAt);
            
            this.state.update(deltaTime);
            this.animation.updateTileAnimations(deltaTime);
            
            return;
        }

        this.checkBridgeTrigger(worldPhase);
    }

    checkBridgeTrigger(worldPhase) {
        if (!this.triggerTileId) return;

        const currentTile = worldPhase.worldMap.mapLayout.find(t => 
            Math.abs(t.rawPosition.x - worldPhase.player.x) < 0.1 && 
            Math.abs(t.rawPosition.y - worldPhase.player.y) < 0.1
        );

        if (currentTile && currentTile.id === this.triggerTileId) {
            if (!this.isActive && !this.animation.transitioningToEvent) {
                this.triggerX = currentTile.rawPosition.x;
                this.triggerY = currentTile.rawPosition.y;
                this.animation.startEventTransition(worldPhase, this.triggerY);
            }
        }
    }

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

    cleanup(worldPhase) {
        this.ui.cleanup();
        this.animation.cleanup(worldPhase);
    }
}
