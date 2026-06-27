import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { el } from "../../../core/utils/DOMBuilder.js";

export class JumpWordUI {
    constructor() {
        this.uiOverlay = null;
        this.wordDisplay = null;
        this.gaugeFillEl = null;
        this.gaugeTextEl = null;
    }

    /**
     * Builds the u i.
     */
    buildUI() {
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("mission-overlay");

        const instructionDisplay = document.createElement("div");
        instructionDisplay.classList.add("mission-instruction");
        instructionDisplay.innerText = LanguageManager.t("game.jumpInstruction");

        const gaugeWrapper = document.createElement("div");
        gaugeWrapper.classList.add("jump-gauge-wrapper");

        const gaugeTitle = document.createElement("div");
        gaugeTitle.classList.add("jump-gauge-title");
        gaugeTitle.innerText = LanguageManager.t("game.jumpPowerTitle");

        const gaugeContainer = document.createElement("div");
        gaugeContainer.classList.add("jump-gauge-container");

        this.gaugeFillEl = document.createElement("div");
        this.gaugeFillEl.classList.add("jump-gauge-fill");

        this.gaugeTextEl = document.createElement("div");
        this.gaugeTextEl.classList.add("jump-gauge-text");
        this.gaugeTextEl.innerText = "0%";

        gaugeContainer.appendChild(this.gaugeFillEl);
        gaugeContainer.appendChild(this.gaugeTextEl);

        gaugeWrapper.appendChild(gaugeTitle);
        gaugeWrapper.appendChild(gaugeContainer);

        this.wordDisplay = document.createElement("div");
        this.wordDisplay.classList.add("mission-word-container");

        this.uiOverlay.appendChild(instructionDisplay);
        this.uiOverlay.appendChild(gaugeWrapper);
        this.uiOverlay.appendChild(this.wordDisplay);
        document.body.appendChild(this.uiOverlay);

        this.updateGaugeUI(0);
    }

    /**
     * Updates the gauge u i.
     * @param {any} percentageRaw - The percentageRaw.
     */
    updateGaugeUI(percentageRaw) {
        if (!this.gaugeFillEl || !this.gaugeTextEl) return;
        
        const percentage = Math.min(100, Math.floor(percentageRaw * 100));
        this.gaugeFillEl.style.height = percentage + "%";
        this.gaugeTextEl.innerText = `${percentage}%`;

        const hue = 120 - (percentage * 1.2); 
        this.gaugeFillEl.style.background = `hsl(${hue}, 80%, 50%)`;
        this.gaugeFillEl.style.boxShadow = `0 0 10px hsla(${hue}, 80%, 50%, 0.5)`;

        if (percentage >= 100) {
            this.gaugeFillEl.parentElement.classList.add("full");
        }
    }

    /**
     * Updates the word display.
     * @param {any} activeWords - The activeWords.
     * @param {any} currentWordId - The currentWordId.
     * @param {any} currentTyped - The currentTyped.
     */
    updateWordDisplay(activeWords, currentWordId, currentTyped) {
        if (!this.wordDisplay) return;

        const existingIds = new Set(activeWords.map(w => "word-" + w.id));
        Array.from(this.wordDisplay.children).forEach(child => {
            if (!existingIds.has(child.id)) {
                child.remove();
            }
        });

        activeWords.forEach(ws => {
            let wordEl = document.getElementById("word-" + ws.id);
            if (!wordEl) {
                wordEl = document.createElement("div");
                wordEl.id = "word-" + ws.id;
                wordEl.classList.add("mission-word");
                this.wordDisplay.appendChild(wordEl);
            }

            wordEl.style.left = ws.x + "%";
            wordEl.style.top = ws.y + "%";
            wordEl.style.transform = `translate(-50%, -50%) scale(${ws.scale})`;
            wordEl.style.opacity = (ws.phase === "completed") ? ws.opacity : ws.scale;

            this.renderWordSpans(ws, wordEl, currentWordId, currentTyped);
        });
    }

    /**
     * Renders the word spans.
     * @param {any} ws - The ws.
     * @param {any} wordEl - The wordEl.
     * @param {any} currentWordId - The currentWordId.
     * @param {any} currentTyped - The currentTyped.
     */
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

    /**
     * Cleans up the jump word UI component resources.
     */
    cleanup() {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        const style = document.getElementById("bridge-event-styles");
        if (style) style.remove();
    }
}
