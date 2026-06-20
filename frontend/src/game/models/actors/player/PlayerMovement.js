import { AudioManager } from "../../../managers/AudioManager.js";

export class PlayerMovement {
    constructor(initialPosition) {
        this.x = initialPosition.x;
        this.y = initialPosition.y;
        this.offsetY = 0;
        
        this.startPosition = { x: this.x, y: this.y };
        this.targetPosition = { x: this.x, y: this.y, z: initialPosition.z };
        
        this.startOffsetY = 0;
        this.targetOffsetY = 0;
        
        this.isMoving = false;
        this.movementProgress = 0;
        this.movementDuration = 15;
        this.currentMovementTime = 0;
        
        this.facingDirection = { x: 0, y: -1 };
        this.lastKeyPressTime = 0;
        this.allowSpeedUp = true;
        this.pendingWormRepel = null;
    }

    update(deltaTime) {
        if (!this.isMoving) return;

        this.currentMovementTime += deltaTime;
        this.movementProgress = this.currentMovementTime / (this.movementDuration * 0.0166);

        if (this.movementProgress >= 1) {
            this.finishMovement();
            return;
        }

        this.interpolatePosition();
    }

    finishMovement() {
        this.movementProgress = 1;
        this.isMoving = false;
        
        this.x = this.targetPosition.x;
        this.y = this.targetPosition.y;
        this.offsetY = this.targetOffsetY;
        
        this.pendingWormRepel = null;
        AudioManager.playSFX("/asset/game_assets/sounds/fall.wav", "player", 1.0);
    }

    interpolatePosition() {
        if (this.pendingWormRepel) {
            this.interpolateRepelMovement();
        } else {
            this.interpolateNormalMovement();
        }
    }

    interpolateNormalMovement() {
        this.x = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * this.movementProgress;
        this.y = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * this.movementProgress;
        this.offsetY = this.startOffsetY + (this.targetOffsetY - this.startOffsetY) * this.movementProgress;
    }

    interpolateRepelMovement() {
        if (this.movementProgress < 0.5) {
            const progress = this.movementProgress * 2;
            const wormX = this.pendingWormRepel.wormKey.rawPosition.x;
            const wormY = this.pendingWormRepel.wormKey.rawPosition.y;
            
            this.x = this.startPosition.x + (wormX - this.startPosition.x) * progress;
            this.y = this.startPosition.y + (wormY - this.startPosition.y) * progress;
            this.offsetY = this.startOffsetY + (this.pendingWormRepel.wormOffsetY - this.startOffsetY) * progress;
        } else {
            const progress = (this.movementProgress - 0.5) * 2;
            const wormX = this.pendingWormRepel.wormKey.rawPosition.x;
            const wormY = this.pendingWormRepel.wormKey.rawPosition.y;

            this.x = wormX + (this.targetPosition.x - wormX) * progress;
            this.y = wormY + (this.targetPosition.y - wormY) * progress;
            this.offsetY = this.pendingWormRepel.wormOffsetY + (this.targetOffsetY - this.pendingWormRepel.wormOffsetY) * progress;
        }
    }

    startMovement(newPosition, keyboardLayout) {
        if (this.pendingWormRepel) return { blocked: true, hitWorm: this.pendingWormRepel.worm, wormKey: this.pendingWormRepel.wormKey };

        if (this.targetPosition && this.targetPosition.x === newPosition.x && this.targetPosition.y === newPosition.y) {
            return { blocked: false };
        }

        this.updateMovementDuration();
        this.startPosition = { x: this.x, y: this.y };
        
        this.updateFacingDirection(newPosition);
        
        this.targetPosition = { ...newPosition };
        this.startOffsetY = this.offsetY;
        this.targetOffsetY = this.calculateTargetOffsetY(newPosition, keyboardLayout);
        
        this.isMoving = true;
        this.currentMovementTime = 0;

        AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "player", 0.9);
        return { blocked: false };
    }

    updateMovementDuration() {
        const now = Date.now();
        const timeSinceLastPress = now - (this.lastKeyPressTime || 0);
        this.lastKeyPressTime = now;

        if (this.allowSpeedUp && timeSinceLastPress < 300) {
            this.movementDuration = Math.max(3, this.movementDuration * 0.4);
        } else {
            this.movementDuration = 15;
        }
    }

    updateFacingDirection(newPosition) {
        const dx = newPosition.x - this.targetPosition.x;
        const dy = newPosition.y - this.targetPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.facingDirection = { x: dx / dist, y: dy / dist };
        }
    }

    calculateTargetOffsetY(newPosition, keyboardLayout) {
        if (newPosition.offsetY !== undefined) return newPosition.offsetY;
        if (!keyboardLayout) return this.offsetY;

        const targetKey = keyboardLayout.find(k => 
            Math.abs(k.rawPosition.x - newPosition.x) < 0.1 && 
            Math.abs(k.rawPosition.y - newPosition.y) < 0.1
        );
        
        if (!targetKey) return this.offsetY;
        return this.getTileSurfaceHeight(targetKey);
    }

    getTileSurfaceHeight(keyObj) {
        if (!keyObj || !keyObj.mesh) return 0.225;
        if (keyObj.isGround === undefined) return 2.0 + (keyObj.baseY || 0);

        const targetMesh = keyObj.isGround ? keyObj.mesh.children[0] : keyObj.mesh.children[1];
        let height = keyObj.mesh.position.y;

        if (targetMesh && targetMesh.geometry) {
            if (!targetMesh.geometry.boundingBox) targetMesh.geometry.computeBoundingBox();
            const bbox = targetMesh.geometry.boundingBox;
            const halfHeight = (bbox.max.y - bbox.min.y) / 2;
            height += halfHeight * targetMesh.scale.y;
        } else {
            height += keyObj.isGround ? 0.2 : 0.225;
        }

        return height + 0.05;
    }

    checkForWormBlockade(newPosition, keyboardLayout, enemiesManager) {
        if (!keyboardLayout || !enemiesManager || this.pendingWormRepel) return;
        
        const startPos = this.isMoving ? this.startPosition : this;
        const pathKeys = this.getKeysOnSegment(startPos, newPosition, keyboardLayout);
        
        for (let i = 1; i < pathKeys.length; i++) {
            const keyObj = pathKeys[i];
            const worm = enemiesManager.container.find(e => 
                !e.isDead && (e.type === "blocker_worm" || e.type === "hazard_worm") && 
                e.actualKey === keyObj.key && e.isBlocking
            );
            
            if (worm) {
                const stopKey = pathKeys[i - 1] || pathKeys[0];
                newPosition.x = stopKey.rawPosition.x;
                newPosition.y = stopKey.rawPosition.y;
                newPosition.offsetY = this.getTileSurfaceHeight(stopKey);
                
                this.pendingWormRepel = {
                    worm: worm,
                    wormKey: keyObj,
                    wormOffsetY: this.getTileSurfaceHeight(keyObj),
                    applied: false
                };
                break;
            }
        }
    }

    getKeysOnSegment(start, end, keyboardLayout) {
        const keys = keyboardLayout.filter(key => {
            if (key.isGround) return false;
            return this.distanceToSegment(key.rawPosition, start, end) < 0.45;
        });
        return keys.sort((k1, k2) => {
            const d1 = Math.pow(k1.rawPosition.x - start.x, 2) + Math.pow(k1.rawPosition.y - start.y, 2);
            const d2 = Math.pow(k2.rawPosition.x - start.x, 2) + Math.pow(k2.rawPosition.y - start.y, 2);
            return d1 - d2;
        });
    }

    distanceToSegment(p, a, b) {
        const abX = b.x - a.x, abY = b.y - a.y;
        const apX = p.x - a.x, apY = p.y - a.y;
        const ab2 = abX * abX + abY * abY;
        if (ab2 === 0) return Math.sqrt(apX * apX + apY * apY);
        let t = Math.max(0, Math.min(1, (apX * abX + apY * abY) / ab2));
        const dx = p.x - (a.x + t * abX), dy = p.y - (a.y + t * abY);
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkRepelWhenIdle(keyboardLayout, enemiesManager, onRepelExecute) {
        if (this.isMoving || !keyboardLayout || !enemiesManager) return;
        
        const currentKey = keyboardLayout.find(k => Math.abs(k.rawPosition.x - this.x) < 0.1 && Math.abs(k.rawPosition.y - this.y) < 0.1);
        if (!currentKey) return;

        const worm = enemiesManager.container.find(e => !e.isDead && (e.type === "blocker_worm" || e.type === "hazard_worm") && e.actualKey === currentKey.key && e.isBlocking);
        if (!worm) return;

        const neighbors = keyboardLayout.filter(k => !k.isGround && k.key !== currentKey.key && Math.abs(k.rawPosition.x - currentKey.rawPosition.x) <= 1.1 && Math.abs(k.rawPosition.y - currentKey.rawPosition.y) <= 1.1);
        const safeNeighbors = neighbors.filter(n => !enemiesManager.container.some(e => !e.isDead && (e.type === "blocker_worm" || e.type === "hazard_worm") && e.actualKey === n.key && e.isBlocking));
        
        const repelKey = safeNeighbors[0] || neighbors[0];
        if (!repelKey) return;

        onRepelExecute(worm, repelKey);
    }
}
