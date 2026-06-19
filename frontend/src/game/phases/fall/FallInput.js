export class FallInput {
    constructor(phase) {
        this.phase = phase;
        this.currentTypedWord = "";
    }

    handleKeyDown(event) {
        if (!this.phase.state.isReady || !this.phase.player || this.phase.player.isMoving || 
            this.phase.state.isPhaseEnded || this.phase.state.isTransitioningToNextLevel) {
            return;
        }

        if (event.key === "Backspace") {
            this.currentTypedWord = this.currentTypedWord.slice(0, -1);
            this.phase.ui.updateColumnsText(this.currentTypedWord);
            return;
        }

        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            const char = event.key.toLowerCase();
            this.currentTypedWord += char;
            
            let isValidPrefix = this.phase.ui.laneWords.some(word => word.startsWith(this.currentTypedWord));

            if (!isValidPrefix) {
                this.currentTypedWord = char;
                isValidPrefix = this.phase.ui.laneWords.some(word => word.startsWith(this.currentTypedWord));
                if (!isValidPrefix) {
                    this.currentTypedWord = "";
                }
            }

            if (isValidPrefix) {
                if (this.currentTypedWord === this.phase.ui.laneWords[0]) {
                    this.movePlayerToLane(-1);
                } else if (this.currentTypedWord === this.phase.ui.laneWords[1]) {
                    this.movePlayerToLane(1);
                } else if (this.currentTypedWord === this.phase.ui.laneWords[2]) {
                    this.movePlayerToLane(0);
                }
            }
            this.phase.ui.updateColumnsText(this.currentTypedWord);
        }
    }

    movePlayerToLane(laneX) {
        this.phase.player.move({ 
            x: laneX * 6, 
            y: this.phase.player.targetPosition.y 
        });
        this.currentTypedWord = "";
        this.phase.ui.updateColumnsText(this.currentTypedWord);
    }
}
