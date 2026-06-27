import * as THREE from "three";
import { AudioManager } from "../../managers/AudioManager.js";

export class FallObstacles {
    constructor(phase) {
        this.phase = phase;
        this.obstacles = [];
        this.pendingObstacles = [];
        this.obstacleSpawnTimer = 0;
        
        this.obstacleGeometry = new THREE.ConeGeometry(3, 8, 8);
        this.obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x00fcff });
    }

    /**
     * Updates.
 * @param {any} deltaTime - The deltaTime.
 * @param {any} movementDelta - The movementDelta.
 * @param {boolean} isTransitioning - The isTransitioning.
     */
    update(deltaTime, movementDelta, isTransitioning) {
        if (!isTransitioning) {
            this.handleSpawning(deltaTime);
        } else {
            this.phase.ui.resetWarnIcons();
        }

        this.handleMovementAndCollision(movementDelta, isTransitioning);
    }

    /**
     * Handles the spawning event/action.
 * @param {any} deltaTime - The deltaTime.
     */
    handleSpawning(deltaTime) {
        this.obstacleSpawnTimer += deltaTime;
        if (this.obstacleSpawnTimer >= this.phase.state.obstacleSpawnInterval) {
            const lanes = [-6, 0, 6];
            const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
            
            this.pendingObstacles.push({
                lane: targetLane,
                timer: 0,
                toggles: 0,
                isVisible: false
            });
            this.obstacleSpawnTimer = 0;
        }

        for (let i = this.pendingObstacles.length - 1; i >= 0; i--) {
            const pending = this.pendingObstacles[i];
            pending.timer += deltaTime;

            if (pending.timer >= 0.40) {
                pending.timer = 0;
                pending.toggles++;
                pending.isVisible = !pending.isVisible;

                const warnEl = this.phase.ui.getWarnElement(pending.lane);
                if (warnEl) {
                    warnEl.style.visibility = pending.isVisible ? "visible" : "hidden";
                    if (pending.isVisible) {
                        AudioManager.playSFX("/asset/game_assets/sounds/warn.wav", "environment", 0.6);
                    }
                }

                if (pending.toggles >= 6) {
                    if (warnEl) warnEl.style.visibility = "hidden";
                    this.spawnObstacle(pending.lane);
                    this.pendingObstacles.splice(i, 1);
                }
            }
        }
    }

    /**
     * Spawns the obstacle.
 * @param {any} targetLane - The targetLane.
     */
    spawnObstacle(targetLane) {
        const obstacleMesh = new THREE.Mesh(this.obstacleGeometry, this.obstacleMaterial);
        
        const player = this.phase.player;
        const playerSpacingX = player ? player.spacingX : 3.2;
        const playerSpacingZ = player ? player.spacingZ : 3.2;
        
        obstacleMesh.position.set(
            targetLane * playerSpacingX,
            -60,
            (player ? player.targetPosition.y : 0) * playerSpacingZ
        );
        
        obstacleMesh.userData = { lane: targetLane, isHit: false };
        
        if (this.phase.renderer && this.phase.renderer.wallContainer) {
            this.phase.renderer.wallContainer.add(obstacleMesh);
        }
        this.obstacles.push(obstacleMesh);
    }

    /**
     * Handles the movement and collision event/action.
 * @param {any} movementDelta - The movementDelta.
 * @param {boolean} isTransitioning - The isTransitioning.
     */
    handleMovementAndCollision(movementDelta, isTransitioning) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacleMesh = this.obstacles[i];
            obstacleMesh.position.y += movementDelta;

            const player = this.phase.player;
            if (player && player.mesh && !isTransitioning) {
                const distanceY = Math.abs(obstacleMesh.position.y - player.mesh.position.y);
                const distanceX = Math.abs(obstacleMesh.position.x - player.mesh.position.x);
                const collisionThresholdX = (6 * player.spacingX) * 0.4;

                if (distanceY < 3.5 && distanceX < collisionThresholdX && !obstacleMesh.userData.isHit) {
                    player.damage(20, "Percuté par un obstacle en chute libre");
                    obstacleMesh.userData.isHit = true;
                    obstacleMesh.visible = false;
                }
            }

            if (obstacleMesh.position.y > 50) {
                if (this.phase.renderer && this.phase.renderer.wallContainer) {
                    this.phase.renderer.wallContainer.remove(obstacleMesh);
                }
                this.obstacles.splice(i, 1);
            }
        }
    }

    /**
     * Updates the lane positions.
     */
    updateLanePositions() {
        const player = this.phase.player;
        const currentSpacingX = player ? player.spacingX : 3.2;
        this.obstacles.forEach(obstacle => {
            if (obstacle && obstacle.userData) {
                obstacle.position.x = obstacle.userData.lane * currentSpacingX;
            }
        });
    }

    /**
     * Cleanups.
     */
    cleanup() {
        if (this.obstacleGeometry) this.obstacleGeometry.dispose();
        if (this.obstacleMaterial) this.obstacleMaterial.dispose();
        this.obstacles = [];
        this.pendingObstacles = [];
    }
}
