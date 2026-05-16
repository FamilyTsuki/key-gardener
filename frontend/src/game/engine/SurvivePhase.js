import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";

const loader = new GLTFLoader();

export class SurvivePhase extends GamePhase {
    constructor(gameEngine) {
        super(gameEngine);
        this.keyboard = null;
        this.player = null;
        this.enemies = null;
        this.projectiles = [];
        this.bonks = [];
    }

    async init() {
        const scene = this.gameEngine.scene;

        this.keyboard = Keyboard.init(scene, KEYBOARD_LAYOUT);

        const enemyGltf = await loader.loadAsync("/asset/game_assets/bug.glb");
        const fireballGltf = await loader.loadAsync("/asset/game_assets/fireball.glb");

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

        this.draw_bg();
    }

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
        }
    }

    draw_bg() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.gameEngine.scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(10, 20, 10);
        this.gameEngine.scene.add(sunLight);
        const fillLight = new THREE.PointLight(0x0088ff, 0.5);
        fillLight.position.set(-10, 10, -10);
        this.gameEngine.scene.add(fillLight);
    }

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
    }

    cleanup() {
        if (this.keyboard) {
            this.gameEngine.scene.remove(this.keyboard.group);
        }
        if (this.player && this.player.mesh) {
            this.gameEngine.scene.remove(this.player.mesh);
        }
    }
}
