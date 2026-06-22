import { LanguageManager } from "../../../core/utils/LanguageManager.js";

export class SurviveInput {
    constructor(phase) {
        this.phase = phase;
        this.elCurrentWord = document.getElementById("currentWord");
        this.pendingSpell = null;
        
        this.setupSpellListUI();
    }

    setupSpellListUI() {
        const spellListContainer = document.getElementById("spell-list-container");
        if (!spellListContainer || !this.phase.player) return;

        spellListContainer.innerHTML = "";
        const spells = this.phase.player.wordSpells.filter(w => w && w !== "" && w !== "undefined");
        
        if (spells.length === 0) {
            spellListContainer.classList.add("none");
            return;
        }

        const title = document.createElement("h3");
        title.textContent = LanguageManager.t("skilltree.title") ? "Sorts disponibles :" : "Sorts disponibles :";
        spellListContainer.appendChild(title);
        
        const ul = document.createElement("ul");
        spells.forEach(spell => {
            const li = document.createElement("li");
            const translatedName = LanguageManager.t("spells." + spell + ".name") || spell;
            li.textContent = `${translatedName} (${spell.toUpperCase()})`;
            ul.appendChild(li);
        });
        
        spellListContainer.appendChild(ul);
        spellListContainer.classList.remove("none");

        this.updateWordDisplay();
    }

    handleKeyDown(event) {
        if (!this.phase.player || !this.phase.player.isAlive() || this.phase.state.isTransitioningToNextLevel || !this.phase.state.isReady) return;

        const keyName = event.key.toUpperCase();
        const target = this.phase.keyboard?.find(keyName);
        if (!target) return;

        this.phase.lastPlayerKey = target.key;
        this.processMovement(target, event.key);
    }

    processMovement(target, originalKey) {
        let moveResult = { blocked: false };
        if (this.phase.player && this.phase.enemies) {
            moveResult = this.phase.player.move({ x: target.rawPosition.x, y: target.rawPosition.y }, this.phase.keyboard?.keyboardLayout);
        }

        let allowed = true;
        if (moveResult && moveResult.blocked) {
            allowed = moveResult.wormKey.key === target.key && moveResult.hitWorm.type === "hazard_worm";
        }

        if (allowed) {
            const isAlreadyOnKey = this.phase.player.targetPosition && 
                                   this.phase.player.targetPosition.x === target.rawPosition.x && 
                                   this.phase.player.targetPosition.y === target.rawPosition.y;
                                   
            if (!isAlreadyOnKey) {
                target.isPressed = true;
            }
            this.processSpell(originalKey);
        }
    }

    processSpell(key) {
        let word = this.phase.player.handleKeyPress(key);
        if (word) {
            this.pendingSpell = word;
        }
        this.updateWordDisplay();
    }

    applyPendingSpell(projectiles) {
        if (!this.pendingSpell || this.phase.player.isMoving) return;

        const closestEnemy = this.phase.enemies.findClosestEnemy(this.phase.player.position);
        const spellResult = this.phase.player.attack(this.pendingSpell, closestEnemy);

        if (spellResult && typeof spellResult === "object" && typeof spellResult.update === "function") {
            projectiles.push(spellResult);
        }
        
        this.updateWordDisplay();
        setTimeout(() => {
            if (this.phase && this.phase.player) {
                this.updateWordDisplay();
            }
        }, 100);
        
        this.pendingSpell = null;
    }

    updateWordDisplay() {
        if (!this.elCurrentWord || !this.phase || !this.phase.player) return;
        const text = this.pendingSpell || this.phase.player.currentWord;
        this.elCurrentWord.textContent = text;
        if (text && text.length > 0) {
            this.elCurrentWord.parentElement.classList.remove("none");
        } else {
            this.elCurrentWord.parentElement.classList.add("none");
        }
    }

    cleanup() {
        const spellListContainer = document.getElementById("spell-list-container");
        if (spellListContainer) {
            spellListContainer.classList.add("none");
            spellListContainer.innerHTML = "";
        }
        if (this.elCurrentWord) {
            this.elCurrentWord.parentElement.classList.add("none");
        }
    }
}
