import Actor from "../Actor.js";
import ProjectilePool from "../ProjectilePool.js";
import Bonk from "../Bonk.js";
import * as THREE from "three";
import ModelLoader from "../../../core/utils/ModelLoader.js";

const KEYBOARD_SPACING = 3.2;
const EMERGE_Y_OFFSET = -10;
const CLAW_ABOVE_HEIGHT = 3.5;

export default class BugBoss extends Actor {
    constructor(name, hp, rawPosition, position, size, scene, fireballModel) {
        super(name, hp, hp, rawPosition, position, size);
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
        this.bugModel.position.y = -0.5;
        this.mesh.add(this.bugModel);
    }

    get isDead() {
        return this.hp < 0;
    }

    updateHpBar() {
        const ratio = Math.max(0, (this.hp / this.hpMax) * 100);
        const fill = document.getElementById("boss-hp-fill");
        const currentTxt = document.getElementById("boss-hp-current");
        const maxTxt = document.getElementById("boss-hp-max");

        if (fill) fill.style.width = ratio + "%";
        if (currentTxt) currentTxt.innerText = Math.ceil(this.hp);
        if (maxTxt) maxTxt.innerText = this.hpMax;
    }

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

    updateDeathAnimation(deltaTime) {
        this.deathProgress += deltaTime / 1500;
        if (this.deathProgress >= 1) {
            this.deathProgress = 1;
            this.hp = -1;
            this.isDying = false;
            this.die();
        } else {
            const t = this.deathProgress;
            this.mesh.position.y = EMERGE_Y_OFFSET * t;
            this.mesh.rotation.y += deltaTime * 0.005;
            const scaleFactor = 1 - t;
            const baseScale = this.size.width * 5;
            this.mesh.scale.set(
                baseScale * scaleFactor,
                baseScale * scaleFactor,
                baseScale * scaleFactor
            );
        }
        if (this.mesh) {
            this.mesh.updateMatrixWorld(true);
        }
    }

    updateEmergeAnimation(deltaTime) {
        this.emergeProgress += deltaTime * 0.0005;

        if (this.emergeProgress < 1) {
            const t = this.emergeProgress;
            const smoothProgress = t * t * (3 - 2 * t);
            this.mesh.position.y = EMERGE_Y_OFFSET * (1 - smoothProgress);

            const baseScale = this.size.width * 5;
            const s = baseScale * smoothProgress;
            this.mesh.scale.set(s, s, s);

            if (window.startShake) window.startShake(0.3);
            this.mesh.updateMatrixWorld(true);
            return true;
        }

        this.isEmerging = false;
        this.mesh.position.y = 0;
        const baseScale = this.size.width * 5;
        this.mesh.scale.set(baseScale, baseScale, baseScale);
        return false;
    }

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

    getClawBones(side) {
        const prefix = side === "left" ? "" : "R_";
        return {
            root: this.bones && this.bones[`${prefix}frontleg`],
            joint0: this.bones && this.bones[`${prefix}frontleg0`],
            joint1: this.bones && this.bones[`${prefix}frontleg1`],
            tip: this.bones && this.bones[`${prefix}frontleg2`]
        };
    }

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

    applyClawTipCounterRotation(bones, transforms) {
        if (!bones.tip || !transforms.tipInParentInitial) {
            return;
        }
        const combined = bones.root.quaternion.clone()
            .multiply(bones.joint0.quaternion)
            .multiply(bones.joint1.quaternion);

        bones.tip.quaternion.copy(combined.invert()).multiply(transforms.tipInParentInitial);
    }

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

    calculateClawTargetAndStretch(elapsed, initialTipWorldPos, targetWorldPos, targetWorldPosAbove, targetStretch) {
        if (elapsed < 0.4) {
            const progress = elapsed / 0.4;
            const targetIK = new THREE.Vector3().lerpVectors(initialTipWorldPos, targetWorldPosAbove, progress);
            return { targetIK, stretch: 1.0, isFinished: false };
        }
        if (elapsed < 0.55) {
            const progress = (elapsed - 0.4) / 0.15;
            const targetIK = new THREE.Vector3().lerpVectors(targetWorldPosAbove, targetWorldPos, progress);
            const stretch = THREE.MathUtils.lerp(1.0, targetStretch, progress);
            return { targetIK, stretch, isFinished: false };
        }
        if (elapsed < 0.7) {
            if (window.startShake && elapsed >= 0.55 && elapsed < 0.58) {
                window.startShake(2.0);
            }
            return { targetIK: targetWorldPos.clone(), stretch: targetStretch, isFinished: false };
        }
        if (elapsed < 1.2) {
            const progress = (elapsed - 0.7) / 0.5;
            const targetIK = new THREE.Vector3().lerpVectors(targetWorldPos, initialTipWorldPos, progress);
            const stretch = THREE.MathUtils.lerp(targetStretch, 1.0, progress);
            return { targetIK, stretch, isFinished: false };
        }
        return { targetIK: null, stretch: 1.0, isFinished: true };
    }

    updateAttackTimers(deltaTime, playerPos, projectiles, bonks) {
        this.stateTimer += deltaTime;
        this.clawTimer += deltaTime;

        const isEnraged = this.hp < this.hpMax / 2;
        const currentAttackInterval = isEnraged ? this.attackInterval * 0.7 : this.attackInterval;
        const currentClawCooldown = isEnraged ? this.clawCooldown * 0.7 : this.clawCooldown;

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

    attackFireball(playerPos, projectiles) {
        const isEnraged = this.hp < this.hpMax / 2;
        const fireballCount = isEnraged ? 7 : 4;
        const dx = playerPos.x - this.rawPosition.x;
        const dy = playerPos.y - this.rawPosition.y;
        const angleToPlayer = Math.atan2(dx, dy);

        const spread = isEnraged ? Math.PI / 1.5 : Math.PI / 2;
        const step = spread / (fireballCount - 1);
        const startAngle = angleToPlayer - spread / 2;

        for (let i = 0; i < fireballCount; i++) {
            const finalAngle = startAngle + step * i;
            const speed = isEnraged ? 0.12 : 0.09;
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

    attackClaw(playerPos, bonks) {
        console.log("Claw target coordinates:", playerPos.x, playerPos.y);
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
                KEYBOARD_SPACING
            )
        );
    }

    checkCollision(other) {
        return (
            this.rawPosition.x < other.position.x + other.size.width &&
            this.rawPosition.x + this.size.width > other.position.x &&
            this.rawPosition.y < other.position.y + other.size.height &&
            this.rawPosition.y + this.size.height > other.position.y
        );
    }

    die() {
        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");

        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.visible = false;
        }
    }

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
        }
        this.updateHpBar();
    }


}
