import Undefined from "../../spells/Undefined.js";
import ProjectileLuncher from "../../spells/ProjectileLuncher.js";
import HealSpell from "../../spells/HealSpells.js";
import FireCircle from "../../spells/FireCircle.js";
import ShieldSpell from "../../spells/ShieldSpell.js";

export class PlayerSpells {
    constructor(statsManager = null) {
        this.statsManager = statsManager;
        this.wordSpells = [];
        this.currentWord = "";
    }

    /**
     * Initializes the ialize.
     * @param {any} scene - The scene.
     * @param {any} playerInstance - The playerInstance.
     * @param {any} enemiesManager - The enemiesManager.
     * @param {any} fireballModel - The fireballModel.
     * @param {any} unlockedSpells - The unlockedSpells.
     */
    initialize(scene, playerInstance, enemiesManager, fireballModel, unlockedSpells = []) {
        this.allSpells = [
            new Undefined(),
            new FireCircle("firecircle", 1, 2.3, 9000, scene, playerInstance, enemiesManager),
            new ProjectileLuncher("fireball", 100, 10000, fireballModel),
            new ProjectileLuncher("spark", 50, 10000, fireballModel),
            new HealSpell("heal", 30),
            new ShieldSpell("shield", 0, Infinity)
        ];

        this.wordSpells = this.allSpells.filter(spell => 
            spell.word === "undefined" || unlockedSpells.includes(spell.word)
        );
    }

    /**
     * Unlocks the spell.
     * @param {any} spellWord - The spellWord.
     */
    unlockSpell(spellWord) {
        if (!this.wordSpells.some(s => s.word === spellWord)) {
            const spell = this.allSpells.find(s => s.word === spellWord);
            if (spell) {
                this.wordSpells.push(spell);
            }
        }
    }

    /**
     * Get the word spells.
     */
    getWordSpells() {
        return this.wordSpells.map(spell => spell.word);
    }

    /**
     * Get the word spells instances.
     */
    getWordSpellsInstances() {
        return this.wordSpells;
    }

    /**
     * Handles the key press event/action.
     * @param {any} key - The key.
     */
    handleKeyPress(key) {
        let keyProcessed = this.processCharacterKey(key);
        
        if (!this.isValidSpellPrefix()) {
            this.resetWord(keyProcessed, false);
            return false;
        }

        return this.checkCompleteSpell(keyProcessed);
    }

    /**
     * Process the character key.
     * @param {any} key - The key.
     */
    processCharacterKey(key) {
        if (key.length === 1 && key.match(/[a-z]/i)) {
            this.currentWord += key.toLowerCase();
            return true;
        }
        
        if (key === "Backspace") {
            this.currentWord = this.currentWord.slice(0, -1);
        }
        return false;
    }

    /**
     * Checks whether is valid spell prefix.
     */
    isValidSpellPrefix() {
        return this.wordSpells.some(spell => spell.word.startsWith(this.currentWord));
    }

    /**
     * Resets the word.
     * @param {any} keyProcessed - The keyProcessed.
     * @param {any} isSuccess - The isSuccess.
     */
    resetWord(keyProcessed, isSuccess) {
        this.currentWord = "";
        if (keyProcessed && this.statsManager) {
            this.statsManager.recordKeystroke(isSuccess);
        }
    }

    /**
     * Checks the complete spell.
     * @param {any} keyProcessed - The keyProcessed.
     */
    checkCompleteSpell(keyProcessed) {
        if (keyProcessed && this.statsManager) {
            this.statsManager.recordKeystroke(true);
        }
        
        const completeSpell = this.wordSpells.find(spell => spell.word === this.currentWord);
        if (!completeSpell) return false;

        this.currentWord = "";
        if (this.statsManager) {
            this.statsManager.recordWordTyped();
        }
        return completeSpell.word;
    }

    /**
     * Triggers the attack action.
     * @param {any} word - The word.
     * @param {any} closestEnemy - The closestEnemy.
     * @param {any} playerInstance - The playerInstance.
     * @param {any} scene - The scene.
     */
    attack(word, closestEnemy, playerInstance, scene) {
        const spell = this.wordSpells.find(s => s.word === word);
        if (!spell) throw new Error("There is no spell related to that word.");
        return spell.effect(closestEnemy, playerInstance, scene);
    }

    /**
     * Updates the player spells state.
     * @param {any} deltaTimeMs - The deltaTimeMs.
     */
    update(deltaTimeMs) {
        this.wordSpells.forEach(spell => {
            if (spell.update) spell.update(deltaTimeMs);
        });
    }
}
