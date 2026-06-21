import { el } from "../../core/utils/DOMBuilder.js";
import { SettingsManager } from "../../core/utils/SettingsManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { createCustomSelect } from "./CustomSelect.js";
import { SkillTreeModal } from "./SkillTreeModal.js";

export class SettingsModal {
    /**
     * @param {GameEngine} engine - The current game engine (to pause/resume).
     * @param {Function} onClose - Callback when modal is closed.
     * @param {Function} saveAndQuitCallback - Callback to trigger save and quit.
     */
    constructor(engine, onClose, saveAndQuitCallback) {
        this.engine = engine;
        this.onClose = onClose;
        this.saveAndQuitCallback = saveAndQuitCallback;
        this.modalEl = null;
    }

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

        const globalSlider = createSlider(LanguageManager.t("settings.volumeGlobal") || "Volume Global", "global");
        const musicSlider = createSlider(LanguageManager.t("settings.volumeMusic") || "Musique", "music");
        const envSlider = createSlider(LanguageManager.t("settings.volumeEnvironment") || "Environnement", "environment");
        const enemySlider = createSlider(LanguageManager.t("settings.volumeEnemy") || "Ennemis", "enemy");
        const playerSlider = createSlider(LanguageManager.t("settings.volumePlayer") || "Joueur (Effets)", "player");

        const currentLang = LanguageManager.getLanguage();
        const langSelect = createCustomSelect([
            { value: "en", label: "English" },
            { value: "fr", label: "Français" }
        ], currentLang, (newValue) => {
            LanguageManager.setLanguage(newValue);
        }, "settings-compact-select");

        const langRow = el("div", { className: "settings-row" },
            el("label", {}, LanguageManager.t("settings.language") || "Langue"),
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
            el("label", {}, LanguageManager.t("settings.keyboardLayout") || "Clavier"),
            layoutSelect
        );

        const currentFullscreen = settings.fullscreen ? "true" : "false";
        const fullscreenSelect = createCustomSelect([
            { value: "true", label: LanguageManager.t("settings.yes") || "Oui" },
            { value: "false", label: LanguageManager.t("settings.no") || "Non" }
        ], currentFullscreen, (newValue) => {
            SettingsManager.saveSettings({ fullscreen: newValue === "true" });
        }, "settings-compact-select");

        const fullscreenRow = el("div", { className: "settings-row" },
            el("label", {}, LanguageManager.t("settings.fullscreen") || "Plein écran"),
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
        }, LanguageManager.t("settings.toggleFullscreen") || "Basculer en Plein Écran");

        const skillTreeBtn = el("button", {
            className: "btn-primary mb-10",
            style: "margin-bottom: 15px; background-color: #a855f7;",
            onclick: () => {
                this.close();
                const skillTreeModal = new SkillTreeModal(this.engine);
                skillTreeModal.open();
            }
        }, LanguageManager.t("skilltree.title") || "Arbre de Compétences");

        const closeBtn = el("button", {
            className: "settings-close-btn",
            onclick: () => this.close()
        }, LanguageManager.t("settings.close") || "Fermer");

        const saveAndQuitBtn = el("button", {
            className: "settings-save-quit-btn",
            onclick: () => {
                if (this.saveAndQuitCallback) {
                    this.saveAndQuitCallback();
                }
            }
        }, LanguageManager.t("game.saveQuitBtn") || "Sauvegarder & Quitter");

        this.modalEl = el("div", { className: "settings-modal-overlay" },
            el("div", { className: "settings-modal-content" },
                el("h2", {}, LanguageManager.t("settings.title") || "Paramètres"),
                globalSlider,
                musicSlider,
                envSlider,
                enemySlider,
                playerSlider,
                langRow,
                layoutRow,
                fullscreenRow,
                toggleFullscreenBtn,
                skillTreeBtn,
                closeBtn,
                saveAndQuitBtn
            )
        );

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

    open() {
        if (this.engine) {
            this.engine.isPaused = true;
        }
        document.body.appendChild(this.render());
        
        // Auto-focus the first focusable element when opened
        const firstFocusable = this.modalEl.querySelector('input[type="range"], .custom-select-container, button');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    close() {
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
        if (this.engine) {
            this.engine.isPaused = false;
        }
        if (this.onClose) {
            this.onClose();
        }
    }
}
