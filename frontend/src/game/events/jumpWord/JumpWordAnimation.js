import * as THREE from "three";
import { AudioManager } from "../../managers/AudioManager.js";

export class JumpWordAnimation {
    constructor() {
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startCameraLookAt = new THREE.Vector3();
        this.targetCameraLookAt = new THREE.Vector3();

        this.eventCameraPos = new THREE.Vector3();
        this.eventCameraLookAt = new THREE.Vector3();

        this.transitionProgress = 0;
        this.transitioningToEvent = false;
        this.transitioningToWorld = false;

        this.isJumping = false;
        this.jumpProgress = 0;
        this.jumpDuration = 1.8;
        
        this.isLanding = false;
        this.landingProgress = 0;

        this.hasPlayedJumpSound = false;
        this.isWaitingToJump = false;
        this.waitTimer = 0;
    }

    /**
     * Starts the event transition.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} triggerY - The triggerY.
     */
    startEventTransition(worldPhase, triggerY) {
        worldPhase.isTransitioning = true;
        this.transitioningToEvent = true;
        this.transitionProgress = 0;

        const playerPos = worldPhase.player.mesh.position;
        this.startCameraPos.copy(worldPhase.camera.position);
        this.startCameraLookAt.copy(playerPos);

        const triggerRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY);
        const islandRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY - 6);

        let triggerCenter = 0;
        if (triggerRow.length > 0) triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;

        let islandCenter = 0;
        if (islandRow.length > 0) islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;

        const startX = (triggerCenter * Math.sqrt(3) * 1.5) + 12;
        const startZ = triggerY * 2.25;

        const endX = (islandCenter * Math.sqrt(3) * 1.5) + 12;
        const endZ = (triggerY - 6) * 2.25;

        const jumpWorldX = (startX + endX) / 2;
        const jumpWorldZ = (startZ + endZ) / 2;

        const dirX = endX - startX;
        const dirZ = endZ - startZ;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

        const perpX = -dirZ / length;
        const perpZ = dirX / length;

        const distance = 18;
        this.eventCameraPos = new THREE.Vector3(jumpWorldX + perpX * distance, 14, jumpWorldZ + perpZ * distance);
        this.eventCameraLookAt = new THREE.Vector3(jumpWorldX, 2, jumpWorldZ);
    }

    /**
     * Handles the camera transition.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} intoEvent - The intoEvent.
     * @param {any} onTransitionComplete - The onTransitionComplete.
     */
    handleCameraTransition(worldPhase, deltaTime, intoEvent, onTransitionComplete) {
        this.transitionProgress += deltaTime * 0.5;

        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            if (intoEvent) {
                this.transitioningToEvent = false;
            } else {
                this.transitioningToWorld = false;
                worldPhase.isTransitioning = false;
            }
            if (onTransitionComplete) onTransitionComplete();
        }

        const t = this.transitionProgress;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const startP = intoEvent ? this.startCameraPos : this.eventCameraPos;
        const startL = intoEvent ? this.startCameraLookAt : this.eventCameraLookAt;
        
        let targetP, targetL;
        if (intoEvent) {
            targetP = this.eventCameraPos;
            targetL = this.eventCameraLookAt;
        } else {
            const playerPos = worldPhase.player.mesh.position;
            targetP = new THREE.Vector3(playerPos.x + 5, playerPos.y + 21, playerPos.z + 14);
            targetL = playerPos.clone();
        }

        worldPhase.camera.position.lerpVectors(startP, targetP, ease);
        const currentLookAt = new THREE.Vector3().lerpVectors(startL, targetL, ease);
        worldPhase.camera.lookAt(currentLookAt);
    }

    /**
     * Applies the idle camera shake.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} percentage - The percentage.
     */
    applyIdleCameraShake(worldPhase, percentage) {
        worldPhase.player.applyCrouch(percentage);
        
        let shakeX = 0, shakeY = 0, shakeZ = 0;
        if (percentage > 0.33) {
            const shakeIntensity = (percentage - 0.33) / 0.67;
            const maxShake = 0.5 * shakeIntensity;
            shakeX = (Math.random() - 0.5) * maxShake;
            shakeY = (Math.random() - 0.5) * maxShake;
            shakeZ = (Math.random() - 0.5) * maxShake;
        }
        
        worldPhase.camera.position.set(
            this.eventCameraPos.x + shakeX,
            this.eventCameraPos.y + shakeY,
            this.eventCameraPos.z + shakeZ
        );
        worldPhase.camera.lookAt(this.eventCameraLookAt);
    }

    /**
     * Starts the jump sequence.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} triggerY - The triggerY.
     */
    startJumpSequence(worldPhase, triggerY) {
        this.isWaitingToJump = true;
        this.waitTimer = 0.5;

        if (!this.hasPlayedJumpSound) {
            AudioManager.playSFX("/asset/game_assets/sounds/big-jump.wav", "player", 0.8);
            this.hasPlayedJumpSound = true;
        }

        const player = worldPhase.player;
        const worldMap = worldPhase.worldMap;

        const triggerRow = worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY);
        const islandRow = worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY - 6);

        let triggerCenter = 0;
        if (triggerRow.length > 0) triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;

        let islandCenter = 0;
        if (islandRow.length > 0) islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;

        const triggerTile = worldMap.mapLayout.find(t => Math.abs(t.rawPosition.x - player.x) < 0.1 && t.rawPosition.y === triggerY) || triggerRow[0];
        const targetTile = worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY - 6).sort((a, b) => Math.abs(a.rawPosition.x - player.x) - Math.abs(b.rawPosition.x - player.x))[0] || islandRow[0];

        const spacingX = player.spacingX;
        const spacingZ = player.spacingZ;
        const offsetX = player.offsetX;
        const offsetZ = player.offsetZ;

        this.jumpStartX = triggerTile.rawPosition.x * spacingX + offsetX;
        this.jumpStartCenterZ = triggerTile.rawPosition.y * spacingZ + offsetZ;
        this.jumpStartY = player.offsetY;

        this.jumpTargetX = targetTile.rawPosition.x * spacingX + offsetX;
        this.jumpTargetCenterZ = targetTile.rawPosition.y * spacingZ + offsetZ;
        this.jumpTargetY = targetTile.baseY + 2.0;

        this.targetTileLogicalX = targetTile.rawPosition.x;
        this.targetTileLogicalY = targetTile.rawPosition.y;
    }

    /**
     * Updates the pre jump wait.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} onWaitComplete - The onWaitComplete.
     */
    updatePreJumpWait(worldPhase, deltaTime, onWaitComplete) {
        this.waitTimer -= deltaTime;
        this.applyIdleCameraShake(worldPhase, 1.0);

        if (this.waitTimer <= 0) {
            this.isWaitingToJump = false;
            this.isJumping = true;
            this.jumpProgress = 0;
            if (onWaitComplete) onWaitComplete();
        }
    }

    /**
     * Updates the jump.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     */
    updateJump(worldPhase, deltaTime) {
        const player = worldPhase.player;
        this.jumpProgress += deltaTime / this.jumpDuration;

        if (this.jumpProgress >= 1) {
            this.jumpProgress = 1;
            this.isJumping = false;

            player.x = this.targetTileLogicalX;
            player.y = this.targetTileLogicalY;
            player.offsetY = this.jumpTargetY;
            player.mesh.position.set(this.jumpTargetX, this.jumpTargetY, this.jumpTargetCenterZ);

            const finalCameraPos = new THREE.Vector3(this.jumpTargetX + 5, this.jumpTargetY + 21, this.jumpTargetCenterZ + 14);
            worldPhase.camera.position.copy(finalCameraPos);
            worldPhase.camera.lookAt(this.jumpTargetX, this.jumpTargetY, this.jumpTargetCenterZ);

            worldPhase.player.applyCrouch(1.0);
            
            if (window.startShake) window.startShake(1.5);

            this.isLanding = true;
            this.landingProgress = 0;
        } else {
            const t = this.jumpProgress;

            const currentX = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * t;
            const currentZ = this.jumpStartCenterZ + (this.jumpTargetCenterZ - this.jumpStartCenterZ) * t;
            const currentY = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * t + Math.sin(t * Math.PI) * 12.0;

            player.offsetY = currentY;
            player.mesh.position.set(currentX, currentY, currentZ);

            let crouchPercentage = 0;
            if (t < 0.2) crouchPercentage = 1.0 - (t / 0.2);
            worldPhase.player.applyCrouch(crouchPercentage);

            const finalCameraPos = new THREE.Vector3(this.jumpTargetX + 5, this.jumpTargetY + 21, this.jumpTargetCenterZ + 14);
            const finalCameraLookAt = new THREE.Vector3(this.jumpTargetX, this.jumpTargetY, this.jumpTargetCenterZ);

            worldPhase.camera.position.lerpVectors(this.eventCameraPos, finalCameraPos, t);
            const currentLook = new THREE.Vector3().lerpVectors(this.eventCameraLookAt, finalCameraLookAt, t);
            worldPhase.camera.lookAt(currentLook);
        }
    }

    /**
     * Updates the landing.
     * @param {any} worldPhase - The worldPhase.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} onLandingComplete - The onLandingComplete.
     */
    updateLanding(worldPhase, deltaTime, onLandingComplete) {
        this.landingProgress += deltaTime / 0.8;
        if (this.landingProgress >= 1.0) {
            this.isLanding = false;
            worldPhase.player.playerModel.scale.set(1.95, 1.95, 1.95);
            if (onLandingComplete) onLandingComplete();
            return;
        }
        
        let percentage = 1.0;
        if (this.landingProgress >= 0.625) {
            percentage = 1.0 - (this.landingProgress - 0.625) / 0.375;
        }
        worldPhase.player.applyCrouch(percentage);
    }
}
