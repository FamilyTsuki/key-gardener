import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import { createWordlLayout } from "../utilities/WORLD_LAYOUT.js";
import Player from "../models/actors/Player.js";

/**
 * Represents the world exploration phase of the game.
 */
export class WorldPhase extends GamePhase {
    /**
     * Creates an instance of WorldPhase.
     * @param {GameEngine} gameEngine - The game engine instance.
     * @param {Array<Object>} [events=[]] - Array of events to handle in this phase.
     */
    constructor(gameEngine, events = []) {
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
        this.events = events || []; 
    }

    /**
     * Initializes the world phase, setting up the map, player, and events.
     * @returns {Promise<void>}
     */
    async init() {
        const scene = this.gameEngine.scene;
        const hasDoorEvent = this.events.some(e => e.constructor.name === "DoorEvent");
        const hasBridgeEvent = this.events.some(e => e.constructor.name === "BridgeWordEvent");
        
        const introType = Math.random() > 0.5 ? "skyfall" : "staircase";
        const worldLayout = createWordlLayout(hasBridgeEvent, introType);

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
            100,
            100,
            {
                x: spawnTile.rawPosition.x,
                y: spawnTile.rawPosition.y,
                z: 5,
            },
            { width: 0.4, height: 0.4 },
            scene
        );
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

        this.runIntroAnimation(introType, spawnTile);
    }

    /**
     * Updates the game state for the world phase.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(deltaTime) {
        if (!this.player) {
            return;
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

    /**
     * Draws the elements of the world phase.
     */
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

    /**
     * Sets up the background and lighting for the scene.
     */
    draw_bg() {
        this.gameEngine.scene.background = new THREE.Color(0x0a0c10);
        this.gameEngine.scene.fog = new THREE.Fog(0x0a0c10, 40, 100);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
        this.gameEngine.scene.add(this.ambientLight);

        this.playerLight = new THREE.PointLight(0xffddaa, 500, 120);
        this.playerLight.position.set(0, 7, 0);
        this.gameEngine.scene.add(this.playerLight);
    }

    /**
     * Runs the introduction animation.
     * @param {string} introType 
     * @param {Object} spawnTile 
     */
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

        this.camera.position.set(
            arrivalX + 5,
            arrivalY + 21,
            arrivalZ + 14
        );
        this.camera.lookAt(arrivalX, arrivalY, arrivalZ);

        if (introType === "skyfall") {
            const targetY = this.player.offsetY;
            this.player.offsetY = targetY + 40;
            this.player.update();
            this.draw();
            
            return new Promise(resolve => {
                let dropSpeed = 0;
                const animateDrop = () => {
                    dropSpeed += 0.02; 
                    this.player.offsetY -= dropSpeed;

                    this.camera.lookAt(arrivalX, this.player.offsetY, arrivalZ);

                    if (this.player.offsetY <= targetY) {
                        this.player.offsetY = targetY;
                        this.camera.lookAt(arrivalX, targetY, arrivalZ);
                        this.player.jumpSound.currentTime = 0;
                        this.player.jumpSound.play();
                        
                        this.isPlayingIntro = false;
                        this.isTransitioning = false;
                        resolve();
                    } else {
                        requestAnimationFrame(animateDrop);
                    }
                };
                requestAnimationFrame(animateDrop);
            });
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

    /**
     * Handles keyboard events for movement and interaction.
     * @param {KeyboardEvent} event - The keyboard event.
     */
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

    /**
     * Cleans up resources used by the world phase.
     */
    cleanup() {
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
