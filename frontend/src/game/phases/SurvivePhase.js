import { GamePhase } from "./GamePhase.js";
import ModelLoader from "../../core/utils/ModelLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import { getExtendedMapLayout } from "../utilities/KEYBOARD.js";

import { SurviveSpawner } from "./survive/SurviveSpawner.js";
import { SurviveInput } from "./survive/SurviveInput.js";
import { SurviveRenderer } from "./survive/SurviveRenderer.js";
import { SurviveState } from "./survive/SurviveState.js";

export class SurvivePhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        this.options = typeof options === "string" ? this.parseStringOptions(options) : options;
        this.decorType = this.options.decorType || (typeof options === "string" ? options : "default");

        this.renderer = new SurviveRenderer(this);
        this.state = new SurviveState(this);
        this.spawner = new SurviveSpawner(this);
        this.input = null;

        this.keyboard = null;
        this.player = null;
        this.enemies = null;
        
        this.projectiles = [];
        this.bonks = [];
        
        this.spawnTimer = 0;
        this.lastPlayerKey = "A";
        this.pathUpdateTimer = 0;
    }

    parseStringOptions(str) {
        return {
            decorType: str, duration: 60, spawnInterval: 3, maxEnemies: Infinity, storyEvents: []
        };
    }

    async init() {
        const scene = this.gameEngine.scene;
        this.renderer.init(scene, this.gameEngine.camera, this.decorType);

        const padSides = this.options.paddingSides !== undefined ? this.options.paddingSides : 3;
        const padTB = this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 5;
        this.keyboard = Keyboard.init(this.renderer.worldGroup, getExtendedMapLayout(padSides, padTB), this.decorType);

        const [enemyGltf, riggedGltf, fireballGltf] = await Promise.all([
            ModelLoader.loadAsync("/asset/game_assets/models/bug.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/worms.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb"),
        ]);

        const riggedModels = new Map();
        riggedModels.set("rigged", riggedGltf);
        riggedModels.set("blocker_worm", riggedGltf);
        riggedModels.set("hazard_worm", riggedGltf);

        this.enemies = new Enemies(this.keyboard.keyboardLayout, enemyGltf.scene, fireballGltf.scene, riggedModels);

        this.player = new Player(
            "Héros",
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            this.renderer.worldGroup,
            fireballGltf.scene,
            this.enemies,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );

        const spawnTile = this.keyboard.find(this.lastPlayerKey) || this.keyboard.keyboardLayout[0];
        this.player.offsetY = this.player.movement.getTileSurfaceHeight(spawnTile);
        this.player.renderer.updatePosition(this.player.movement);

        this.input = new SurviveInput(this);

        this.settingsListener = () => {
            const ps = this.options.paddingSides !== undefined ? this.options.paddingSides : 0;
            const pt = this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 0;
            this.updateLayout(ps, pt);
        };
        window.addEventListener("settings_updated", this.settingsListener);

        if (this.options.boss) await this.enemies.spawnBoss(this.renderer.worldGroup);
        if (this.options.bugBoss) await this.enemies.spawnBugBoss(this.renderer.worldGroup);

        await this.waitForLoader();
        this.state.isReady = true;
    }

    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            if (!loader) return resolve();
            
            const checkHidden = setInterval(() => {
                if (loader.classList.contains("hidden")) {
                    clearInterval(checkHidden);
                    setTimeout(resolve, 600);
                }
            }, 50);
        });
    }

    updateLayout(padSides, padTB) {
        if (!this.keyboard || !this.keyboard.rebuild) return;
        this.keyboard.rebuild(getExtendedMapLayout(padSides, padTB));
        
        if (this.player) {
            const pPos = this.player.targetPosition || this.player.rawPosition;
            if (pPos) {
                const k = this.keyboard.keyboardLayout.find(k => k.rawPosition.x === pPos.x && k.rawPosition.y === pPos.y);
                if (k) this.lastPlayerKey = k.key;
            }
        }

        if (this.enemies) {
            for (const enemy of this.enemies.container) {
                if (enemy.name !== "Octopus" && enemy.name !== "GiantBug" && enemy) {
                    const ePos = enemy.targetedPosition || enemy.rawPosition;
                    if (ePos) {
                        const k = this.keyboard.keyboardLayout.find(k => k.rawPosition.x === ePos.x && k.rawPosition.y === ePos.y);
                        if (k) enemy.actualKey = k.key;
                    }
                }
            }
            this.enemies.keyboardLayout = this.keyboard.keyboardLayout;
            this.enemies.rebuildGrid(this.keyboard.keyboardLayout);
        }
    }

    update(deltaTime) {
        if (!this.state.update(deltaTime, this.gameEngine)) return;

        this.renderer.updateCamera(this.gameEngine.camera, this.enemies);
        this.spawner.update(deltaTime);

        if (this.enemies && this.player && this.player.isAlive()) {
            this.updatePathing(deltaTime);
            const deadCount = this.enemies.clearDead() || 0;
            this.state.enemiesKilled += deadCount;
            this.spawner.kills += deadCount;

            if (deadCount > 0 && this.gameEngine.stats) {
                for (let i = 0; i < deadCount; i++) this.gameEngine.stats.recordEnemyDefeated(false);
            }

            this.enemies.update(this.player.position, this.projectiles, this.bonks, this.player, deltaTime);
        }

        if (this.player) {
            this.player.update(deltaTime, this.keyboard ? this.keyboard.keyboardLayout : null);
            this.input.applyPendingSpell(this.projectiles);
            
            const pTarget = this.player.targetPosition;
            if (pTarget && this.keyboard) {
                const k = this.keyboard.keyboardLayout.find(k => Math.abs(k.rawPosition.x - pTarget.x) < 0.1 && Math.abs(k.rawPosition.y - pTarget.y) < 0.1);
                if (k) this.lastPlayerKey = k.key;
            }
        }
        
        this.updateProjectilesAndBonks(deltaTime);
        this.renderer.updateDecor(deltaTime);
    }

    updatePathing(deltaTime) {
        this.pathUpdateTimer += deltaTime;
        if (this.pathUpdateTimer >= 0.5) {
            this.pathUpdateTimer = 0;
            if (this.lastPlayerKey) this.enemies.updatePath(this.lastPlayerKey, this.keyboard);
        }
    }

    updateProjectilesAndBonks(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(null, deltaTime * 1000);
            
            if (p.team === "player" && this.enemies) {
                for (const enemy of this.enemies.container) {
                    if (!enemy.isDead && !enemy.isSpawning && (enemy.model || enemy.mesh) && p.checkCollision(enemy)) {
                        enemy.takeDamage(p.damage || 50);
                        p.die();
                        break;
                    }
                }
            } else if (p.team !== "player" && this.player && this.player.isAlive() && p.checkCollision(this.player)) {
                this.player.damage(p.damage || 10, "Touché par une boule de feu du boss");
                p.die();
            }
            
            if (p.position && (Math.abs(p.position.x) > 50 || Math.abs(p.position.y) > 50)) p.die();
            if (p.isDead) this.projectiles.splice(i, 1);
        }

        for (let i = this.bonks.length - 1; i >= 0; i--) {
            const bonk = this.bonks[i];
            bonk.update(deltaTime * 1000, this.player);
            if (bonk.isDead) this.bonks.splice(i, 1);
        }
    }

    draw() {
        this.renderer.draw(this.keyboard, this.player, this.enemies);
    }

    handleKeyDown(event) {
        if (this.input) this.input.handleKeyDown(event);
    }

    cleanup() {
        this.renderer.cleanup(this.gameEngine.scene);
        
        if (this.keyboard && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.keyboard.group);
        }
        if (this.player && this.player.mesh && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.player.mesh);
        }
        
        if (this.input) this.input.cleanup();
        
        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");
        
        if (this.settingsListener) {
            window.removeEventListener("settings_updated", this.settingsListener);
        }
    }
}
