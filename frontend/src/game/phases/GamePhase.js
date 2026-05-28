/**
 * Represents a generic game phase.
 */
export class GamePhase {
    /**
     * Creates an instance of GamePhase.
     * @param {Object} gameEngine - The game engine instance.
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
     * @param {KeyboardEvent} _event - The keyboard event.
     */
    handleKeyDown(_event) {}

    /**
     * Updates the game phase logic.
     * @param {number} _deltaTime - The time elapsed since the last update.
     */
    update(_deltaTime) {}

    /**
     * Cleans up resources used by the game phase.
     */
    cleanup() {}
}
