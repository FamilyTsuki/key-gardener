import Actor from "../Actor.js";
import * as THREE from "three";
import { AudioManager } from "../../managers/AudioManager.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";

export default class EarthBoss extends Actor {
    constructor(name, hp, rawPosition, position, size, scene, fireballModel, bossModel) {
        super(name, hp, hp, rawPosition, position, size);
        
        this.scene = scene;
        this.fireballModel = fireballModel;
        this.totalTime = 0;
        this.stateTimer = 0;
        this.attackPhase = "idle";
        this.targetX = 0;

        this.isEmerging = true;
        this.emergeProgress = 0;
        this.isDying = false;
        this.deathProgress = 0;

        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        this.disposables = [];
        this.hasTaughtLaser = false;

        this._buildBody(bossModel);
        this.updateHpBar();
    }

    /**
     * _builds the body.
     * @param {any} bossModel - The bossModel.
     */
    _buildBody(bossModel) {
        if (bossModel) {
            this.bossMesh = bossModel.scene.clone();
            this.bossMesh.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    if (child.isSkinnedMesh) {
                        child.frustumCulled = false;
                    }
                }
            });
            this.mesh.add(this.bossMesh);

            this.bossMesh.updateMatrixWorld(true);
            const box = new THREE.Box3();
            let hasMesh = false;
            this.bossMesh.traverse((child) => {
                if (child.isMesh && child.visible) {
                    if (!hasMesh) {
                        box.setFromObject(child);
                        hasMesh = true;
                    } else {
                        const childBox = new THREE.Box3().setFromObject(child);
                        box.union(childBox);
                    }
                }
            });
            if (!hasMesh) {
                box.setFromObject(this.bossMesh);
            }

            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetScale = 18.0 / (maxDim || 1);
            this.bossMesh.scale.set(targetScale, targetScale, targetScale);

            const center = box.getCenter(new THREE.Vector3());
            this.bossMesh.position.set(-center.x * targetScale, -center.y * targetScale + 4.0, -center.z * targetScale);
        }

        this.mesh.position.set(this.position.x * 3.2, -15, this.position.y * 3.2);

        const bossUI = document.getElementById("boss-ui");
        const bossName = document.getElementById("boss-name-display");
        if (bossName) bossName.innerText = "EARTH CORE";
        if (bossUI) {
            setTimeout(() => {
                bossUI.classList.remove("hidden");
            }, 1000);
        }
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
     * Updates the Earth Boss state and animations.
     * @param {any} deltaTimeMs - The deltaTimeMs.
     * @param {any} playerPos - The playerPos.
     * @param {any} projectiles - The projectiles.
     * @param {any} bonks - The bonks.
     * @param {any} player - The player.
     */
    update(deltaTimeMs, playerPos, projectiles, bonks, player) {
        if (this.hp < 0) return;

        const dt = deltaTimeMs / 1000;
        this.totalTime += dt;

        if (this.isDying) {
            this._updateDeathAnimation(dt);
            return;
        }

        if (this.isEmerging) {
            this._updateEmergeAnimation(dt);
            return;
        }

        this._animateBody(dt);
        this._updateAttackPhases(dt, player);
    }

    /**
     * _updates the emerge animation.
     * @param {any} dt - The dt.
     */
    _updateEmergeAnimation(dt) {
        this.emergeProgress += dt * 0.5;
        if (this.emergeProgress >= 1) {
            this.emergeProgress = 1;
            this.isEmerging = false;
            this.mesh.position.y = 1.0;
            if (window.startShake) window.startShake(2.0);
            AudioManager.playSFX("/asset/game_assets/sounds/impact.wav", "enemy", 1.0);
        } else {
            this.mesh.position.y = -15 + this.emergeProgress * 16.0;
        }
        this.mesh.updateMatrixWorld(true);
    }

    /**
     * _updates the death animation.
     * @param {any} dt - The dt.
     */
    _updateDeathAnimation(dt) {
        this.deathProgress += dt;
        if (this.deathProgress >= 1.5) {
            this.hp = -1;
            this.isDying = false;
            this.die();
        } else {
            const factor = 1.0 - (this.deathProgress / 1.5);
            this.mesh.scale.set(factor, factor, factor);
            this.mesh.rotation.y += dt * 5.0;
            this.mesh.position.y -= dt * 4.0;
        }
        this.mesh.updateMatrixWorld(true);
    }

    /**
     * _animates the body.
     * @param {any} dt - The dt.
     */
    _animateBody(dt) {
        this.mesh.updateMatrixWorld(true);
    }

    /**
     * _updates the attack phases.
     * @param {any} dt - The dt.
     * @param {any} player - The player.
     */
    _updateAttackPhases(dt, player) {
        this.stateTimer += dt;

        if (this.attackPhase === "idle") {
            if (this.stateTimer >= 3.0) {
                if (!this.hasTaughtLaser) {
                    this.hasTaughtLaser = true;
                    window.dispatchEvent(new CustomEvent("pause_game_for_dialogue"));
                    import("../../ui/DialogueBox.js").then((module) => {
                        const dBox = new module.DialogueBox();
                        dBox.show(
                            [
                                "boss.earth.sempai_warn_1",
                                "boss.earth.sempai_warn_2",
                                "boss.earth.sempai_warn_3",
                                "boss.earth.sempai_warn_4"
                            ],
                            "/asset/game_assets/models/sempai.glb",
                            () => {
                                dBox.destroy();
                                
                                const hasShield = player && player.spells && player.spells.getWordSpells().includes("shield");
                                
                                const startAttack = () => {
                                    window.dispatchEvent(new CustomEvent("resume_game_after_dialogue"));
                                    this.attackPhase = "charging";
                                    this.stateTimer = 0;
                                    this.targetX = 5;
                                    this._createGuideMesh();
                                    this._createChargeSphere();
                                    AudioManager.playSFX("/asset/game_assets/sounds/warn.wav", "enemy", 0.8);
                                };

                                if (!hasShield) {
                                    import("../../ui/SpellUnlockedPopup.js").then((popupModule) => {
                                        popupModule.SpellUnlockedPopup.show("shield", () => {
                                            window.dispatchEvent(new CustomEvent("earth_boss_unlock_shield"));
                                            startAttack();
                                        });
                                    });
                                } else {
                                    startAttack();
                                }
                            },
                            true
                        );
                    });
                } else {
                    this.attackPhase = "charging";
                    this.stateTimer = 0;
                    this.targetX = 5;
                    this._createGuideMesh();
                    this._createChargeSphere();
                    AudioManager.playSFX("/asset/game_assets/sounds/warn.wav", "enemy", 0.8);
                }
            }
        } else if (this.attackPhase === "charging") {
            if (this.guideMesh) {
                this.guideMesh.position.x = 16.0;
            }
            
            if (this.chargeGroup) {
                const progress = Math.min(1.0, this.stateTimer / 4.0);
                const scale = progress * 4.5;
                this.chargeGroup.scale.set(scale, scale, scale);
                if (this.chargeSphereOut) {
                    this.chargeSphereOut.rotation.y += dt * 5.0;
                    this.chargeSphereOut.rotation.x += dt * 2.0;
                }
            }
            
            if (this.stateTimer >= 4.0) {
                this.attackPhase = "firing";
                this.stateTimer = 0;
                this._removeGuideMesh();
                this._createLaserMesh();
                AudioManager.playSFX("/asset/game_assets/sounds/fire.wav", "enemy", 1.0);
            }
        } else if (this.attackPhase === "firing") {
            if (window.startShake) {
                window.startShake(2.5);
            }
            
            if (this.laserMesh && this.coreMesh) {
                const pulse = 1.0 + Math.sin(this.totalTime * 30.0) * 0.1;
                let zEnd = 60.0;

                const rescueShield = this.scene.getObjectByName("rescueShield");
                if (rescueShield) {
                    const shieldZ = rescueShield.position.z;
                    const shieldRadius = 3.2 * rescueShield.scale.x;
                    zEnd = Math.min(zEnd, shieldZ - shieldRadius);
                }

                if (player && player.shieldGroup && player.shieldEnergy > 0 && player.mesh) {
                    const shieldZ = player.mesh.position.z;
                    const scale = 1.0 + (player.shieldEnergy / 100.0) * 1.5;
                    const shieldRadius = 1.6 * scale;
                    zEnd = Math.min(zEnd, shieldZ - shieldRadius);
                }

                const zStart = this.mesh.position.z;
                const L = zEnd - zStart;
                if (L > 0) {
                    this.laserMesh.visible = true;
                    this.coreMesh.visible = true;

                    const scaleZ = L / 120.0;
                    const zCenter = zStart + L / 2.0;

                    this.laserMesh.scale.set(pulse, pulse, scaleZ);
                    this.coreMesh.scale.set(pulse, pulse, scaleZ);

                    this.laserMesh.position.z = zCenter;
                    this.coreMesh.position.z = zCenter;
                } else {
                    this.laserMesh.visible = false;
                    this.coreMesh.visible = false;
                }

                this.laserMesh.position.x = 16.0;
                this.coreMesh.position.x = 16.0;
            }

            if (this.chargeGroup) {
                const progress = 1.0 - (this.stateTimer / 4.5);
                const scale = Math.max(1.0, progress * 4.5);
                this.chargeGroup.scale.set(scale, scale, scale);
                if (this.chargeSphereOut) {
                    this.chargeSphereOut.rotation.y += dt * 10.0;
                }
            }

            this._applyLaserDamage(dt, player);

            if (this.stateTimer >= 4.5) {
                this.attackPhase = "recovery";
                this.stateTimer = 0;
                this._removeLaserMesh();
                this._removeChargeSphere();
            }
        } else if (this.attackPhase === "recovery") {
            if (this.stateTimer >= 2.5) {
                this.attackPhase = "idle";
                this.stateTimer = 0;
            }
        }
    }

    /**
     * _creates the guide mesh.
     */
    _createGuideMesh() {
        const geo = new THREE.CylinderGeometry(1.5, 1.5, 120, 8);
        geo.rotateX(Math.PI / 2);
        
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.5
        });
        
        this.guideMesh = new THREE.Mesh(geo, mat);
        this.guideMesh.position.set(16.0, 0.5, 0);
        this.scene.add(this.guideMesh);
        
        this.disposables.push(geo, mat);
    }

    /**
     * _removes the guide mesh.
     */
    _removeGuideMesh() {
        if (this.guideMesh) {
            this.scene.remove(this.guideMesh);
            if (this.guideMesh.geometry) this.guideMesh.geometry.dispose();
            if (this.guideMesh.material) this.guideMesh.material.dispose();
            this.guideMesh = null;
        }
    }

    /**
     * _creates the laser mesh.
     */
    _createLaserMesh() {
        const geoLaser = new THREE.CylinderGeometry(24.0, 24.0, 120, 32);
        geoLaser.rotateX(Math.PI / 2);
        
        const matLaser = new THREE.MeshBasicMaterial({
            color: 0x00ffbb,
            transparent: true,
            opacity: 0.65,
            depthWrite: false
        });

        this.laserMesh = new THREE.Mesh(geoLaser, matLaser);
        this.laserMesh.position.set(16.0, 0.5, 0);
        this.scene.add(this.laserMesh);

        const geoCore = new THREE.CylinderGeometry(8.0, 8.0, 120, 32);
        geoCore.rotateX(Math.PI / 2);

        const matCore = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });

        this.coreMesh = new THREE.Mesh(geoCore, matCore);
        this.coreMesh.position.set(16.0, 0.5, 0);
        this.scene.add(this.coreMesh);

        this.disposables.push(geoLaser, matLaser, geoCore, matCore);
    }

    /**
     * _removes the laser mesh.
     */
    _removeLaserMesh() {
        if (this.laserMesh) {
            this.scene.remove(this.laserMesh);
            if (this.laserMesh.geometry) this.laserMesh.geometry.dispose();
            if (this.laserMesh.material) this.laserMesh.material.dispose();
            this.laserMesh = null;
        }
        if (this.coreMesh) {
            this.scene.remove(this.coreMesh);
            if (this.coreMesh.geometry) this.coreMesh.geometry.dispose();
            if (this.coreMesh.material) this.coreMesh.material.dispose();
            this.coreMesh = null;
        }
    }

    /**
     * _applies the laser damage.
     * @param {any} dt - The dt.
     * @param {any} player - The player.
     */
    _applyLaserDamage(dt, player) {
        if (!player || !player.isAlive()) return;

        if (player.shieldEnergy > 0) {
            player.shieldEnergy -= dt * 50.0;
            if (Math.random() < 0.2) {
                AudioManager.playSFX("/asset/game_assets/sounds/impact.wav", "player", 0.4);
            }
        } else {
            player.damage(dt * 60.0, LanguageManager.t("death.laser"));
        }
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
                        position: this.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)),
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
            this._removeGuideMesh();
            this._removeLaserMesh();
            const bossUI = document.getElementById("boss-ui");
            if (bossUI) bossUI.classList.add("hidden");
        } else {
            const index = Math.floor(Math.random() * 3) + 1;
            AudioManager.playSFX(`/asset/game_assets/sounds/damage_${index}.wav`, "enemy", 0.6);
        }
        this.updateHpBar();
    }

    /**
     * Handles the death logic of the entity.
     */
    die() {
        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");
        
        this._removeChargeSphere();
        
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }

        this.disposables.forEach(d => {
            if (d && typeof d.dispose === "function") d.dispose();
        });
        this.disposables = [];
    }

    /**
     * _creates the charge sphere.
     */
    _createChargeSphere() {
        this.chargeGroup = new THREE.Group();
        this.chargeGroup.position.set(0, 2.0, 3.0);
        this.mesh.add(this.chargeGroup);

        const geoOut = new THREE.SphereGeometry(1.0, 16, 16);
        const matOut = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            wireframe: true
        });
        this.chargeSphereOut = new THREE.Mesh(geoOut, matOut);
        this.chargeGroup.add(this.chargeSphereOut);

        const geoIn = new THREE.SphereGeometry(0.5, 16, 16);
        const matIn = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        this.chargeSphereIn = new THREE.Mesh(geoIn, matIn);
        this.chargeGroup.add(this.chargeSphereIn);

        this.disposables.push(geoOut, matOut, geoIn, matIn);
    }

    /**
     * _removes the charge sphere.
     */
    _removeChargeSphere() {
        if (this.chargeGroup) {
            this.mesh.remove(this.chargeGroup);
            if (this.chargeSphereOut) {
                this.chargeSphereOut.geometry.dispose();
                this.chargeSphereOut.material.dispose();
            }
            if (this.chargeSphereIn) {
                this.chargeSphereIn.geometry.dispose();
                this.chargeSphereIn.material.dispose();
            }
            this.chargeGroup = null;
            this.chargeSphereOut = null;
            this.chargeSphereIn = null;
        }
    }
}
