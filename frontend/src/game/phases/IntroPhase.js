import { GamePhase } from "./GamePhase.js";
import { WorldPhase } from "./WorldPhase.js";
import { AmbientBackground, GlitchEffect } from "../utilities/IntroVisuals.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * Represents the introductory cinematic phase of the game.
 */
export class IntroPhase extends GamePhase {
    static GLITCH_DELAY_MS = 38000;
    static RIFT_OPENING_DELAY_MS = 40000;
    static STATIC_STATE_DELAY_MS = 41000;
    static DIALOGUE_DELAY_MS = 43000;
    static RIFT_TRANSITION_DELAY_MS = 1000;

    /**
     * Creates an instance of IntroPhase.
     * @param {GameEngine} gameEngine - The game engine instance.
     */
    constructor(gameEngine) {
        super(gameEngine);
        this.camera = this.gameEngine.camera;
        this.container = null;
        this.video = null;
        this.rift = null;
        this.ambientBackground = null;
        this.glitchEffect = null;
        this.timeouts = [];
        this.onRiftClick = this.handleRiftClick.bind(this);

        this.dialogueContainer = null;
        this.dialogueText = null;
        this.dialogueStep = 0;
        this.dialogues = [LanguageManager.t("engine.introDialogue1"), LanguageManager.t("engine.introDialogue2")];
        this.dialogueTimeout = null;
        this.typewriterInterval = null;
    }

    /**
     * Initializes the intro phase, setting up DOM elements and starting the timeline.
     * @returns {Promise<void>}
     */
    async init() {
        this.createCinematicDOM();
        this.ambientBackground = new AmbientBackground(this.container);
        this.ambientBackground.start();
        this.startCinematicTimeline();
    }

    /**
     * Creates the main DOM elements for the cinematic video and rift.
     */
    createCinematicDOM() {
        this.container = document.createElement("div");
        this.container.className = "intro-cinematic-container";

        const video = document.createElement("video");
        video.className = "intro-video";
        video.src = "/asset/game_assets/videos/bg.mp4";
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        video.controls = false;
        video.oncontextmenu = (e) => e.preventDefault();

        const rift = document.createElement("img");
        rift.className = "cinematic-rift ";
        rift.src = "/asset/game_assets/textures/shift.png";
        rift.alt = "rift";

        this.container.appendChild(video);
        this.container.appendChild(rift);
        this.createDialogueDOM();
        document.body.appendChild(this.container);

        this.video = video;
        this.rift = rift;
    }

    /**
     * Creates the DOM elements for the dialogue UI.
     */
    createDialogueDOM() {
        this.dialogueContainer = document.createElement("div");
        this.dialogueContainer.className = "intro-dialogue-container";

        const bubble = document.createElement("div");
        bubble.className = "intro-dialogue-bubble";

        this.dialogueText = document.createElement("span");
        this.dialogueText.className = "intro-dialogue-text";

        const tail = document.createElement("div");
        tail.className = "intro-dialogue-tail";

        bubble.appendChild(this.dialogueText);

        const skipIndicator = document.createElement("div");
        skipIndicator.className = "dialogue-skip-indicator";
        skipIndicator.innerHTML = "↵ Enter / Space";
        bubble.appendChild(skipIndicator);

        this.dialogueContainer.appendChild(tail);
        this.dialogueContainer.appendChild(bubble);

        this.container.appendChild(this.dialogueContainer);
    }

    /**
     * Starts the timed sequence of cinematic events.
     */
    startCinematicTimeline() {
        this.timeouts.push(
            setTimeout(() => {
                this.triggerGlitches();
            }, IntroPhase.GLITCH_DELAY_MS)
        );

        this.timeouts.push(
            setTimeout(() => {
                this.triggerRiftOpening();
            }, IntroPhase.RIFT_OPENING_DELAY_MS)
        );

        this.timeouts.push(
            setTimeout(() => {
                this.triggerStaticState();
            }, IntroPhase.STATIC_STATE_DELAY_MS)
        );

        this.timeouts.push(
            setTimeout(() => {
                this.triggerDialogue();
            }, IntroPhase.DIALOGUE_DELAY_MS)
        );
    }

    /**
     * Triggers the glitch effects on the video and container.
     */
    triggerGlitches() {
        if (this.video) {
            this.video.classList.add("glitching");
        }
        this.glitchEffect = new GlitchEffect(this.container);
        this.glitchEffect.start();
    }

    /**
     * Triggers the appearance of the rift and pauses the video.
     */
    triggerRiftOpening() {
        if (this.rift) {
            this.rift.classList.add("visible");
        }
        if (this.video) {
            this.video.pause();
            this.video.classList.add("glitch-paused");
        }
        if (this.container) {
            this.container.classList.add("glitch-paused");
        }
    }

    /**
     * Transitions the video state to a static broken look.
     */
    triggerStaticState() {
        if (this.video && this.rift) {
            this.video.classList.remove("glitching");
            this.video.classList.remove("glitch-paused");
            this.video.classList.add("static-broken");
        }
        if (this.container) {
            this.container.classList.remove("glitch-paused");
        }
    }

    /**
     * Shows the dialogue container and starts the dialogue sequence.
     */
    triggerDialogue() {
        if (!this.dialogueContainer) return;
        this.dialogueContainer.classList.add("visible");
        this.showNextDialogue();
    }

    /**
     * Displays the next piece of dialogue with a typewriter effect.
     */
    showNextDialogue() {
        if (this.dialogueTimeout) {
            clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = null;
        }
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }

        if (this.dialogueStep < this.dialogues.length) {
            const fullText = this.dialogues[this.dialogueStep];
            this.dialogueText.textContent = "";
            this.dialogueStep++;
            let charIndex = 0;

            this.typewriterInterval = setInterval(() => {
                this.dialogueText.textContent += fullText[charIndex];
                charIndex++;
                if (charIndex >= fullText.length) {
                    clearInterval(this.typewriterInterval);
                    this.typewriterInterval = null;
                    
                    const autoSkipDelay = Math.max(3000, fullText.length * 80);
                    this.dialogueTimeout = setTimeout(() => {
                        this.advanceDialogue();
                    }, autoSkipDelay);
                }
            }, 50);
        } else {
            this.endDialogue();
        }
    }

    /**
     * Advances the dialogue instantly if it's currently typing out.
     */
    advanceDialogue() {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
            const fullText = this.dialogues[this.dialogueStep - 1];
            this.dialogueText.textContent = fullText;

            if (this.dialogueTimeout) clearTimeout(this.dialogueTimeout);
            const autoSkipDelay = Math.max(3000, (fullText || '').length * 80);
            this.dialogueTimeout = setTimeout(() => {
                this.advanceDialogue();
            }, autoSkipDelay);
        } else {
            this.showNextDialogue();
        }
    }

    /**
     * Ends the dialogue sequence and makes the rift clickable.
     */
    endDialogue() {
        if (this.dialogueContainer) {
            this.dialogueContainer.classList.remove("visible");
        }
        if (this.rift) {
            this.rift.classList.add("clickable");
            this.rift.addEventListener("click", this.onRiftClick);
        }
    }

    /**
     * Handles clicking on the rift, transitioning to the next phase.
     */
    handleRiftClick() {
        this.rift.removeEventListener("click", this.onRiftClick);
        this.rift.classList.remove("clickable");
        this.container.classList.add("transitioning");
        setTimeout(() => {
            this.gameEngine.loadLevel(this.gameEngine.currentLevel || 1);
        }, IntroPhase.RIFT_TRANSITION_DELAY_MS);
    }

    /**
     * Updates the logic for this phase.
     * @param {number} _deltaTime - The time elapsed since the last update.
     */
    update(_deltaTime) {}

    /**
     * Draws the elements of this phase.
     */
    draw() {}

    /**
     * Handles keyboard interactions during the intro.
     * @param {KeyboardEvent} _event - The keyboard event.
     */
    handleKeyDown(_event) {
        if (
            this.dialogueContainer &&
            this.dialogueContainer.classList.contains("visible")
        ) {
            if (_event.code === "Space" || _event.code === "Enter") {
                this.advanceDialogue();
            }
        } else if (this.rift && this.rift.classList.contains("clickable")) {
            if (_event.code === "Space" || _event.code === "Enter") {
                this.handleRiftClick();
            }
        }
    }

    /**
     * Cleans up all DOM elements and timeouts.
     */
    cleanup() {
        if (this.glitchEffect) {
            this.glitchEffect.destroy();
            this.glitchEffect = null;
        }
        if (this.ambientBackground) {
            this.ambientBackground.destroy();
            this.ambientBackground = null;
        }
        this.timeouts.forEach((id) => clearTimeout(id));
        this.timeouts = [];
        if (this.dialogueTimeout) {
            clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = null;
        }
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }
        if (this.rift) {
            this.rift.removeEventListener("click", this.onRiftClick);
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
