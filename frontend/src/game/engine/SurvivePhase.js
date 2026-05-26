import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import Projectile from "../models/Projectile.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";

const loader = new GLTFLoader();

/**
 * Represents the survive phase of the game where the player defends against enemies.
 */
export class SurvivePhase extends GamePhase {
    /**
     * Creates an instance of SurvivePhase.
     * @param {GameEngine} gameEngine - The game engine instance.
     */
    constructor(gameEngine) {
        super(gameEngine);
        this.keyboard = null;
        this.player = null;
        this.enemies = null;
        this.projectiles = [];
        this.bonks = [];
        this.elCurrentWord = null;
    }

    /**
     * Initializes the survive phase, including the player, enemies, and keyboard.
     * @returns {Promise<void>}
     */
    async init() {
        const scene = this.gameEngine.scene;

        this.keyboard = Keyboard.init(scene, KEYBOARD_LAYOUT);

        const enemyGltf = await loader.loadAsync("/asset/game_assets/bug.glb");
        const fireballGltf = await loader.loadAsync(
            "/asset/game_assets/fireball.glb"
        );

        this.enemies = new Enemies(
            this.keyboard.keyboardLayout,
            enemyGltf.scene,
            fireballGltf.scene
        );

        this.player = new Player(
            "Héros",
            100,
            100,
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            scene,
            fireballGltf.scene,
            this.enemies
        );
        this.elCurrentWord = document.getElementById("currentWord");
        document
            .getElementById("currentWord")
            .parentElement.classList.remove("none");

        this.draw_bg();
    }

    /**
     * Updates the game state for the survive phase.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(deltaTime) {
        if (this.enemies && this.player) {
            this.enemies.clearDead();
            this.enemies.update(
                this.player.position,
                this.projectiles,
                this.bonks,
                this.player
            );
        }
        if (this.player) {
            this.player.update();
        }
    }

    /**
     * Draws the elements of the survive phase, updating positions and states.
     */
    draw() {
        if (this.keyboard && this.player) {
            this.keyboard.keyboardLayout.forEach((tile) => {
                const isPlayerOnTile =
                    Math.abs(this.player.position.x * 3.2 - tile.x) < 0.4 &&
                    Math.abs(this.player.position.y * 3.2 - tile.y) < 0.4;

                tile.isPressed = isPlayerOnTile;
            });

            this.keyboard.update();
        }

        if (this.player && this.player.mesh) {
            const spacing = 3.2;
            const targetX = this.player.position.x;
            const targetY = this.player.position.y;

            this.player.mesh.position.set(
                targetX * spacing,
                1.5,
                targetY * spacing
            );
            
            if (this.playerLight) {
                this.playerLight.position.set(targetX * spacing, 7, targetY * spacing);
            }
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
     * Handles keyboard events for movement and attacking.
     * @param {KeyboardEvent} event - The keyboard event.
     */
    handleKeyDown(event) {
        const keyName = event.key.toUpperCase();
        const target = this.keyboard?.find(keyName);
        if (!target) {
            return;
        }

        target.isPressed = true;

        if (this.player && this.enemies) {
            this.enemies.updatePath(target.key, this.keyboard);
            this.player.move({
                x: target.rawPosition.x,
                y: target.rawPosition.y,
            });
        }
        let word = this.player.handleKeyPress(event.key);

        if (word) {
            const closestEnemy = this.enemies.findClosestEnemy(
                this.player.position
            );

            const spellResult = this.player.attack(word, closestEnemy);

            if (spellResult instanceof Projectile) {
                this.projectiles.push(spellResult);
            }
            if (this.elCurrentWord) {
                this.elCurrentWord.textContent = word;
                setTimeout(() => {
                    this.elCurrentWord.textContent = this.player.currentWord;
                }, 100);
            }
        } else if (this.elCurrentWord) {
            this.elCurrentWord.textContent = this.player.currentWord;
        }
    }

    /**
     * Cleans up resources used by the survive phase.
     */
    cleanup() {
        if (this.keyboard) {
            this.gameEngine.scene.remove(this.keyboard.group);
        }
        if (this.player && this.player.mesh) {
            this.gameEngine.scene.remove(this.player.mesh);
        }
    }
}
