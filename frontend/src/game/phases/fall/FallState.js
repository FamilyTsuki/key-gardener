export class FallState {
    constructor(phase) {
        this.phase = phase;
        this.isReady = false;
        this.isPhaseEnded = false;
        this.isTransitioningToNextLevel = false;
        
        this.targetDepth = typeof phase.options === "string" ? 2000 : (phase.options.targetDepth || 2000);
        this.deep = 0;
        
        this.gravity = 15;
        this.terminalVelocity = 250;
        this.baseVelocity = 50;
        this.currentVelocity = this.baseVelocity;
        
        this.obstacleSpawnInterval = 4.8;
        this.textScramblersStopped = false;
    }

    /**
     * Updates.
 * @param {any} deltaTime - The deltaTime.
     */
    update(deltaTime) {
        if (!this.isReady) return 0;
        
        if (!this.phase.player.isAlive() || this.isPhaseEnded) {
            if (this.phase.player && !this.phase.player.isAlive() && !this.textScramblersStopped) {
                this.textScramblersStopped = true;
                this.phase.ui.stopScramblers();
            }
            return 0;
        }

        const difficultyRatio = Math.min(this.deep / this.targetDepth, 1.0);
        this.terminalVelocity = 100 + difficultyRatio * 200;
        this.gravity = 15 + difficultyRatio * 20;
        this.obstacleSpawnInterval = 4.8 - difficultyRatio * 3.6;

        this.currentVelocity = Math.min(this.currentVelocity + (this.gravity * deltaTime), this.terminalVelocity);
        const movementDelta = this.currentVelocity * deltaTime;

        this.deep += movementDelta;
        
        if (this.deep >= this.targetDepth && !this.isTransitioningToNextLevel) {
            this.triggerPhaseTransition();
        }

        return movementDelta;
    }

    /**
     * Triggers the phase transition.
     */
    triggerPhaseTransition() {
        this.isTransitioningToNextLevel = true;

        const overlay = document.createElement("div");
        overlay.classList.add("phase-transition-overlay");
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add("active");
            
            setTimeout(async () => {
                this.isPhaseEnded = true;
                await this.phase.gameEngine.nextLevel();
                
                overlay.classList.remove("active");
                
                setTimeout(() => {
                    overlay.remove();
                }, 1000);
            }, 1000);
        }, 2000);
    }
}
