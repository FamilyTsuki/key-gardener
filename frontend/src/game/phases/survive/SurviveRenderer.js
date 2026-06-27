import * as THREE from "three";
import { SurviveDecorBuilder } from "../../utilities/SurviveDecorBuilder.js";

export class SurviveRenderer {
    constructor(phase) {
        this.phase = phase;
        this.worldGroupPivot = new THREE.Group();
        this.worldGroup = new THREE.Group();
        this.decor = null;
    }

    /**
     * Initializes the survive renderer.
     * @param {any} scene - The scene.
     * @param {any} camera - The camera.
     * @param {any} decorType - The decorType.
     */
    init(scene, camera, decorType) {
        camera.position.set(15, 18, 7);
        camera.lookAt(15, 0, 3);

        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.decor = SurviveDecorBuilder.buildDecor(decorType, scene);
    }

    /**
     * Updates the camera.
     * @param {any} camera - The camera.
     * @param {any} enemies - The enemies.
     */
    updateCamera(camera, enemies) {
        const hasBugBoss = enemies && enemies.boss && enemies.boss.name === "GiantBug" && !enemies.boss.isDead;
        const hasEarthBoss = enemies && enemies.boss && enemies.boss.name === "EarthCore" && !enemies.boss.isDead;
        
        let targetCamY = 18;
        let targetCamZ = 7;
        let targetLookY = 0;
        let targetLookZ = 3;

        if (hasBugBoss) {
            targetCamY = 20;
            targetCamZ = 14;
            targetLookY = 3;
            targetLookZ = 3;
        } else if (hasEarthBoss) {
            targetCamY = 11;
            targetCamZ = 15.5;
            targetLookY = 3.5;
            targetLookZ = 2.0;
        }

        const currentCamPos = camera.position;
        currentCamPos.set(
            15,
            THREE.MathUtils.lerp(currentCamPos.y, targetCamY, 0.03),
            THREE.MathUtils.lerp(currentCamPos.z, targetCamZ, 0.03)
        );
        
        camera.lookAt(15, targetLookY, targetLookZ);
    }

    /**
     * Updates the decor.
     * @param {any} deltaTime - The deltaTime.
     */
    updateDecor(deltaTime) {
        if (!this.decor) return;
        
        const waveData = this.decor.update(deltaTime) || { y: 0, rotationX: 0, rotationZ: 0 };
        if (this.worldGroupPivot) {
            if (typeof waveData === 'number') {
                this.worldGroupPivot.position.y = waveData;
            } else {
                this.worldGroupPivot.position.y = waveData.y;
                this.worldGroupPivot.rotation.x = waveData.rotationX;
                this.worldGroupPivot.rotation.z = waveData.rotationZ;
            }
        }
    }

    /**
     * Draws the elements to the canvas or screen.
     * @param {any} keyboard - The keyboard.
     * @param {any} player - The player.
     * @param {any} enemies - The enemies.
     */
    draw(keyboard, player, enemies) {
        if (keyboard && player) {
            keyboard.keyboardLayout.forEach((tile) => {
                const isPlayerOnTile = player.targetPosition && 
                    player.targetPosition.x === tile.rawPosition.x &&
                    player.targetPosition.y === tile.rawPosition.y &&
                    player.isAlive();
                tile.isPressed = !!isPlayerOnTile;
            });
            keyboard.update(enemies);
        }
    }

    /**
     * Cleans up survive renderer resources.
     * @param {any} scene - The scene.
     */
    cleanup(scene) {
        if (this.worldGroupPivot) {
            scene.remove(this.worldGroupPivot);
        }
        if (this.decor) {
            this.decor.cleanup();
        }
    }
}
