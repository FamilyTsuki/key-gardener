/**
 * Base class representing an event that can occur in the world phase.
 */
export class WorldEvent {
    /**
     * Creates an instance of WorldEvent.
     */
    constructor() {}

    /**
     * Called before the WorldMap meshes are generated to allow the event to mutate the layout.
     * @param {any} mapLayout - The mapLayout.
     */
    modifyLayout(mapLayout) {}

    /**
     * Called when the WorldPhase initializes.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} scene - The scene.
     */
    async init(worldPhase, scene) {}

    /**
     * Called every frame.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     */
    update(worldPhase, deltaTime) {}

    /**
     * Called on key press.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} event - The event.
     */
    handleKeyDown(worldPhase, event) {}

    /**
     * Called when the WorldPhase is cleaned up.
     * @param {any} worldPhase - The worldPhase.
     */
    cleanup(worldPhase) {}
}
