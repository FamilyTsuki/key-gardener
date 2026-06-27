import ModelLoader from "../../core/utils/ModelLoader.js";
import * as SkeletonUtils from '/node_modules/three/examples/jsm/utils/SkeletonUtils.js';
import NodeAStar from "../utilities/NodeAStar.js";
import Boss from "../models/actors/Boss.js";
import BugBoss from "../models/actors/BugBoss.js";
import EarthBoss from "../models/actors/EarthBoss.js";
import Enemy from "../models/actors/Enemy.js";
import findBestPath from "../utilities/aStar.js";
import { ENEMY_TYPES } from "../constants/EnemyTypes.js";
import { generateUUID } from "../utilities/UUID.js";



/**
 * Manages the collection of enemies, their pathfinding, and behavior.
 */
export default class Enemies {
    #aStarGrid;
    #container;
    #boss;
    #enemyModel;
    #fireBallModel;
    #riggedModels;
    bonus = 0;

    /**
     * Creates an instance of Enemies manager.
     * @param {Array<Object>} keyboardLayout - The layout of keys on the keyboard.
     * @param {THREE.Group} enemyModel - The 3D model for basic enemies.
     * @param {THREE.Group} fireballModel - The 3D model for the fireball projectile.
     * @param {Map<string, Object>} [riggedModels=new Map()] - Optional map of type -> GLTF for rigged models.
     */
    constructor(keyboardLayout, enemyModel, fireballModel, riggedModels = new Map()) {
        this.#aStarGrid = new Map();
        this.#container = [];
        this.#enemyModel = enemyModel;
        this.#fireBallModel = fireballModel;
        this.#riggedModels = riggedModels;
        this.keyboardLayout = keyboardLayout;

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
        }
    }

    /**
     * Rebuilds the A* grid based on a new keyboard layout.
     * @param {Array<Object>} keyboardLayout - The new layout.
     */
    rebuildGrid(keyboardLayout) {
        this.#aStarGrid = new Map();
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
        }
    }

    /**
     * Gets the A* pathfinding grid.
     * @returns {Map<string, NodeAStar>} The grid map.
     */
    get grid() {
        return this.#aStarGrid;
    }
    /**
     * Gets the list of active enemies.
     * @returns {Array<Enemy>} The array of enemies.
     */
    get container() {
        return this.#container;
    }
    /**
     * Gets the boss instance, if any.
     * @returns {Boss} The boss enemy.
     */
    get boss() {
        return this.#boss;
    }

    /**
     * Adds an enemy at the given position.
     * @param {Object} position - The position to spawn the enemy.
     */
    add(position) {
        this.#container.push(new Enemy(position, 50, 50, this.#enemyModel));
    }
    /**
     * Removes dead enemies from the container and grants bonuses.
     * @returns {number} The bonus awarded.
     */
    clearDead() {
        let deadCount = 0;
        for (const enemy of this.#container) {
            if (enemy.isDead) {
                this.bonus = 100;
                console.log("Enemy dead, bonus", this.bonus);
                deadCount++;
            }
        }

        this.#container = this.#container.filter((enemy) => !enemy.isDead);

        return deadCount;
    }

    /**
     * Updates all enemies and the boss.
     * @param {Object} playerPos - The player's current position.
     * @param {Array<Projectile>} projectiles - The active projectiles in the scene.
     * @param {Array<Object>} bonks - Active bonks or hit effects.
     * @param {Player} player - The player instance.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(playerPos, projectiles, bonks, player, deltaTime) {
        for (let i = this.#container.length - 1; i >= 0; i--) {
            const enemy = this.#container[i];
            if (enemy.isDead) {
                if (enemy.mesh) {
                    if (enemy.mesh.parent) enemy.mesh.parent.remove(enemy.mesh);
                    enemy.mesh.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                                else child.material.dispose();
                            }
                        }
                        if (child.isSprite && child.material) {
                            if (child.material.map) child.material.map.dispose();
                            child.material.dispose();
                        }
                    });
                }
                this.#container.splice(i, 1);
                continue;
            }
            if (enemy !== this.#boss) {
                enemy.update(player, deltaTime, this.keyboardLayout, projectiles);
            }
        }
        
        if (this.#boss) {
            this.#boss.update(deltaTime * 1000, playerPos, projectiles, bonks, player);
        }
    }

    /**
     * Triggers movement for all enemies.
     */
    move() {
        for (const enemy of this.#container) {
            enemy.move();
        }
    }

    /**
     * Updates pathfinding for enemies to reach the target key.
     * @param {string} playerKey - The key the player is currently on.
     * @param {Keyboard} keyboard - The keyboard manager instance.
     */
    updatePath(playerKey, keyboard) {
        for (const enemy of this.#container) {
            if (enemy.name !== "Octopus" && enemy.name !== "GiantBug" && enemy && enemy.type !== "sniper" && enemy.type !== "blocker_worm" && enemy.type !== "hazard_worm") {
                const occupiedKeys = new Set();
                for (const other of this.#container) {
                    if (other !== enemy && other.name !== "Octopus" && other.name !== "GiantBug" && !other.isDead) {
                        if (other.actualKey) {
                            occupiedKeys.add(other.actualKey);
                        }
                        if (other.targetedPosition) {
                            const keyAtTarget = keyboard.keyboardLayout.find(
                                k => k.rawPosition.x === other.targetedPosition.x && k.rawPosition.y === other.targetedPosition.y
                            );
                            if (keyAtTarget) {
                                occupiedKeys.add(keyAtTarget.key);
                            }
                        }
                        if (other.path && other.path.length > 0) {
                            occupiedKeys.add(other.path[0].key);
                        }
                    }
                }

                const tempGrid = new Map();
                for (const [k, node] of this.#aStarGrid.entries()) {
                    const nodeCopy = node.copy();
                    if (occupiedKeys.has(k) && k !== playerKey) {
                        nodeCopy.neighbours = [];
                    } else {
                        nodeCopy.neighbours = nodeCopy.neighbours.filter(n => !occupiedKeys.has(n.key) || n.key === playerKey);
                    }
                    tempGrid.set(k, nodeCopy);
                }

                const pathKeys = findBestPath(
                    enemy.actualKey,
                    playerKey,
                    tempGrid
                );

                const path = pathKeys.map((keyStr) => keyboard.find(keyStr)).filter(Boolean);
                
                if (path.length > 1 && path[0].key === enemy.actualKey) {
                    path.shift();
                }

                if (path.length > 0) {
                    enemy.path = path;
                    enemy.move();
                }
            }
        }
    }

    /**
     * Finds the closest enemy to the player.
     * @param {Object} playerPos - The player's position.
     * @returns {Object|boolean} An object with the closest enemy and distance, or false if no enemies.
     */
    findClosestEnemy(playerPos) {
        if (this.#container.length > 0) {
            let closestEnemy = null;
            let minDist = Infinity;

            for (let i = 0; i < this.#container.length; i++) {
                const enemy = this.#container[i];
                if (enemy.isSpawning || (!enemy.model && !enemy.mesh)) continue;

                const dist = Math.sqrt(
                    (playerPos.x - enemy.x) ** 2 + (playerPos.y - enemy.y) ** 2
                );

                if (dist < minDist) {
                    minDist = dist;
                    closestEnemy = { instance: enemy, dist };
                }
            }

            return closestEnemy || false;
        }

        return false;
    }

    /**
     * Spawns an enemy at a specific key.
     * @param {Object} keyObject - The key on which to spawn the enemy.
     * @param {THREE.Scene} scene - The main three.js scene.
     * @param {string} [type="basic"] - The type of enemy to spawn.
     * @returns {Enemy} The spawned enemy instance.
     */
    spawnAt(keyObject, scene, type = "basic", options = {}) {
        if (!keyObject || !keyObject.rawPosition) {
            console.error(
                "Erreur: La touche fournie à spawnAt est invalide",
                keyObject
            );
            return;
        }
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.basic;
        const hp = config.baseHp * (options.difficulty || 1);
        
        let position = keyObject.rawPosition;

        const riggedGltf = this.#riggedModels.get(type);
        let modelToUse;
        if (riggedGltf) {
            const clonedScene = SkeletonUtils.clone(riggedGltf.scene);
            modelToUse = { scene: clonedScene, animations: riggedGltf.animations || [] };
        } else {
            modelToUse = this.#enemyModel.clone();
        }

        const enemy = new Enemy(
            type,
            keyObject.key,
            scene,
            position,
            hp,
            hp,
            modelToUse,
            { width: 1, height: 1 },
            generateUUID(),
            options.scale || 1,
            this.#fireBallModel
        );

        this.#container.push(enemy);
        return enemy;
    }

    /**
     * Loads and spawns the boss.
     * @param {THREE.Scene} scene - The main three.js scene.
     * @returns {Promise<void>}
     */
    async spawnBoss(scene) {
        this.isSpawningBoss = true;
        const bossRawPosition = { x: 5, y: -2 };

        const bossModel = await ModelLoader.loadAsync("/asset/game_assets/models/yameter.glb");

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

        this.boss.mesh.position.set(this.boss.x * 3.2, 0, this.boss.y * 3.2);
        this.isSpawningBoss = false;
    }

    async spawnBugBoss(scene, level = 1) {
        this.isSpawningBoss = true;
        const bossRawPosition = { x: 5, y: -4.2 };

        this.#boss = new BugBoss(
            "GiantBug",
            400,
            bossRawPosition,
            {
                x: bossRawPosition.x,
                y: bossRawPosition.y,
                z: bossRawPosition.z,
            },
            { width: 1, height: 1 },
            scene,
            this.#fireBallModel,
            level
        );
        this.#container.push(this.#boss);
        this.boss.mesh.position.set(this.boss.x * 3.2, 0, this.boss.y * 3.2);
        this.isSpawningBoss = false;
    }

    async spawnEarthBoss(scene) {
        this.isSpawningBoss = true;
        const bossRawPosition = { x: 5, y: -4.0 };
        const bossModel = await ModelLoader.loadAsync("/asset/game_assets/models/earth-boss.glb");

        this.#boss = new EarthBoss(
            "EarthCore",
            600,
            bossRawPosition,
            {
                x: bossRawPosition.x,
                y: bossRawPosition.y,
                z: bossRawPosition.z,
            },
            { width: 1.5, height: 1.5 },
            scene,
            this.#fireBallModel,
            bossModel
        );
        this.#container.push(this.#boss);
        this.isSpawningBoss = false;
    }
}

/**
 * Finds valid neighbour keys for pathfinding.
 * @param {string} keyTargetedName - The key's identifier.
 * @param {Object} position - The key's raw grid position.
 * @param {Array<Object>} keyboardLayout - The keyboard layout definition.
 * @returns {Array<string>} An array of neighbour key identifiers.
 */
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
