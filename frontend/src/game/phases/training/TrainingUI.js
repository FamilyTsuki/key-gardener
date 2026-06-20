export class TrainingUI {
    constructor() {
        this.injectStyles();

        this.container = document.createElement("div");
        this.container.id = "training-ui-container";
        this.container.className = "training-ui-hidden";
        
        this.promptText = document.createElement("div");
        this.promptText.className = "training-prompt-text";
        
        this.wordContainer = document.createElement("div");
        this.wordContainer.className = "training-word-container";
        
        this.targetWordDisplay = document.createElement("div");
        this.targetWordDisplay.className = "training-target-word";
        
        this.statsDisplay = document.createElement("div");
        this.statsDisplay.className = "training-stats";
        
        this.wordContainer.appendChild(this.targetWordDisplay);
        this.wordContainer.appendChild(this.statsDisplay);
        
        this.container.appendChild(this.promptText);
        this.container.appendChild(this.wordContainer);
        
        document.body.appendChild(this.container);
    }

    injectStyles() {
        if (document.getElementById("training-ui-styles")) return;
        const style = document.createElement("style");
        style.id = "training-ui-styles";
        style.textContent = `
            #training-ui-container {
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                z-index: 50;
                pointer-events: none;
                transition: opacity 0.3s;
            }
            .training-ui-hidden {
                display: none !important;
            }
            .training-prompt-text {
                font-size: 24px;
                font-weight: bold;
                color: white;
                text-align: center;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }
            .training-word-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                background-color: rgba(0, 0, 0, 0.6);
                padding: 16px;
                border-radius: 12px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                align-items: center;
                justify-content: center;
                transition: background-color 0.3s, border 0.3s;
            }
            .training-word-container-transparent {
                background-color: transparent !important;
                border-color: transparent !important;
            }
            .training-target-word {
                font-size: 36px;
                font-family: monospace;
                letter-spacing: 4px;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 40px; /* Space between words */
            }
            .training-stats {
                font-size: 20px;
                color: #d1d5db;
                font-weight: bold;
                margin-top: 8px;
            }
            .training-word-item {
                text-align: center;
                display: inline-block;
            }
            .training-char-matched {
                color: #4ade80;
                font-weight: bold;
            }
            .training-char-unmatched {
                color: white;
                opacity: 0.8;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }
            .training-char-error {
                color: #ef4444;
                font-weight: bold;
                text-decoration: underline;
            }
            .training-char-error-bg {
                color: #ef4444;
                background-color: rgba(127, 29, 29, 0.5);
            }
        `;
        document.head.appendChild(style);
    }

    showPrompt(message, wordsToType, currentTyped) {
        this.container.classList.remove("training-ui-hidden");
        this.wordContainer.classList.add("training-word-container-transparent");
        this.promptText.textContent = message;
        
        this.targetWordDisplay.innerHTML = "";
        
        // Handle multiple words (like ACCEPTER / REFUSER)
        wordsToType.forEach(word => {
            const wordEl = document.createElement("div");
            wordEl.className = "training-word-item";
            
            let matched = false;
            if (word.startsWith(currentTyped) && currentTyped.length > 0) {
                matched = true;
            }
            
            for (let i = 0; i < word.length; i++) {
                const span = document.createElement("span");
                span.textContent = word[i];
                if (matched && i < currentTyped.length) {
                    span.className = "training-char-matched";
                } else {
                    span.className = "training-char-unmatched";
                }
                wordEl.appendChild(span);
            }
            this.targetWordDisplay.appendChild(wordEl);
        });
        
        this.statsDisplay.textContent = "";
    }

    showExercise(targetWord, currentTyped, progressText) {
        this.container.classList.remove("training-ui-hidden");
        this.wordContainer.classList.remove("training-word-container-transparent");
        this.promptText.textContent = "";
        
        this.targetWordDisplay.innerHTML = "";
        const wordEl = document.createElement("div");
        wordEl.className = "training-word-item";
        
        // Highlight errors or correct
        let hasError = false;
        for (let i = 0; i < currentTyped.length; i++) {
            if (currentTyped[i] !== targetWord[i]) {
                hasError = true;
                break;
            }
        }

        for (let i = 0; i < targetWord.length; i++) {
            const span = document.createElement("span");
            span.textContent = targetWord[i];
            
            if (i < currentTyped.length) {
                if (currentTyped[i] === targetWord[i]) {
                    span.className = "training-char-matched";
                } else {
                    span.className = "training-char-error";
                }
            } else {
                if (hasError && i === currentTyped.length) {
                    span.className = "training-char-error-bg";
                } else {
                    span.className = "training-char-unmatched";
                }
            }
            wordEl.appendChild(span);
        }
        
        this.targetWordDisplay.appendChild(wordEl);
        this.statsDisplay.textContent = progressText;
    }

    hide() {
        this.container.classList.add("training-ui-hidden");
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
