import Actor from "../Actor.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
export default class Enemy extends Actor {
    #damage;
    #actualKey; //? String
    #targetedPosition; //? { x: Number, y: Number }
    #path; //? [Key, Key, ...]

    constructor(
        type,
        actualKey,
        scene,
        position,
        hp = 100,
        hpMax = 100,
        model = undefined,
        size = { width: 1, height: 1 },
        id = crypto.randomUUID()
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
        if (type == "basic") {
            this.color = 0x00ff00;
            this.speed = 0.05;
        } else if (type == "speedy") {
            this.speed = 0.15;
            this.color = 0x0000ff;
        } else if (type == "tank") {
            this.color = 0xff0000;
            this.speed = 0.02;
        }

        scene.add(this.mesh);

        const textureLoader = new THREE.TextureLoader();
        const bugTexture = textureLoader.load("/asset/game_assets/bug.png");
        bugTexture.flipY = false;
        bugTexture.colorSpace = THREE.SRGBColorSpace;
        const loader = new GLTFLoader();
        loader.load("/asset/game_assets/bug.glb", (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1.3, 1.3, 1.3);

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
        this.jumpSound = new Audio("/asset/game_assets/sounds/jump.wav");
        this.jumpSound.volume = 0.1;
        this.updateHpBar();
        // À la fin de ton constructeur Enemy.js
    }

    get isDead() {
        return this.hp <= 0 || this.hp === undefined;
    }
    get actualKey() {
        return this.#actualKey;
    }
    get path() {
        return this.#path;
    }
    set path(path) {
        this.#path = path;
    }
    takeDamage(nb) {
        this.hp -= nb;
        if (this.hp <= 0) {
            this.hp = -1;

            this.die();
        }

        this.updateHpBar();
    }
    attack(player) {
        if (!player) {
            throw new Error("No player !");
        }
        player.hp -= this.#damage;
    }

    move() {
        if (this.isJumping) return;

        if (this.#path.length > 0) {
            this.isJumping = true;
            this.startJumpPos = { x: this.position.x, y: this.position.y };

            this.#targetedPosition = this.#path[0].rawPosition;
            this.#actualKey = this.#path[0].key;
            this.#path.shift();

            const dx = this.#targetedPosition.x - this.startJumpPos.x;
            const dy = this.#targetedPosition.y - this.startJumpPos.y;
            this.totalJumpDist = Math.sqrt(dx * dx + dy * dy);

            // --- CORRECTION SON ---
            if (this.jumpSound) {
                // On remet à zéro pour que le "clic" soit audible à chaque saut
                this.jumpSound.currentTime = 0;

                // On baisse un peu le volume pour les ennemis (optionnel)
                this.jumpSound.volume = 0.2;

                this.jumpSound
                    .play()
                    .catch((e) => console.log("Audio play blocked"));
            }
        }
    }
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
    update(player) {
        if (!this.#targetedPosition) return;

        const dx = this.#targetedPosition.x - this.position.x;
        const dy = this.#targetedPosition.y - this.position.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        this.position.x += dx * this.speed;
        this.position.y += dy * this.speed;

        if (this.mesh) {
            const spacing = 3.2;
            this.mesh.position.set(
                this.position.x * spacing,
                0,
                this.position.y * spacing
            );

            if (currentDist > 0.05) {
                const targetWorldX = this.#targetedPosition.x * spacing;
                const targetWorldZ = this.#targetedPosition.y * spacing;
                this.mesh.lookAt(targetWorldX, 0, targetWorldZ);
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

                    const stretchFactor = 0.3 * Math.sin(progression * Math.PI);

                    this.model.scale.y = 1.3 + stretchFactor;
                    this.model.scale.x = 1.3 - stretchFactor * 0.5;
                    this.model.scale.z = 1.3 - stretchFactor * 0.5;
                }

                if (currentDist < 0.05) {
                    this.isJumping = false;
                    if (this.model) {
                        this.model.position.y = 1.6;
                        this.model.scale.set(1.3, 1.3, 1.3);
                    }
                    this.position.x = this.#targetedPosition.x;
                    this.position.y = this.#targetedPosition.y;
                    this.totalJumpDist = 0;
                }
            }
        }

        if (this.checkCollision(player)) {
            this.hp = -1;
            player.damage(50);
            this.die();
        }
    }
    die() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.visible = false;
        }
    }
}
