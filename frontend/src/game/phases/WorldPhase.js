import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import { createWordlLayout } from "../utilities/WORLD_LAYOUT.js";
import Player from "../models/actors/Player.js";
import { DialogueBox } from "../ui/DialogueBox.js";

export class WorldPhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        this.worldMap = null;
        this.player = null;
        this.camera = this.gameEngine.camera;
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.isTransitioning = false;
        this.isPlayingIntro = false;
        this.isStunnedAfterFall = false;
        this.stunTimer = 0;
        this.dropSpeed = 0;
        this.arrivalX = 0;
        this.arrivalZ = 0;
        this.targetY = 0;
        this.activeIntroType = null;
        
        if (Array.isArray(options)) {
            this.options = {};
            this.events = options;
            this.introType = "random";
            this.dialogue = ["Testing the new reusable dialogue box!", "Here is a 3D model next to it."];
            this.dialogueModel = "/asset/game_assets/models/player.glb";
            this.storyEvents = [];
        } else {
            this.options = options;
            this.events = options.events || [];
            this.introType = options.introType || "random";
            this.dialogue = options.dialogue || [];
            this.dialogueModel = options.dialogueModel || null;
            this.storyEvents = (options.storyEvents || []).map(evt => ({ ...evt, isTriggered: false }));
        }
        
        this.elapsedTime = 0;
    }

    async init() {
        const scene = this.gameEngine.scene;
        const hasDoorEvent = this.events.some(e => e.constructor.name === "DoorEvent");
        const hasBridgeEvent = this.events.some(e => e.constructor.name === "BridgeWordEvent");
        
        this.activeIntroType = this.introType === "random" ? (Math.random() > 0.5 ? "skyfall" : "staircase") : this.introType;
        const worldLayout = createWordlLayout(hasBridgeEvent, this.activeIntroType);

        this.worldMap = await WorldMap.init(
            this.gameEngine.scene,
            worldLayout,
            hasDoorEvent
        );
        console.log(this.worldMap);
        this.draw_bg();

        const spawnTile = this.worldMap.mapLayout.find(t => t.isSpawn) || this.worldMap.mapLayout[1];

        this.player = new Player(
            "Héros",
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            {
                x: spawnTile.rawPosition.x,
                y: spawnTile.rawPosition.y,
                z: 5,
            },
            { width: 0.4, height: 0.4 },
            scene,
            undefined,
            undefined,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel)
        );
        this.player.allowSpeedUp = false;
        this.player.spacingX = Math.sqrt(3) * 1.5;
        this.player.spacingZ = 1.5 * 1.5;
        this.player.offsetX = 12;
        this.player.offsetY = 2.9 + (spawnTile.baseY || 0);
        this.player.offsetZ = 0;

        for (const event of this.events) {
            if (event.init) {
                await event.init(this, scene);
            }
        }

        if (this.player.loadPromise) {
            await this.player.loadPromise;
        }

        this.runIntroAnimation(this.activeIntroType, spawnTile);
    }

    executeEventAction(eventToTrigger) {
        if (eventToTrigger.actionType === "heal") {
            if (this.player) {
                this.player.heal(eventToTrigger.healAmount || 50);
            }
        } else if (eventToTrigger.actionType === "spawn") {
            console.log("Spawn action triggered in WorldPhase, but not fully supported here yet.");
        }
    }

    update(deltaTime) {
        if (!this.player) {
            return;
        }

        this.elapsedTime += deltaTime;

        if (this.isPlayingIntro && this.activeIntroType === "skyfall") {
            this.dropSpeed += 25 * deltaTime;
            this.player.offsetY -= this.dropSpeed * deltaTime;

            this.camera.position.set(
                this.arrivalX + 5,
                this.targetY + 21,
                this.arrivalZ + 14
            );
            this.camera.lookAt(this.arrivalX, this.player.offsetY, this.arrivalZ);

            if (this.player.offsetY <= this.targetY) {
                this.player.offsetY = this.targetY;
                this.camera.lookAt(this.arrivalX, this.targetY, this.arrivalZ);
                this.player.jumpSound.currentTime = 0;
                const playPromise = this.player.jumpSound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => console.warn("Autoplay prevented:", error));
                }

                this.isPlayingIntro = false;
                this.isStunnedAfterFall = true;
                this.stunTimer = 0.8;
            }
        }

        if (this.isStunnedAfterFall) {
            this.stunTimer -= deltaTime;
            if (this.stunTimer <= 0) {
                this.isStunnedAfterFall = false;
                this.isTransitioning = false;
                this.startIntroDialogue();
            }
        }

        if (this.storyEvents) {
            const eventToTrigger = this.storyEvents.find(evt => {
                if (evt.isTriggered) return false;
                if (evt.triggerType === "time") {
                    return this.elapsedTime >= evt.triggerValue;
                } else if (evt.triggerType === "distance") {
                    return Math.abs(this.player.y) >= evt.triggerValue;
                }
                return false;
            });

            if (eventToTrigger) {
                eventToTrigger.isTriggered = true;
                
                if (eventToTrigger.dialogue && eventToTrigger.dialogue.length > 0) {
                    this.gameEngine.isPaused = true;
                    
                    const dBox = new DialogueBox();
                    dBox.show(eventToTrigger.dialogue, eventToTrigger.dialogueModel || "/asset/game_assets/models/player.glb", () => {
                        dBox.destroy();
                        this.gameEngine.isPaused = false;
                        this.executeEventAction(eventToTrigger);
                    });
                    return;
                } else {
                    this.executeEventAction(eventToTrigger);
                }
            }
        }

        this.player.update();
        if (this.player && this.player.mesh) {
            const playerPos = this.player.mesh.position;

            if (!this.isTransitioning) {
                this.camera.position.set(
                    playerPos.x + 5,
                    playerPos.y + 21,
                    playerPos.z + 14
                );
                this.camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
            }

            if (this.worldMap) {
                for (const event of this.events) {
                    if (event.update) {
                        event.update(this, deltaTime);
                    }
                }
            }
        }
    }

    draw() {
        if (this.player && this.player.mesh && this.playerLight) {
            const pos = this.player.mesh.position;
            this.playerLight.position.set(pos.x, pos.y + 7, pos.z);
        }

        if (this.worldMap) {
            this.worldMap.update(
                this.player ? { x: this.player.x, y: this.player.y } : null
            );
        }
    }

    draw_bg() {
        this.gameEngine.scene.background = new THREE.Color(0x0a0c10);
        this.gameEngine.scene.fog = new THREE.Fog(0x0a0c10, 40, 100);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
        this.gameEngine.scene.add(this.ambientLight);

        this.playerLight = new THREE.PointLight(0xffddaa, 500, 120);
        this.playerLight.position.set(0, 7, 0);
        this.gameEngine.scene.add(this.playerLight);
    }

    startIntroDialogue() {
        if (this.dialogue && this.dialogue.length > 0) {
            this.gameEngine.isPaused = true;
            this.dBox = new DialogueBox();
            this.dBox.show(
                this.dialogue, 
                this.dialogueModel, 
                () => {
                    if (this.dBox) {
                        this.dBox.destroy();
                        this.dBox = null;
                    }
                    this.gameEngine.isPaused = false;
                }
            );
        }
    }

    async runIntroAnimation(introType, spawnTile) {
        this.isPlayingIntro = true;
        this.isTransitioning = true;

        let arrivalTile = spawnTile;
        if (introType === "staircase") {
            const normalTiles = this.worldMap.mapLayout.filter(t => !t.isStairs && t.rawPosition.y <= 0);
            const firstNormalTile = normalTiles[1] || normalTiles[0];
            if (firstNormalTile) {
                arrivalTile = firstNormalTile;
            }
        }

        const arrivalX = arrivalTile.rawPosition.x * Math.sqrt(3) * 1.5 + 12;
        const arrivalZ = arrivalTile.rawPosition.y * 1.5 * 1.5;
        const arrivalY = 2.9 + (arrivalTile.baseY || 0);

        this.arrivalX = arrivalX;
        this.arrivalZ = arrivalZ;
        this.targetY = arrivalY;

        this.camera.position.set(
            arrivalX + 5,
            arrivalY + 21,
            arrivalZ + 14
        );
        this.camera.lookAt(arrivalX, arrivalY, arrivalZ);

        if (introType === "skyfall") {
            this.isPlayingIntro = true;
            this.isTransitioning = true;
            this.dropSpeed = 0;
            this.player.offsetY = arrivalY + 40;
            this.player.update();
            this.draw();
        } else if (introType === "staircase") {
            const stairsTiles = this.worldMap.mapLayout.filter(t => t.isStairs).sort((a, b) => b.baseY - a.baseY);
            
            this.player.update();
            this.draw();

            const stepDown = async (index) => {
                if (index >= stairsTiles.length) {
                    const normalTiles = this.worldMap.mapLayout.filter(t => !t.isStairs && t.rawPosition.y <= 0);
                    const firstNormalTile = normalTiles[1] || normalTiles[0];
                    if (firstNormalTile) {
                        this.player.move({
                            x: firstNormalTile.rawPosition.x,
                            y: firstNormalTile.rawPosition.y,
                            offsetY: 2.9 + (firstNormalTile.baseY || 0)
                        });
                        await new Promise(r => setTimeout(r, this.player.movementDuration * 16.6));
                    }
                    this.isPlayingIntro = false;
                    this.isTransitioning = false;
                    this.startIntroDialogue();
                    return;
                }
                
                const nextTile = stairsTiles[index];
                this.player.move({
                    x: nextTile.rawPosition.x,
                    y: nextTile.rawPosition.y,
                    offsetY: 2.9 + (nextTile.baseY || 0)
                });
                
                await new Promise(r => setTimeout(r, this.player.movementDuration * 16.6));
                await stepDown(index + 1);
            };
            
            await new Promise(r => setTimeout(r, 500));
            await stepDown(1);
        }
    }

    handleKeyDown(event) {
        if (this.isPlayingIntro) return;

        for (const evt of this.events) {
            if (evt.handleKeyDown) {
                const intercepted = evt.handleKeyDown(this, event);
                if (intercepted) return;
            }
        }

        if (this.isTransitioning) return;

        const keyName = event.key.toUpperCase();

        let target = null;
        if (this.worldMap) {
            target = this.worldMap.find(keyName, this.player.position.y);
        }
        if (!target) {
            return;
        }

        target.isPressed = true;

        if (this.player) {
            this.player.move({
                x: target.rawPosition.x,
                y: target.rawPosition.y,
                offsetY: 2.9 + (target.baseY || 0),
            });
        }
    }

    cleanup() {
        if (this.dialogueTimeout) {
            clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = null;
        }
        if (this.dBox) {
            this.dBox.destroy();
            this.dBox = null;
        }

        for (const event of this.events) {
            if (event.cleanup) {
                event.cleanup(this);
            }
        }

        if (this.player && this.player.mesh) {
            this.gameEngine.scene.remove(this.player.mesh);
        }

        if (this.worldMap) {
            this.gameEngine.scene.remove(this.worldMap.group);
        }

        if (this.ambientLight) {
            this.gameEngine.scene.remove(this.ambientLight);
            this.ambientLight.dispose && this.ambientLight.dispose();
        }

        if (this.playerLight) {
            this.gameEngine.scene.remove(this.playerLight);
            this.playerLight.dispose && this.playerLight.dispose();
        }
    }
}
