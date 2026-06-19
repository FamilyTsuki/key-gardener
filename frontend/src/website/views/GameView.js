import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { GameEngine } from "../../game/engine/GameEngine.js";
import { SaveService } from "../../core/services/save.service.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsModal } from "../components/SettingsModal.js";

/**
 * View for the main game interface.
 */
export default class GameView extends AbstractView {
    /**
     * Creates an instance of GameView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle("Game - Keyboard Survivor");
        this.engine = null;
        
        this.handleEscapeKey = (e) => {
            if (e.key === "Escape") {
                if (this.settingsModal) {
                    this.settingsModal.close();
                } else {
                    this.openSettings();
                }
            }
        };
        window.addEventListener("keydown", this.handleEscapeKey);
    }

    /**
     * Renders the game view content including the canvas.
     *
     * @returns {Promise<HTMLElement>} The game view container element.
     */
    async render() {
        this.canvas = el("canvas", {
            id: "game-canvas",
            className: "game-canvas",
        });
        const settingsBtn = el("button", { className: "game-settings-btn", onclick: () => this.openSettings() },
            el("img", { src: "/asset/game_assets/textures/parametre.webp", alt: "Paramètres", className: "settings-icon" })
        );

        this.settingsBtnContainer = el(
            "div",
            { className: "settings-btn-container" },
            el("span", { className: "settings-btn-text" }, LanguageManager.t("settings.title") || "Settings"),
            settingsBtn
        );
        return el(
            "div",
            { className: "game-container" },
            this.canvas,
            this.settingsBtnContainer,
            el(
                "div",
                { className: "word-container none" },
                el("span", { id: "currentWord" }),
                el("span", { className: "clignotant" }, "_")
            ),
            el("div", { className: "spell-list-container none", id: "spell-list-container" }),
            el(
                "div",
                { id: "boss-ui", className: "boss-ui hidden" },
                el(
                    "div",
                    { className: "boss-info" },
                    el("span", { className: "boss-name" }, "OCTOPUS"),
                    el(
                        "div",
                        { className: "boss-hp-text" },
                        el("span", { id: "boss-hp-current" }, "0"),
                        " / ",
                        el("span", { id: "boss-hp-max" }, "0")
                    )
                ),
                el(
                    "div",
                    { className: "boss-hp-bar" },
                    el("div", { id: "boss-hp-fill", className: "boss-hp-fill" })
                )
            ),
            el(
                "div",
                { id: "player-hud", className: "player-hud" },
                el(
                    "div",
                    { className: "hud-tech-ring" },
                    el("div", { className: "hud-tech-core" })
                ),
                el(
                    "div",
                    { className: "hud-bar-wrapper" },
                        el(
                            "div",
                            { className: "player-hp-bar" },
                            el("div", { id: "player-hp-fill", className: "player-hp-fill" }),
                            el(
                                "div",
                                { className: "player-hp-text" },
                                el("span", { id: "player-hp-current" }, "100"),
                                " / ",
                                el("span", { id: "player-hp-max" }, "100")
                            )
                        )
                    )
                ),
                el("div", { className: "column-world none", id: "column-world" },
                    el("span", { className: "column-text glitch-text", id: "left-column" }, "left" ),
                    el("span", { className: "column-text glitch-text", id: "center-column" }, "center" ),
                    el("span", { className: "column-text glitch-text", id: "right-column" }, "right" )  
                ),
                el("div", { className: "column-warn-icon-container none", id: "column-warn-icon-container" },
                    el("img", { src: "/asset/game_assets/textures/warn.png", className: "column-warn-img", id: "left-warn-img" }),
                    el("img", { src: "/asset/game_assets/textures/warn.png", className: "column-warn-img", id: "center-warn-img" }),
                    el("img", { src: "/asset/game_assets/textures/warn.png", className: "column-warn-img", id: "right-warn-img" })  
                ),
                el("div", { className: "deep-container none", id: "deep-container" },
                    el("span", { className: "deep-text glitch-text" }, "deep : "),
                    el("span", { className: "deep-number glitch-text" }, "1")
                )


        );
        
    }

    /**
     * Initializes the game engine and starts the game loop.
     *
     * @returns {Promise<void>}
     */
    async init() {
        document.body.classList.add("in-game");
        
        let startMode = "normal";
        let startData = null;
        if (window.location.search.includes("mode=duel")) {
            if (window.currentDuelData) {
                startMode = "duel";
                startData = window.currentDuelData;
            } else {
                import("../../core/utils/FlashMessageManager.js").then(module => {
                    module.FlashMessageManager.show("Duel data lost. Please restart the duel.", "error");
                });
                history.pushState(null, null, "/social");
                window.dispatchEvent(new Event('popstate'));
                return;
            }
        }

        this.engine = new GameEngine(startMode, startData);
        await this.engine.init();

        this.engine.start();
    }

    /**
     * Opens the settings modal.
     */
    openSettings() {
        if (!this.settingsModal) {
            this.settingsModal = new SettingsModal(this.engine, () => {
                this.settingsModal = null;
            }, () => this.saveAndQuit());
            this.settingsModal.open();
        }
    }

    /**
     * Saves the current game state and exits to the save menu.
     *
     * @returns {Promise<void>}
     */
    async saveAndQuit() {
        const token = AuthService.getToken();
        const activeSlot = localStorage.getItem("activeSaveSlot") || "1";

        let phase = "intro";
        if (this.engine && this.engine.gamePhase) {
            const phaseName = this.engine.gamePhase.constructor.name;
            if (phaseName === "WorldPhase") {
                phase = "world";
            } else if (phaseName === "SurvivePhase") {
                phase = "survive";
            } else if (phaseName === "InfiniteVoidPhase") {
                phase = "void";
            } else if (phaseName === "FallPhase") {
                phase = "fall";
            }
        }

        const currentGameState = {
            phase: phase,
            level: this.engine ? this.engine.currentLevel : 1,
            score: 0,
        };

        if (token) {
            try {
                await SaveService.saveGame(activeSlot, currentGameState);
                FlashMessageManager.show(LanguageManager.t("game.saveSuccess"), "success");
            } catch (err) {
                console.error("Failed to save game:", err);
                FlashMessageManager.show(
                    LanguageManager.t("game.saveFailed"),
                    "error"
                );
            }
        } else {
            FlashMessageManager.show(LanguageManager.t("game.savedLocally"), "info");
        }

        localStorage.setItem(
            "activeSaveData",
            JSON.stringify(currentGameState)
        );

        document.body.classList.remove("in-game");

        if (this.engine) {
            this.engine.destroy();
        }

        history.pushState(null, null, "/save");
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Cleans up the game view and stops the engine.
     */
    destroy() {
        document.body.classList.remove("in-game");
        window.removeEventListener("keydown", this.handleEscapeKey);
        
        if (this.settingsModal) {
            this.settingsModal.close();
            this.settingsModal = null;
        }
        if (this.engine) {
            this.engine.destroy();
        }
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return [
            "/asset/css/game.css",
            "/asset/css/intro.css",
            "/asset/css/tempo.css",
            "/asset/css/flame-wall.css",
            "/asset/css/game-over.css",
            "/asset/css/bridgeEvent.css",
            "/asset/css/settings.css"
        ];
    }
}
