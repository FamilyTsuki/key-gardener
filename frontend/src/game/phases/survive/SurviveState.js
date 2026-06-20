import { DialogueBox } from "../../ui/DialogueBox.js";

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
            
            this.triggerPhaseTransition(gameEngine);
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
}
