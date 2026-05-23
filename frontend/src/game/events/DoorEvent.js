import { WorldEvent } from "./WorldEvent.js";

/**
 * Event for handling interaction with a door in the world phase.
 */
export class DoorEvent extends WorldEvent {
    /**
     * Creates an instance of DoorEvent.
     */
    constructor() {
        super();
        this.isDoorSequenceActive = false;
        this.doorSequence = ["O", "P", "E", "N"];
        this.doorSequenceIndex = 0;
        this.isDoorOpen = false;
        this.isOpeningDoor = false;
        this.enterPromptOverlay = null;
        this.uiOverlay = null;
        this.errorTimeout = null;
    }

    /**
     * Initializes the door event.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {THREE.Scene} scene - The scene instance.
     * @returns {Promise<void>}
     */
    async init(worldPhase, scene) {}

    /**
     * Updates the state of the door event, checking player proximity.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {number} deltaTime - Time elapsed since last frame.
     */
    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap) return;

        const doorTile = worldPhase.worldMap.mapLayout.find(
            (t) => t.isDoorTile
        );
        if (doorTile) {
            const dx = doorTile.rawPosition.x - worldPhase.player.x;
            const dy = doorTile.rawPosition.y - worldPhase.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!this.isDoorOpen && !this.isOpeningDoor) {
                if (dist < 2.5 && !this.isDoorSequenceActive) {
                    this.startDoorSequence(worldPhase);
                }
            } else if (this.isDoorOpen) {
                if (dist < 0.5) {
                    this.showEnterPrompt(worldPhase);
                } else {
                    this.hideEnterPrompt(worldPhase);
                }
            }
        }
    }

    /**
     * Handles keyboard input during the door sequence or interaction.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {KeyboardEvent} event - The keyboard event.
     * @returns {boolean} True if the event was intercepted, false otherwise.
     */
    handleKeyDown(worldPhase, event) {
        if (this.isDoorSequenceActive) {
            const keyName = event.key.toUpperCase();
            if (keyName === this.doorSequence[this.doorSequenceIndex]) {
                this.doorSequenceIndex++;
                this.updateDoorUI();
                if (this.doorSequenceIndex >= this.doorSequence.length) {
                    this.completeDoorSequence(worldPhase);
                }
            } else {
                if (this.uiOverlay) {
                    this.doorSequenceIndex = 0;
                    this.updateDoorUI();
                    this.uiOverlay.classList.remove("error");
                    void this.uiOverlay.offsetWidth;
                    this.uiOverlay.classList.add("error");

                    if (this.errorTimeout) clearTimeout(this.errorTimeout);
                    this.errorTimeout = setTimeout(() => {
                        if (this.uiOverlay)
                            this.uiOverlay.classList.remove("error");
                    }, 400);
                }
            }
            return true;
        }

        if (worldPhase.isTransitioning) return false;

        const keyName = event.key.toUpperCase();
        if (this.isDoorOpen && keyName === "ENTER") {
            const doorTile = worldPhase.worldMap.mapLayout.find(
                (t) => t.isDoorTile
            );
            if (doorTile) {
                const dx = doorTile.rawPosition.x - worldPhase.player.x;
                const dy = doorTile.rawPosition.y - worldPhase.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 2.5) {
                    worldPhase.isTransitioning = true;
                    this.hideEnterPrompt(worldPhase);
                    worldPhase.gameEngine.nextLevel();
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Cleans up the UI overlay and timeouts.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    cleanup(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
        if (this.errorTimeout) clearTimeout(this.errorTimeout);
    }

    /**
     * Starts the door opening mini-game sequence.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    startDoorSequence(worldPhase) {
        this.isDoorSequenceActive = true;
        this.doorSequenceIndex = 0;

        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("door-mini-game-overlay");

        document.body.appendChild(this.uiOverlay);
        this.updateDoorUI();
    }

    /**
     * Updates the UI for the door opening sequence.
     */
    updateDoorUI() {
        if (!this.uiOverlay) return;
        this.uiOverlay.innerHTML = "";

        this.doorSequence.forEach((letter, index) => {
            const letterBox = document.createElement("div");
            letterBox.innerText = letter;
            letterBox.classList.add("door-mini-game-letter");

            if (index < this.doorSequenceIndex) {
                letterBox.classList.add("done");
            } else if (index === this.doorSequenceIndex) {
                letterBox.classList.add("active");
            } else {
                letterBox.classList.add("pending");
            }
            this.uiOverlay.appendChild(letterBox);
        });
    }

    /**
     * Completes the door sequence and opens the door.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @returns {Promise<void>}
     */
    async completeDoorSequence(worldPhase) {
        this.isDoorSequenceActive = false;
        this.isOpeningDoor = true;

        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }

        if (worldPhase.worldMap) {
            await worldPhase.worldMap.openDoor();
        }

        this.isOpeningDoor = false;
        this.isDoorOpen = true;
    }

    /**
     * Shows a prompt indicating the player can enter the portal.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    showEnterPrompt(worldPhase) {
        if (this.enterPromptOverlay) return;

        this.enterPromptOverlay = document.createElement("div");
        this.enterPromptOverlay.classList.add(
            "door-mini-game-overlay",
            "enter-prompt-overlay"
        );

        const enterKey = document.createElement("div");
        enterKey.classList.add("enter-prompt-key");
        enterKey.innerHTML = `
            <svg width="40" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
        `;

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("enter-prompt-title");
        titleDiv.innerText = "Entrer dans le portail";

        this.enterPromptOverlay.appendChild(titleDiv);
        this.enterPromptOverlay.appendChild(enterKey);

        document.body.appendChild(this.enterPromptOverlay);
    }

    /**
     * Hides the enter prompt.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    hideEnterPrompt(worldPhase) {
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
    }
}
