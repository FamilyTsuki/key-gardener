import * as THREE from "three";
import ModelLoader from "../../../../core/utils/ModelLoader.js";

export class PlayerRenderer3D {
    constructor(scene, spacingX, spacingZ) {
        this.scene = scene;
        this.spacingX = spacingX;
        this.spacingZ = spacingZ;
        this.offsetX = 0;
        this.offsetZ = 0;
        
        this.mesh = new THREE.Group();
        this.playerModel = null;
        this.scene.add(this.mesh);
    }

    /**
     * Loads the model.
     */
    async loadModel() {
        try {
            const gltf = await ModelLoader.loadAsync("/asset/game_assets/models/player.glb");
            const rawModel = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(rawModel);
            const center = box.getCenter(new THREE.Vector3());
            
            rawModel.position.x = -center.x;
            rawModel.position.z = -center.z;
            
            this.playerModel = new THREE.Group();
            this.playerModel.add(rawModel);

            rawModel.traverse((child) => {
                if (child.isBone) {
                    child.userData.initialPosition = child.position.clone();
                    child.userData.initialRotation = child.rotation.clone();
                }
            });

            this.playerModel.scale.set(1.95, 1.95, 1.95);
            this.playerModel.position.y = 0.25;
            this.mesh.add(this.playerModel);
        } catch (e) {
            console.error("Failed to load player model", e);
        }
    }

    /**
     * Updates the position.
 * @param {any} movementState - The movementState.
     */
    updatePosition(movementState) {
        const worldCurrentX = movementState.x * this.spacingX + this.offsetX;
        const worldCurrentZ = movementState.y * this.spacingZ + this.offsetZ;
        this.mesh.position.set(worldCurrentX, movementState.offsetY, worldCurrentZ);
    }

    /**
     * Updates the rotation.
 * @param {any} facingDirection - The facingDirection.
     */
    updateRotation(facingDirection) {
        const angle = Math.atan2(
            facingDirection.x * this.spacingX,
            facingDirection.y * this.spacingZ
        );
        this.mesh.rotation.set(0, angle, 0);
    }

    /**
     * Renders the movement animation.
 * @param {any} movementState - The movementState.
 * @param {any} startPos - The startPos.
 * @param {any} targetPos - The targetPos.
 * @param {any} pendingWormRepel - The pendingWormRepel.
     */
    renderMovementAnimation(movementState, startPos, targetPos, pendingWormRepel) {
        if (!this.playerModel) return;

        if (movementState.isMoving) {
            this.applyJumpAnimation(movementState, startPos, targetPos, pendingWormRepel);
        } else {
            this.resetAnimation();
        }
    }

    /**
     * Applies the jump animation.
 * @param {any} movementState - The movementState.
 * @param {any} startPos - The startPos.
 * @param {any} targetPos - The targetPos.
 * @param {any} pendingWormRepel - The pendingWormRepel.
     */
    applyJumpAnimation(movementState, startPos, targetPos, pendingWormRepel) {
        const jumpAmplitude = 2.0;
        this.playerModel.position.y = 0.25 + Math.sin(movementState.movementProgress * Math.PI) * jumpAmplitude;

        let dx, dy;
        if (pendingWormRepel) {
            dx = pendingWormRepel.wormKey.rawPosition.x - startPos.x;
            dy = pendingWormRepel.wormKey.rawPosition.y - startPos.y;
        } else {
            dx = targetPos.x - startPos.x;
            dy = targetPos.y - startPos.y;
        }
        
        const jumpDistance = Math.sqrt(dx * dx + dy * dy);
        const maxTilt = Math.min(jumpDistance * 0.1, 0.6);
        this.playerModel.rotation.x = (this.baseRotationX || 0) + Math.sin(movementState.movementProgress * Math.PI) * maxTilt; 

        const speedFactor = 15 / movementState.movementDuration;
        const maxStretchZ = Math.max(1, speedFactor * 0.6);
        const stretchFactor = 1 + (maxStretchZ - 1) * Math.sin(movementState.movementProgress * Math.PI);
        const shrinkFactor = 1.95 / Math.sqrt(stretchFactor);
        
        this.playerModel.scale.set(shrinkFactor, shrinkFactor, 1.95 * stretchFactor);
    }

    /**
     * Resets the animation.
     */
    resetAnimation() {
        this.playerModel.position.y = 0.25;
        this.playerModel.rotation.x = this.baseRotationX || 0;
        this.playerModel.scale.set(1.95, 1.95, 1.95);

        this.playerModel.traverse((child) => {
            if (child.isBone && child.userData.initialRotation) {
                child.position.copy(child.userData.initialPosition);
                child.rotation.copy(child.userData.initialRotation);
            }
        });
    }

    /**
     * Applies the crouch.
 * @param {any} percentage - The percentage.
     */
    applyCrouch(percentage) {
        if (!this.playerModel) return;
        
        const model = this.playerModel;
        const hips = model.getObjectByName("Hips") || model.getObjectByName("mixamorigHips");
        const leftUpLeg = model.getObjectByName("LeftUpLeg") || model.getObjectByName("mixamorigLeftUpLeg");
        const rightUpLeg = model.getObjectByName("RightUpLeg") || model.getObjectByName("mixamorigRightUpLeg");
        const leftLeg = model.getObjectByName("LeftLeg") || model.getObjectByName("mixamorigLeftLeg");
        const rightLeg = model.getObjectByName("RightLeg") || model.getObjectByName("mixamorigRightLeg");
        const spine = model.getObjectByName("Spine") || model.getObjectByName("mixamorigSpine");

        if (hips && leftUpLeg && rightUpLeg && leftLeg && rightLeg && hips.userData.initialPosition) {
            model.scale.set(1.95, 1.95, 1.95);
            hips.position.y = hips.userData.initialPosition.y * (1 - percentage * 0.6);
            leftUpLeg.rotation.x = leftUpLeg.userData.initialRotation.x - percentage * 1.5;
            rightUpLeg.rotation.x = rightUpLeg.userData.initialRotation.x - percentage * 1.5;
            leftLeg.rotation.x = leftLeg.userData.initialRotation.x + percentage * 2.2;
            rightLeg.rotation.x = rightLeg.userData.initialRotation.x + percentage * 2.2;
            if (spine) {
                spine.rotation.x = spine.userData.initialRotation.x + percentage * 0.6;
            }
        } else {
            const squashY = 1.95 - (percentage * 1.05);
            const stretchXZ = 1.95 + (percentage * 0.6);
            model.scale.set(stretchXZ, squashY, stretchXZ);
        }
    }

    /**
     * Renders the death.
     */
    renderDeath() {
        if (!this.playerModel) return;
        this.playerModel.rotation.x = -Math.PI / 2;
        this.playerModel.position.y = 0.5;
        this.playerModel.scale.set(1.95, 1.95, 1.95);
    }

    /**
     * Destroies.
     */
    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}
