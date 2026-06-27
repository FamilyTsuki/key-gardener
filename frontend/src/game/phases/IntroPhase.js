import { el } from "../../core/utils/DOMBuilder.js";
import { GamePhase } from "./GamePhase.js";
import { WorldPhase } from "./WorldPhase.js";
import { AmbientBackground, GlitchEffect } from "../utilities/IntroVisuals.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { AudioManager } from "../managers/AudioManager.js";

/**
 * Represents the introductory cinematic phase of the game.
 */
export class IntroPhase extends GamePhase {
    static ONE_SECOND_MS = 1000;
    static GLITCH_DELAY_MS = IntroPhase.ONE_SECOND_MS * 15.2;
    static RIFT_OPENING_DELAY_MS = IntroPhase.GLITCH_DELAY_MS + IntroPhase.ONE_SECOND_MS * 0.8;
    static STATIC_STATE_DELAY_MS = IntroPhase.RIFT_OPENING_DELAY_MS + IntroPhase.ONE_SECOND_MS * 0.4;
    static DIALOGUE_DELAY_MS = IntroPhase.STATIC_STATE_DELAY_MS + IntroPhase.ONE_SECOND_MS * 0.8;
    static RIFT_TRANSITION_DELAY_MS = IntroPhase.ONE_SECOND_MS * 1;
    static IDLE_REMINDER_DELAY_MS = IntroPhase.ONE_SECOND_MS * 10;
    static MIN_AUTO_SKIP_DELAY_MS = IntroPhase.ONE_SECOND_MS * 3;

    /**
     * Creates an instance of IntroPhase.
     * @param {any} gameEngine - The gameEngine.
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
        this.idleTimeout = null;
        this.isIdleDialogueActive = false;
    }

    /**
     * Initializes the intro phase, setting up DOM elements and starting the timeline.
     * @returns {Promise<void>}
     */
    async init() {
        AudioManager.init();
        AudioManager.preloadSound("/asset/game_assets/sounds/tic.wav");
        AudioManager.preloadSound("/asset/game_assets/sounds/rift.wav");
        AudioManager.preloadSound("/asset/game_assets/sounds/rift-clic.wav");
        AudioManager.preloadSound("/asset/game_assets/sounds/pull.wav");
        AudioManager.preloadSound("/asset/game_assets/sounds/glitch.wav");

        this.createCinematicDOM();
        this.ambientBackground = new AmbientBackground(this.container);
        this.ambientBackground.start();
        this.fadeInAudio();
        this.showPrologue().then(() => {
            this.startCinematicTimeline();
        });
    }

    /**
     * Fades in the video audio smoothly.
     */
    fadeInAudio() {
        if (!this.video) return;

        this.video.volume = 0;
        this.video.muted = false;

        if (this.audioInterval) clearInterval(this.audioInterval);
        this.audioInterval = setInterval(() => {
            if (!this.video) {
                clearInterval(this.audioInterval);
                return;
            }
            if (this.video.volume < 0.95) {
                this.video.volume += 0.05;
            } else {
                this.video.volume = 1;
                clearInterval(this.audioInterval);
            }
        }, 250);
    }

    /**
     * Shows the prologue text on a black screen before the cinematic.
     * @returns {Promise<void>}
     */
    async showPrologue() {
        return new Promise((resolve) => {
            const prologueText = el("div", { className: "intro-prologue-text" }, LanguageManager.t("engine.introPrologue"));
            const prologueContainer = el("div", { className: "intro-prologue-container" }, prologueText);

            this.container.appendChild(prologueContainer);

            this.timeouts.push(setTimeout(() => {
                prologueText.classList.add("visible");
            }, 1000));

            this.timeouts.push(setTimeout(() => {
                prologueText.classList.remove("visible");
            }, 8000));

            this.timeouts.push(setTimeout(() => {
                prologueContainer.classList.add("hidden");
            }, 9500));

            this.timeouts.push(setTimeout(() => {
                if (this.container && prologueContainer.parentElement) {
                    this.container.removeChild(prologueContainer);
                }
                resolve();
            }, 11000));
        });
    }

    /**
     * Creates the main DOM elements for the cinematic video and rift.
     */
    createCinematicDOM() {
        this.video = el("video", {
            className: "intro-video",
            src: "/asset/game_assets/videos/bg.mp4",
            autoplay: true,
            loop: true,
            muted: true,
            playsInline: true,
            disablePictureInPicture: true,
            controls: false,
            oncontextmenu: (e) => e.preventDefault()
        });

        this.rift = el("img", {
            className: "cinematic-rift ",
            src: "/asset/game_assets/textures/shift.webp",
            alt: "rift",
            draggable: "false"
        });

        this.container = el("div", { className: "intro-cinematic-container" }, this.video, this.rift);
        this.createDialogueDOM();
        document.body.appendChild(this.container);
    }

    /**
     * Creates the DOM elements for the dialogue UI.
     */
    createDialogueDOM() {
        this.dialogueText = el("span", { className: "intro-dialogue-text" });
        const skipIndicator = el("div", { className: "dialogue-skip-indicator" }, "↵ Enter / Space");
        const bubble = el("div", { className: "intro-dialogue-bubble" }, this.dialogueText, skipIndicator);
        const tail = el("div", { className: "intro-dialogue-tail" });

        this.dialogueContainer = el("div", { className: "intro-dialogue-container" }, tail, bubble);
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
        this.glitchSoundNode = AudioManager.playSFX("/asset/game_assets/sounds/glitch.wav", "environment", 1.0);
        if (this.video) {
            this.video.classList.add("glitching");
            
            if (this.audioInterval) {
                clearInterval(this.audioInterval);
                this.audioInterval = null;
            }
            
            this.audioGlitchInterval = setInterval(() => {
                if (this.video && !this.video.paused) {
                    this.video.volume = 0.6 + Math.random() * 0.4;
                    this.video.playbackRate = 0.8 + Math.random() * 0.4;
                    if (Math.random() > 0.85) {
                        this.video.currentTime = Math.max(0, this.video.currentTime - Math.random() * 0.05);
                    }
                }
            }, 120);
        }
        this.glitchEffect = new GlitchEffect(this.container);
        this.glitchEffect.start();
    }

    /**
     * Triggers the appearance of the rift and pauses the video.
     */
    triggerRiftOpening() {
        if (this.audioGlitchInterval) {
            clearInterval(this.audioGlitchInterval);
            this.audioGlitchInterval = null;
        }
        if (this.rift) {
            this.rift.classList.add("visible");
            AudioManager.playSFX("/asset/game_assets/sounds/rift.wav", "environment", 1.0);
        }
        if (this.video) {
            this.video.pause();
            this.video.playbackRate = 1.0;
            this.video.volume = 1.0;
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
                const char = fullText[charIndex];
                this.dialogueText.textContent += char;
                if (char !== ' ') {
                    AudioManager.playSFX("/asset/game_assets/sounds/tic.wav", "ui", 0.4);
                }
                charIndex++;
                if (charIndex >= fullText.length) {
                    clearInterval(this.typewriterInterval);
                    this.typewriterInterval = null;
                    
                    const autoSkipDelay = Math.max(IntroPhase.MIN_AUTO_SKIP_DELAY_MS, fullText.length * 80);
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
            const autoSkipDelay = Math.max(IntroPhase.MIN_AUTO_SKIP_DELAY_MS, (fullText || '').length * 80);
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
        this.idleTimeout = setTimeout(() => {
            this.triggerIdleDialogue();
        }, IntroPhase.IDLE_REMINDER_DELAY_MS);
    }

    /**
     * Triggers the idle reminder dialogue after 10 seconds of inaction.
     */
    triggerIdleDialogue() {
        this.isIdleDialogueActive = true;
        if (this.dialogueContainer) {
            this.dialogueContainer.classList.add("visible");
        }
        const fullText = LanguageManager.t("engine.introDialogueIdle");
        this.dialogueText.textContent = "";
        let charIndex = 0;

        this.typewriterInterval = setInterval(() => {
            const char = fullText[charIndex];
            this.dialogueText.textContent += char;
            if (char !== ' ') {
                AudioManager.playSFX("/asset/game_assets/sounds/tic.wav", "ui", 0.4);
            }
            charIndex++;
            if (charIndex >= fullText.length) {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
            }
        }, 50);
    }

    /**
     * Instantly finishes typing or starts the game if the idle text is fully typed.
     */
    advanceIdleDialogue() {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
            this.dialogueText.textContent = LanguageManager.t("engine.introDialogueIdle");
        } else {
            this.handleRiftClick();
        }
    }

    /**
     * Handles clicking on the rift, transitioning to the next phase.
     */
    handleRiftClick() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
        if (this.dialogueContainer) {
            this.dialogueContainer.classList.remove("visible");
        }
        this.rift.removeEventListener("click", this.onRiftClick);
        this.rift.classList.remove("clickable");
        this.container.classList.add("transitioning");
        
        AudioManager.playSFX("/asset/game_assets/sounds/rift-clic.wav", "environment", 1.0);
        
        setTimeout(() => {
            AudioManager.playSFX("/asset/game_assets/sounds/pull.wav", "environment", 1.0);
        }, 300);

        setTimeout(() => {
            this.gameEngine.loadLevel(this.gameEngine.currentLevel || 1);
        }, IntroPhase.RIFT_TRANSITION_DELAY_MS);
    }

    /**
     * Updates the logic for this phase.
     * @param {any} _deltaTime - The _deltaTime.
     */
    update(_deltaTime) {}

    /**
     * Draws the elements of this phase.
     */
    draw() {}

    /**
     * Handles keyboard interactions during the intro.
     * @param {any} _event - The _event.
     */
    handleKeyDown(_event) {
        if (
            this.dialogueContainer &&
            this.dialogueContainer.classList.contains("visible")
        ) {
            if (_event.code === "Space" || _event.code === "Enter") {
                _event.preventDefault();
                if (this.isIdleDialogueActive) {
                    this.advanceIdleDialogue();
                } else {
                    this.advanceDialogue();
                }
            }
        } else if (this.rift && this.rift.classList.contains("clickable")) {
            if (_event.code === "Space" || _event.code === "Enter") {
                _event.preventDefault();
                this.handleRiftClick();
            }
        }
    }

    /**
     * Cleans up all DOM elements and timeouts.
     */
    cleanup() {
        if (this.glitchSoundNode) {
            try { this.glitchSoundNode.stop(); } catch (e) {}
            this.glitchSoundNode = null;
        }
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
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
        if (this.audioInterval) {
            clearInterval(this.audioInterval);
            this.audioInterval = null;
        }
        if (this.audioGlitchInterval) {
            clearInterval(this.audioGlitchInterval);
            this.audioGlitchInterval = null;
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
