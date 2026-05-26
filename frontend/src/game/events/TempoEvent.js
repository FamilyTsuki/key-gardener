import { WorldEvent } from "./WorldEvent.js";

export class TempoEvent extends WorldEvent {
    /**
     * Creates an instance of TempoEvent.
     */
    constructor() {
        super();
        this.bpm = 80;
        this.beatInterval = 60 / this.bpm;
        this.tolerance = 0.25;
        this.timeElapsed = 0;
        this.uiOverlay = null;
        this.barContainer = null;
        this.centerTarget = null;
        this.leftBall = null;
        this.rightBall = null;
    }

    /**
     * Initializes the tempo event and builds its UI.
     * @param {Object} worldPhase
     * @param {THREE.Scene} scene
     * @returns {Promise<void>}
     */
    async init(worldPhase, scene) {
        this.buildUI();
    }

    /**
     * Constructs and appends the DOM elements for the rhythm UI.
     */
    buildUI() {
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("tempo-overlay");

        const title = document.createElement("div");
        title.innerText = "KEEP THE RHYTHM!";
        title.classList.add("tempo-title");

        this.barContainer = document.createElement("div");
        this.barContainer.classList.add("tempo-bar-container");

        this.centerTarget = document.createElement("div");
        this.centerTarget.classList.add("tempo-center-target");

        this.leftBall = document.createElement("div");
        this.leftBall.classList.add("tempo-ball");

        this.rightBall = document.createElement("div");
        this.rightBall.classList.add("tempo-ball");

        this.barContainer.appendChild(this.centerTarget);
        this.barContainer.appendChild(this.leftBall);
        this.barContainer.appendChild(this.rightBall);

        this.uiOverlay.appendChild(title);
        this.uiOverlay.appendChild(this.barContainer);

        document.body.appendChild(this.uiOverlay);
    }

    /**
     * Updates the event logic per frame.
     * @param {Object} worldPhase
     * @param {number} deltaTime
     */
    update(worldPhase, deltaTime) {
        this.timeElapsed += deltaTime;
        
        const timeSinceLastBeat = this.timeElapsed % this.beatInterval;
        const timeToNextBeat = this.beatInterval - timeSinceLastBeat;
        const closestDistance = Math.min(timeSinceLastBeat, timeToNextBeat);
        
        const progress = timeSinceLastBeat / this.beatInterval;

        this.updateBallPositions(progress);
        this.updateTargetVisuals(closestDistance);
    }

    /**
     * Animates the balls based on the rhythm progress.
     * @param {number} progress
     */
    updateBallPositions(progress) {
        if (!this.leftBall || !this.rightBall) return;
        
        const leftPos = progress * 50;
        const rightPos = 100 - (progress * 50);
        
        this.leftBall.style.left = `${leftPos}%`;
        this.rightBall.style.left = `${rightPos}%`;
    }

    /**
     * Updates the visual state of the center target based on rhythm proximity.
     * @param {number} closestDistance
     */
    updateTargetVisuals(closestDistance) {
        if (!this.centerTarget) return;

        if (closestDistance < this.tolerance / 2) {
            this.centerTarget.classList.add("hit");
            this.centerTarget.classList.remove("miss");
        } else {
            this.centerTarget.classList.remove("hit");
        }
    }

    /**
     * Intercepts keydown events to enforce rhythm constraints on player movement.
     * @param {Object} worldPhase
     * @param {KeyboardEvent} event
     * @returns {boolean} True if the input is intercepted and blocked.
     */
    handleKeyDown(worldPhase, event) {
        if (this.isMovementKey(event.key)) {
            return this.processRhythmInput();
        }
        return false;
    }

    /**
     * Checks if a pressed key is a valid movement key.
     * @param {string} key
     * @returns {boolean}
     */
    isMovementKey(key) {
        return key.length === 1 && key.match(/[a-z]/i);
    }

    /**
     * Validates if the player pressed a key on beat.
     * @returns {boolean} True if the player missed the beat.
     */
    processRhythmInput() {
        const timeSinceLastBeat = this.timeElapsed % this.beatInterval;
        const timeToNextBeat = this.beatInterval - timeSinceLastBeat;
        const closestDistance = Math.min(timeSinceLastBeat, timeToNextBeat);

        if (closestDistance > this.tolerance) {
            this.triggerMissFeedback();
            return true;
        }
        return false;
    }

    /**
     * Activates the UI feedback when the player misses a beat.
     */
    triggerMissFeedback() {
        if (this.centerTarget) {
            this.centerTarget.classList.add("miss");
        }
        
        const flash = document.createElement("div");
        flash.classList.add("tempo-flash");
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);
    }

    /**
     * Cleans up all resources used by the event.
     * @param {Object} worldPhase
     */
    cleanup(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
    }
}
