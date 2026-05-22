import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import { WORLD_LAYOUT } from "../utilities/WORLD_LAYOUT.js";
import Player from "../models/actors/Player.js";
import { SurvivePhase } from "./SurvivePhase.js";

export class WorldPhase extends GamePhase {
    constructor(gameEngine) {
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

        this.isDoorSequenceActive = false;
        this.doorSequence = ["O", "P", "E", "N"];
        this.doorSequenceIndex = 0;
        this.isTransitioning = false;
        this.isDoorOpen = false;
        this.isOpeningDoor = false;
        this.enterPromptOverlay = null;
    }

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
    }

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
                const doorTile = this.worldMap.mapLayout.find(
                    (t) => t.isDoorTile
                );
                if (doorTile) {
                    const dx = doorTile.rawPosition.x - this.player.x;
                    const dy = doorTile.rawPosition.y - this.player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (!this.isDoorOpen && !this.isOpeningDoor) {
                        if (dist < 2.5 && !this.isDoorSequenceActive) {
                            this.startDoorSequence();
                        }
                    } else if (this.isDoorOpen) {
                        if (dist < 0.5) {
                            this.showEnterPrompt();
                        } else {
                            this.hideEnterPrompt();
                        }
                    }
                }
            }
        }
    }

    startDoorSequence() {
        this.isDoorSequenceActive = true;
        this.doorSequenceIndex = 0;

        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("door-mini-game-overlay");

        document.body.appendChild(this.uiOverlay);
        this.updateDoorUI();
    }

    updateDoorUI() {
        if (!this.uiOverlay) return;
        this.uiOverlay.innerHTML = "";

        this.doorSequence.forEach((letter, index) => {
            const letterBox = document.createElement("div");
            letterBox.innerText = letter;
            letterBox.classList.add("door-mini-game-letter");

            if (index < this.doorSequenceIndex) {
                letterBox.classList.add("done");
            } else if (index === this.doorSequenceIndex) {
                letterBox.classList.add("active");
            } else {
                letterBox.classList.add("pending");
            }
            this.uiOverlay.appendChild(letterBox);
        });
    }

    async completeDoorSequence() {
        this.isDoorSequenceActive = false;
        this.isOpeningDoor = true;

        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }

        if (this.worldMap) {
            await this.worldMap.openDoor();
        }

        this.isOpeningDoor = false;
        this.isDoorOpen = true;
    }

    showEnterPrompt() {
        if (this.enterPromptOverlay) return;

        this.enterPromptOverlay = document.createElement("div");
        this.enterPromptOverlay.classList.add(
            "door-mini-game-overlay",
            "enter-prompt-overlay"
        );

        const enterKey = document.createElement("div");
        enterKey.classList.add("enter-prompt-key");
        enterKey.innerHTML = `
            <svg width="40" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
        `;

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("enter-prompt-title");
        titleDiv.innerText = "Entrer dans le portail";

        this.enterPromptOverlay.appendChild(titleDiv);
        this.enterPromptOverlay.appendChild(enterKey);

        document.body.appendChild(this.enterPromptOverlay);
    }

    hideEnterPrompt() {
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
    }

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

    draw_bg() {
        this.gameEngine.scene.background = new THREE.Color(0x0a0c10);
        this.gameEngine.scene.fog = new THREE.Fog(0x0a0c10, 40, 100);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
        this.gameEngine.scene.add(ambientLight);

        this.playerLight = new THREE.PointLight(0xffddaa, 500, 120);
        this.playerLight.position.set(0, 7, 0);
        this.gameEngine.scene.add(this.playerLight);
    }

    handleKeyDown(event) {
        if (this.isDoorSequenceActive) {
            const keyName = event.key.toUpperCase();
            if (keyName === this.doorSequence[this.doorSequenceIndex]) {
                this.doorSequenceIndex++;
                this.updateDoorUI();
                if (this.doorSequenceIndex >= this.doorSequence.length) {
                    this.completeDoorSequence();
                }
            } else {
                if (this.uiOverlay) {
                    this.doorSequenceIndex = 0;
                    this.updateDoorUI();
                    this.uiOverlay.classList.remove("error");
                    void this.uiOverlay.offsetWidth;
                    this.uiOverlay.classList.add("error");

                    if (this.errorTimeout) clearTimeout(this.errorTimeout);
                    this.errorTimeout = setTimeout(() => {
                        if (this.uiOverlay)
                            this.uiOverlay.classList.remove("error");
                    }, 400);
                }
            }
            return;
        }

        if (this.isTransitioning) return;

        const keyName = event.key.toUpperCase();

        if (this.isDoorOpen && keyName === "ENTER") {
            const doorTile = this.worldMap.mapLayout.find((t) => t.isDoorTile);
            if (doorTile) {
                const dx = doorTile.rawPosition.x - this.player.x;
                const dy = doorTile.rawPosition.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 2.5) {
                    this.isTransitioning = true;
                    this.hideEnterPrompt();
                    this.gameEngine.setPhase(new SurvivePhase(this.gameEngine));
                    return;
                }
            }
        }

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

    cleanup() {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
        if (this.worldMap) {
            this.gameEngine.scene.remove(this.worldMap.group);
        }
    }
}
