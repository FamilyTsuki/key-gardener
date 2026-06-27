/**
 * Represents a generic game phase.
 */
export class GamePhase {
    /**
     * Creates an instance of GamePhase.
     * @param {any} gameEngine - The gameEngine.
     */
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    /**
     * Initializes the game phase.
     * @returns {Promise<void>}
     */
    async init() {}

    /**
     * Draws the elements of the game phase.
     */
    draw() {}

    /**
     * Handles keyboard events.
     * @param {any} _event - The _event.
     */
    handleKeyDown(_event) {}

    /**
     * Updates the game phase logic.
     * @param {any} _deltaTime - The _deltaTime.
     */
    update(_deltaTime) {}

    /**
     * Cleans up resources used by the game phase.
     */
    cleanup() {}
}
