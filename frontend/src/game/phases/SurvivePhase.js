import { GamePhase } from "./GamePhase.js";
import ModelLoader from "../../core/utils/ModelLoader.js";
import ProjectilePool from "../models/ProjectilePool.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import { getExtendedMapLayout, getKeyboardLayout } from "../utilities/KEYBOARD.js";

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
        this.keyboard = Keyboard.init(
            this.renderer.worldGroup,
            getExtendedMapLayout(padSides, padTB),
            this.decorType,
            { paddingSides: padSides, paddingTopBottom: padTB }
        );

        const hasSempai = this.options.earthBoss || 
            (this.options.storyEvents && this.options.storyEvents.some(evt => 
                (evt.actionType === "spawnBoss" && evt.bossType === "earth_boss") || 
                evt.actionType === "sempaiRescue"
            ));

        const sempaiPromise = hasSempai 
            ? ModelLoader.loadAsync("/asset/game_assets/models/sempai.glb")
            : Promise.resolve(null);

        const [enemyGltf, riggedGltf, fireballGltf, sempaiGltf] = await Promise.all([
            ModelLoader.loadAsync("/asset/game_assets/models/bug.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/worms.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb"),
            sempaiPromise
        ]);

        if (sempaiGltf) {
            this.sempaiModel = sempaiGltf.scene;
        }

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
            this.gameEngine.stats,
            this.gameEngine.unlockedSpells
        );

        const spawnTile = this.keyboard.find(this.lastPlayerKey) || this.keyboard.keyboardLayout[0];
        this.player.offsetY = this.player.movement.getTileSurfaceHeight(spawnTile);
        this.player.renderer.updatePosition(this.player.movement);

        if (this.player.loadPromise) {
            await this.player.loadPromise;
        }

        this.input = new SurviveInput(this);

        this.settingsListener = () => {
            const ps = this.options.paddingSides !== undefined ? this.options.paddingSides : 0;
            const pt = this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 0;
            this.updateLayout(ps, pt);
        };
        window.addEventListener("settings_updated", this.settingsListener);

        this.pauseGameListener = () => {
            this.gameEngine.isPaused = true;
        };
        this.resumeGameListener = () => {
            this.gameEngine.isPaused = false;
        };
        window.addEventListener("pause_game_for_dialogue", this.pauseGameListener);
        window.addEventListener("resume_game_after_dialogue", this.resumeGameListener);

        this.sempaiRescueListener = () => {
            if (this.state && typeof this.state.triggerSempaiRescueCinematic === "function") {
                this.state.triggerSempaiRescueCinematic();
            }
        };
        window.addEventListener("earth_boss_sempai_rescue", this.sempaiRescueListener);

        if (this.options.boss) await this.enemies.spawnBoss(this.renderer.worldGroup);
        if (this.options.bugBoss) await this.enemies.spawnBugBoss(this.renderer.worldGroup, this.gameEngine.currentLevel);
        if (this.options.earthBoss) await this.enemies.spawnEarthBoss(this.renderer.worldGroup);

        if (localStorage.getItem('unlockedFingersColors') === 'true') {
            this.applyKeyboardFingerColors();
        }

        this.waitForLoader().then(() => {
            this.state.isReady = true;
        });
    }

    applyKeyboardFingerColors() {
        if (!this.keyboard) return;
        const layout = getKeyboardLayout();
        if (!layout || layout.length === 0) return;

        const isQwerty = layout[0].key === "Q";
        
        const pinkyLeft = isQwerty ? ["Q", "A", "Z"] : ["A", "Q", "W"];
        const ringLeft = isQwerty ? ["W", "S", "X"] : ["Z", "S", "X"];
        const middleLeft = isQwerty ? ["E", "D", "C"] : ["E", "D", "C"];
        const indexLeft = isQwerty ? ["R", "F", "V", "T", "G", "B"] : ["R", "F", "V", "T", "G", "B"];
        
        const indexRight = isQwerty ? ["Y", "H", "N", "U", "J", "M"] : ["Y", "H", "N", "U", "J"];
        const middleRight = isQwerty ? ["I", "K"] : ["I", "K"];
        const ringRight = isQwerty ? ["O", "L"] : ["O", "L"];
        const rightPinky = isQwerty ? ["P"] : ["P", "M"];

        this.keyboard.keyboardLayout.forEach((keyObj) => {
            if (keyObj.isGround || !keyObj.mesh) return;

            const keyChar = keyObj.key.toUpperCase();
            let color = 0x111111;

            if (pinkyLeft.includes(keyChar)) color = 0x56c2e6;
            else if (ringLeft.includes(keyChar)) color = 0x8ae656;
            else if (middleLeft.includes(keyChar)) color = 0xffdf4f;
            else if (indexLeft.includes(keyChar)) color = 0xff9f4f;
            else if (indexRight.includes(keyChar)) color = 0xaf7fdf;
            else if (middleRight.includes(keyChar)) color = 0xffdf4f;
            else if (ringRight.includes(keyChar)) color = 0x8ae656;
            else if (rightPinky.includes(keyChar)) color = 0x56c2e6;

            if (keyObj.mesh.children[1] && keyObj.mesh.children[1].material) {
                keyObj.mesh.children[1].material.color.setHex(color);
                keyObj.originalColor = color;
            }
        });
    }

    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            const overlay = document.getElementById("page-transition");
            const checkHidden = setInterval(() => {
                const isLoaderHidden = !loader || loader.classList.contains("hidden");
                const isOverlayHidden = !overlay || 
                    (!overlay.classList.contains("fade-in") && parseFloat(window.getComputedStyle(overlay).opacity) <= 0.05);

                if (isLoaderHidden && isOverlayHidden) {
                    clearInterval(checkHidden);
                    setTimeout(resolve, 100);
                }
            }, 50);
        });
    }

    updateLayout(padSides, padTB) {
        if (!this.keyboard || !this.keyboard.rebuild) return;
        this.keyboard.rebuild(getExtendedMapLayout(padSides, padTB), { paddingSides: padSides, paddingTopBottom: padTB });
        
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

        if (localStorage.getItem('unlockedFingersColors') === 'true') {
            this.applyKeyboardFingerColors();
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
            if (!p || typeof p.update !== "function") {
                console.warn("Invalid projectile found in array:", p);
                this.projectiles.splice(i, 1);
                continue;
            }
            
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
            if (p.isDead) {
                this.projectiles.splice(i, 1);
                ProjectilePool.recycle(p);
            }
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
        
        if (this.sempaiCinematicMesh && this.sempaiCinematicMesh.parent) {
            this.sempaiCinematicMesh.parent.remove(this.sempaiCinematicMesh);
        }
        this.sempaiCinematicMesh = null;
        this.sempaiModel = null;

        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");

        const warning = document.getElementById("boss-laser-warning");
        if (warning) {
            warning.remove();
        }
        
        if (this.settingsListener) {
            window.removeEventListener("settings_updated", this.settingsListener);
        }
        if (this.pauseGameListener) {
            window.removeEventListener("pause_game_for_dialogue", this.pauseGameListener);
        }
        if (this.resumeGameListener) {
            window.removeEventListener("resume_game_after_dialogue", this.resumeGameListener);
        }
        if (this.sempaiRescueListener) {
            window.removeEventListener("earth_boss_sempai_rescue", this.sempaiRescueListener);
        }
    }
}
