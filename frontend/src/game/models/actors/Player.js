import Actor from "../Actor.js";
import Undefined from "../spells/Undefined.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ProjectileLuncher from "../spells/ProjectileLuncher.js";
import HealSpell from "../spells/HealSpells.js";
import FireCircle from "../spells/FireCircle.js";

export default class Player extends Actor {
    #wordSpells;
    #currentWord = "";

    constructor(
        playerName = "Unknown",
        hp = 100,
        hpMax = 100,
        rawPosition,
        size,
        scene,
        fireballModel,
        enemiesManager
    ) {
        const position = {
            x: rawPosition.x,
            y: rawPosition.y,
            z: rawPosition.z,
        };

        super(playerName, hp, hpMax, rawPosition, position, size);

        this.#wordSpells = [
            new Undefined(),
            new FireCircle("fire", 1, 2.3, 9000, scene, this, enemiesManager),
            new ProjectileLuncher("wasa", 25, 10000, fireballModel),
            new ProjectileLuncher("pok", 2, 10000, fireballModel),
            new HealSpell("heal", 15),
        ];

        this.targetPosition = { x: position.x, y: position.y, z: position.z };
        this.startPosition = { x: position.x, y: position.y };

        this.isMoving = false;
        this.movementProgress = 0;
        this.movementDuration = 15;
        this.currentMovementTime = 0;

        this.spacingX = 3.2;
        this.spacingZ = 3.2;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;

        this.mesh = new THREE.Group();
        this.scene = scene;
        scene.add(this.mesh);

        this.fireballModel = fireballModel;
        this.playerModel = null;

        this.jumpSound = new Audio("/asset/game_assets/sounds/jump.wav");
        this.jumpSound.volume = 0.5;

        this.damageSound = new Audio("/asset/game_assets/sounds/ouch.wav");
        this.damageSound.volume = 0.5;

        const loader = new GLTFLoader();
        loader.load("/asset/game_assets/player.glb", (gltf) => {
            this.playerModel = gltf.scene;
            this.playerModel.scale.set(1.3, 1.3, 1.3);
            this.playerModel.position.y = 0.6;
            this.mesh.add(this.playerModel);
        });

        this.elVignette = document.getElementById("damage-vignette");
    }

    get wordSpells() {
        return this.#wordSpells.map((wordSpell) => wordSpell.word);
    }

    get currentWord() {
        return this.#currentWord;
    }

    attack(word, closestEnemy = null) {
        const spell = this.#wordSpells.find(
            (wordSpell) => wordSpell.word === word
        );

        if (!spell) {
            throw new Error("There is no spell related to that word.");
        }

        return spell.effect(closestEnemy, this, this.scene);
    }

    move(newPosition) {
        if (
            this.targetPosition.x !== newPosition.x ||
            this.targetPosition.y !== newPosition.y
        ) {
            this.startPosition = { x: this.x, y: this.y };
            this.targetPosition = newPosition;

            this.isMoving = true;
            this.currentMovementTime = 0;

            this.jumpSound.currentTime = 0;
            this.jumpSound.play();
        }
    }

    update() {
        this.#wordSpells.forEach((spell) => {
            if (spell.update) {
                spell.update(16.6);
            }
        });

        if (this.isMoving) {
            this.currentMovementTime += 1;
            this.movementProgress =
                this.currentMovementTime / this.movementDuration;

            if (this.movementProgress >= 1) {
                this.movementProgress = 1;
                this.isMoving = false;
            }

            this.x =
                this.startPosition.x +
                (this.targetPosition.x - this.startPosition.x) *
                    this.movementProgress;
            this.y =
                this.startPosition.y +
                (this.targetPosition.y - this.startPosition.y) *
                    this.movementProgress;
        }

        if (this.mesh && this.playerModel) {
            const worldCurrentX = this.x * this.spacingX + this.offsetX;
            const worldCurrentZ = this.y * this.spacingZ + this.offsetZ;

            this.mesh.position.set(worldCurrentX, this.offsetY, worldCurrentZ);

            if (this.isMoving) {
                const worldTargetX =
                    this.targetPosition.x * this.spacingX + this.offsetX;
                const worldTargetZ =
                    this.targetPosition.y * this.spacingZ + this.offsetZ;

                this.mesh.lookAt(worldTargetX, this.offsetY, worldTargetZ);

                const jumpAmplitude = 2.0;
                this.playerModel.position.y =
                    0.6 +
                    Math.sin(this.movementProgress * Math.PI) * jumpAmplitude;
            } else {
                this.playerModel.position.y = 0.6;
                this.playerModel.rotation.x = 0;
            }
        }
    }

    damage(amount) {
        this.hp -= amount;
        this.damageSound.play();

        if (this.elVignette) {
            this.elVignette.classList.add("flash-red");

            setTimeout(() => {
                this.elVignette.classList.remove("flash-red");
            }, 500);
        }
    }

    handleKeyPress(key, findClosestEnemy) {
        if (key.length === 1 && key.match(/[a-z]/i)) {
            this.#currentWord += key.toLowerCase();
        } else if (key === "Backspace") {
            this.#currentWord = this.#currentWord.slice(0, -1);
        }

        const isValidPrefix = this.#wordSpells.some((spell) =>
            spell.word.startsWith(this.#currentWord)
        );

        if (!isValidPrefix) {
            this.#currentWord = "";
        } else {
            const completeSpell = this.#wordSpells.find(
                (spell) => spell.word === this.#currentWord
            );
            if (completeSpell) {
                this.#currentWord = "";
                return completeSpell.word;
            }
        }

        return false;
    }

    get wordSpellsInstances() {
        return this.#wordSpells;
    }
}
