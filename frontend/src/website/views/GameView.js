import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { GameEngine } from "../../game/engine/GameEngine.js";
import { SaveService } from "../../core/services/save.service.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsModal } from "../components/SettingsModal.js";
import { SettingsManager } from "../../core/utils/SettingsManager.js";
import { SkillTreeModal } from "../components/SkillTreeModal.js";

/**
 * View for the main game interface.
 */
export default class GameView extends AbstractView {
    /**
     * Creates an instance of GameView.
     *
     * @param {any} params - The params.
     */
    constructor(params) {
        super(params);
        this.setTitle("Game");
        this.engine = null;
        
        this.handleEscapeKey = (e) => {
            if (e.key === "Escape") {
                if (!this.settingsModal && !this.skillTreeModal) {
                    this.openSettings();
                }
            } else if (e.key === "Enter") {
                if (!this.settingsModal && !this.skillTreeModal && !document.body.classList.contains("dialogue-active")) {
                    const unlockPopup = document.querySelector(".spell-unlock-overlay");
                    const stDetailPopup = document.querySelector(".st-detail-popup");
                    if (!unlockPopup && !stDetailPopup) {
                        this.openSkillTree();
                    }
                }
            }
        };
        window.addEventListener("keydown", this.handleEscapeKey);

        this.handleBeforeUnload = (e) => {
            if (window.allowPageUnload) {
                return;
            }
            e.preventDefault();
            e.returnValue = "";
        };

        this.handleBlockSystemShortcuts = (e) => {
            if (e.ctrlKey || e.metaKey || e.key === "Tab") {
                e.preventDefault();
                e.stopPropagation();
            }
        };
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
        const settingsBtn = el("button", {
            className: "game-settings-btn",
            title: LanguageManager.t("settings.title"),
            onclick: () => this.openSettings()
        },
            el("img", { src: "/asset/game_assets/textures/parametre.webp", alt: "Paramètres", className: "settings-icon" })
        );

        const skillTreeBtn = el("button", {
            className: "game-settings-btn",
            title: LanguageManager.t("skilltree.title"),
            onclick: () => this.openSkillTree()
        },
            el("span", {
                className: "settings-icon",
                style: "display: flex; align-items: center; justify-content: center; font-size: 28px;"
            }, "🌳")
        );

        this.settingsBtnContainer = el(
            "div",
            { className: "settings-btn-container" },
            el("span", { className: "settings-btn-text" }, LanguageManager.t("skilltree.title")),
            skillTreeBtn,
            el("span", { className: "settings-btn-text" }, LanguageManager.t("settings.title")),
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
                { id: "objective-ui", className: "objective-ui hidden" },
                el("span", { id: "objective-text" }, "Objectif:"),
                el("span", { id: "objective-value" }, "--")
            ),
            el(
                "div",
                { id: "boss-ui", className: "boss-ui hidden" },
                el(
                    "div",
                    { className: "boss-info" },
                    el("span", { className: "boss-name", id: "boss-name-display" }, "OCTOPUS"),
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
        this.savedTheme = document.body.getAttribute("data-theme");
        document.body.removeAttribute("data-theme");
        document.body.classList.add("in-game");
        window.addEventListener("beforeunload", this.handleBeforeUnload);
        window.addEventListener("keydown", this.handleBlockSystemShortcuts, true);
        
        let startMode = "normal";
        let startData = null;
        if (window.location.search.includes("mode=duel")) {
            if (window.currentDuelData) {
                startMode = "duel";
                startData = window.currentDuelData;
            } else {
                import("../../core/utils/FlashMessageManager.js").then(module => {
                    module.FlashMessageManager.show(LanguageManager.t("game.duelDataLost"), "error");
                });
                history.pushState(null, null, "/social");
                window.dispatchEvent(new Event('popstate'));
                return;
            }
        } else if (window.location.search.includes("mode=training")) {
            startMode = "training";
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
            this.settingsModal = new SettingsModal(
                this.engine,
                () => {
                    this.settingsModal = null;
                },
                () => this.saveAndQuit()
            );
            this.settingsModal.open();
        }
    }

    /**
     * Opens the skill tree.
     */
    openSkillTree() {
        if (!this.skillTreeModal) {
            this.skillTreeModal = new SkillTreeModal(this.engine, () => {
                this.skillTreeModal = null;
            });
            this.skillTreeModal.open();
        }
    }

    /**
     * Saves the current game state and exits to the save menu.
     *
     * @returns {Promise<void>}
     */
    async saveAndQuit() {
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

        if (AuthService.isAuthenticated()) {
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
        if (this.savedTheme) {
            document.body.setAttribute("data-theme", this.savedTheme);
        }
        window.removeEventListener("beforeunload", this.handleBeforeUnload);
        window.removeEventListener("keydown", this.handleBlockSystemShortcuts, true);

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.warn(err));
        }

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
        if (this.savedTheme) {
            document.body.setAttribute("data-theme", this.savedTheme);
        }
        window.removeEventListener("beforeunload", this.handleBeforeUnload);
        window.removeEventListener("keydown", this.handleBlockSystemShortcuts, true);
        window.removeEventListener("keydown", this.handleEscapeKey);
        
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.warn(err));
        }

        if (this.settingsModal) {
            this.settingsModal.close();
            this.settingsModal = null;
        }
        if (this.skillTreeModal) {
            this.skillTreeModal.close();
            this.skillTreeModal = null;
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
