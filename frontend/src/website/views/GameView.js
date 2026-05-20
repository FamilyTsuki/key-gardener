import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { GameEngine } from "../../game/engine/GameEngine.js";
import { SaveService } from "../../core/services/save.service.js";

export default class GameView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Game - Keyboard Survivor");
        this.engine = null;
    }

    async render() {
        this.canvas = el("canvas", {
            id: "game-canvas",
            className: "game-canvas",
        });
        this.saveQuitBtn = el("button", {
            className: "save-quit-btn",
            onclick: () => this.saveAndQuit()
        }, "Save & Quit");
        return el("div", { className: "game-container" },
            this.canvas,
            this.saveQuitBtn
        );
    }

    async init() {
        document.body.classList.add("in-game");
        this.engine = new GameEngine();
        await this.engine.init();

        this.engine.start();
    }

    async saveAndQuit() {
        const token = AuthService.getToken();
        const activeSlot = localStorage.getItem("activeSaveSlot") || "1";
        
        let phase = "init";
        if (this.engine && this.engine.gamePhase) {
            const phaseName = this.engine.gamePhase.constructor.name;
            if (phaseName === "WorldPhase") {
                phase = "game";
            } else if (phaseName === "SurvivePhase") {
                phase = "survive";
            }
        }

        const currentGameState = {
            phase: phase,
            score: 0
        };

        if (token) {
            try {
                await SaveService.saveGame(activeSlot, currentGameState);
                FlashMessageManager.show("Game saved successfully!", "success");
            } catch (err) {
                console.error("Failed to save game:", err);
                FlashMessageManager.show("Failed to save game to server.", "error");
            }
        } else {
            FlashMessageManager.show("Saved locally (not logged in).", "info");
        }

        localStorage.setItem("activeSaveData", JSON.stringify(currentGameState));

        document.body.classList.remove("in-game");

        if (this.engine) {
            this.engine.stop();
        }

        history.pushState(null, null, "/save");
        window.dispatchEvent(new Event("popstate"));
    }

    destroy() {
        document.body.classList.remove("in-game");
        if (this.engine) {
            this.engine.stop();
        }
    }

    getCss() {
        return ["/asset/css/game.css", "/asset/css/intro.css"];
    }
}
