import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { TextScramble } from "./TextScramble.js";

export class FallUI {
    constructor(phase) {
        this.phase = phase;
        this.textScrambleInstances = [];
        this.scramblers = new Map();
        
        const leftWord = (LanguageManager.t("game.fallLeft") || "left").toLowerCase();
        const rightWord = (LanguageManager.t("game.fallRight") || "right").toLowerCase();
        const centerWord = (LanguageManager.t("game.fallCenter") || "center").toLowerCase();
        this.laneWords = [leftWord, rightWord, centerWord];
    }

    init() {
        const leftColumn = document.getElementById("left-column");
        const centerColumn = document.getElementById("center-column");
        const rightColumn = document.getElementById("right-column");
        if (leftColumn) leftColumn.innerText = this.laneWords[0];
        if (centerColumn) centerColumn.innerText = this.laneWords[2];
        if (rightColumn) rightColumn.innerText = this.laneWords[1];

        const deepContainer = document.getElementById("deep-container");
        if (deepContainer && deepContainer.children[0]) {
            deepContainer.children[0].innerText = LanguageManager.t("game.fallDeep") || "deep : ";
        }

        const textElements = document.querySelectorAll(".glitch-text");
        textElements.forEach(el => {
            const instance = new TextScramble(el);
            instance.revealSpeed = 2; 
            instance.setText(el.innerText); 
            
            this.textScrambleInstances.push(instance);
            if (el.id) this.scramblers.set(el.id, instance);
        });

        const colWorld = document.getElementById("column-world");
        const warnContainer = document.getElementById("column-warn-icon-container");
        if (colWorld) colWorld.classList.remove("none");
        if (warnContainer) warnContainer.classList.remove("none");
        if (deepContainer) deepContainer.classList.remove("none");

        this.resetWarnIcons();
    }

    updateColumnsText(typedWord) {
        const updateElement = (id, targetWord) => {
            const instance = this.scramblers.get(id);
            if (!instance) return;
            const typed = typedWord.toLowerCase();
            
            if (typed.length > 0 && targetWord.startsWith(typed)) {
                instance.matchedCount = typed.length;
            } else {
                instance.matchedCount = 0;
            }
        };

        updateElement("left-column", this.laneWords[0]);
        updateElement("center-column", this.laneWords[2]);
        updateElement("right-column", this.laneWords[1]);
    }

    getWarnElement(laneX) {
        if (laneX === -6) return document.getElementById("left-warn-img");
        if (laneX === 0) return document.getElementById("center-warn-img");
        if (laneX === 6) return document.getElementById("right-warn-img");
        return null;
    }

    resetWarnIcons() {
        const icons = ["left-warn-img", "center-warn-img", "right-warn-img"];
        icons.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.visibility = "hidden";
        });
    }

    updateDeep(currentDeep) {
        const deepContainer = document.getElementById("deep-container");
        if (deepContainer && deepContainer.children[1]) {
            deepContainer.children[1].innerHTML = Math.trunc(currentDeep);
        }
        
        this.textScrambleInstances.forEach(instance => {
            instance.updateIntensity(currentDeep);
        });
    }

    stopScramblers() {
        this.textScrambleInstances.forEach(instance => {
            if (typeof instance.destroy === "function") instance.destroy();
        });
    }

    cleanup() {
        const leftColumn = document.getElementById("left-column");
        const centerColumn = document.getElementById("center-column");
        const rightColumn = document.getElementById("right-column");
        if (leftColumn) leftColumn.innerHTML = "left";
        if (centerColumn) centerColumn.innerHTML = "center";
        if (rightColumn) rightColumn.innerHTML = "right";

        const colWorld = document.getElementById("column-world");
        const warnContainer = document.getElementById("column-warn-icon-container");
        const deepContainer = document.getElementById("deep-container");
        if (colWorld) colWorld.classList.add("none");
        if (warnContainer) warnContainer.classList.add("none");
        if (deepContainer) deepContainer.classList.add("none");
        
        this.resetWarnIcons();
        this.stopScramblers();
        this.textScrambleInstances = [];
        this.scramblers.clear();
    }
}
