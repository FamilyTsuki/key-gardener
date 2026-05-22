import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { SaveService } from "../../core/services/save.service.js";
import { AuthService } from "../../core/services/auth.service.js";
import { DeviceCapabilitiesDetector } from "../../core/utils/DeviceCapabilitiesDetector.js";

export default class SaveView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Save - Keyboard Survivor");
        this.saves = [];
    }

    async render() {
        this.container = el(
            "div",
            { className: "save-container" },
            el("h1", { className: "save-title" }, "Save Slots"),
            el(
                "div",
                { className: "save-slots", id: "save-slots-list" },
                "Loading saves..."
            )
        );
        return this.container;
    }

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
                            "Please log in to manage your saves."
                        ),
                        el(
                            "a",
                            {
                                href: "/login",
                                dataset: { link: true },
                                className: "play-btn",
                            },
                            "Login"
                        )
                    )
                );
            }
            return;
        }

        await this.loadSaves();
        const deviceDetector = new DeviceCapabilitiesDetector(".require-keyboard");
        deviceDetector.initialize();
    }

    async loadSaves() {
        try {
            const res = await SaveService.getSaves();
            this.saves = res.saves || [];
            this.renderSlots();
        } catch (err) {
            console.error("Failed to load saves:", err);
        }
    }

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

    buildSlotCard(slot, save) {
        let saveInfoElement;
        let actionButtons;

        const contextMenu = el("div", {
            className: "context-menu",
            id: `menu-${slot}`,
        });

        if (save) {
            const lastPlayedStr = new Date(save.last_played).toLocaleString();
            const gameStateName = save.game_state.name || `Hero Slot ${slot}`;

            saveInfoElement = el(
                "div",
                { className: "save-info" },
                el("div", { className: "save-slot-title" }, `Slot ${slot}`),
                el("div", { className: "save-name" }, gameStateName),
                el(
                    "div",
                    { className: "save-date" },
                    `Last Played: ${lastPlayedStr}`
                )
            );

            const launchGame = () => this.startGame(slot, save.game_state);

            actionButtons = el(
                "div",
                { className: "save-actions" },
                el(
                    "button",
                    { className: "play-btn require-keyboard", onclick: launchGame },
                    "Play"
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
                { className: "context-item require-keyboard", onclick: launchGame },
                "Play"
            );
            const renameItem = el(
                "button",
                {
                    className: "context-item",
                    onclick: () => this.openRenameModal(slot, save.game_state),
                },
                "Rename"
            );
            const exportItem = el(
                "button",
                {
                    className: "context-item",
                    onclick: () => this.exportSave(slot, save.game_state),
                },
                "Export"
            );
            const deleteItem = el(
                "button",
                {
                    className: "context-item delete",
                    onclick: () => this.confirmDelete(slot),
                },
                "Delete"
            );

            contextMenu.appendChild(playItem);
            contextMenu.appendChild(renameItem);
            contextMenu.appendChild(exportItem);
            contextMenu.appendChild(deleteItem);
        } else {
            saveInfoElement = el(
                "div",
                { className: "save-info" },
                el("div", { className: "save-slot-title" }, `Slot ${slot}`),
                el("div", { className: "save-empty" }, "Empty Slot")
            );

            const newGame = () =>
                this.startGame(slot, {
                    name: `Hero Slot ${slot}`,
                    phase: 0,
                    score: 0,
                });

            actionButtons = el(
                "div",
                { className: "save-actions" },
                el(
                    "button",
                    { className: "play-btn require-keyboard", onclick: newGame },
                    "New Game"
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

    startGame(slot, gameState) {
        localStorage.setItem("activeSaveSlot", slot);
        localStorage.setItem("activeSaveData", JSON.stringify(gameState));
        history.pushState(null, null, "/game");
        window.dispatchEvent(new Event("popstate"));
    }

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
            "Rename"
        );

        const cancelBtn = el(
            "button",
            {
                className: "modal-btn cancel",
                onclick: () => modal.remove(),
            },
            "Cancel"
        );

        const modal = el(
            "div",
            { className: "modal-backdrop" },
            el(
                "div",
                { className: "modal-content" },
                el("div", { className: "modal-title" }, "Rename Save Slot"),
                input,
                el("div", { className: "modal-actions" }, cancelBtn, confirmBtn)
            )
        );

        document.body.appendChild(modal);
        input.focus();
    }

    exportSave(slot, gameState) {
        const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(gameState, null, 2));
        const downloadAnchor = el("a", {
            href: dataStr,
            download: `keyboard_survivor_slot_${slot}.json`,
        });
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

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
            "Delete"
        );

        const cancelBtn = el(
            "button",
            {
                className: "modal-btn cancel",
                onclick: () => modal.remove(),
            },
            "Cancel"
        );

        const modal = el(
            "div",
            { className: "modal-backdrop" },
            el(
                "div",
                { className: "modal-content" },
                el("div", { className: "modal-title" }, "Delete Save?"),
                el(
                    "div",
                    { className: "modal-delete-text" },
                    `Are you sure you want to delete Slot ${slot}? This action is irreversible.`
                ),
                el("div", { className: "modal-actions" }, cancelBtn, confirmBtn)
            )
        );

        document.body.appendChild(modal);
    }

    getCss() {
        return ["/asset/css/save.css"];
    }
}
