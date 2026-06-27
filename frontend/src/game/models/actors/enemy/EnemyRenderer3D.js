import * as THREE from "three";
import ModelLoader from "../../../../core/utils/ModelLoader.js";

export class EnemyRenderer3D {
    constructor(scene, state) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        
        this.model = null;
        this.animationMixer = null;
        
        this.color = state.color;
        this.baseScale = state.config.scale || 1.0;
        this.isWorm = state.isWorm;
        this.spacing = 3.2;

        this.spawnZoneMesh = null;
        this.spawnZoneMaterial = null;
    }

    /**
     * Creates the spawn zone.
     * @param {any} position - The position.
     */
    createSpawnZone(position) {
        const geoWidth = 1.0 * this.spacing * 0.9;
        const geoHeight = 1.0 * this.spacing * 0.9;
        const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
        this.spawnZoneMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.spawnZoneMesh = new THREE.Mesh(geometry, this.spawnZoneMaterial);
        this.spawnZoneMesh.rotation.x = -Math.PI / 2;
        this.spawnZoneMesh.position.set(position.x * this.spacing, 0.4, position.y * this.spacing);
        this.scene.add(this.spawnZoneMesh);
    }

    /**
     * Loads the model.
     * @param {any} modelArg - The modelArg.
     */
    loadModel(modelArg) {
        const resolveModel = (gltfOrScene) => {
            this.model = gltfOrScene.scene ? gltfOrScene.scene : gltfOrScene;
            this.model.scale.set(1.3 * this.baseScale, 1.3 * this.baseScale, 1.3 * this.baseScale);
            this.model.rotation.y = Math.PI / 2;
            
            this.model.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) {
                    const matParams = { color: this.color };
                    if (child.isSkinnedMesh) matParams.skinning = true;
                    child.material = new THREE.MeshLambertMaterial(matParams);
                    child.castShadow = true;
                    child.material.needsUpdate = true;
                }
            });

            const clipList = modelArg && modelArg.animations ? modelArg.animations : (gltfOrScene.animations || []);
            if (clipList.length > 0) {
                this.animationMixer = new THREE.AnimationMixer(this.model);
                const idleClip = THREE.AnimationClip.findByName(clipList, "idle") || clipList[0];
                this.animationMixer.clipAction(idleClip).play();
            }

            this.model.position.y = 0.6;
            this.mesh.add(this.model);
        };

        if (modelArg) {
            resolveModel(modelArg);
        } else {
            const path = this.isWorm ? "/asset/game_assets/models/worms.glb" : "/asset/game_assets/models/bug.glb";
            ModelLoader.load(path, (gltf) => resolveModel(gltf));
        }
    }

    /**
     * Updates the animations.
     * @param {any} deltaTime - The deltaTime.
     */
    updateAnimations(deltaTime) {
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
    }

    /**
     * Renders the spawn animation.
     * @param {any} movementState - The movementState.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    renderSpawnAnimation(movementState, keyboardLayout) {
        if (this.isWorm) {
            this.renderWormSpawn(movementState, keyboardLayout);
        } else {
            this.renderBugSpawn(movementState, keyboardLayout);
        }
    }

    /**
     * Renders the worm spawn.
     * @param {any} movementState - The movementState.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    renderWormSpawn(movementState, keyboardLayout) {
        const currentKey = keyboardLayout ? keyboardLayout.find(k => k.key === movementState.actualKey) : null;
        
        if (this.spawnZoneMesh && currentKey && currentKey.mesh) {
            const height = this.getTileSurfaceHeight(currentKey);
            this.spawnZoneMesh.position.y = height + 0.01;
        }

        const elapsedSpawnTime = movementState.spawnProgress * movementState.spawnDuration;
        if (elapsedSpawnTime < 1.0) {
            if (this.model) this.model.visible = false;
            if (this.spawnZoneMesh) this.spawnZoneMesh.visible = true;
        } else {
            if (this.model) {
                this.model.visible = true;
                const targetHeight = this.getTileSurfaceHeight(currentKey);
                const emergeProgress = (elapsedSpawnTime - 1.0) / 0.3;
                this.model.position.y = targetHeight - 2.0 + (emergeProgress * 2.0);
                this.model.rotation.x = 0;
            }
            if (this.spawnZoneMesh) this.spawnZoneMesh.visible = false;
        }

        this.mesh.position.set(movementState.position.x * this.spacing, 0, movementState.position.y * this.spacing);
    }

    /**
     * Renders the bug spawn.
     * @param {any} movementState - The movementState.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    renderBugSpawn(movementState, keyboardLayout) {
        const currentX = movementState.spawnSource.x + (movementState.position.x - movementState.spawnSource.x) * movementState.spawnProgress;
        const currentY = movementState.spawnSource.y + (movementState.position.y - movementState.spawnSource.y) * movementState.spawnProgress;
        
        const currentKey = keyboardLayout ? keyboardLayout.find(k => k.key === movementState.actualKey) : null;
        const targetHeight = this.getTileSurfaceHeight(currentKey);
        const maxJumpHeight = Math.min(6.0, 2.0 + movementState.spawnDistance * 0.25);
        
        this.mesh.position.set(currentX * this.spacing, 0, currentY * this.spacing);

        if (this.model) {
            this.model.position.y = targetHeight + Math.sin(movementState.spawnProgress * Math.PI) * maxJumpHeight;
            this.model.rotation.x = movementState.spawnProgress * Math.PI * 2;
        }
    }

    /**
     * Finalizes the spawn.
     * @param {any} movementState - The movementState.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    finalizeSpawn(movementState, keyboardLayout) {
        this.mesh.position.set(movementState.position.x * this.spacing, 0, movementState.position.y * this.spacing);
        
        if (this.model) {
            const currentKey = keyboardLayout ? keyboardLayout.find(k => k.key === movementState.actualKey) : null;
            this.model.position.y = this.getTileSurfaceHeight(currentKey);
            this.model.rotation.x = 0;
            this.model.scale.set(1.3 * this.baseScale, 1.3 * this.baseScale, 1.3 * this.baseScale);
            this.model.visible = true;
        }

        this.removeSpawnZone();
    }

    /**
     * Renders the movement.
     * @param {any} movementState - The movementState.
     * @param {any} progression - The progression.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    renderMovement(movementState, progression, keyboardLayout) {
        this.mesh.position.set(movementState.position.x * this.spacing, 0, movementState.position.y * this.spacing);

        if (movementState.isJumping && this.model) {
            const startKey = keyboardLayout ? keyboardLayout.find(k => Math.abs(k.rawPosition.x - movementState.startJumpPos.x) < 0.1 && Math.abs(k.rawPosition.y - movementState.startJumpPos.y) < 0.1) : null;
            const endKey = keyboardLayout ? keyboardLayout.find(k => Math.abs(k.rawPosition.x - movementState.targetedPosition.x) < 0.1 && Math.abs(k.rawPosition.y - movementState.targetedPosition.y) < 0.1) : null;
            
            const startHeight = this.getTileSurfaceHeight(startKey);
            const endHeight = this.getTileSurfaceHeight(endKey);
            const baseHeight = startHeight + (endHeight - startHeight) * progression;

            this.model.position.y = baseHeight + Math.sin(progression * Math.PI) * 1.5;

            const stretchFactor = 0.3 * Math.sin(progression * Math.PI) * this.baseScale;
            this.model.scale.set(1.3 * this.baseScale - stretchFactor * 0.5, 1.3 * this.baseScale + stretchFactor, 1.3 * this.baseScale - stretchFactor * 0.5);
        } else if (!movementState.isJumping && this.model) {
            const currentKey = keyboardLayout ? keyboardLayout.find(k => k.key === movementState.actualKey) : null;
            this.model.position.y = this.getTileSurfaceHeight(currentKey);
            this.model.scale.set(1.3 * this.baseScale, 1.3 * this.baseScale, 1.3 * this.baseScale);
        }
    }

    /**
     * Looks at target.
     * @param {any} targetX - The targetX.
     * @param {any} targetY - The targetY.
     */
    lookAtTarget(targetX, targetY) {
        const targetPos = new THREE.Vector3(targetX * this.spacing, 0, targetY * this.spacing);
        if (this.mesh.parent) {
            this.mesh.parent.localToWorld(targetPos);
        }
        
        const currentQ = this.mesh.quaternion.clone();
        this.mesh.lookAt(targetPos);
        const targetQ = this.mesh.quaternion.clone();
        this.mesh.quaternion.copy(currentQ);
        this.mesh.quaternion.slerp(targetQ, 0.15);
    }

    /**
     * Get the tile surface height.
     * @param {any} keyObj - The keyObj.
     */
    getTileSurfaceHeight(keyObj) {
        if (!keyObj || !keyObj.mesh) return 0.225;
        if (keyObj.isGround === undefined) return 2.0 + (keyObj.baseY || 0);

        const targetMesh = keyObj.isGround ? keyObj.mesh.children[0] : keyObj.mesh.children[1];
        let height = keyObj.mesh.position.y;

        if (targetMesh && targetMesh.geometry) {
            if (!targetMesh.geometry.boundingBox) targetMesh.geometry.computeBoundingBox();
            const bbox = targetMesh.geometry.boundingBox;
            height += ((bbox.max.y - bbox.min.y) / 2) * targetMesh.scale.y;
        } else {
            height += keyObj.isGround ? 0.2 : 0.225;
        }
        return height + 0.48 * this.baseScale;
    }

    /**
     * Removes the spawn zone.
     */
    removeSpawnZone() {
        if (this.spawnZoneMesh) {
            this.scene.remove(this.spawnZoneMesh);
            this.spawnZoneMesh.geometry.dispose();
            this.spawnZoneMaterial.dispose();
            this.spawnZoneMesh = null;
        }
    }

    /**
     * Destroys the enemy 3D renderer and cleans up resources.
     */
    destroy() {
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            if (this.model) this.animationMixer.uncacheRoot(this.model);
            this.animationMixer = null;
        }
        this.removeSpawnZone();
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.visible = false;
        }
    }
}
