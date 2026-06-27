import Actor from "../Actor.js";
import ProjectilePool from "../ProjectilePool.js";
import Bonk from "../Bonk.js";
import * as THREE from "three";
import ModelLoader from "../../../core/utils/ModelLoader.js";
import { AudioManager } from "../../managers/AudioManager.js";

const KEYBOARD_SPACING = 3.2;
const EMERGE_Y_OFFSET = -10;
const CLAW_ABOVE_HEIGHT = 3.5;

export default class BugBoss extends Actor {
    constructor(name, hp, rawPosition, position, size, scene, fireballModel, level = 1) {
        super(name, hp, hp, rawPosition, position, size);
        this.level = level;
        this.stateTimer = 0;
        this.attackInterval = 1800;
        this.clawCooldown = 2500;
        this.clawTimer = 0;
        this.scene = scene;
        this.fireballModel = fireballModel;
        this.totalTime = 0;
        this.container = new THREE.Group();
        this.scene.add(this.container);
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.attackPhase = "idle";
        this.attackStartTime = 0;
        this.isAttacking = false;
        this.isDying = false;
        this.deathProgress = 0;
        this.isEmerging = true;
        this.emergeProgress = 0;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        this.mesh.position.y = EMERGE_Y_OFFSET;
        this.mesh.scale.set(0, 0, 0);

        this.loadModel();
        AudioManager.playSFX("/asset/game_assets/sounds/impact.wav", "enemy", 0.8);

        const bossUI = document.getElementById("boss-ui");
        const bossName = document.getElementById("boss-name-display");
        if (bossName) {
            bossName.innerText = "GIANT BUG";
        }
        if (bossUI) {
            setTimeout(() => {
                bossUI.classList.remove("hidden");
            }, 1500);
        }
        this.updateHpBar();
    }

    /**
     * Loads the model.
     */
    async loadModel() {
        const gltf = await ModelLoader.loadAsync("/asset/game_assets/models/bug_3.glb");
        this.bugModel = gltf.scene;

        this.bones = {};
        this.initialBoneRotations = {};
        this.initialBoneScales = {};
        this.initialBonePositions = {};
        this.initialBoneQuaternions = {};
        const bugColor = 0x8b0000;
        this.bugModel.traverse((child) => {
            if (child.isBone) {
                this.bones[child.name] = child;
                this.initialBoneRotations[child.name] = child.rotation.clone();
                this.initialBoneScales[child.name] = child.scale.clone();
                this.initialBonePositions[child.name] = child.position.clone();
                this.initialBoneQuaternions[child.name] = child.quaternion.clone();
            }
            if (child.isMesh || child.isSkinnedMesh) {
                child.visible = true;
                child.material = new THREE.MeshLambertMaterial({
                    color: bugColor,
                    skinning: child.isSkinnedMesh
                });
                child.material.needsUpdate = true;
                if (child.isSkinnedMesh) {
                    child.frustumCulled = false;
                }
            }
        });

        console.log("BugBoss loaded bones:", Object.keys(this.bones));

        const scaleFactor = this.size.width * 5 * 280;
        this.bugModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.bugModel.rotation.y = 0;
        this.bugModel.position.y = -0.2;
        this.mesh.add(this.bugModel);
    }

    /**
     * Retrieves the is dead.
     */
    get isDead() {
        return this.hp < 0;
    }

    /**
     * Updates the hp bar.
     */
    updateHpBar() {
        const ratio = Math.max(0, (this.hp / this.hpMax) * 100);
        const fill = document.getElementById("boss-hp-fill");
        const currentTxt = document.getElementById("boss-hp-current");
        const maxTxt = document.getElementById("boss-hp-max");

        if (fill) fill.style.width = ratio + "%";
        if (currentTxt) currentTxt.innerText = Math.ceil(this.hp);
        if (maxTxt) maxTxt.innerText = this.hpMax;
    }

    /**
     * Updates the Bug Boss state and animations.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} playerPos - The playerPos.
     * @param {any} projectiles - The projectiles.
     * @param {any} bonks - The bonks.
     */
    update(deltaTime, playerPos, projectiles, bonks) {
        if (this.hp < 0) return;

        if (this.isDying) {
            this.updateDeathAnimation(deltaTime);
            return;
        }

        if (this.isEmerging) {
            if (this.updateEmergeAnimation(deltaTime)) return;
        }

        this.updateMeshPosition(deltaTime);
        this.updateAttackTimers(deltaTime, playerPos, projectiles, bonks);
    }

    /**
     * Updates the death animation.
     * @param {any} deltaTime - The deltaTime.
     */
    updateDeathAnimation(deltaTime) {
        this.deathProgress += deltaTime / 1500;
        const t = Math.min(1, this.deathProgress);

        this.mesh.rotation.z = 0;
        this.mesh.position.y = -t * 1.5;

        if (this.bones) {
            this.splayLegs(t);
        }

        if (this.deathProgress >= 1) {
            this.deathProgress = 1;
            this.hp = -1;
            this.isDying = false;
            this.die();
        }

        if (this.mesh) {
            this.mesh.updateMatrixWorld(true);
        }
    }

    /**
     * Splaies the legs.
     * @param {any} t - The t.
     */
    splayLegs(t) {
        const legs = [
            { side: "left", type: "front" },
            { side: "right", type: "front" },
            { side: "left", type: "back" },
            { side: "right", type: "back" }
        ];

        for (const leg of legs) {
            this.splayLeg(leg.side, leg.type, t);
        }
    }

    /**
     * Splaies the leg.
     * @param {any} side - The side.
     * @param {any} type - The type.
     * @param {any} t - The t.
     */
    splayLeg(side, type, t) {
        const prefix = side === "left" ? "" : "R_";
        const name = type === "front" ? "frontleg" : "backleg";
        const root = this.bones[`${prefix}${name}`];
        if (!root) {
            return;
        }

        const initialQuat = this.initialBoneQuaternions[`${prefix}${name}`];
        if (initialQuat) {
            const initialDir = new THREE.Vector3(0, 1, 0).applyQuaternion(initialQuat).normalize();
            const targetDir = this.getLegTargetDirection(side, type);
            const deltaQuat = new THREE.Quaternion().setFromUnitVectors(initialDir, targetDir);
            const targetQuat = deltaQuat.multiply(initialQuat);
            root.quaternion.slerpQuaternions(initialQuat, targetQuat, t);
        }

        const joints = [
            this.bones[`${prefix}${name}0`],
            this.bones[`${prefix}${name}1`],
            this.bones[`${prefix}${name}2`]
        ];

        for (let i = 0; i < joints.length; i++) {
            const joint = joints[i];
            if (!joint) {
                continue;
            }
            const jointName = `${prefix}${name}${i}`;
            const initialJointQuat = this.initialBoneQuaternions[jointName];
            if (initialJointQuat) {
                joint.quaternion.slerpQuaternions(initialJointQuat, new THREE.Quaternion(), t);
            }
            const initialJointPos = this.initialBonePositions[jointName];
            if (initialJointPos) {
                joint.position.copy(initialJointPos);
            }
        }
    }

    /**
     * Get the leg target direction.
     * @param {any} side - The side.
     * @param {any} type - The type.
     */
    getLegTargetDirection(side, type) {
        const xSign = side === "left" ? 1 : -1;
        const zSign = type === "front" ? 0.2 : -0.4;
        return new THREE.Vector3(xSign, 0.1, zSign).normalize();
    }

    /**
     * Updates the emerge animation.
     * @param {any} deltaTime - The deltaTime.
     */
    updateEmergeAnimation(deltaTime) {
        this.emergeProgress += deltaTime * 0.0018;

        if (this.emergeProgress < 1) {
            const t = this.emergeProgress;
            
            const baseScale = this.size.width * 5;
            this.mesh.scale.set(baseScale, baseScale, baseScale);
            
            const spacing = KEYBOARD_SPACING;
            this.mesh.position.x = this.position.x * spacing;
            this.mesh.position.y = Math.sin(t * Math.PI) * 8 + (1 - t) * 15;
            this.mesh.position.z = (this.position.y * spacing) - (1 - t) * 15;
            
            this.mesh.rotation.x = (1 - t) * 0.3;
            
            this.mesh.updateMatrixWorld(true);
            return true;
        }

        this.isEmerging = false;
        const spacing = KEYBOARD_SPACING;
        this.mesh.position.x = this.position.x * spacing;
        this.mesh.position.y = 0;
        this.mesh.position.z = this.position.y * spacing;
        this.mesh.rotation.x = 0;
        const baseScale = this.size.width * 5;
        this.mesh.scale.set(baseScale, baseScale, baseScale);
        
        if (window.startShake) {
            window.startShake(3.0);
        }
        AudioManager.playSFX("/asset/game_assets/sounds/quak.wav", "enemy", 1.0);
        return false;
    }

    /**
     * Updates the mesh position.
     * @param {any} deltaTime - The deltaTime.
     */
    updateMeshPosition(deltaTime) {
        this.totalTime += deltaTime * 0.001;

        if (!this.mesh) return;

        this.mesh.position.x = THREE.MathUtils.lerp(
            this.mesh.position.x,
            this.position.x * KEYBOARD_SPACING,
            0.05
        );
        this.mesh.position.z = THREE.MathUtils.lerp(
            this.mesh.position.z,
            this.position.y * KEYBOARD_SPACING,
            0.05
        );

        this.updateIdleAnimations();

        this.mesh.updateMatrixWorld(true);

        if (this.isAttacking) {
            this.updateClawAnimation();
            this.mesh.updateMatrixWorld(true);
        }
    }

    /**
     * Updates the idle animations.
     */
    updateIdleAnimations() {
        if (this.bones && this.bones["chest"]) {
            const breathe = Math.sin(this.totalTime * 3) * 0.05;
            this.bones["chest"].rotation.x = this.initialBoneRotations["chest"].x + breathe;
        }
        if (this.bones && this.bones["tail1"]) {
            const sway = Math.sin(this.totalTime * 2) * 0.2;
            this.bones["tail1"].rotation.y = this.initialBoneRotations["tail1"].y + sway;
            if (this.bones["tail2"]) this.bones["tail2"].rotation.y = this.initialBoneRotations["tail2"].y + sway * 1.2;
            if (this.bones["tail3"]) this.bones["tail3"].rotation.y = this.initialBoneRotations["tail3"].y + sway * 1.5;
        }
        if (this.bones && this.bones["earend"]) {
            const twitch = Math.sin(this.totalTime * 15) * 0.1;
            this.bones["earend"].rotation.z = this.initialBoneRotations["earend"].z + twitch;
        }
        if (this.bones && this.bones["R_earend"]) {
            const twitch = Math.sin(this.totalTime * 15 + 1) * 0.1;
            this.bones["R_earend"].rotation.z = this.initialBoneRotations["R_earend"].z - twitch;
        }
    }

    /**
     * Resets the all bones.
     */
    resetAllBones() {
        for (const name of Object.keys(this.bones)) {
            const bone = this.bones[name];
            if (bone) {
                if (this.initialBoneRotations[name]) {
                    bone.rotation.copy(this.initialBoneRotations[name]);
                }
                if (this.initialBonePositions[name]) {
                    bone.position.copy(this.initialBonePositions[name]);
                }
                if (this.initialBoneScales[name]) {
                    bone.scale.copy(this.initialBoneScales[name]);
                }
            }
        }
    }

    /**
     * Resets the inactive claw bones.
     * @param {any} activeSide - The activeSide.
     */
    resetInactiveClawBones(activeSide) {
        const inactiveSide = activeSide === "left" ? "right" : "left";
        const prefix = inactiveSide === "left" ? "" : "R_";
        const names = [
            `${prefix}frontleg`,
            `${prefix}frontleg0`,
            `${prefix}frontleg1`,
            `${prefix}frontleg2`
        ];
        for (const name of names) {
            const bone = this.bones && this.bones[name];
            if (bone) {
                if (this.initialBoneRotations[name]) {
                    bone.rotation.copy(this.initialBoneRotations[name]);
                }
                if (this.initialBonePositions[name]) {
                    bone.position.copy(this.initialBonePositions[name]);
                }
                if (this.initialBoneScales[name]) {
                    bone.scale.copy(this.initialBoneScales[name]);
                }
            }
        }
    }

    /**
     * Get the claw bones.
     * @param {any} side - The side.
     */
    getClawBones(side) {
        const prefix = side === "left" ? "" : "R_";
        return {
            root: this.bones && this.bones[`${prefix}frontleg`],
            joint0: this.bones && this.bones[`${prefix}frontleg0`],
            joint1: this.bones && this.bones[`${prefix}frontleg1`],
            tip: this.bones && this.bones[`${prefix}frontleg2`]
        };
    }

    /**
     * Get the claw initial transforms.
     * @param {any} side - The side.
     */
    getClawInitialTransforms(side) {
        const prefix = side === "left" ? "" : "R_";
        const rootQuat = this.initialBoneQuaternions[`${prefix}frontleg`].clone();
        const joint0Quat = this.initialBoneQuaternions[`${prefix}frontleg0`].clone();
        const joint1Quat = this.initialBoneQuaternions[`${prefix}frontleg1`].clone();
        const tipQuat = this.initialBoneQuaternions[`${prefix}frontleg2`].clone();

        const tipInParentInitial = rootQuat.clone()
            .multiply(joint0Quat)
            .multiply(joint1Quat)
            .multiply(tipQuat);

        return {
            rootRot: this.initialBoneRotations[`${prefix}frontleg`],
            joint0Rot: this.initialBoneRotations[`${prefix}frontleg0`],
            joint1Rot: this.initialBoneRotations[`${prefix}frontleg1`],
            tipRot: this.initialBoneRotations[`${prefix}frontleg2`],
            joint0Pos: this.initialBonePositions[`${prefix}frontleg0`],
            joint1Pos: this.initialBonePositions[`${prefix}frontleg1`],
            tipPos: this.initialBonePositions[`${prefix}frontleg2`],
            rootQuat: rootQuat,
            tipInParentInitial: tipInParentInitial
        };
    }

    /**
     * Applies the claw tip counter rotation.
     * @param {any} bones - The bones.
     * @param {any} transforms - The transforms.
     */
    applyClawTipCounterRotation(bones, transforms) {
        if (!bones.tip || !transforms.tipInParentInitial) {
            return;
        }
        const combined = bones.root.quaternion.clone()
            .multiply(bones.joint0.quaternion)
            .multiply(bones.joint1.quaternion);

        bones.tip.quaternion.copy(combined.invert()).multiply(transforms.tipInParentInitial);
    }

    /**
     * Applies the claw translations.
     * @param {any} bones - The bones.
     * @param {any} transforms - The transforms.
     * @param {any} stretch - The stretch.
     */
    applyClawTranslations(bones, transforms, stretch) {
        if (bones.joint0 && transforms.joint0Pos) {
            bones.joint0.position.copy(transforms.joint0Pos).multiplyScalar(stretch);
        }
        if (bones.joint1 && transforms.joint1Pos) {
            bones.joint1.position.copy(transforms.joint1Pos).multiplyScalar(stretch);
        }
        if (bones.tip && transforms.tipPos) {
            bones.tip.position.copy(transforms.tipPos).multiplyScalar(stretch);
        }
    }

    /**
     * Solves the i k.
     * @param {any} bones - The bones.
     * @param {any} targetWorldPos - The targetWorldPos.
     * @param {any} iterations - The iterations.
     */
    solveIK(bones, targetWorldPos, iterations = 8) {
        const tipWorldPos = new THREE.Vector3();
        const tipLocal = new THREE.Vector3();
        const targetLocal = new THREE.Vector3();
        const localRotation = new THREE.Quaternion();
        const euler = new THREE.Euler();
        
        const chain = [
            { bone: bones.joint1, isHinge: true },
            { bone: bones.joint0, isHinge: true },
            { bone: bones.root, isHinge: false }
        ];
        
        for (let iter = 0; iter < iterations; iter++) {
            for (const item of chain) {
                const bone = item.bone;
                if (!bone) continue;
                
                bones.tip.getWorldPosition(tipWorldPos);
                if (tipWorldPos.distanceTo(targetWorldPos) < 0.01) {
                    break;
                }
                
                tipLocal.copy(tipWorldPos);
                bone.worldToLocal(tipLocal);
                
                targetLocal.copy(targetWorldPos);
                bone.worldToLocal(targetLocal);
                
                if (item.isHinge) {
                    tipLocal.x = 0;
                    targetLocal.x = 0;
                    if (tipLocal.lengthSq() < 0.0001 || targetLocal.lengthSq() < 0.0001) {
                        continue;
                    }
                }
                
                tipLocal.normalize();
                targetLocal.normalize();
                
                localRotation.setFromUnitVectors(tipLocal, targetLocal);
                
                if (item.isHinge) {
                    euler.setFromQuaternion(localRotation, 'XYZ');
                    const pitchRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), euler.x);
                    bone.quaternion.multiply(pitchRotation);
                } else {
                    bone.quaternion.multiply(localRotation);
                }
                
                bone.updateMatrixWorld(true);
            }
        }
    }

    /**
     * Updates the claw animation.
     */
    updateClawAnimation() {
        const elapsed = this.totalTime - this.attackStartTime;
        this.resetInactiveClawBones(this.clawSide);

        const bones = this.getClawBones(this.clawSide);
        const transforms = this.getClawInitialTransforms(this.clawSide);

        if (!bones.root || !transforms.rootRot) {
            this.isAttacking = false;
            return;
        }

        bones.root.rotation.copy(transforms.rootRot);
        bones.joint0.rotation.copy(transforms.joint0Rot);
        bones.joint1.rotation.copy(transforms.joint1Rot);
        bones.tip.rotation.copy(transforms.tipRot);
        this.applyClawTranslations(bones, transforms, 1.0);
        bones.root.updateMatrixWorld(true);

        const initialTipWorldPos = new THREE.Vector3();
        bones.tip.getWorldPosition(initialTipWorldPos);

        const targetWorldPos = new THREE.Vector3(
            this.strikeTarget.x * KEYBOARD_SPACING,
            0,
            this.strikeTarget.y * KEYBOARD_SPACING
        );
        const targetWorldPosAbove = new THREE.Vector3(
            this.strikeTarget.x * KEYBOARD_SPACING,
            CLAW_ABOVE_HEIGHT,
            this.strikeTarget.y * KEYBOARD_SPACING
        );

        const shoulderWorldPos = new THREE.Vector3();
        bones.root.getWorldPosition(shoulderWorldPos);

        const dirWorld = new THREE.Vector3().subVectors(targetWorldPos, shoulderWorldPos);

        const initialLocalLength = transforms.joint0Pos.y + transforms.joint1Pos.y + transforms.tipPos.y;
        const worldScale = new THREE.Vector3();
        bones.root.getWorldScale(worldScale);
        const legWorldScale = Math.abs(worldScale.y);
        const initialWorldLength = initialLocalLength * legWorldScale;

        const targetStretch = Math.max(1.0, dirWorld.length() / initialWorldLength);

        const { targetIK, stretch, isFinished } = this.calculateClawTargetAndStretch(
            elapsed,
            initialTipWorldPos,
            targetWorldPos,
            targetWorldPosAbove,
            targetStretch
        );

        if (isFinished) {
            this.isAttacking = false;
            this.resetAllBones();
            return;
        }

        this.applyClawTranslations(bones, transforms, stretch);
        bones.root.updateMatrixWorld(true);

        this.solveIK(bones, targetIK, 8);

        this.applyClawTipCounterRotation(bones, transforms);
    }

    /**
     * Calculates the claw target and stretch.
     * @param {any} elapsed - The elapsed.
     * @param {any} initialTipWorldPos - The initialTipWorldPos.
     * @param {any} targetWorldPos - The targetWorldPos.
     * @param {any} targetWorldPosAbove - The targetWorldPosAbove.
     * @param {any} targetStretch - The targetStretch.
     */
    calculateClawTargetAndStretch(elapsed, initialTipWorldPos, targetWorldPos, targetWorldPosAbove, targetStretch) {
        const warning = this.currentWarningDuration || 0.5;
        const impactTime = Math.max(0.2, warning - 0.05);
        
        const raiseDuration = Math.min(0.3, impactTime * 0.75);
        const slamDuration = Math.min(0.1, impactTime * 0.25);
        const stillDuration = impactTime - raiseDuration - slamDuration;
        
        if (elapsed < stillDuration) {
            return { targetIK: initialTipWorldPos.clone(), stretch: 1.0, isFinished: false };
        }
        if (elapsed < stillDuration + raiseDuration) {
            const progress = (elapsed - stillDuration) / raiseDuration;
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            const targetIK = new THREE.Vector3().lerpVectors(initialTipWorldPos, targetWorldPosAbove, easeOutProgress);
            return { targetIK, stretch: 1.0, isFinished: false };
        }
        if (elapsed < impactTime) {
            const progress = (elapsed - stillDuration - raiseDuration) / slamDuration;
            const easeInProgress = progress * progress * progress;
            const targetIK = new THREE.Vector3().lerpVectors(targetWorldPosAbove, targetWorldPos, easeInProgress);
            const stretch = THREE.MathUtils.lerp(1.0, targetStretch, easeInProgress);
            return { targetIK, stretch, isFinished: false };
        }
        if (elapsed < warning + 0.25) {
            if (window.startShake && elapsed >= impactTime && elapsed < impactTime + 0.04) {
                window.startShake(4.5);
            }
            return { targetIK: targetWorldPos.clone(), stretch: targetStretch, isFinished: false };
        }
        if (elapsed < warning + 0.75) {
            const progress = (elapsed - (warning + 0.25)) / 0.5;
            const easeInOutProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            const targetIK = new THREE.Vector3().lerpVectors(targetWorldPos, initialTipWorldPos, easeInOutProgress);
            const stretch = THREE.MathUtils.lerp(targetStretch, 1.0, easeInOutProgress);
            return { targetIK, stretch, isFinished: false };
        }
        return { targetIK: null, stretch: 1.0, isFinished: true };
    }

    /**
     * Updates the attack timers.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} playerPos - The playerPos.
     * @param {any} projectiles - The projectiles.
     * @param {any} bonks - The bonks.
     */
    updateAttackTimers(deltaTime, playerPos, projectiles, bonks) {
        this.stateTimer += deltaTime;
        this.clawTimer += deltaTime;

        const isEnraged = this.hp < this.hpMax / 2;
        const currentAttackInterval = isEnraged ? this.attackInterval * 0.85 : this.attackInterval;
        const currentClawCooldown = isEnraged ? this.clawCooldown * 0.85 : this.clawCooldown;

        if (isEnraged && this.bugModel) {
            this.bugModel.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) {
                    child.material.color.lerp(new THREE.Color(0xff3300), 0.05);
                    child.material.emissive = new THREE.Color(0xaa1100);
                    child.material.emissiveIntensity = 0.4;
                }
            });
        }

        if (this.stateTimer >= currentAttackInterval) {
            this.stateTimer = 0;
            this.attackFireball(playerPos, projectiles);
        }

        if (this.clawTimer >= currentClawCooldown) {
            this.clawTimer = 0;
            this.attackClaw(playerPos, bonks);
        }
    }

    /**
     * Attacks the fireball.
     * @param {any} playerPos - The playerPos.
     * @param {any} projectiles - The projectiles.
     */
    attackFireball(playerPos, projectiles) {
        const isEnraged = this.hp < this.hpMax / 2;
        const fireballCount = isEnraged ? 5 : 4;
        const dx = playerPos.x - this.rawPosition.x;
        const dy = playerPos.y - this.rawPosition.y;
        const angleToPlayer = Math.atan2(dx, dy);

        const spread = isEnraged ? Math.PI / 1.5 : Math.PI / 2;
        const step = spread / (fireballCount - 1);
        const startAngle = angleToPlayer - spread / 2;

        for (let i = 0; i < fireballCount; i++) {
            const finalAngle = startAngle + step * i;
            const speed = isEnraged ? 0.10 : 0.09;
            const velocity = {
                x: Math.sin(finalAngle) * speed,
                y: Math.cos(finalAngle) * speed,
            };

            projectiles.push(
                ProjectilePool.get(
                    { x: this.rawPosition.x, y: this.rawPosition.y },
                    { width: 0.5, height: 0.5 },
                    isEnraged ? 20 : 15,
                    velocity,
                    this.scene,
                    "boss",
                    KEYBOARD_SPACING,
                    this.fireballModel
                )
            );
        }

        if (this.bones && this.bones["head"]) {
            this.bones["head"].rotation.x = this.initialBoneRotations["head"].x - 0.5;
            setTimeout(() => {
                if (this.bones && this.bones["head"]) {
                    this.bones["head"].rotation.x = this.initialBoneRotations["head"].x;
                }
            }, 200);
        }
    }

    /**
     * Attacks the claw.
     * @param {any} playerPos - The playerPos.
     * @param {any} bonks - The bonks.
     */
    attackClaw(playerPos, bonks) {
        console.log("Claw target coordinates:", playerPos.x, playerPos.y);
        
        const isEnraged = this.hp < this.hpMax / 2;
        const baseWarning = Math.max(0.4, 0.9 - (this.level - 1) * 0.05);
        const warningDuration = isEnraged ? baseWarning * 0.9 : baseWarning;
        
        this.currentWarningDuration = warningDuration;
        this.attackStartTime = this.totalTime;
        this.isAttacking = true;

        const bossCenter = this.rawPosition.x;
        const playerIsLeft = playerPos.x < bossCenter;
        
        this.clawSide = playerIsLeft ? "right" : "left";
        this.strikeTarget = { x: playerPos.x, y: playerPos.y };

        bonks.push(
            new Bonk(
                { x: playerPos.x, y: playerPos.y },
                { width: 3, height: 3 },
                30,
                this.scene,
                KEYBOARD_SPACING,
                warningDuration * 1000
            )
        );
    }

    /**
     * Checks the collision.
     * @param {any} other - The other.
     */
    checkCollision(other) {
        return (
            this.rawPosition.x < other.position.x + other.size.width &&
            this.rawPosition.x + this.size.width > other.position.x &&
            this.rawPosition.y < other.position.y + other.size.height &&
            this.rawPosition.y + this.size.height > other.position.y
        );
    }

    /**
     * Handles the death logic of the entity.
     */
    die() {
        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");
    }

    /**
     * Takes the damage.
     * @param {any} nb - The nb.
     */
    takeDamage(nb) {
        if (this.isDying || this.hp < 0) return;
        this.hp -= nb;

        if (this.mesh && this.mesh.position) {
            window.dispatchEvent(
                new CustomEvent("spawn_floating_text", {
                    detail: {
                        position: this.mesh.position,
                        text: `-${Math.round(nb)}`,
                        type: "damage",
                    },
                })
            );
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDying = true;
            this.deathProgress = 0;
            const bossUI = document.getElementById("boss-ui");
            if (bossUI) bossUI.classList.add("hidden");
        } else {
            const index = Math.floor(Math.random() * 3) + 1;
            AudioManager.playSFX(`/asset/game_assets/sounds/damage_${index}.wav`, "enemy", 0.6);
        }
        this.updateHpBar();
    }

}
