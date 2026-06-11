import Actor from "../Actor.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AudioManager } from "../../managers/AudioManager.js";
/**
 * Enemy class representing an adversary in the game.
 * Inherits from Actor.
 */
export default class Enemy extends Actor {
    /** @type {number} */
    #damage;
    /** @type {string} */
    #actualKey;
    /** @type {Object} */
    #targetedPosition;
    /** @type {Array<Object>} */
    #path;

    /**
     * Constructs an Enemy instance.
     * @param {string} type - The type of the enemy ('basic', 'speedy', 'tank').
     * @param {string} actualKey - The current key associated with the enemy.
     * @param {THREE.Scene} scene - The scene where the enemy will be added.
     * @param {Object} position - The initial position of the enemy {x, y}.
     * @param {number} [hp=100] - The health points of the enemy.
     * @param {number} [hpMax=100] - The maximum health points of the enemy.
     * @param {THREE.Group|undefined} [model=undefined] - The 3D model of the enemy.
     * @param {Object} [size={width: 1, height: 1}] - The size of the enemy.
     * @param {string} [id=crypto.randomUUID()] - The unique identifier of the enemy.
     */
    constructor(
        type,
        actualKey,
        scene,
        position,
        hp = 100,
        hpMax = 100,
        model = undefined,
        size = { width: 1, height: 1 },
        id = crypto.randomUUID(),
        scale = 1
    ) {
        super(id, hp, hpMax, position, position, size, model);
        this.#actualKey = actualKey;
        this.#path = [];
        this.#targetedPosition = { x: position.x, y: position.y };

        this.startJumpPos = { x: position.x, y: position.y };
        this.totalJumpDist = 0;

        this.mesh = new THREE.Group();
        this.scene = scene;
        this.isJumping = false;
        this.baseScale = scale;
        
        let defaultHp = 100;
        if (type == "basic") {
            this.color = 0x00ff00;
            this.speed = 0.05;
        } else if (type == "speedy") {
            this.speed = 0.15;
            this.color = 0x0000ff;
            defaultHp = 50;
        } else if (type == "tank") {
            this.color = 0xff0000;
            this.speed = 0.02;
            defaultHp = 250;
        }
        
        this.hp = hp !== 100 ? hp : defaultHp;
        this.hpMax = hpMax !== 100 ? hpMax : defaultHp;

        this.isSpawning = true;
        this.spawnProgress = 0;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 12;
        this.spawnSource = {
            x: position.x + Math.cos(spawnAngle) * spawnDist,
            y: position.y + Math.sin(spawnAngle) * spawnDist
        };

        scene.add(this.mesh);

        const textureLoader = new THREE.TextureLoader();
        const bugTexture = textureLoader.load("/asset/game_assets/textures/bug.webp");
        bugTexture.flipY = false;
        bugTexture.colorSpace = THREE.SRGBColorSpace;
        const loader = new GLTFLoader();
        loader.load("/asset/game_assets/models/bug.glb", (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1.3 * this.baseScale, 1.3 * this.baseScale, 1.3 * this.baseScale);

            this.model.rotation.y = Math.PI / 2;
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshLambertMaterial({
                        color: this.color,
                    });

                    child.material.needsUpdate = true;
                }
            });

            if (this.hpSprite) {
                this.model.add(this.hpSprite);

                this.hpSprite.position.set(0, 1.5, 0);
            }
            this.model.position.y = 1.3;
            this.mesh.add(this.model);
        });
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext("2d");
        this.hpCanvas = canvas;
        this.hpContext = context;

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.hpSprite = new THREE.Sprite(spriteMaterial);

        this.hpSprite.scale.set(2, 0.5, 1);
        this.hpSprite.position.y = 2.5;
        this.updateHpBar();
    }

    /**
     * Checks if the enemy is dead.
     * @returns {boolean} True if dead, false otherwise.
     */
    get isDead() {
        return this.hp <= 0 || this.hp === undefined;
    }

    /**
     * Gets the actual key of the enemy.
     * @returns {string} The actual key.
     */
    get actualKey() {
        return this.#actualKey;
    }

    /**
     * Gets the path the enemy is following.
     * @returns {Array<Object>} The path array.
     */
    get path() {
        return this.#path;
    }

    /**
     * Sets the path the enemy should follow.
     * @param {Array<Object>} path - The new path array.
     */
    set path(path) {
        this.#path = path;
    }

    /**
     * Reduces the enemy's health by the specified damage.
     * @param {number} nb - The amount of damage to take.
     */
    takeDamage(nb) {
        this.hp -= nb;
        if (this.hp <= 0) {
            this.hp = -1;

            this.die();
        }

        this.updateHpBar();
    }
    /**
     * Attacks the given player.
     * @param {Player} player - The player to attack.
     * @throws {Error} If no player is provided.
     */
    attack(player) {
        if (!player) {
            throw new Error("No player !");
        }
        player.hp -= this.#damage;
    }

    /**
     * Moves the enemy along its path.
     */
    move() {
        if (this.isSpawning || this.isJumping || this.jumpDelayTimer > 0) return;

        if (this.#path && this.#path.length > 0) {
            this.isJumping = true;
            this.startJumpPos = { x: this.position.x, y: this.position.y };

            this.#targetedPosition = this.#path[0].rawPosition;
            this.#actualKey = this.#path[0].key;
            this.#path.shift();

            const dx = this.#targetedPosition.x - this.startJumpPos.x;
            const dy = this.#targetedPosition.y - this.startJumpPos.y;
            this.totalJumpDist = Math.sqrt(dx * dx + dy * dy);

            AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "enemy", 0.2);
        }
    }
    /**
     * Updates the health bar visual representation.
     */
    updateHpBar() {
        const ctx = this.hpContext;
        const width = this.hpCanvas.width;
        const height = this.hpCanvas.height;
        const ratio = Math.max(0, this.hp / this.hpMax);

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = ratio > 0.3 ? "#2ecc71" : "#e74c3c";
        ctx.fillRect(5, 5, (width - 10) * ratio, height - 10);

        ctx.fillStyle = "#000000";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            `${Math.ceil(this.hp)}/${this.hpMax}`,
            width / 2,
            height / 2 + 10
        );

        this.hpSprite.material.map.needsUpdate = true;
    }
    /**
     * Updates the enemy's state and position each frame.
     * @param {Player} player - The player instance to check for collisions.
     * @param {number} deltaTime - Time elapsed since last frame.
     */
    update(player, deltaTime = 0.016) {
        if (this.isSpawning) {
            this.spawnProgress += 0.025;
            if (this.spawnProgress >= 1) {
                this.isSpawning = false;
                this.spawnProgress = 1;
                this.mesh.position.set(this.position.x * 3.2, 0, this.position.y * 3.2);
                if (this.model) {
                    this.model.position.y = 1.3;
                    this.model.rotation.x = 0;
                }
                if (this.hpSprite) this.hpSprite.visible = true;
                
                AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "enemy", 0.4);
                
                this.jumpDelayTimer = 0.07 / this.speed;
            } else {
                const currentX = this.spawnSource.x + (this.position.x - this.spawnSource.x) * this.spawnProgress;
                const currentY = this.spawnSource.y + (this.position.y - this.spawnSource.y) * this.spawnProgress;
                
                const height = 1.3 + Math.sin(this.spawnProgress * Math.PI) * 12;
                
                this.mesh.position.set(currentX * 3.2, 0, currentY * 3.2);
                const lookTarget = new THREE.Vector3(this.position.x * 3.2, 0, this.position.y * 3.2);
                if (this.mesh.parent) {
                    this.mesh.parent.localToWorld(lookTarget);
                }
                this.mesh.lookAt(lookTarget);

                if (this.model) {
                    this.model.position.y = height;
                    this.model.rotation.x = this.spawnProgress * Math.PI * 2;
                    this.model.rotation.x = this.spawnProgress * Math.PI * 2;
                }
                if (this.hpSprite) this.hpSprite.visible = false;
                
                return;
            }
        }

        if (this.jumpDelayTimer > 0) {
            this.jumpDelayTimer -= deltaTime;
            if (this.jumpDelayTimer <= 0) {
                this.jumpDelayTimer = 0;
                this.move();
            }
        }

        if (!this.#targetedPosition) return;

        const dx = this.#targetedPosition.x - this.position.x;
        const dy = this.#targetedPosition.y - this.position.y;
        let currentDist = Math.sqrt(dx * dx + dy * dy);

        const moveSpeed = 6.0;
        const moveDist = moveSpeed * deltaTime;

        if (currentDist <= moveDist) {
            this.position.x = this.#targetedPosition.x;
            this.position.y = this.#targetedPosition.y;
            currentDist = 0;
        } else if (currentDist > 0 && this.isJumping) {
            this.position.x += (dx / currentDist) * moveDist;
            this.position.y += (dy / currentDist) * moveDist;
            const newDx = this.#targetedPosition.x - this.position.x;
            const newDy = this.#targetedPosition.y - this.position.y;
            currentDist = Math.sqrt(newDx * newDx + newDy * newDy);
        }

        if (this.mesh) {
            const spacing = 3.2;
            this.mesh.position.set(
                this.position.x * spacing,
                0,
                this.position.y * spacing
            );

            if (currentDist > 0.05 && this.isJumping) {
                const targetWorldX = this.#targetedPosition.x * spacing;
                const targetWorldZ = this.#targetedPosition.y * spacing;
                const targetPos = new THREE.Vector3(targetWorldX, 0, targetWorldZ);
                if (this.mesh.parent) {
                    this.mesh.parent.localToWorld(targetPos);
                }
                this.mesh.lookAt(targetPos);
            }

            if (this.isJumping) {
                let progression =
                    this.totalJumpDist > 0
                        ? 1 - currentDist / this.totalJumpDist
                        : 1;
                progression = Math.max(0, Math.min(1, progression));

                const jumpAmplitude = 1.5;

                if (this.model) {
                    const sinePos = Math.sin(progression * Math.PI);
                    this.model.position.y = 1.6 + sinePos * jumpAmplitude;

                    const stretchFactor = 0.3 * Math.sin(progression * Math.PI) * this.baseScale;

                    this.model.scale.y = 1.3 * this.baseScale + stretchFactor;
                    this.model.scale.x = 1.3 * this.baseScale - stretchFactor * 0.5;
                    this.model.scale.z = 1.3 * this.baseScale - stretchFactor * 0.5;
                }

                if (currentDist < 0.05) {
                    this.isJumping = false;
                    if (this.model) {
                        this.model.position.y = 1.6;
                        this.model.scale.set(1.3 * this.baseScale, 1.3 * this.baseScale, 1.3 * this.baseScale);
                    }
                    this.position.x = this.#targetedPosition.x;
                    this.position.y = this.#targetedPosition.y;
                    this.totalJumpDist = 0;
                    this.jumpDelayTimer = 0.07 / this.speed;
                }
            }
        }

        let collision = this.checkCollision(player);
        
        if (!collision && player.isMoving && player.lastX !== undefined) {
            const minX = Math.min(player.lastX, player.x);
            const maxX = Math.max(player.lastX, player.x) + player.size.width;
            const minY = Math.min(player.lastY, player.y);
            const maxY = Math.max(player.lastY, player.y) + player.size.height;

            const enemyMinX = this.position.x;
            const enemyMaxX = this.position.x + this.size.width;
            const enemyMinY = this.position.y;
            const enemyMaxY = this.position.y + this.size.height;

            if (
                enemyMinX < maxX &&
                enemyMaxX > minX &&
                enemyMinY < maxY &&
                enemyMaxY > minY
            ) {
                collision = true;
            }
        }

        if (collision) {
            this.hp = -1;
            player.damage(50, "Écrasé par un ennemi.");
            this.die();
        }
    }
    /**
     * Handles the enemy's death logic, removing it from the scene.
     */
    die() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.visible = false;
        }
    }
}
