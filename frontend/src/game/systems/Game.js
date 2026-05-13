import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import Projectile from "../models/Projectile.js";

const loader = new GLTFLoader();

export default class Game {
    #canvas;
    #keyboard;
    #player;
    #enemies;
    #projectiles;
    #bonks;
    #fireBallModel;

    constructor(scene, player, enemies, keyboard, enemyModel, fireBallModel) {
        this.#canvas = document.getElementById("game-canvas");
        this.scene = scene;
        if (!this.#canvas) {
            throw new Error("No canvas found !");
        }

        this.#keyboard = keyboard;
        this.#player = player;
        this.#enemies = enemies;
        this.#projectiles = [];
        this.#bonks = [];
        this.#fireBallModel = fireBallModel;
    }

    get keyboard() {
        return this.#keyboard;
    }
    get player() {
        return this.#player;
    }
    get enemies() {
        return this.#enemies;
    }
    get projectiles() {
        return this.#projectiles;
    }
    set projectiles(projectiles) {
        this.#projectiles = projectiles;
    }
    get bonks() {
        return this.#bonks;
    }
    set bonks(bonks) {
        this.#bonks = bonks;
    }

    keyboardUpdate() {
        this.#keyboard.update();
    }

    keyboardUpdateSize() {
        if (this.#keyboard.updateSize) {
            this.#keyboard.updateSize(this.#canvas);
        }
    }

    update() {
        this.#enemies.clearDead();
        this.#enemies.update(
            this.#player.position,
            this.#projectiles,
            this.#bonks,
            this.#player
        );
    }
    moveEnemies() {
        this.#enemies.move();
    }

    async spawnBoss() {
        await this.#enemies.spawnBoss(this.scene);
    }

    spawnWave(enemyNumber) {
        for (let x = 0; x < enemyNumber; x++) {
            this.#enemies.add(x, 3 + x);
        }
    }

    /**
     *
     * @param {String} key
     */
    spawnAt(key) {
        return this.#enemies.spawnAt(this.#keyboard.find(key), this.scene);
    }

    static async init(scene, keyboardLayout) {
        const keyboard = Keyboard.init(scene, keyboardLayout);

        const enemyGltf = await loader.loadAsync("/asset/game_assets/bug.glb");
        const fireballGltf = await loader.loadAsync(
            "/asset/game_assets/fireball.glb"
        );

        const enemiesManager = new Enemies(
            keyboard.keyboardLayout,
            enemyGltf.scene,
            fireballGltf.scene
        );

        const player = new Player(
            "Héros",
            100,
            100,
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            scene,
            fireballGltf.scene,
            enemiesManager
        );

        return new Game(
            scene,
            player,
            enemiesManager,
            keyboard,
            enemyGltf.scene,
            fireballGltf.scene
        );
    }
}
