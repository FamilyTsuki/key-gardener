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
        const spells = this.phase.player.wordSpells.filter(w => w && w !== "");
        
        const title = document.createElement("h3");
        title.textContent = "Sorts disponibles :";
        spellListContainer.appendChild(title);
        
        const ul = document.createElement("ul");
        spells.forEach(spell => {
            const li = document.createElement("li");
            li.textContent = spell;
            ul.appendChild(li);
        });
        
        spellListContainer.appendChild(ul);
        spellListContainer.classList.remove("none");

        if (this.elCurrentWord) {
            this.elCurrentWord.parentElement.classList.remove("none");
        }
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
            target.isPressed = true;
            this.processSpell(originalKey);
        }
    }

    processSpell(key) {
        let word = this.phase.player.handleKeyPress(key);
        if (word) {
            this.pendingSpell = word;
        } else if (this.elCurrentWord && !this.pendingSpell) {
            this.elCurrentWord.textContent = this.phase.player.currentWord;
        }
    }

    applyPendingSpell(projectiles) {
        if (!this.pendingSpell || this.phase.player.isMoving) return;

        const closestEnemy = this.phase.enemies.findClosestEnemy(this.phase.player.position);
        const spellResult = this.phase.player.attack(this.pendingSpell, closestEnemy);

        if (spellResult) {
            projectiles.push(spellResult);
        }
        
        if (this.elCurrentWord) {
            this.elCurrentWord.textContent = this.pendingSpell;
            setTimeout(() => {
                if (this.elCurrentWord) this.elCurrentWord.textContent = this.phase.player.currentWord;
            }, 100);
        }
        
        this.pendingSpell = null;
    }

    cleanup() {
        const spellListContainer = document.getElementById("spell-list-container");
        if (spellListContainer) {
            spellListContainer.classList.add("none");
            spellListContainer.innerHTML = "";
        }
    }
}
