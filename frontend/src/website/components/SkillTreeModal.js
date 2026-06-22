import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsModal } from "./SettingsModal.js";
import { SpellUnlockedPopup } from "../../game/ui/SpellUnlockedPopup.js";

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

    getSkillPoints() {
        return this.engine.skillPoints || 0;
    }

    isUnlocked(spellId) {
        return (this.engine.unlockedSpells || []).includes(spellId);
    }

    canUnlock(spell) {
        if (spell.storyOnly) return false;
        if (this.isUnlocked(spell.id)) return false;
        if (spell.requires && !this.isUnlocked(spell.requires)) return false;
        return this.getSkillPoints() >= spell.cost;
    }

    isAccessible(spell) {
        if (spell.storyOnly) return true;
        if (spell.requires && !this.isUnlocked(spell.requires)) return false;
        return true;
    }

    buildSVGLines(containerW, containerH) {
        const px = (pctX) => (pctX / 100) * containerW;
        const py = (pctY) => (pctY / 100) * containerH;

        const swBase = 4;
        const swGlow = 10;
        const paths = [];

        paths.push(`
<defs>
  <linearGradient id="grad-attack" x1="0%" y1="100%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#ef4444"/>
  </linearGradient>
  <linearGradient id="grad-defense" x1="100%" y1="100%" x2="0%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#10b981"/>
  </linearGradient>
  <linearGradient id="grad-utility" x1="50%" y1="100%" x2="50%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#ffd700"/>
  </linearGradient>

  <filter id="glow-attack" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="glow-defense" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="glow-utility" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
        `);

        const tx0 = px(50), ty0 = py(90);
        const tx1 = px(50), ty1 = py(82);

        paths.push(`<path d="M ${tx0} ${ty0} L ${tx1} ${ty1}" stroke="#475569" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`);

        const segments = [
            {
                destId: "spark",
                color: "url(#grad-attack)",
                glowColor: "#ef4444",
                filter: "url(#glow-attack)",
                d: `M ${tx1} ${ty1} C ${px(50)} ${py(77)}, ${px(57)} ${py(74)}, ${px(62)} ${py(72)}`
            },
            {
                destId: "fireball",
                color: "#ef4444",
                glowColor: "#ef4444",
                filter: "url(#glow-attack)",
                d: `M ${px(62)} ${py(72)} C ${px(67)} ${py(70)}, ${px(70)} ${py(58)}, ${px(73)} ${py(48)}`
            },
            {
                destId: "shield",
                color: "url(#grad-defense)",
                glowColor: "#10b981",
                filter: "url(#glow-defense)",
                d: `M ${tx1} ${ty1} C ${px(50)} ${py(77)}, ${px(43)} ${py(74)}, ${px(38)} ${py(72)}`
            },
            {
                destId: "firecircle",
                color: "#10b981",
                glowColor: "#10b981",
                filter: "url(#glow-defense)",
                d: `M ${px(38)} ${py(72)} C ${px(33)} ${py(70)}, ${px(30)} ${py(58)}, ${px(27)} ${py(48)}`
            },
            {
                destId: "heal",
                color: "url(#grad-utility)",
                glowColor: "#ffd700",
                filter: "url(#glow-utility)",
                d: `M ${tx1} ${ty1} C ${px(48)} ${py(70)}, ${px(52)} ${py(55)}, ${px(50)} ${py(40)}`
            }
        ];

        for (const seg of segments) {
            const unlocked = this.isUnlocked(seg.destId);
            if (unlocked) {
                paths.push(`<path d="${seg.d}" stroke="${seg.glowColor}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.15" filter="${seg.filter}"/>`);
                paths.push(`<path d="${seg.d}" stroke="${seg.color}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9"/>`);
            } else {
                paths.push(`<path d="${seg.d}" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,5" stroke-linecap="round" fill="none" opacity="0.4"/>`);
            }
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">${paths.join("")}</svg>`;
    }

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

    openDetailPopup(spell, branchKey, branchDef) {
        const unlocked = this.isUnlocked(spell.id);
        const accessible = this.isAccessible(spell);
        const affordable = this.canUnlock(spell);

        const spellName = LanguageManager.t(spell.nameKey) || spell.defaultName;
        const spellDesc = LanguageManager.t(spell.descKey) || spell.defaultDesc;
        const howTo = LanguageManager.t("game.spellHowTo") || "Tapez ce mot pour le lancer :";

        const storyOnly = spell.storyOnly === true;

        const buyBtnLabel = unlocked
            ? (LanguageManager.t("skilltree.unlocked") || "Débloqué ✓")
            : storyOnly
            ? (LanguageManager.t("skilltree.storyOnly") || "🎭 Obtenu via l'histoire")
            : !accessible
            ? (LanguageManager.t("skilltree.locked") || "🔒 Verrouillé")
            : `${LanguageManager.t("skilltree.unlock") || "Débloquer"} — ${spell.cost} pt${spell.cost > 1 ? "s" : ""}`;

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
                unlocked ? null : el("div", { className: "st-detail-cost" }, `Coût : ${spell.cost} point${spell.cost > 1 ? "s" : ""} de compétence`),
                el("div", { className: "st-detail-actions" }, buyBtn, closeBtn)
            )
        );

        document.body.appendChild(popup);
    }

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
            el("span", {}, LanguageManager.t("skilltree.branchAttack") || "ATTAQUE"),
            el("span", { style: "color: #ef4444;" }, this.countUnlocked("attack").toString())
        );

        const branchLabelDefense = el("div", {
            className: "st-branch-label",
            style: `left: ${BRANCH_POSITIONS.defense.labelX}%; bottom: 6%;`,
        },
            el("span", {}, LanguageManager.t("skilltree.branchDefense") || "DÉFENSE"),
            el("span", { style: "color: #10b981;" }, this.countUnlocked("defense").toString())
        );

        const branchLabelUtility = el("div", {
            className: "st-branch-label",
            style: `left: ${BRANCH_POSITIONS.utility.labelX}%; bottom: 6%;`,
        },
            el("span", {}, LanguageManager.t("skilltree.branchUtility") || "UTILITAIRE"),
            el("span", { style: "color: #ffd700;" }, this.countUnlocked("utility").toString())
        );

        const svgWrapper = el("div", { className: "skill-tree-svg-container" });
        svgWrapper.innerHTML = this.buildSVGLines(containerW, containerH);

        this.modalEl = el("div", { className: "skill-tree-overlay", tabIndex: "-1" },
            el("div", { className: "skill-tree-header" },
                el("div", { className: "skill-tree-title" }, LanguageManager.t("skilltree.title") || "Skill Tree"),
                el("div", { className: "skill-tree-points" },
                    ` ${skillPoints} ${LanguageManager.t("skilltree.pts") || "pts"}`
                ),
                el("button", {
                    className: "skill-tree-back-btn",
                    onclick: () => this.goBackToSettings(),
                }, LanguageManager.t("skilltree.back") || "\u2190 Retour")
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

    goBackToSettings() {
        this.close();
    }

    countUnlocked(branchKey) {
        return TREE_DEFINITION[branchKey].spells.filter(s => this.isUnlocked(s.id)).length;
    }

    refresh() {
        if (this.modalEl && this.modalEl.parentNode) {
            const parent = this.modalEl.parentNode;
            parent.removeChild(this.modalEl);
            parent.appendChild(this.render());
        }
    }

    open() {
        if (this.engine) this.engine.isPaused = true;
        document.body.appendChild(this.render());
        this.modalEl.focus();
    }

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
