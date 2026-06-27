export class PlayerUI {
    constructor() {
        this.elVignette = document.getElementById("damage-vignette");
        this.hudEl = document.getElementById("player-hud");
        this.fillEl = document.getElementById("player-hp-fill");
        this.currentEl = document.getElementById("player-hp-current");
        this.maxEl = document.getElementById("player-hp-max");
        this.separatorNode = this.maxEl ? this.maxEl.previousSibling : null;
    }

    /**
     * Updates the hp bar.
 * @param {any} hp - The hp.
 * @param {any} hpMax - The hpMax.
     */
    updateHpBar(hp, hpMax) {
        if (hp === Infinity) {
            if (this.hudEl) this.hudEl.style.display = "none";
            return;
        }

        if (this.hudEl) this.hudEl.style.display = "flex";

        if (!this.fillEl || !this.currentEl || !this.maxEl) return;

        const ratio = Math.max(0, hp / hpMax);
        this.currentEl.textContent = Math.ceil(Math.max(0, hp));
        this.maxEl.textContent = hpMax;
        
        if (this.separatorNode && this.separatorNode.nodeType === Node.TEXT_NODE) {
            this.separatorNode.textContent = " / ";
        }
        
        this.fillEl.style.width = `${ratio * 100}%`;
        this.updateHpColor(ratio);
    }

    /**
     * Updates the hp color.
 * @param {any} ratio - The ratio.
     */
    updateHpColor(ratio) {
        if (ratio > 0.3) {
            this.fillEl.classList.remove("low-hp");
            this.fillEl.classList.add("high-hp");
        } else {
            this.fillEl.classList.remove("high-hp");
            this.fillEl.classList.add("low-hp");
        }
    }

    /**
     * Shows the damage vignette.
     */
    showDamageVignette() {
        if (!this.elVignette) return;
        this.elVignette.classList.add("flash-red");
        setTimeout(() => this.elVignette.classList.remove("flash-red"), 500);
    }

    /**
     * Shows the floating text.
 * @param {any} position - The position.
 * @param {any} amount - The amount.
 * @param {any} type - The type.
     */
    showFloatingText(position, amount, type) {
        if (!position) return;
        const prefix = type === "heal" ? "+" : "-";
        window.dispatchEvent(new CustomEvent("spawn_floating_text", {
            detail: {
                position: position,
                text: `${prefix}${Math.round(amount)}`,
                type: type
            }
        }));
    }

    /**
     * Triggers the screen shake.
     */
    triggerScreenShake() {
        if (typeof window.startShake === "function") {
            window.startShake(0.6);
        }
    }

    /**
     * Shows the game over screen.
 * @param {any} reason - The reason.
 * @param {Function} onDeathCallback - The onDeathCallback.
     */
    showGameOverScreen(reason, onDeathCallback) {
        const container = document.querySelector(".game-container");
        if (container) container.classList.add("player-dead");

        const screen = this.buildGameOverDOM(reason);
        document.body.appendChild(screen);

        this.scheduleGameOverTransitions(screen, container, onDeathCallback);
    }

    /**
     * Builds the game over d o m.
 * @param {any} reason - The reason.
     */
    buildGameOverDOM(reason) {
        const screen = document.createElement("div");
        screen.id = "game-over-screen";

        const banner = document.createElement("div");
        banner.className = "div-title";

        const title = document.createElement("h1");
        title.className = "game-over-title";
        title.textContent = "Vous êtes mort.";

        const reasonEl = document.createElement("p");
        reasonEl.className = "game-over-reason";
        reasonEl.textContent = reason || "Cause inconnue.";

        banner.appendChild(title);
        banner.appendChild(reasonEl);
        screen.appendChild(banner);
        
        return screen;
    }

    /**
     * Schedules the game over transitions.
 * @param {any} screen - The screen.
 * @param {any} container - The container.
 * @param {Function} onDeathCallback - The onDeathCallback.
     */
    scheduleGameOverTransitions(screen, container, onDeathCallback) {
        setTimeout(() => {
            screen.classList.add("fading-out");
            if (container) {
                container.classList.remove("player-dead");
                container.classList.add("player-restarting");
            }

            setTimeout(() => {
                screen.remove();
                if (container) container.classList.remove("player-restarting");
                if (onDeathCallback) onDeathCallback();
            }, 1200);
        }, 8000);
    }

    /**
     * Hides the hud.
     */
    hideHud() {
        if (this.hudEl) this.hudEl.style.display = "none";
    }
}
