import { DialogueBox } from "../../ui/DialogueBox.js";
import * as THREE from "three";

export class SurviveState {
    constructor(phase) {
        this.phase = phase;
        
        this.duration = phase.options.duration !== undefined ? phase.options.duration : 60;
        this.survivalTime = 0;
        this.enemiesKilled = 0;
        
        this.storyEvents = (phase.options.storyEvents || []).map(evt => ({ ...evt, isTriggered: false }));
        
        this.isPhaseEnded = false;
        this.isTransitioningToNextLevel = false;
        this.isReady = false;
        this.bossDeathRecorded = false;
    }

    update(deltaTime, gameEngine) {
        if (this.isPhaseEnded || !this.isReady) return false;

        if (this.checkBossDeath(gameEngine)) return false;

        this.survivalTime += deltaTime;

        if (this.duration !== null && this.survivalTime >= this.duration) {
            if (!this.phase.enemies || !this.phase.enemies.boss) {
                this.isPhaseEnded = true;
                gameEngine.nextLevel();
                return false;
            }
        }

        this.processStoryEvents(gameEngine);
        return true;
    }

    checkBossDeath(gameEngine) {
        if (this.phase.enemies && this.phase.enemies.boss && this.phase.enemies.boss.isDead && !this.isTransitioningToNextLevel) {
            if (gameEngine.stats && !this.bossDeathRecorded) {
                gameEngine.stats.recordEnemyDefeated(true);
                this.bossDeathRecorded = true;
            }
            
            const bossUI = document.getElementById("boss-ui");
            if (bossUI) bossUI.classList.add("hidden");
            
            if (this.phase.enemies.boss.name === "EarthCore") {
                this.isTransitioningToNextLevel = true;
                this.triggerEarthBossCinematic(gameEngine);
            } else {
                this.triggerPhaseTransition(gameEngine);
            }
            return true;
        }
        return false;
    }

    processStoryEvents(gameEngine) {
        if (!this.storyEvents) return;

        const eventToTrigger = this.storyEvents.find(evt => {
            if (evt.isTriggered) return false;
            if (evt.triggerType === "time") return this.survivalTime >= evt.triggerValue;
            if (evt.triggerType === "enemiesKilled") return this.enemiesKilled >= evt.triggerValue;
            return false;
        });

        if (eventToTrigger) {
            eventToTrigger.isTriggered = true;
            
            if (eventToTrigger.dialogue && eventToTrigger.dialogue.length > 0 && !(eventToTrigger.dialogue.length === 1 && eventToTrigger.dialogue[0] === 'Hello!')) {
                gameEngine.isPaused = true;
                const dBox = new DialogueBox();
                dBox.show(eventToTrigger.dialogue, eventToTrigger.dialogueModel || "/asset/game_assets/models/player.glb", () => {
                    dBox.destroy();
                    gameEngine.isPaused = false;
                    this.executeEventAction(eventToTrigger);
                });
            } else {
                this.executeEventAction(eventToTrigger);
            }
        }
    }

    executeEventAction(eventToTrigger) {
        if (eventToTrigger.actionType === "heal" && this.phase.player) {
            this.phase.player.heal(eventToTrigger.healAmount || 50);
        } else if (eventToTrigger.actionType === "spawn") {
            const count = eventToTrigger.spawnCount !== undefined ? eventToTrigger.spawnCount : 1;
            const enemyType = eventToTrigger.enemyType || eventToTrigger.spawnEnemy || "basic";
            for (let i = 0; i < count; i++) {
                this.phase.spawner.spawnEnemy(enemyType, eventToTrigger);
            } 
        } else if (eventToTrigger.actionType === "spawnBoss" && this.phase.enemies) {
            if (eventToTrigger.bossType === "giant_bug") this.phase.enemies.spawnBugBoss(this.phase.renderer.worldGroup);
            else if (eventToTrigger.bossType === "earth_boss") this.phase.enemies.spawnEarthBoss(this.phase.renderer.worldGroup);
            else this.phase.enemies.spawnBoss(this.phase.renderer.worldGroup);
        } else if (eventToTrigger.actionType === "spawnerConfig") {
            this.applySpawnerConfig(eventToTrigger);
        } else if (eventToTrigger.actionType === "expandMap") {
            this.phase.options.paddingSides = eventToTrigger.padSides !== undefined ? eventToTrigger.padSides : 3;
            this.phase.options.paddingTopBottom = eventToTrigger.padTB !== undefined ? eventToTrigger.padTB : 5;
            this.phase.updateLayout(this.phase.options.paddingSides, this.phase.options.paddingTopBottom);
        }
    }

    applySpawnerConfig(event) {
        const spawner = this.phase.spawner;
        spawner.interval = event.spawnInterval !== undefined ? event.spawnInterval : 3;
        spawner.maxEnemies = event.maxEnemies !== undefined ? event.maxEnemies : 20;
        spawner.active = true;
        spawner.time = 0;
        spawner.enemiesSpawned = 0;
        spawner.kills = 0;
        spawner.endCondition = event.spawnerEndCondition || "none";
        spawner.duration = event.spawnerDuration || null;
        spawner.spawnLimit = event.spawnerSpawnLimit || null;
        spawner.killTarget = event.spawnerKillTarget || null;

        if (event.minSpawnDistance !== undefined) this.phase.options.minSpawnDistance = event.minSpawnDistance;
        if (event.maxSpawnDistance !== undefined) this.phase.options.maxSpawnDistance = event.maxSpawnDistance;
        if (event.enemyWeights !== undefined) this.phase.options.enemyWeights = event.enemyWeights;
    }

    triggerPhaseTransition(gameEngine) {
        this.isTransitioningToNextLevel = true;

        const overlay = document.createElement("div");
        overlay.classList.add("phase-transition-overlay");
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add("active");
            setTimeout(async () => {
                this.isPhaseEnded = true;
                await gameEngine.nextLevel();
                overlay.classList.remove("active");
                setTimeout(() => overlay.remove(), 1000);
            }, 1000);
        }, 2000);
    }

    triggerEarthBossCinematic(gameEngine) {
        gameEngine.isPaused = true;
        if (this.phase.player && this.phase.player.state) {
            this.phase.player.state.isInvulnerable = true;
        }

        if (this.phase.enemies) {
            for (const enemy of this.phase.enemies.container) {
                if (enemy !== this.phase.enemies.boss) {
                    enemy.hp = -1;
                    enemy.die();
                }
            }
        }

        if (this.phase.sempaiModel) {
            const sempai = this.phase.sempaiModel.clone();
            sempai.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                }
            });
            const pPos = this.phase.player.mesh.position;
            sempai.position.set(pPos.x, pPos.y, pPos.z + 4.5);
            sempai.rotation.y = 0;

            const box = new THREE.Box3().setFromObject(sempai);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / (maxDim || 1);
            sempai.scale.set(scale, scale, scale);

            this.phase.renderer.worldGroup.add(sempai);
            this.phase.sempaiCinematicMesh = sempai;
        }

        const dBox = new DialogueBox();
        dBox.show(
            [
                "boss.earth.sempai_victory_1",
                "boss.earth.sempai_victory_2",
                "boss.earth.sempai_victory_3"
            ],
            "/asset/game_assets/models/sempai.glb",
            () => {
                dBox.destroy();
                if (this.phase.sempaiCinematicMesh && this.phase.sempaiCinematicMesh.parent) {
                    this.phase.sempaiCinematicMesh.parent.remove(this.phase.sempaiCinematicMesh);
                    this.phase.sempaiCinematicMesh = null;
                }
                gameEngine.isPaused = false;
                this.triggerPhaseTransition(gameEngine);
            }
        );
    }

    triggerSempaiRescueCinematic() {
        const gameEngine = this.phase.gameEngine;
        gameEngine.isPaused = true;
        if (this.phase.player && this.phase.player.state) {
            this.phase.player.state.isInvulnerable = true;
        }

        if (this.phase.enemies) {
            for (const enemy of this.phase.enemies.container) {
                if (enemy !== this.phase.enemies.boss) {
                    enemy.hp = -1;
                    enemy.die();
                }
            }
        }

        const pPos = this.phase.player.mesh.position.clone();
        
        let sempai = null;
        if (this.phase.sempaiModel) {
            sempai = this.phase.sempaiModel.clone();
            sempai.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                }
            });
            
            const box = new THREE.Box3().setFromObject(sempai);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / (maxDim || 1);
            sempai.scale.set(scale, scale, scale);

            sempai.position.set(pPos.x, pPos.y + 10.0, pPos.z - 8.0);
            sempai.rotation.y = Math.PI;

            this.phase.renderer.worldGroup.add(sempai);
            this.phase.sempaiCinematicMesh = sempai;
        }

        const jumpDuration = 500;
        const jumpStartTime = performance.now();
        const startX = pPos.x;
        const startY = pPos.y + 10.0;
        const startZ = pPos.z - 8.0;
        const endX = pPos.x;
        const endY = pPos.y;
        const endZ = pPos.z - 3.5;

        const animateSempaiJump = () => {
            const elapsed = performance.now() - jumpStartTime;
            const progress = Math.min(1.0, elapsed / jumpDuration);

            const currentX = THREE.MathUtils.lerp(startX, endX, progress);
            const currentZ = THREE.MathUtils.lerp(startZ, endZ, progress);
            const currentY = endY + (startY - endY) * (1.0 - progress * progress);

            if (sempai) {
                sempai.position.set(currentX, currentY, currentZ);
            }

            if (progress < 1.0) {
                requestAnimationFrame(animateSempaiJump);
            } else {
                if (sempai) {
                    sempai.position.set(endX, endY, endZ);
                }
                const AudioManager = window.AudioManager || { playSFX: () => {} };
                import("../../managers/AudioManager.js").then((module) => {
                    const manager = module.AudioManager || AudioManager;
                    manager.playSFX("/asset/game_assets/sounds/impact.wav", "player", 1.0);
                });
                
                if (window.startShake) {
                    window.startShake(3.5);
                }

                const sempaiPos = new THREE.Vector3(endX, endY, endZ);
                this.spawnRescueShield(sempaiPos, gameEngine);
            }
        };

        animateSempaiJump();
    }

    spawnRescueShield(position, gameEngine) {
        const rescueGeo = new THREE.SphereGeometry(3.2, 32, 32);
        const rescueMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            wireframe: true
        });
        const rescueShield = new THREE.Mesh(rescueGeo, rescueMat);
        rescueShield.position.copy(position);
        rescueShield.position.y += 1.25;
        this.phase.renderer.worldGroup.add(rescueShield);

        setTimeout(() => {
            const startTime = performance.now();
            const duration = 600;

            const animateRescueShield = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(1.0, elapsed / duration);

                const scale = 1.0 + progress * 25.0;
                rescueShield.scale.set(scale, scale, scale);
                rescueMat.opacity = 0.8 * (1.0 - progress);

                if (progress < 1.0) {
                    requestAnimationFrame(animateRescueShield);
                } else {
                    this.triggerRescuePhaseTransition(gameEngine, rescueShield, rescueMat);
                }
            };

            animateRescueShield();
        }, 1000);
    }

    triggerRescuePhaseTransition(gameEngine, shield, material) {
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "#ffffff";
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 1.5s ease-in-out";
        overlay.style.zIndex = "99999";
        document.body.appendChild(overlay);

        overlay.offsetWidth;
        overlay.style.opacity = "1";

        setTimeout(() => {
            if (shield && shield.parent) {
                shield.parent.remove(shield);
            }
            if (shield) {
                shield.geometry.dispose();
                material.dispose();
            }

            if (this.phase.sempaiCinematicMesh && this.phase.sempaiCinematicMesh.parent) {
                this.phase.sempaiCinematicMesh.parent.remove(this.phase.sempaiCinematicMesh);
                this.phase.sempaiCinematicMesh = null;
            }

            setTimeout(async () => {
                this.isPhaseEnded = true;
                gameEngine.isPaused = false;
                await gameEngine.nextLevel();

                overlay.style.transition = "opacity 1.0s ease-in-out";
                overlay.style.opacity = "0";
                setTimeout(() => overlay.remove(), 1000);
            }, 1000);
        }, 1500);
    }
}
