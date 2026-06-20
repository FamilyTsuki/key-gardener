import { GamePhase } from "./GamePhase.js";
import ModelLoader from "../../core/utils/ModelLoader.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import { getKeyboardLayout } from "../utilities/KEYBOARD.js";
import { SurviveRenderer } from "./survive/SurviveRenderer.js";
import { DialogueBox } from "../ui/DialogueBox.js";

export class TrainingPhase extends GamePhase {
    constructor(gameEngine) {
        super(gameEngine);
        this.renderer = new SurviveRenderer(this);
        this.keyboard = null;
        this.player = null;
        this.dBox = null;
        this.isReady = false;
        this.currentLevel = 1;
    }

    async init() {
        const scene = this.gameEngine.scene;
        this.renderer.init(scene, this.gameEngine.camera, "default");

        this.keyboard = Keyboard.init(
            this.renderer.worldGroup,
            getKeyboardLayout(),
            "training"
        );

        const fireballGltf = await ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb");

        this.player = new Player(
            "Héros",
            100,
            100,
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            this.renderer.worldGroup,
            fireballGltf.scene,
            null,
            () => {},
            this.gameEngine.stats
        );

        const spawnTile = this.keyboard.find("A") || this.keyboard.keyboardLayout[0];
        this.player.offsetY = this.player.movement.getTileSurfaceHeight(spawnTile);
        this.player.renderer.updatePosition(this.player.movement);

        this.applyKeyboardFingerColors();

        this.isReady = true;

        this.gameEngine.isPaused = true;
        this.dBox = new DialogueBox();
        this.dBox.show(
            [
                "engine.trainingWelcome1",
                "engine.trainingWelcome2",
                "engine.trainingWelcome3"
            ],
            "/asset/game_assets/models/sempai.glb",
            () => {
                if (this.dBox) {
                    this.dBox.destroy();
                    this.dBox = null;
                }
                this.gameEngine.isPaused = false;
            }
        );
        this.settingsListener = () => {
            if (this.keyboard && this.keyboard.rebuild) {
                this.keyboard.rebuild(getKeyboardLayout());
                this.applyKeyboardFingerColors();
            }
        };
        window.addEventListener("settings_updated", this.settingsListener);
    }

    applyKeyboardFingerColors() {
        const settingsStr = localStorage.getItem("game_settings");
        let layoutType = "AZERTY";
        if (settingsStr) {
            try {
                const settings = JSON.parse(settingsStr);
                if (settings.keyboardLayout) {
                    layoutType = settings.keyboardLayout;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }

        const isQwerty = layoutType === "QWERTY";

        const pinkyLeft = isQwerty ? ["Q", "A", "Z"] : ["A", "Q", "W"];
        const ringLeft = isQwerty ? ["W", "S", "X"] : ["Z", "S", "X"];
        const middleLeft = ["E", "D", "C"];
        const indexLeft = ["R", "T", "F", "G", "V", "B"];

        const indexRight = isQwerty ? ["Y", "U", "H", "J", "N", "M"] : ["Y", "U", "H", "J", "N"];
        const middleRight = ["I", "K"];
        const ringRight = ["O", "L"];
        const rightPinky = isQwerty ? ["P"] : ["P", "M"];

        this.keyboard.keyboardLayout.forEach((keyObj) => {
            if (keyObj.isGround || !keyObj.mesh) return;

            const keyChar = keyObj.key.toUpperCase();
            let color = 0x111111;

            if (pinkyLeft.includes(keyChar)) color = 0x56c2e6;
            else if (ringLeft.includes(keyChar)) color = 0x8ae656;
            else if (middleLeft.includes(keyChar)) color = 0xffdf4f;
            else if (indexLeft.includes(keyChar)) color = 0xff9f4f;
            else if (indexRight.includes(keyChar)) color = 0xaf7fdf;
            else if (middleRight.includes(keyChar)) color = 0xffdf4f;
            else if (ringRight.includes(keyChar)) color = 0x8ae656;
            else if (rightPinky.includes(keyChar)) color = 0x56c2e6;

            if (keyObj.mesh.children[1] && keyObj.mesh.children[1].material) {
                keyObj.mesh.children[1].material.color.setHex(color);
                keyObj.defaultTrainingColor = color;
            }
        });
    }

    draw() {
        this.renderer.draw(this.keyboard, this.player, null);
    }

    handleKeyDown(event) {
        if (!this.player || !this.isReady || this.gameEngine.isPaused) return;

        const keyName = event.key.toUpperCase();
        const target = this.keyboard?.find(keyName);
        if (!target) return;

        target.isPressed = true;
        this.player.move({ x: target.rawPosition.x, y: target.rawPosition.y }, this.keyboard?.keyboardLayout);

        setTimeout(() => {
            target.isPressed = false;
        }, 150);
    }

    update(deltaTime) {
        if (!this.isReady || this.gameEngine.isPaused) return;

        this.player.update(deltaTime, null);
        this.renderer.updateCamera(this.gameEngine.camera, null);
        this.renderer.updateDecor(deltaTime);
    }

    cleanup() {
        this.renderer.cleanup(this.gameEngine.scene);
        if (this.keyboard && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.keyboard.group);
        }
        if (this.player && this.player.mesh && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.player.mesh);
        }
        if (this.dBox) {
            this.dBox.destroy();
            this.dBox = null;
        }
        if (this.settingsListener) {
            window.removeEventListener("settings_updated", this.settingsListener);
        }
    }
}
