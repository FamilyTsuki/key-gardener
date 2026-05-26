/**
 * Base class representing an event that can occur in the world phase.
 */
export class WorldEvent {
    /**
     * Creates an instance of WorldEvent.
     */
    constructor() {}

    /**
     * Called when the WorldPhase initializes.
     * @param {WorldPhase} worldPhase - The instance of WorldPhase.
     * @param {THREE.Scene} scene - The main three.js scene.
     */
    async init(worldPhase, scene) {}

    /**
     * Called every frame.
     * @param {WorldPhase} worldPhase - The instance of WorldPhase.
     * @param {number} deltaTime - Time elapsed since last frame.
     */
    update(worldPhase, deltaTime) {}

    /**
     * Called on key press.
     * @param {WorldPhase} worldPhase - The instance of WorldPhase.
     * @param {KeyboardEvent} event - The keydown event.
     */
    handleKeyDown(worldPhase, event) {}

    /**
     * Called when the WorldPhase is cleaned up.
     * @param {WorldPhase} worldPhase - The instance of WorldPhase.
     */
    cleanup(worldPhase) {}
}
