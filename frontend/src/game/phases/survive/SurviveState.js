import { DialogueBox } from "../../ui/DialogueBox.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { SpellUnlockedPopup } from "../../ui/SpellUnlockedPopup.js";
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
        this.firstSpellCinematicTriggered = false;
    }

    /**
     * Updates the survive game state.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} gameEngine - The gameEngine.
     */
    update(deltaTime, gameEngine) {
        if (!this.firstSpellCinematicTriggered && gameEngine.unlockedSpells && gameEngine.unlockedSpells.length === 0) {
            if (this.survivalTime >= 1.5) {
                this.firstSpellCinematicTriggered = true;
                this.triggerFirstSpellCinematic(gameEngine);
                return false;
            }
        }

        if (this.isPhaseEnded || !this.isReady) return false;

        if (this.checkBossDeath(gameEngine)) return false;

        this.survivalTime += deltaTime;

        const timeUp = this.duration !== null && this.survivalTime >= this.duration;
        
        const allStoryEventsTriggered = !this.storyEvents || this.storyEvents.every(e => e.isTriggered);
        const spawnerFinished = !this.phase.spawner.active;
        const enemiesDead = this.phase.enemies && this.phase.enemies.container.length === 0;
        const noBoss = !this.phase.enemies || (!this.phase.enemies.boss && !this.phase.enemies.isSpawningBoss) || (this.phase.enemies.boss && this.phase.enemies.boss.isDead);
        const clearedAllEnemies = spawnerFinished && allStoryEventsTriggered && enemiesDead && noBoss;

        if (!this.isTransitioningToNextLevel && (timeUp || clearedAllEnemies)) {
            if (!this.phase.enemies || (!this.phase.enemies.boss && !this.phase.enemies.isSpawningBoss)) {
                this.triggerPhaseTransition(gameEngine);
                return false;
            }
        }

        this.processStoryEvents(gameEngine);
        return true;
    }

    /**
     * Triggers the first spell cinematic.
     * @param {any} gameEngine - The gameEngine.
     */
    triggerFirstSpellCinematic(gameEngine) {
        gameEngine.isPaused = true;
        
        const dBox = new DialogueBox();
        const dialogues = [
            LanguageManager.t("story.firstCombat1"),
            LanguageManager.t("story.firstCombat2"),
            LanguageManager.t("story.firstCombat3")
        ];
        dBox.show(dialogues, "/asset/game_assets/models/sempai.glb", () => {
            dBox.destroy();
            
            SpellUnlockedPopup.show("spark", () => {
                gameEngine.unlockedSpells.push("spark");
                if (this.phase.player && this.phase.player.spells) {
                    this.phase.player.spells.unlockSpell("spark");
                }
                if (this.phase.input && typeof this.phase.input.setupSpellListUI === "function") {
                    this.phase.input.setupSpellListUI();
                }
                gameEngine.autoSave();
            });
        }, true);
    }

    /**
     * Checks the boss death.
     * @param {any} gameEngine - The gameEngine.
     */
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

    /**
     * Process the story events.
     * @param {any} gameEngine - The gameEngine.
     */
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

    /**
     * Executes the event action.
     * @param {any} eventToTrigger - The eventToTrigger.
     */
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
        } else if (eventToTrigger.actionType === "sempaiRescue") {
            this.triggerSempaiRescueCinematic();
        }
    }

    /**
     * Applies the spawner config.
     * @param {any} event - The event.
     */
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

    /**
     * Triggers the phase transition.
     * @param {any} gameEngine - The gameEngine.
     */
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

    /**
     * Triggers the earth boss cinematic.
     * @param {any} gameEngine - The gameEngine.
     */
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

    /**
     * Triggers the sempai rescue cinematic.
     */
    triggerSempaiRescueCinematic() {
        const gameEngine = this.phase.gameEngine;
        gameEngine.isPaused = true;
        if (this.phase.player && this.phase.player.state) {
            this.phase.player.state.isInvulnerable = true;
        }

        const boss = this.phase.enemies ? this.phase.enemies.boss : null;
        if (boss && boss.name === "EarthCore") {
            boss.attackPhase = "firing";
            if (!boss.laserMesh) {
                boss._createLaserMesh();
            }
        }

        if (this.phase.enemies) {
            for (const enemy of this.phase.enemies.container) {
                if (enemy !== boss) {
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

        const jumpDuration = 1200;
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

    /**
     * Spawns the rescue shield.
     * @param {any} position - The position.
     * @param {any} gameEngine - The gameEngine.
     */
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

        const updateLaserBlocking = () => {
            if (!rescueShield.parent) return;

            const boss = this.phase.enemies ? this.phase.enemies.boss : null;
            if (boss && boss.name === "EarthCore" && boss.laserMesh && boss.coreMesh) {
                const pulse = 1.0 + Math.sin(performance.now() / 33.0) * 0.1;
                const zStart = boss.mesh.position.z;
                const shieldZ = rescueShield.position.z;
                const shieldRadius = 3.2 * rescueShield.scale.x;
                const zEnd = shieldZ - shieldRadius;

                const L = zEnd - zStart;
                if (L > 0) {
                    boss.laserMesh.visible = true;
                    boss.coreMesh.visible = true;

                    const scaleZ = L / 120.0;
                    const zCenter = zStart + L / 2.0;

                    boss.laserMesh.scale.set(pulse, pulse, scaleZ);
                    boss.coreMesh.scale.set(pulse, pulse, scaleZ);

                    boss.laserMesh.position.z = zCenter;
                    boss.coreMesh.position.z = zCenter;
                } else {
                    boss.laserMesh.visible = false;
                    boss.coreMesh.visible = false;
                }
            }

            requestAnimationFrame(updateLaserBlocking);
        };

        updateLaserBlocking();

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

    /**
     * Triggers the rescue phase transition.
     * @param {any} gameEngine - The gameEngine.
     * @param {any} shield - The shield.
     * @param {any} material - The material.
     */
    triggerRescuePhaseTransition(gameEngine, shield, material) {
        const overlay = document.createElement("div");
        overlay.classList.add("rescue-phase-overlay");
        document.body.appendChild(overlay);

        overlay.offsetWidth;
        overlay.classList.add("active");

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

                overlay.classList.remove("active");
                overlay.classList.add("fade-out");
                setTimeout(() => overlay.remove(), 1000);
            }, 1000);
        }, 1500);
    }
}
