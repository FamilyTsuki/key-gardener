import { LanguageManager } from "../../../core/utils/LanguageManager.js";

export class BridgeWordUI {
    constructor() {
        this.uiOverlay = null;
        this.wordDisplay = null;
    }

    buildUI() {
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("mission-overlay");

        const instructionDisplay = document.createElement("div");
        instructionDisplay.classList.add("mission-instruction");
        instructionDisplay.innerText = LanguageManager.t("game.bridgeInstruction");

        this.wordDisplay = document.createElement("div");
        this.wordDisplay.classList.add("mission-word-container");
        
        this.uiOverlay.appendChild(instructionDisplay);
        this.uiOverlay.appendChild(this.wordDisplay);
        document.body.appendChild(this.uiOverlay);
    }

    updateWordDisplay(activeWords, currentWordId, currentTyped) {
        if (!this.wordDisplay) return;
        
        const existingIds = new Set(activeWords.map(w => 'word-' + w.id));
        Array.from(this.wordDisplay.children).forEach(child => {
            if (!existingIds.has(child.id)) {
                child.remove();
            }
        });
        
        activeWords.forEach(ws => {
            let wordEl = document.getElementById('word-' + ws.id);
            if (!wordEl) {
                wordEl = document.createElement("div");
                wordEl.id = 'word-' + ws.id;
                wordEl.classList.add("mission-word");
                this.wordDisplay.appendChild(wordEl);
            }
            
            wordEl.style.left = ws.x + '%';
            wordEl.style.top = ws.y + '%';
            wordEl.style.transform = `translate(-50%, -50%) scale(${ws.scale})`;
            wordEl.style.opacity = (ws.phase === "completed") ? ws.opacity : ws.scale;
            
            this.renderWordSpans(ws, wordEl, currentWordId, currentTyped);
        });
    }

    renderWordSpans(ws, wordEl, currentWordId, currentTyped) {
        if (ws.phase === "completed") {
            const typedSpan = document.createElement("span");
            typedSpan.classList.add("typed");
            typedSpan.innerText = ws.word;
            wordEl.innerHTML = "";
            wordEl.appendChild(typedSpan);
        } else if (currentWordId === ws.id) {
            const typedSpan = document.createElement("span");
            typedSpan.classList.add("typed");
            typedSpan.innerText = currentTyped;
            
            wordEl.innerHTML = "";
            wordEl.appendChild(typedSpan);
            
            let remainingWord = ws.word.substring(currentTyped.length);
            
            if (ws.errorFlash && remainingWord.length > 0) {
                const errorSpan = document.createElement("span");
                errorSpan.classList.add("next-error");
                errorSpan.innerText = remainingWord[0];
                wordEl.appendChild(errorSpan);
                remainingWord = remainingWord.substring(1);
            }
            
            if (remainingWord.length > 0) {
                const restSpan = document.createElement("span");
                restSpan.innerText = remainingWord;
                wordEl.appendChild(restSpan);
            }
            
            wordEl.style.opacity = ws.scale; 
        } else {
            wordEl.innerHTML = "";
            const span = document.createElement("span");
            span.innerText = ws.word;
            wordEl.appendChild(span);
        }
    }

    cleanup() {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        const style = document.getElementById("bridge-event-styles");
        if (style) style.remove();
    }
}
