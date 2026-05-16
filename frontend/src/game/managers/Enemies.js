import { GLTFLoader } from "three/examples/jsm/Addons.js";
import NodeAStar from "../utilities/NodeAStar.js";
import Boss from "../models/actors/Boss.js";
import Enemy from "../models/actors/Enemy.js";
import findBestPath from "../utilities/aStar.js";

const loader = new GLTFLoader();

export default class Enemies {
    #aStarGrid;
    #container;
    #boss;
    #enemyModel;
    #fireBallModel;
    bosnus = 0;

    constructor(keyboardLayout, enemyModel, fireballModel) {
        this.#aStarGrid = new Map();
        this.#container = [];
        this.#enemyModel = enemyModel;
        this.#fireBallModel = fireballModel;

        for (const key of keyboardLayout) {
            const position = { x: key.x, y: key.y };

            this.#aStarGrid.set(
                key.key,
                new NodeAStar(
                    key.key,
                    position,
                    findNeighbours(key.key, key.rawPosition, keyboardLayout)
                )
            );
        }

        for (const key of this.#aStarGrid.values()) {
            for (let i = 0; i < key.neighbours.length; i++) {
                key.neighbours[i] = this.#aStarGrid.get(key.neighbours[i]);
            }
            this.boss;
        }
    }

    get grid() {
        return this.#aStarGrid;
    }
    get container() {
        return this.#container;
    }
    get boss() {
        return this.#boss;
    }

    add(position) {
        console.error("here");
        this.#container.push(new Enemy(position, 50, 50, this.#enemyModel));
        enemy_alive += 1;
    }
    clearDead() {
        // On compte combien d'ennemis sont morts
        for (const enemy of this.#container) {
            if (enemy.isDead) {
                this.bonus = 100;
                console.log("Enemy dead, bonus", this.bonus);
            }
        }

        // On filtre le container pour ne garder que les vivants
        this.#container = this.#container.filter((enemy) => !enemy.isDead);

        // On renvoie le total à ajouter au score global
        return this.bonus;
    }

    /**
     *
     * @param {Object} playerPos = {x: Number, y: Number}
     * @param {Array} projectiles
     * @param {Array} bonks
     */
    update(playerPos, projectiles, bonks, player) {
        for (const enemy of this.#container) {
            if (enemy !== this.#boss) {
                enemy.update(player);
            }
        }
        if (this.#boss) {
            this.#boss.update(10, playerPos, projectiles, bonks);
        }
    }

    move() {
        for (const enemy of this.#container) {
            enemy.move();
        }
    }

    /**
     *
     * @param {String} playerKey
     * @param {Keyboard} keyboard
     */
    updatePath(playerKey, keyboard) {
        for (const enemy of this.#container) {
            if (enemy.name !== "Octopus" && enemy) {
                const path = findBestPath(
                    enemy.actualKey,
                    playerKey,
                    this.#aStarGrid
                ).map((keyStr) => keyboard.find(keyStr));
                enemy.path = path;
                enemy.move();
            }
        }
    }

    /**
     *
     * @param {Object} playerPos = {x: Number, y: Number}
     */
    findClosestEnemy(playerPos) {
        if (this.#container.length > 0) {
            const first = this.#container[0];
            let closestEnemy = {
                instance: first,
                dist: Math.sqrt(
                    (playerPos.x - first.x) ** 2 + (playerPos.y - first.y) ** 2
                ),
            };

            for (let i = 1; i < this.#container.length; i++) {
                const enemy = this.#container[i];
                const dist = Math.sqrt(
                    (playerPos.x - enemy.x) ** 2 + (playerPos.y - enemy.y) ** 2
                );

                if (dist < closestEnemy.dist) {
                    closestEnemy = { instance: enemy, dist };
                }
            }

            return closestEnemy;
        }

        return false;
    }

    spawnAt(keyObject, scene, type = "basic") {
        if (!keyObject || !keyObject.rawPosition) {
            console.error(
                "Erreur: La touche fournie à spawnAt est invalide",
                keyObject
            );
            return;
        }
        let hp;
        if (type == "basic") {
            hp = 50;
        } else if (type == "speedy") {
            hp = 10;
        } else if (type == "tank") {
            hp = 100;
        }
        const enemy = new Enemy(
            type,
            keyObject.key,
            scene,
            keyObject.rawPosition,
            hp,
            hp,
            this.#enemyModel.clone()
        );

        this.#container.push(enemy);
        return enemy;
    }

    async spawnBoss(scene) {
        const bossRawPosition = { x: 5, y: -2 };

        const bossModel = await loader.loadAsync(
            "/asset/game_assets/yameter.glb",
            (bossGltf) => bossGltf
        );

        this.#boss = new Boss(
            "Octopus",
            500,
            bossRawPosition,
            {
                x: bossRawPosition.x,
                y: bossRawPosition.y,
                z: bossRawPosition.z,
            },
            { width: 1, height: 1 },
            scene,
            this.#fireBallModel,
            bossModel
        );
        this.#container.push(this.#boss);

        //? set the mesh position
        this.boss.mesh.position.set(this.boss.x, 0, this.boss.y);
    }
}

function findNeighbours(keyTargetedName, position, keyboardLayout) {
    const neighbours = [];

    for (const key of keyboardLayout) {
        if (keyTargetedName !== key.key) {
            if (
                position.x - 1 <= key.rawPosition.x &&
                key.rawPosition.x <= position.x + 1
            ) {
                if (
                    position.y - 1 <= key.rawPosition.y &&
                    key.rawPosition.y <= position.y + 1
                ) {
                    neighbours.push(key.key);
                }
            }
        }
    }

    return neighbours;
}
