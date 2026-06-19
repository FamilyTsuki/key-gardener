import Undefined from "../../spells/Undefined.js";
import ProjectileLuncher from "../../spells/ProjectileLuncher.js";
import HealSpell from "../../spells/HealSpells.js";
import FireCircle from "../../spells/FireCircle.js";

export class PlayerSpells {
    constructor(statsManager = null) {
        this.statsManager = statsManager;
        this.wordSpells = [];
        this.currentWord = "";
    }

    initialize(scene, playerInstance, enemiesManager, fireballModel) {
        this.wordSpells = [
            new Undefined(),
            new FireCircle("fire", 1, 2.3, 9000, scene, playerInstance, enemiesManager),
            new ProjectileLuncher("wasa", 100, 10000, fireballModel),
            new ProjectileLuncher("pok", 35, 10000, fireballModel),
            new HealSpell("heal", 30)
        ];
    }

    getWordSpells() {
        return this.wordSpells.map(spell => spell.word);
    }

    getWordSpellsInstances() {
        return this.wordSpells;
    }

    handleKeyPress(key) {
        let keyProcessed = this.processCharacterKey(key);
        
        if (!this.isValidSpellPrefix()) {
            this.resetWord(keyProcessed, false);
            return false;
        }

        return this.checkCompleteSpell(keyProcessed);
    }

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

    isValidSpellPrefix() {
        return this.wordSpells.some(spell => spell.word.startsWith(this.currentWord));
    }

    resetWord(keyProcessed, isSuccess) {
        this.currentWord = "";
        if (keyProcessed && this.statsManager) {
            this.statsManager.recordKeystroke(isSuccess);
        }
    }

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

    attack(word, closestEnemy, playerInstance, scene) {
        const spell = this.wordSpells.find(s => s.word === word);
        if (!spell) throw new Error("There is no spell related to that word.");
        return spell.effect(closestEnemy, playerInstance, scene);
    }

    update(deltaTimeMs) {
        this.wordSpells.forEach(spell => {
            if (spell.update) spell.update(deltaTimeMs);
        });
    }
}
