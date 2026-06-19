import Actor from "../Actor.js";
import ProjectilePool from "../ProjectilePool.js";
import Bonk from "../Bonk.js";
import * as THREE from "three";
import ModelLoader from "../../../core/utils/ModelLoader.js";

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
        this.mesh.position.y = -10;
        this.mesh.scale.set(0, 0, 0);

        this.loadModel();

        const bossUI = document.getElementById("boss-ui");
        if (bossUI) {
            setTimeout(() => {
                bossUI.classList.remove("hidden");
            }, 1500);
        }
        this.updateHpBar();
    }

    async loadModel() {
        const gltf = await ModelLoader.loadAsync("/asset/game_assets/models/bug.glb");
        this.bugModel = gltf.scene.clone();

        const bugColor = 0x8b0000;
        this.bugModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                child.material = new THREE.MeshLambertMaterial({ color: bugColor });
                child.material.needsUpdate = true;
                if (child.isSkinnedMesh) {
                    child.frustumCulled = false;
                }
            }
        });

        const scaleFactor = this.size.width * 5;
        this.bugModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.bugModel.rotation.y = Math.PI / 2;
        this.bugModel.position.y = 1.6;
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
            this.mesh.position.y = -10 * t;
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
            this.mesh.position.y = -10 * (1 - smoothProgress);

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
        const spacing = 3.2;
        this.totalTime += deltaTime * 0.001;

        if (!this.mesh) return;

        const xToReach = this.isAttacking ? this.targetX : this.position.x;
        this.mesh.position.x = THREE.MathUtils.lerp(
            this.mesh.position.x,
            xToReach * spacing,
            0.05
        );
        this.mesh.position.z = this.position.y * spacing;

        if (this.isAttacking) {
            this.updateClawAnimation();
        } else {
            const breathe = Math.sin(this.totalTime * 3) * 0.02;
            const baseScale = this.size.width * 5;
            this.mesh.scale.set(
                baseScale + breathe,
                baseScale + breathe * 2,
                baseScale + breathe
            );
        }

        this.mesh.updateMatrixWorld(true);
    }

    updateClawAnimation() {
        const elapsed = this.totalTime - this.attackStartTime;

        if (elapsed < 0.4) {
            const raiseProgress = elapsed / 0.4;
            this.mesh.position.y = raiseProgress * 3.0;
        } else if (elapsed < 0.55) {
            const slamProgress = (elapsed - 0.4) / 0.15;
            this.mesh.position.y = 3.0 * (1 - slamProgress);
        } else if (elapsed < 0.65) {
            this.mesh.position.y = 0;
            if (window.startShake) window.startShake(2.0);
        } else if (elapsed < 1.1) {
            this.mesh.position.y = 0;
        } else {
            this.isAttacking = false;
            this.mesh.position.y = 0;
        }
    }

    updateAttackTimers(deltaTime, playerPos, projectiles, bonks) {
        this.stateTimer += deltaTime;
        this.clawTimer += deltaTime;

        if (this.stateTimer >= this.attackInterval) {
            this.stateTimer = 0;
            this.attackFireball(playerPos, projectiles);
        }

        if (this.clawTimer >= this.clawCooldown) {
            this.clawTimer = 0;
            this.attackClaw(playerPos, bonks);
        }
    }

    attackFireball(playerPos, projectiles) {
        const fireballCount = 3;
        const dx = playerPos.x - this.rawPosition.x;
        const dy = playerPos.y - this.rawPosition.y;
        const angleToPlayer = Math.atan2(dx, dy);

        for (let i = 0; i < fireballCount; i++) {
            const spread = Math.PI / 3;
            const finalAngle = angleToPlayer + (Math.random() - 0.5) * spread;
            const speed = 0.08;
            const velocity = {
                x: Math.sin(finalAngle) * speed,
                y: Math.cos(finalAngle) * speed,
            };

            projectiles.push(
                ProjectilePool.get(
                    { x: this.rawPosition.x, y: this.rawPosition.y },
                    { width: 0.5, height: 0.5 },
                    15,
                    velocity,
                    this.scene,
                    "boss",
                    3.2,
                    this.fireballModel
                )
            );
        }
    }

    attackClaw(playerPos, bonks) {
        this.attackStartTime = this.totalTime;
        this.isAttacking = true;

        const bossCenter = this.rawPosition.x;
        const playerIsLeft = playerPos.x < bossCenter;

        const pawX = playerIsLeft ? bossCenter - 2.5 : bossCenter + 1.5;
        this.targetX = playerIsLeft ? bossCenter - 1 : bossCenter + 1;
        this.clawSide = playerIsLeft ? "left" : "right";

        bonks.push(
            new Bonk(
                { x: pawX, y: this.rawPosition.y + 1 },
                { width: 2, height: 3 },
                30,
                this.scene,
                3.2
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
