import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsModal } from "./SettingsModal.js";
import { SpellUnlockedPopup } from "../../game/ui/SpellUnlockedPopup.js";
import { Icons } from "../../core/utils/Icons.js";

const TREE_DEFINITION = {
    attack: {
        color: "#ef4444",
        glowColor: "rgba(239,68,68,0.5)",
        labelKey: "skilltree.branchAttack",
        defaultLabel: "Attaque",
        spells: [
            {
                id: "spark",
                icon: "⚡",
                nameKey: "spells.spark.name",
                descKey: "spells.spark.desc",
                defaultName: "Étincelle",
                defaultDesc: "Un projectile électrique rapide.",
                cost: 0,
                storyOnly: true,
            },
            {
                id: "fireball",
                icon: "🔥",
                nameKey: "spells.fireball.name",
                descKey: "spells.fireball.desc",
                defaultName: "Boule de feu",
                defaultDesc: "Une boule de feu lente mais très puissante.",
                cost: 2,
                requires: "spark",
            },
        ],
    },
    defense: {
        color: "#10b981",
        glowColor: "rgba(16,185,129,0.5)",
        labelKey: "skilltree.branchDefense",
        defaultLabel: "Défense",
        spells: [
            {
                id: "shield",
                icon: "🛡️",
                nameKey: "spells.shield.name",
                descKey: "spells.shield.desc",
                defaultName: "Bouclier",
                defaultDesc: "Bloque la prochaine attaque entrante.",
                cost: 2,
            },
            {
                id: "firecircle",
                icon: "⭕",
                nameKey: "spells.firecircle.name",
                descKey: "spells.firecircle.desc",
                defaultName: "Cercle de feu",
                defaultDesc: "Crée un anneau de feu défensif autour de vous.",
                cost: 2,
                requires: "shield",
            },
        ],
    },
    utility: {
        color: "#ffd700",
        glowColor: "rgba(255,215,0,0.5)",
        labelKey: "skilltree.branchUtility",
        defaultLabel: "Utilitaire",
        spells: [
            {
                id: "heal",
                icon: "💚",
                nameKey: "spells.heal.name",
                descKey: "spells.heal.desc",
                defaultName: "Soin",
                defaultDesc: "Restaure vos points de vie.",
                cost: 2,
                comingSoon: false,
            },
        ],
    },
};

const BRANCH_POSITIONS = {
    attack: {
        labelX: 70,
        nodes: [
            { x: 62, y: 72 },
            { x: 73, y: 48 },
        ],
    },
    defense: {
        labelX: 30,
        nodes: [
            { x: 38, y: 72 },
            { x: 27, y: 48 },
        ],
    },
    utility: {
        labelX: 50,
        nodes: [
            { x: 50, y: 40 },
        ],
    },
};

const TRUNK_X = 50;
const TRUNK_BOTTOM_Y = 90;
const FORK_Y = 80;

export class SkillTreeModal {
    constructor(engine, onClose) {
        this.engine = engine;
        this.onClose = onClose;
        this.modalEl = null;
    }

    /**
     * Get the skill points.
     */
    getSkillPoints() {
        return this.engine.skillPoints || 0;
    }

    /**
     * Checks whether is unlocked.
     * @param {any} spellId - The spellId.
     */
    isUnlocked(spellId) {
        return (this.engine.unlockedSpells || []).includes(spellId);
    }

    /**
     * Checks whether can unlock.
     * @param {any} spell - The spell.
     */
    canUnlock(spell) {
        if (spell.storyOnly) return false;
        if (this.isUnlocked(spell.id)) return false;
        if (spell.requires && !this.isUnlocked(spell.requires)) return false;
        return this.getSkillPoints() >= spell.cost;
    }

    /**
     * Checks whether is accessible.
     * @param {any} spell - The spell.
     */
    isAccessible(spell) {
        if (spell.storyOnly) return true;
        if (spell.requires && !this.isUnlocked(spell.requires)) return false;
        return true;
    }

    /**
     * Builds the node.
     * @param {any} spell - The spell.
     * @param {any} branchKey - The branchKey.
     * @param {any} branchDef - The branchDef.
     * @param {any} nodeIndex - The nodeIndex.
     */
    buildNode(spell, branchKey, branchDef, nodeIndex) {
        const positions = BRANCH_POSITIONS[branchKey];
        const nodePos = positions.nodes[nodeIndex];
        const posX = `${nodePos.x}%`;
        const posY = `${nodePos.y}%`;

        const unlocked = this.isUnlocked(spell.id);
        const accessible = this.isAccessible(spell);
        const affordable = this.canUnlock(spell);
        const comingSoon = spell.comingSoon === true;

        let stateClass = "locked";
        if (unlocked) stateClass = "unlocked";
        else if (affordable) stateClass = "can-afford";
        else if (!accessible) stateClass = "locked";
        else stateClass = "cant-afford";

        const spellName = LanguageManager.t(spell.nameKey) || spell.defaultName;
        let label;
        if (unlocked) {
            label = spellName;
        } else if (spell.storyOnly) {
            label = `🎭 ${spellName}`;
        } else if (!accessible) {
            label = `🔒 ${spellName}`;
        } else {
            label = `${spellName} — ${spell.cost} pt${spell.cost > 1 ? "s" : ""}`;
        }

        const node = el("div", {
            className: `st-node ${branchKey} ${stateClass}`,
            style: `left: ${posX}; top: ${posY};`,
            onclick: () => {
                if (!comingSoon) this.openDetailPopup(spell, branchKey, branchDef);
            },
        },
            el("div", { className: "st-node-circle" }, 
                el("span", { className: "st-node-icon" }, spell.icon)
            ),
            el("div", { className: "st-node-label" }, label)
        );

        return node;
    }

    /**
     * Opens the detail popup.
     * @param {any} spell - The spell.
     * @param {any} branchKey - The branchKey.
     * @param {any} branchDef - The branchDef.
     */
    openDetailPopup(spell, branchKey, branchDef) {
        const unlocked = this.isUnlocked(spell.id);
        const accessible = this.isAccessible(spell);
        const affordable = this.canUnlock(spell);

        const spellName = LanguageManager.t(spell.nameKey) || spell.defaultName;
        const spellDesc = LanguageManager.t(spell.descKey) || spell.defaultDesc;
        const howTo = LanguageManager.t("game.spellHowTo");

        const storyOnly = spell.storyOnly === true;

        const buyBtnLabel = unlocked
            ? (LanguageManager.t("skilltree.unlocked"))
            : storyOnly
            ? LanguageManager.t("skilltree.storyOnly")
            : !accessible
            ? (LanguageManager.t("skilltree.locked"))
            : `${LanguageManager.t("skilltree.unlock")} — ${spell.cost} pt${spell.cost > 1 ? "s" : ""}`;

        const buyBtn = el("button", {
            className: "st-detail-buy-btn",
            disabled: unlocked || storyOnly || !accessible || !affordable,
            onclick: () => {
                if (!unlocked && !storyOnly && accessible && affordable) {
                    this.engine.skillPoints -= spell.cost;
                    popup.remove();

                    SpellUnlockedPopup.show(spell.id, () => {
                        this.engine.unlockedSpells.push(spell.id);

                        if (this.engine.gamePhase?.player?.spells) {
                            this.engine.gamePhase.player.spells.unlockSpell(spell.id);
                        }
                        if (this.engine.gamePhase?.input?.setupSpellListUI) {
                            this.engine.gamePhase.input.setupSpellListUI();
                        }

                        this.engine.autoSave();
                        this.refresh();
                    });
                }
            },
        }, buyBtnLabel);

        const closeBtn = el("button", {
            className: "st-detail-close-btn",
            onclick: () => popup.remove(),
        }, "✕");

        const popup = el("div", { className: "st-detail-popup", onclick: (e) => { if (e.target === popup) popup.remove(); } },
            el("div", { className: `st-detail-box ${branchKey}` },
                el("div", { className: "st-detail-icon" }, spell.icon),
                el("div", { className: "st-detail-name" }, spellName),
                el("div", { className: "st-detail-howto" }, howTo),
                el("div", { className: "st-detail-word" }, spell.id.toUpperCase()),
                el("div", { className: "st-detail-desc" }, spellDesc),
                unlocked ? null : el("div", { className: "st-detail-cost" }, LanguageManager.t("skilltree.cost", { cost: spell.cost }) || `Coût : ${spell.cost} point(s)`),
                el("div", { className: "st-detail-actions" }, buyBtn, closeBtn)
            )
        );

        document.body.appendChild(popup);
    }

    /**
     * Renders the skill tree modal.
     */
    render() {
        const skillPoints = this.getSkillPoints();
        const containerW = window.innerWidth;
        const containerH = window.innerHeight;

        const nodesContainer = el("div", { className: "skill-tree-nodes" });

        for (const [branchKey, branch] of Object.entries(TREE_DEFINITION)) {
            branch.spells.forEach((spell, index) => {
                nodesContainer.appendChild(this.buildNode(spell, branchKey, branch, index));
            });
        }

        const branchLabelAttack = el("div", {
            className: "st-branch-label",
            style: `left: ${BRANCH_POSITIONS.attack.labelX}%; bottom: 6%;`,
        },
            el("span", {}, LanguageManager.t("skilltree.branchAttack")),
            el("span", { className: "text-attack" }, this.countUnlocked("attack").toString())
        );

        const branchLabelDefense = el("div", {
            className: "st-branch-label",
            style: `left: ${BRANCH_POSITIONS.defense.labelX}%; bottom: 6%;`,
        },
            el("span", {}, LanguageManager.t("skilltree.branchDefense")),
            el("span", { className: "text-defense" }, this.countUnlocked("defense").toString())
        );

        const branchLabelUtility = el("div", {
            className: "st-branch-label",
            style: `left: ${BRANCH_POSITIONS.utility.labelX}%; bottom: 6%;`,
        },
            el("span", {}, LanguageManager.t("skilltree.branchUtility")),
            el("span", { className: "text-utility" }, this.countUnlocked("utility").toString())
        );

        const svgWrapper = el("div", { className: "skill-tree-svg-container" });
        svgWrapper.innerHTML = Icons.skillTreeLines(containerW, containerH, this.isUnlocked.bind(this));

        this.modalEl = el("div", { className: "skill-tree-overlay", tabIndex: "-1" },
            el("div", { className: "skill-tree-header" },
                el("div", { className: "skill-tree-title" }, LanguageManager.t("skilltree.title")),
                el("div", { className: "skill-tree-points" },
                    ` ${skillPoints} ${LanguageManager.t("skilltree.pts")}`
                ),
                el("button", {
                    className: "skill-tree-back-btn",
                    onclick: () => this.goBackToSettings(),
                }, LanguageManager.t("skilltree.back"))
            ),
            svgWrapper,
            nodesContainer,
            branchLabelAttack,
            branchLabelDefense,
            branchLabelUtility,
        );

        this.escapeHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.goBackToSettings();
            }
        };
        window.addEventListener("keydown", this.escapeHandler);

        return this.modalEl;
    }

    /**
     * Goes the back to settings.
     */
    goBackToSettings() {
        this.close();
    }

    /**
     * Counts the unlocked.
     * @param {any} branchKey - The branchKey.
     */
    countUnlocked(branchKey) {
        return TREE_DEFINITION[branchKey].spells.filter(s => this.isUnlocked(s.id)).length;
    }

    /**
     * Refreshes the component state and UI.
     */
    refresh() {
        if (this.modalEl && this.modalEl.parentNode) {
            const parent = this.modalEl.parentNode;
            parent.removeChild(this.modalEl);
            parent.appendChild(this.render());
        }
    }

    /**
     * Opens the modal or component.
     */
    open() {
        if (this.engine) this.engine.isPaused = true;
        document.body.appendChild(this.render());
        this.modalEl.focus();
    }

    /**
     * Closes the modal or component.
     */
    close() {
        if (this.escapeHandler) {
            window.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }
        if (this.modalEl?.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
        if (this.engine) this.engine.isPaused = false;
        if (this.onClose) this.onClose();
    }
}
