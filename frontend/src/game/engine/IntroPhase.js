import { GamePhase } from "./GamePhase.js";
import { WorldPhase } from "./WorldPhase.js";
import { AmbientBackground, GlitchEffect } from "../utilities/IntroVisuals.js";

export class IntroPhase extends GamePhase {
    static GLITCH_DELAY_MS = 38000;
    static RIFT_OPENING_DELAY_MS = 40000;
    static STATIC_STATE_DELAY_MS = 41000;
    static RIFT_TRANSITION_DELAY_MS = 1000;

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
    }

    async init() {
        this.createCinematicDOM();
        this.ambientBackground = new AmbientBackground(this.container);
        this.ambientBackground.start();
        this.startCinematicTimeline();
    }

    createCinematicDOM() {
        this.container = document.createElement("div");
        this.container.className = "intro-cinematic-container";

        const video = document.createElement("video");
        video.className = "intro-video";
        video.src = "/asset/game_assets/bg.mp4";
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        video.controls = false;
        video.oncontextmenu = (e) => e.preventDefault();

        const rift = document.createElement("img");
        rift.className = "cinematic-rift ";
        rift.src = "/asset/game_assets/shift.png";
        rift.alt = "rift";

        this.container.appendChild(video);
        this.container.appendChild(rift);
        document.body.appendChild(this.container);

        this.video = video;
        this.rift = rift;
    }

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
    }

    triggerGlitches() {
        if (this.video) {
            this.video.classList.add("glitching");
        }
        this.glitchEffect = new GlitchEffect(this.container);
        this.glitchEffect.start();
    }

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

    triggerStaticState() {
        if (this.video && this.rift) {
            this.video.classList.remove("glitching");
            this.video.classList.remove("glitch-paused");
            this.video.classList.add("static-broken");
            this.rift.classList.add("clickable");
            this.rift.addEventListener("click", this.onRiftClick);
        }
        if (this.container) {
            this.container.classList.remove("glitch-paused");
        }
    }

    handleRiftClick() {
        this.rift.removeEventListener("click", this.onRiftClick);
        this.container.classList.add("transitioning");
        setTimeout(() => {
            this.gameEngine.setPhase(new WorldPhase(this.gameEngine));
        }, IntroPhase.RIFT_TRANSITION_DELAY_MS);
    }

    update(_deltaTime) {}

    draw() {}

    handleKeyDown(_event) {}

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
        if (this.rift) {
            this.rift.removeEventListener("click", this.onRiftClick);
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
