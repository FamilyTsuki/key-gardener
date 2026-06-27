import { el } from "../../core/utils/DOMBuilder.js";
import { SettingsManager } from "../../core/utils/SettingsManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { createCustomSelect } from "./CustomSelect.js";

export class SettingsModal {
    /**
     * @param {any} engine - The engine.
     * @param {any} onClose - The onClose.
     * @param {any} saveAndQuitCallback - The saveAndQuitCallback.
     */
    constructor(engine, onClose, saveAndQuitCallback) {
        this.engine = engine;
        this.onClose = onClose;
        this.saveAndQuitCallback = saveAndQuitCallback;
        this.modalEl = null;
    }

    /**
     * Renders the settings modal.
     */
    render() {
        const settings = SettingsManager.getSettings();

        const createSlider = (label, category) => {
            const currentVol = settings.volume[category] ?? 1.0;
            const valueDisplay = el("span", { className: "settings-val" }, Math.round(currentVol * 100) + "%");
            
            const input = el("input", {
                type: "range",
                min: "0",
                max: "1",
                step: "0.01",
                value: currentVol,
                oninput: (e) => {
                    const val = parseFloat(e.target.value);
                    valueDisplay.textContent = Math.round(val * 100) + "%";
                    SettingsManager.saveSettings({ volume: { [category]: val } });
                }
            });

            return el("div", { className: "settings-row" },
                el("label", {}, label),
                input,
                valueDisplay
            );
        };

        const globalSlider = createSlider(LanguageManager.t("settings.volumeGlobal"), "global");
        const musicSlider = createSlider(LanguageManager.t("settings.volumeMusic"), "music");
        const envSlider = createSlider(LanguageManager.t("settings.volumeEnvironment"), "environment");
        const enemySlider = createSlider(LanguageManager.t("settings.volumeEnemy"), "enemy");
        const playerSlider = createSlider(LanguageManager.t("settings.volumePlayer"), "player");

        const advancedAudioContent = el("div", { className: "advanced-audio-content", style: "display: none; padding-left: 15px; border-left: 2px solid #444; margin-left: 5px; margin-bottom: 15px;" },
            musicSlider,
            envSlider,
            enemySlider,
            playerSlider
        );

        const advancedAudioToggle = el("div", { 
            className: "advanced-audio-toggle", 
            style: "cursor: pointer; user-select: none; margin-bottom: 15px; font-size: 0.9em; color: #aaa;",
            onclick: (e) => {
                const isHidden = advancedAudioContent.style.display === "none";
                advancedAudioContent.style.display = isHidden ? "block" : "none";
                e.currentTarget.querySelector(".arrow").textContent = isHidden ? "▼" : "▶";
            }
        }, 
            el("span", { className: "arrow", style: "display: inline-block; width: 15px;" }, "▶"),
            el("span", {}, " " + (LanguageManager.t("settings.advancedAudio") || "Détails Audio"))
        );

        const currentLang = LanguageManager.getLanguage();
        const langSelect = createCustomSelect([
            { value: "en", label: "English" },
            { value: "fr", label: "Français" }
        ], currentLang, (newValue) => {
            LanguageManager.setLanguage(newValue);
        }, "settings-compact-select");

        const langRow = el("div", { className: "settings-row" },
            el("label", {}, LanguageManager.t("settings.language")),
            langSelect
        );

        const currentLayout = settings.keyboardLayout || "AZERTY";
        const layoutSelect = createCustomSelect([
            { value: "AZERTY", label: "AZERTY" },
            { value: "QWERTY", label: "QWERTY" }
        ], currentLayout, (newValue) => {
            SettingsManager.saveSettings({ keyboardLayout: newValue });
        }, "settings-compact-select");
        const layoutRow = el("div", { className: "settings-row" },
            el("label", {}, LanguageManager.t("settings.keyboardLayout")),
            layoutSelect
        );

        const currentFullscreen = settings.fullscreen ? "true" : "false";
        const fullscreenSelect = createCustomSelect([
            { value: "true", label: LanguageManager.t("settings.yes") },
            { value: "false", label: LanguageManager.t("settings.no") }
        ], currentFullscreen, (newValue) => {
            SettingsManager.saveSettings({ fullscreen: newValue === "true" });
        }, "settings-compact-select");

        const fullscreenRow = el("div", { className: "settings-row" },
            el("label", {}, LanguageManager.t("settings.fullscreen")),
            fullscreenSelect
        );

        const toggleFullscreenBtn = el("button", {
            className: "btn-primary mb-10",
            style: "margin-bottom: 15px;",
            onclick: () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                        if (navigator.keyboard && navigator.keyboard.lock) {
                            navigator.keyboard.lock(["Escape"]).catch(e => console.warn(e));
                        }
                    }).catch(err => console.warn(err));
                } else if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }, LanguageManager.t("settings.toggleFullscreen"));

        const closeBtn = el("button", {
            className: "settings-close-btn",
            onclick: () => this.close()
        }, LanguageManager.t("settings.close"));

        const saveAndQuitBtn = el("button", {
            className: "settings-save-quit-btn",
            onclick: () => {
                if (this.saveAndQuitCallback) {
                    this.saveAndQuitCallback();
                }
            }
        }, LanguageManager.t("game.saveQuitBtn"));

        this.modalEl = el("div", { className: "settings-modal-overlay" },
            el("div", { className: "settings-modal-content" },
                el("h2", {}, LanguageManager.t("settings.title")),
                globalSlider,
                advancedAudioToggle,
                advancedAudioContent,
                langRow,
                layoutRow,
                fullscreenRow,
                toggleFullscreenBtn,
                closeBtn,
                saveAndQuitBtn
            )
        );

        this.escapeHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.close();
            }
        };
        window.addEventListener("keydown", this.escapeHandler);

        this.modalEl.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                const focusables = Array.from(this.modalEl.querySelectorAll('input[type="range"], .custom-select-container, button'));
                const currentIndex = focusables.indexOf(document.activeElement);
                
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % focusables.length;
                    focusables[nextIndex].focus();
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prevIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
                    focusables[prevIndex].focus();
                }
            }
        });

        return this.modalEl;
    }

    /**
     * Opens the modal or component.
     */
    open() {
        if (this.engine) {
            this.engine.isPaused = true;
        }
        document.body.appendChild(this.render());
        
        const firstFocusable = this.modalEl.querySelector('input[type="range"], .custom-select-container, button');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * Closes the modal or component.
     */
    close() {
        if (this.escapeHandler) {
            window.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }
        if (this.modalEl) {
            this.modalEl.querySelectorAll(".custom-select-container").forEach(el => {
                if (typeof el.destroy === "function") {
                    el.destroy();
                }
            });
            if (this.modalEl.parentNode) {
                this.modalEl.parentNode.removeChild(this.modalEl);
            }
        }
        if (this.engine) {
            this.engine.isPaused = false;
        }
        if (this.onClose) {
            this.onClose();
        }
    }
}
