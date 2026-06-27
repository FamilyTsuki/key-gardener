import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { SaveService } from "../../core/services/save.service.js";
import { AuthService } from "../../core/services/auth.service.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsManager } from "../../core/utils/SettingsManager.js";

/**
 * View for managing game save slots.
 */
export default class SaveView extends AbstractView {
    /**
     * Creates an instance of SaveView.
     *
     * @param {any} params - The params.
     */
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("nav.save"));
        this.saves = [];
    }

    /**
     * Renders the save view content.
     *
     * @returns {Promise<HTMLElement>} The save view container element.
     */
    async render() {
        this.container = el(
            "div",
            { className: "save-container" },
            el("h1", { className: "save-title" }, LanguageManager.t("save.title")),
            el(
                "div",
                { className: "save-slots", id: "save-slots-list" },
                LanguageManager.t("save.loadingSaves")
            )
        );
        return this.container;
    }

    /**
     * Initializes the view by loading save slots if the user is authenticated.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (!AuthService.isAuthenticated()) {
            const list = document.getElementById("save-slots-list");
            if (list) {
                list.innerHTML = "";
                list.appendChild(
                    el(
                        "div",
                        { className: "save-login-container" },
                        el(
                            "p",
                            {
                                className: "save-login-text",
                            },
                            LanguageManager.t("save.loginRequired")
                        ),
                        el(
                            "a",
                            {
                                href: "/login",
                                dataset: { link: true },
                                className: "play-btn",
                            },
                            LanguageManager.t("save.loginBtn")
                        )
                    )
                );
            }
            return;
        }

        await this.loadSaves();
    }

    /**
     * Fetches the user's game saves from the server.
     *
     * @returns {Promise<void>}
     */
    async loadSaves() {
        try {
            const res = await SaveService.getSaves();
            this.saves = res.saves || [];
            this.renderSlots();
        } catch (err) {
            console.error("Failed to load saves:", err);
        }
    }

    /**
     * Renders the individual save slot cards into the list.
     */
    renderSlots() {
        const list = document.getElementById("save-slots-list");
        if (!list) return;
        list.innerHTML = "";

        for (let slot = 1; slot <= 3; slot++) {
            const save = this.saves.find((s) => s.slot_number === slot);
            const slotCard = this.buildSlotCard(slot, save);
            list.appendChild(slotCard);
        }
    }

    /**
     * Creates the DOM elements for a specific save slot card.
     *
     * @param {any} slot - The slot.
     * @param {any} save - The save.
     * @returns {HTMLElement} The save slot card element.
     */
    buildSlotCard(slot, save) {
        let saveInfoElement;
        let actionButtons;

        const contextMenu = el("div", {
            className: "context-menu",
            id: `menu-${slot}`,
        });

        if (save) {
            const lastPlayedStr = new Date(save.last_played).toLocaleString();
            const saveLevel = save.game_state.level !== undefined ? save.game_state.level : 1;
            const savePhase = save.game_state.phase !== undefined ? save.game_state.phase : 0;

            saveInfoElement = el(
                "div",
                { className: "save-info" },
                el("div", { className: "save-slot-title" }, LanguageManager.t("save.slotPrefix") + slot),
                el("div", { className: "save-level-phase" }, LanguageManager.t("save.levelPhase", { level: saveLevel, phase: savePhase }) || `Level: ${saveLevel} - Phase: ${savePhase}`),
                el(
                    "div",
                    { className: "save-date" },
                    LanguageManager.t("save.lastPlayed") + lastPlayedStr
                )
            );

            const launchGame = () => {
                if (SettingsManager.getSettings().fullscreen && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                        if (navigator.keyboard && navigator.keyboard.lock) {
                            navigator.keyboard.lock(["Escape"]).catch(e => console.warn(e));
                        }
                    }).catch(err => console.warn(err));
                }
                this.startGame(slot, save.game_state);
            };

            actionButtons = el(
                "div",
                { className: "save-actions" },
                el(
                    "button",
                    { className: "play-btn", onclick: launchGame },
                    LanguageManager.t("save.playBtn")
                ),
                el(
                    "button",
                    {
                        className: "menu-btn",
                        onclick: (e) => {
                            e.stopPropagation();
                            this.toggleContextMenu(slot);
                        },
                    },
                    "⋮"
                )
            );

            const playItem = el(
                "button",
                { className: "context-item", onclick: launchGame },
                LanguageManager.t("save.playBtn")
            );
            const renameItem = el(
                "button",
                {
                    className: "context-item",
                    onclick: () => this.openRenameModal(slot, save.game_state),
                },
                LanguageManager.t("save.renameBtn")
            );
            const exportItem = el(
                "button",
                {
                    className: "context-item",
                    onclick: () => this.exportSave(slot, save.game_state),
                },
                LanguageManager.t("save.exportBtn")
            );
            const deleteItem = el(
                "button",
                {
                    className: "context-item delete",
                    onclick: () => this.confirmDelete(slot),
                },
                LanguageManager.t("save.deleteBtn")
            );

            contextMenu.appendChild(playItem);
            contextMenu.appendChild(renameItem);
            contextMenu.appendChild(exportItem);
            contextMenu.appendChild(deleteItem);
        } else {
            saveInfoElement = el(
                "div",
                { className: "save-info" },
                el("div", { className: "save-slot-title" }, LanguageManager.t("save.slotPrefix") + slot),
                el("div", { className: "save-empty" }, LanguageManager.t("save.emptySlot"))
            );

            const newGame = () => {
                if (SettingsManager.getSettings().fullscreen && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                        if (navigator.keyboard && navigator.keyboard.lock) {
                            navigator.keyboard.lock(["Escape"]).catch(e => console.warn(e));
                        }
                    }).catch(err => console.warn(err));
                }
                this.startGame(slot, {
                    name: `Hero Slot ${slot}`,
                    phase: 0,
                    score: 0,
                });
            };

            actionButtons = el(
                "div",
                { className: "save-actions" },
                el(
                    "button",
                    { className: "play-btn", onclick: newGame },
                    LanguageManager.t("save.newGameBtn")
                )
            );
        }

        const card = el(
            "div",
            { className: "save-card" },
            saveInfoElement,
            actionButtons,
            contextMenu
        );

        return card;
    }

    /**
     * Toggles the visibility of the context menu for a specific slot.
     *
     * @param {any} slot - The slot.
     */
    toggleContextMenu(slot) {
        document.querySelectorAll(".context-menu").forEach((menu) => {
            if (menu.id !== `menu-${slot}`) {
                menu.classList.remove("active");
                const card = menu.closest(".save-card");
                if (card) {
                    card.classList.remove("menu-open");
                }
            }
        });

        const menu = document.getElementById(`menu-${slot}`);
        if (menu) {
            const isActive = menu.classList.toggle("active");
            const card = menu.closest(".save-card");
            if (card) {
                if (isActive) {
                    card.classList.add("menu-open");
                } else {
                    card.classList.remove("menu-open");
                }
            }
        }

        const closeMenu = () => {
            if (menu) {
                menu.classList.remove("active");
                const card = menu.closest(".save-card");
                if (card) {
                    card.classList.remove("menu-open");
                }
            }
            document.removeEventListener("click", closeMenu);
        };
        setTimeout(() => document.addEventListener("click", closeMenu), 0);
    }

    /**
     * Starts the game using the provided save slot and game state.
     *
     * @param {any} slot - The slot.
     * @param {any} gameState - The gameState.
     */
    startGame(slot, gameState) {
        localStorage.setItem("activeSaveSlot", slot);
        localStorage.setItem("activeSaveData", JSON.stringify(gameState));
        history.pushState(null, null, "/game");
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Opens a modal to rename a specific save slot.
     *
     * @param {any} slot - The slot.
     * @param {any} gameState - The gameState.
     */
    openRenameModal(slot, gameState) {
        const input = el("input", {
            className: "modal-input",
            type: "text",
            value: gameState.name || "",
        });

        const confirmBtn = el(
            "button",
            {
                className: "modal-btn confirm",
                onclick: async () => {
                    const newName = input.value.trim();
                    if (newName) {
                        gameState.name = newName;
                        await SaveService.saveGame(slot, gameState);
                        modal.remove();
                        await this.loadSaves();
                    }
                },
            },
            LanguageManager.t("save.renameBtn")
        );

        const cancelBtn = el(
            "button",
            {
                className: "modal-btn cancel",
                onclick: () => modal.remove(),
            },
            LanguageManager.t("save.cancelBtn")
        );

        const modal = el(
            "div",
            { className: "modal-backdrop" },
            el(
                "div",
                { className: "modal-content" },
                el("div", { className: "modal-title" }, LanguageManager.t("save.renameTitle")),
                input,
                el("div", { className: "modal-actions" }, cancelBtn, confirmBtn)
            )
        );

        document.body.appendChild(modal);
        input.focus();
    }

    /**
     * Exports the save game data as a JSON file for download.
     *
     * @param {any} slot - The slot.
     * @param {any} gameState - The gameState.
     */
    exportSave(slot, gameState) {
        const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(gameState, null, 2));
        const gameSlug = window.GAME_NAME
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_");
        const downloadAnchor = el("a", {
            href: dataStr,
            download: `${gameSlug}_slot_${slot}.json`,
        });
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    /**
     * Opens a confirmation modal before deleting a save slot.
     *
     * @param {any} slot - The slot.
     */
    confirmDelete(slot) {
        const confirmBtn = el(
            "button",
            {
                className: "modal-btn confirm delete-confirm",
                onclick: async () => {
                    await SaveService.deleteSave(slot);
                    modal.remove();
                    await this.loadSaves();
                },
            },
            LanguageManager.t("save.deleteBtn")
        );

        const cancelBtn = el(
            "button",
            {
                className: "modal-btn cancel",
                onclick: () => modal.remove(),
            },
            LanguageManager.t("save.cancelBtn")
        );

        const modal = el(
            "div",
            { className: "modal-backdrop" },
            el(
                "div",
                { className: "modal-content" },
                el("div", { className: "modal-title" }, LanguageManager.t("save.deleteConfirmTitle")),
                el(
                    "div",
                    { className: "modal-delete-text" },
                    LanguageManager.t("save.deleteConfirmText", { slot: slot })
                ),
                el("div", { className: "modal-actions" }, cancelBtn, confirmBtn)
            )
        );

        document.body.appendChild(modal);
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return ["/asset/css/save.css"];
    }
}
