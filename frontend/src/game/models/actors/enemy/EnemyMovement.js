import { AudioManager } from "../../../managers/AudioManager.js";

export class EnemyMovement {
    constructor(initialPosition, speed) {
        this.position = { x: initialPosition.x, y: initialPosition.y };
        this.actualKey = null;
        this.targetedPosition = { x: initialPosition.x, y: initialPosition.y };
        this.path = [];
        
        this.speed = speed;
        this.isJumping = false;
        this.startJumpPos = { x: initialPosition.x, y: initialPosition.y };
        this.totalJumpDist = 0;
        this.jumpDelayTimer = 0;
        
        this.isSpawning = true;
        this.spawnProgress = 0;
        this.spawnDuration = 1.3;
        this.spawnSource = { x: 0, y: 0 };
        this.spawnDistance = 0;
    }

    setupSpawn(isWorm, position) {
        if (isWorm) {
            this.spawnDuration = 1.3;
            this.spawnSource = { x: position.x, y: position.y };
            this.spawnDistance = 0;
            return;
        }

        const distLeft = position.x - (-12);
        const distRight = 22 - position.x;
        const distTop = position.y - (-15);

        let spawnX, spawnY;
        if (distLeft < distRight && distLeft < distTop) {
            spawnX = -12;
            spawnY = position.y + (Math.random() - 0.5) * 2;
        } else if (distRight < distLeft && distRight < distTop) {
            spawnX = 22;
            spawnY = position.y + (Math.random() - 0.5) * 2;
        } else {
            spawnX = position.x + (Math.random() - 0.5) * 2;
            spawnY = -15;
        }
        
        this.spawnSource = { x: spawnX, y: spawnY };
        const dx = position.x - this.spawnSource.x;
        const dy = position.y - this.spawnSource.y;
        this.spawnDistance = Math.sqrt(dx * dx + dy * dy);
        this.spawnDuration = Math.max(0.7, Math.min(1.3, this.spawnDistance * 0.05));
    }

    updateSpawn(deltaTime) {
        if (!this.isSpawning) return false;
        
        this.spawnProgress += deltaTime / this.spawnDuration;
        if (this.spawnProgress >= 1) {
            this.isSpawning = false;
            this.spawnProgress = 1;
            this.jumpDelayTimer = 0.07 / this.speed;
            AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "enemy", 0.4);
            return true; 
        }
        return false;
    }

    get isBlocking() {
        return !this.isSpawning || (this.spawnProgress * this.spawnDuration >= 1.0);
    }

    setPath(newPath) {
        this.path = newPath;
    }

    startJump() {
        if (this.isSpawning || this.isJumping || this.jumpDelayTimer > 0) return;
        if (!this.path || this.path.length === 0) return;

        this.isJumping = true;
        this.startJumpPos = { x: this.position.x, y: this.position.y };
        
        const nextNode = this.path.shift();
        this.targetedPosition = nextNode.rawPosition;
        this.actualKey = nextNode.key;

        const dx = this.targetedPosition.x - this.startJumpPos.x;
        const dy = this.targetedPosition.y - this.startJumpPos.y;
        this.totalJumpDist = Math.sqrt(dx * dx + dy * dy);

        AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "enemy", 0.2);
    }

    updateJump(deltaTime) {
        if (this.jumpDelayTimer > 0) {
            this.jumpDelayTimer -= deltaTime;
            if (this.jumpDelayTimer <= 0) {
                this.jumpDelayTimer = 0;
                this.startJump();
            }
        }

        if (!this.targetedPosition || !this.isJumping) return 0;

        const dx = this.targetedPosition.x - this.position.x;
        const dy = this.targetedPosition.y - this.position.y;
        let currentDist = Math.sqrt(dx * dx + dy * dy);

        const moveSpeed = 6.0;
        const moveDist = moveSpeed * deltaTime;

        if (currentDist <= moveDist) {
            this.position.x = this.targetedPosition.x;
            this.position.y = this.targetedPosition.y;
            currentDist = 0;
        } else {
            this.position.x += (dx / currentDist) * moveDist;
            this.position.y += (dy / currentDist) * moveDist;
            const newDx = this.targetedPosition.x - this.position.x;
            const newDy = this.targetedPosition.y - this.position.y;
            currentDist = Math.sqrt(newDx * newDx + newDy * newDy);
        }

        let progression = this.totalJumpDist > 0 ? 1 - currentDist / this.totalJumpDist : 1;
        progression = Math.max(0, Math.min(1, progression));

        if (currentDist < 0.05) {
            this.finishJump();
        }

        return progression;
    }

    finishJump() {
        this.isJumping = false;
        this.position.x = this.targetedPosition.x;
        this.position.y = this.targetedPosition.y;
        this.totalJumpDist = 0;
        this.jumpDelayTimer = 0.07 / this.speed;
    }
}
