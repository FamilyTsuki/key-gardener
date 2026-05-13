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
        playerName = "Unknow",
        hp = 100,
        hpMax = 100,
        rawPosition,
        size,
        scene,
        fireballModel,
        enemiesManager
    ) {
        const spacing = 3.2;
        const position = {
            x: rawPosition.x * spacing,
            y: rawPosition.y * spacing,
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
        this.speed = 0.1;

        this.mesh = new THREE.Group();
        this.scene = scene;
        scene.add(this.mesh);

        this.fireballModel = fireballModel;
        this.playerModel = null;
        this.jumpTimer = 0;
        this.startJumpPos = { x: position.x, y: position.y };
        this.totalJumpDist = 0;
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

    /**
     *
     * @param {String} word
     * @param {Object} closestEnemy = {instance: Enemy, dist: Number}
     */
    attack(word, closestEnemy = null) {
        const spell = this.#wordSpells.find(
            (wordSpell) => wordSpell.word === word
        );

        if (!spell) {
            throw new Error("There is no spell related to that word.");
        }

        return spell.effect(closestEnemy, this, this.scene);
    }

    /**
     *
     * @param {Object} newPos = { x: Number, y: Number }
     */
    move(newPos) {
        this.startJumpPos = { x: this.x, y: this.y };

        if (
            this.targetPosition.x !== newPos.x ||
            this.targetPosition.y !== newPos.y
        ) {
            this.jumpSound.currentTime = 0;
            this.jumpSound.play();

            this.targetPosition = newPos;

            const dx = this.targetPosition.x - this.startJumpPos.x;
            const dy = this.targetPosition.y - this.startJumpPos.y;
            this.totalJumpDist = Math.sqrt(dx * dx + dy * dy);
        }
    }
    update() {
        const dx = this.targetPosition.x - this.x;
        const dy = this.targetPosition.y - this.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const spacing = 3.2;

        this.x += dx * this.speed;
        this.y += dy * this.speed;
        this.#wordSpells.forEach((spell) => {
            if (spell.update) {
                // On passe un deltaTime approximatif (16.6ms pour 60fps)
                // Ou tu peux passer deltaTime en argument de la fonction update(dt)
                spell.update(16.6);
            }
        });
        if (this.mesh && this.playerModel) {
            this.mesh.position.set(this.x, 0, this.y);

            if (currentDist > 0.01) {
                const worldTargetX = this.targetPosition.x * spacing;
                const worldTargetZ = this.targetPosition.y * spacing;

                this.mesh.position.set(this.x * spacing, 0, this.y * spacing);

                this.mesh.lookAt(worldTargetX, 0, worldTargetZ);

                const progression =
                    this.totalJumpDist > 0
                        ? 1 - currentDist / this.totalJumpDist
                        : 1;

                const jumpAmplitude = 2.0;
                this.playerModel.position.y =
                    0.6 + Math.sin(progression * Math.PI) * jumpAmplitude;
            } else {
                this.playerModel.position.y = 0.6;
                this.playerModel.rotation.x = 0;
                this.x = this.targetPosition.x;
                this.y = this.targetPosition.y;
            }
        }
    }
    damage(nb) {
        this.hp -= nb;
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

        let ok = this.#wordSpells.some((spell) =>
            spell.word.startsWith(this.#currentWord)
        );

        if (!ok) {
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
