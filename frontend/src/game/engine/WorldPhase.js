import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import { WORLD_LAYOUT } from "../utilities/WORLD_LAYOUT.js";
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
        this.worldMap = await WorldMap.init(
            this.gameEngine.scene,
            WORLD_LAYOUT
        );
        console.log(this.worldMap);
        this.draw_bg();

        this.player = new Player(
            "Héros",
            100,
            100,
            {
                x: this.worldMap.mapLayout[0].rawPosition.x,
                y: this.worldMap.mapLayout[0].rawPosition.y,
                z: 5,
            },
            { width: 0.4, height: 0.4 },
            scene
        );
        this.player.spacingX = Math.sqrt(3) * 1.5;
        this.player.spacingZ = 1.5 * 1.5;
        this.player.offsetX = 12;
        this.player.offsetY = 3.5;
        this.player.offsetZ = 0;

        for (const event of this.events) {
            if (event.init) {
                await event.init(this, scene);
            }
        }
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

            this.camera.position.set(
                playerPos.x + 5,
                playerPos.y + 21,
                playerPos.z + 14
            );

            this.camera.lookAt(playerPos.x, playerPos.y, playerPos.z);

            if (!this.isTransitioning && this.worldMap) {
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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
        this.gameEngine.scene.add(ambientLight);

        this.playerLight = new THREE.PointLight(0xffddaa, 500, 120);
        this.playerLight.position.set(0, 7, 0);
        this.gameEngine.scene.add(this.playerLight);
    }

    /**
     * Handles keyboard events for movement and interaction.
     * @param {KeyboardEvent} event - The keyboard event.
     */
    handleKeyDown(event) {
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
    }
}
