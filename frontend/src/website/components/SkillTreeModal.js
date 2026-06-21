import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsModal } from "./SettingsModal.js";
import { SpellUnlockedPopup } from "../../game/ui/SpellUnlockedPopup.js";

export class SkillTreeModal {
    constructor(engine, onClose) {
        this.engine = engine;
        this.onClose = onClose;
        this.modalEl = null;

        this.spellsInfo = [
            { id: "fireball", nameKey: "spells.fireball.name", defaultName: "Fireball" },
            { id: "firecircle", nameKey: "spells.firecircle.name", defaultName: "Fire Circle" },
            { id: "heal", nameKey: "spells.heal.name", defaultName: "Heal" },
            { id: "shield", nameKey: "spells.shield.name", defaultName: "Shield" }
        ];
    }

    getUnlockedCount() {
        let count = 0;
        this.spellsInfo.forEach(s => {
            if (this.engine.unlockedSpells.includes(s.id)) count++;
        });
        return count;
    }

    getNextCost() {
        const count = this.getUnlockedCount();
        if (count === 0) return 1;
        if (count === 1) return 2;
        if (count === 2) return 2;
        if (count === 3) return 3;
        return Infinity;
    }

    render() {
        const cost = this.getNextCost();
        const skillPoints = this.engine.skillPoints || 0;

        const pointsDisplay = el("h3", { className: "skill-points-display", style: "text-align: center; margin-bottom: 20px; color: #4ade80;" }, 
            `${LanguageManager.t("skilltree.pointsAvailable") || "Skill Points:"} ${skillPoints}`
        );

        const spellsContainer = el("div", { className: "spells-grid", style: "display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;" });

        this.spellsInfo.forEach(spell => {
            const isUnlocked = this.engine.unlockedSpells.includes(spell.id);
            const canAfford = !isUnlocked && skillPoints >= cost;

            const btnClass = isUnlocked ? "btn-secondary" : (canAfford ? "btn-primary" : "btn-secondary");
            const btnStyle = isUnlocked ? "opacity: 0.5; cursor: default;" : "";

            let btnText = LanguageManager.t(spell.nameKey) || spell.defaultName;
            if (isUnlocked) {
                btnText += ` (${LanguageManager.t("skilltree.unlocked") || "Unlocked"})`;
            } else {
                btnText += ` - ${cost} ${LanguageManager.t("skilltree.pts") || "pts"}`;
            }

            const spellBtn = el("button", {
                className: btnClass,
                style: `padding: 15px; width: 100%; ${btnStyle}`,
                onclick: () => {
                    if (!isUnlocked && canAfford) {
                        this.engine.skillPoints -= cost;
                        
                        SpellUnlockedPopup.show(spell.id, () => {
                            this.engine.unlockedSpells.push(spell.id);
                            
                            if (this.engine.gamePhase && this.engine.gamePhase.player && this.engine.gamePhase.player.spells) {
                                this.engine.gamePhase.player.spells.unlockSpell(spell.id);
                            }
                            if (this.engine.gamePhase && this.engine.gamePhase.input && typeof this.engine.gamePhase.input.setupSpellListUI === "function") {
                                this.engine.gamePhase.input.setupSpellListUI();
                            }

                            this.engine.autoSave();
                            // Re-render modal to update UI
                            this.refresh();
                        });
                    }
                }
            }, btnText);

            spellsContainer.appendChild(spellBtn);
        });

        const backBtn = el("button", {
            className: "btn-secondary",
            style: "width: 100%; margin-top: 10px;",
            onclick: () => {
                this.close();
                // Re-open settings modal when backing out
                const settingsModal = new SettingsModal(this.engine, null, () => {
                    // saveAndQuit is handled by GameView if needed, we'll leave it simple here
                    window.location.href = "/";
                });
                settingsModal.open();
            }
        }, LanguageManager.t("skilltree.back") || "Back to Menu");

        this.modalEl = el("div", { className: "settings-modal-overlay" },
            el("div", { className: "settings-modal-content", style: "max-width: 500px;" },
                el("h2", { style: "text-align: center; margin-bottom: 10px;" }, LanguageManager.t("skilltree.title") || "Skill Tree"),
                pointsDisplay,
                spellsContainer,
                backBtn
            )
        );

        return this.modalEl;
    }

    refresh() {
        if (this.modalEl && this.modalEl.parentNode) {
            const parent = this.modalEl.parentNode;
            parent.removeChild(this.modalEl);
            parent.appendChild(this.render());
        }
    }

    open() {
        if (this.engine) {
            this.engine.isPaused = true;
        }
        document.body.appendChild(this.render());
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
