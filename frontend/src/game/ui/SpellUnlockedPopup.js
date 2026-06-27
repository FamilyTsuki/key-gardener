import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

export class SpellUnlockedPopup {
    static SPELL_INFO = {
        "spark": {
            icon: "⚡",
            nameKey: "spells.spark.name",
            defaultName: "Spark",
            descKey: "spells.spark.desc",
            defaultDesc: "A quick, weak electric projectile."
        },
        "fireball": {
            icon: "🔥",
            nameKey: "spells.fireball.name",
            defaultName: "Heavy Fireball",
            descKey: "spells.fireball.desc",
            defaultDesc: "A slow, powerful ball of fire."
        },
        "firecircle": {
            icon: "⭕",
            nameKey: "spells.firecircle.name",
            defaultName: "Fire Circle",
            descKey: "spells.firecircle.desc",
            defaultDesc: "Creates a defensive ring of fire around you."
        },
        "heal": {
            icon: "💚",
            nameKey: "spells.heal.name",
            defaultName: "Heal",
            descKey: "spells.heal.desc",
            defaultDesc: "Restores your health points."
        },
        "shield": {
            icon: "🛡️",
            nameKey: "spells.shield.name",
            defaultName: "Shield",
            descKey: "spells.shield.desc",
            defaultDesc: "Blocks the next incoming attack."
        }
    };

    /**
     * Shows the UI popup or warning.
     * @param {any} spellId - The spellId.
     * @param {any} onClose - The onClose.
     */
    static show(spellId, onClose) {
        const info = this.SPELL_INFO[spellId] || {
            icon: "✨",
            nameKey: `spells.${spellId}.name`,
            defaultName: spellId,
            descKey: `spells.${spellId}.desc`,
            defaultDesc: "A magical spell."
        };

        const title = LanguageManager.t("game.spellUnlocked");
        const name = LanguageManager.t(info.nameKey) || info.defaultName;
        const desc = LanguageManager.t(info.descKey) || info.defaultDesc;
        const howTo = LanguageManager.t("game.spellHowTo");

        const popup = el("div", { className: "spell-unlock-overlay fade-in" },
            el("div", { className: "spell-unlock-box glass-panel" },
                el("h1", { className: "spell-unlock-title" }, title),
                el("div", { className: "spell-unlock-icon" }, info.icon),
                el("h2", { className: "spell-unlock-name" }, name),
                el("div", { className: "spell-unlock-cast-box" },
                    el("p", { className: "spell-unlock-howto" }, howTo),
                    el("div", { className: "spell-unlock-word" }, spellId.toUpperCase())
                ),
                el("p", { className: "spell-unlock-desc" }, desc),
                el("button", { 
                    className: "btn-primary spell-unlock-close",
                    onclick: () => {
                        popup.classList.remove("fade-in");
                        popup.classList.add("fade-out");
                        setTimeout(() => {
                            popup.remove();
                            if (onClose) onClose();
                        }, 500);
                    }
                }, LanguageManager.t("common.confirm"))
            )
        );

        document.body.appendChild(popup);
    }
}
