import { GamePhase } from "./GamePhase.js";
import ModelLoader from "../../core/utils/ModelLoader.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import { getKeyboardLayout } from "../utilities/KEYBOARD.js";
import { SurviveRenderer } from "./survive/SurviveRenderer.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { TrainingUI } from "./training/TrainingUI.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { AudioManager } from "../managers/AudioManager.js";

export class TrainingPhase extends GamePhase {
    constructor(gameEngine) {
        super(gameEngine);
        this.renderer = new SurviveRenderer(this);
        this.keyboard = null;
        this.player = null;
        this.dBox = null;
        this.ui = null;
        this.isReady = false;
        this.currentLevel = 1;
        this.trainingState = "IDLE"; 
        this.currentTyped = "";
        this.correctTyped = "";
        this.errorTimeout = null;
        this.exerciseWords = [];
        this.exerciseIndex = 0;
        this.exerciseStartTime = 0;
        this.totalKeystrokes = 0;
    }

    async init() {
        AudioManager.init();
        const scene = this.gameEngine.scene;
        this.renderer.init(scene, this.gameEngine.camera, "training");

        this.keyboard = Keyboard.init(
            this.renderer.worldGroup,
            getKeyboardLayout(),
            "training"
        );

        const [fireballGltf, sempaiGltf] = await Promise.all([
            ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/sempai.glb")
        ]);

        this.sempaiModel = sempaiGltf.scene;
        this.sempaiModel.position.set(14.4, 4.2, -8); 
        this.sempaiModel.scale.set(3.5, 3.5, 3.5); 
        this.renderer.worldGroup.add(this.sempaiModel);

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
            this.gameEngine.stats,
            this.gameEngine.unlockedSpells
        );

        const spawnTile = this.keyboard.find("A") || this.keyboard.keyboardLayout[0];
        this.player.offsetY = this.player.movement.getTileSurfaceHeight(spawnTile);
        this.player.renderer.updatePosition(this.player.movement);

        if (this.player.loadPromise) {
            await this.player.loadPromise;
        }

        this.applyKeyboardFingerColors();

        this.isReady = true;

        this.ui = new TrainingUI();

        this.gameEngine.isPaused = true;
        this.dBox = new DialogueBox();
        this.dBox.show(
            [
                "engine.trainingWelcome1",
                "engine.trainingWelcome2",
                "engine.trainingWelcome3",
                "engine.trainingWelcome4"
            ],
            "/asset/game_assets/models/sempai.glb",
            () => {
                if (this.dBox) {
                    this.dBox.destroy();
                    this.dBox = null;
                }
                this.exercisesDone = 0;
                this.gameEngine.isPaused = false;
                this.startExercise("PHRASES");
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

    promptExercise() {
        if (!this.dBox) this.dBox = new DialogueBox();
        
        let promptKey = "engine.trainingPrompt";
        if (this.exercisesDone >= 3) {
            promptKey = "engine.trainingEncourage";
        }
        
        this.dBox.show(
            [promptKey],
            "/asset/game_assets/models/sempai.glb",
            () => {
                if (this.dBox) {
                    this.dBox.destroy();
                    this.dBox = null;
                }
                this.gameEngine.isPaused = false;
                this.trainingState = "WAITING_ANSWER";
                this.currentTyped = "";
                this.correctTyped = "";
                if (this.errorTimeout) {
                    clearTimeout(this.errorTimeout);
                    this.errorTimeout = null;
                }
                this.ui.showPrompt(LanguageManager.t(promptKey), ["SIMON", "ALPHABET", "SYLLABES", "PHRASES", "REFUSER"], this.currentTyped);
            }
        );
    }

    startExercise(type) {
        this.trainingState = "EXERCISE";
        this.currentExerciseType = type;
        this.currentTyped = "";
        this.correctTyped = "";
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        this.exerciseIndex = 0;
        this.totalKeystrokes = 0;
        this.exerciseStartTime = Date.now();

        if (type === "SIMON") {
            this.simonTotalRounds = 20;
            this.simonRoundTimes = [];
            this.startSimonRound();
            return;
        }

        if (type === "ALPHABET") {
            this.exerciseWords = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
            this.ui.showExercise(this.exerciseWords[0], "", "Alphabet Sprint");
            return;
        }

        if (type === "PHRASES") {
            const phrases = [
                "LE PETIT CHAPERON ROUGE",
                "JE SUIS TON PERE",
                "IL FAIT BEAU AUJOURDHUI",
                "LA VIE EST BELLE",
                "SURVIVRE EST MON DEVOIR"
            ];
            this.exerciseWords = phrases.sort(() => 0.5 - Math.random()).slice(0, 3);
            this.ui.showExercise(this.exerciseWords[0], "", `Phrase 1 / ${this.exerciseWords.length}`);
            return;
        }

        const syllabes = ["CH", "OU", "TR", "ION", "ENT", "TION", "MENT", "QUE", "QU", "EAU", "BL", "PR", "BR", "GR", "FR", "VR"];
        let wordCount = 20;
        let availableWords = syllabes;

        this.exerciseWords = [];
        for (let i = 0; i < wordCount; i++) {
            this.exerciseWords.push(availableWords[Math.floor(Math.random() * availableWords.length)]);
        }

        this.ui.showExercise(this.exerciseWords[0], "", `Syllabe 1 / ${wordCount}`);
    }

    startSimonRound() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.simonTargetKey = letters[Math.floor(Math.random() * letters.length)];
        this.simonRoundStartTime = Date.now();
        
        const targetObj = this.keyboard?.find(this.simonTargetKey);
        if (targetObj && targetObj.mesh && targetObj.mesh.children[1]) {
            targetObj.tempSimonColor = targetObj.mesh.children[1].material.color.getHex();
            targetObj.mesh.children[1].material.color.setHex(0xff0000); 
        }

        this.ui.showExercise(this.simonTargetKey, "", `Réflexes ${this.exerciseIndex + 1} / ${this.simonTotalRounds}`);
    }

    finishExercise() {
        this.trainingState = "RESULT";
        this.ui.hide();
        
        this.gameEngine.isPaused = true;
        this.dBox = new DialogueBox();
        let resultMsg = "";

        if (this.currentExerciseType === "SIMON") {
            const avgTime = Math.round(this.simonRoundTimes.reduce((a, b) => a + b, 0) / this.simonRoundTimes.length);
            resultMsg = LanguageManager.t("engine.trainingResultSimon") || "Impressionnant ! Ton temps de réaction moyen est de {ms} millisecondes.";
            resultMsg = resultMsg.replace("{ms}", avgTime.toString());
        } else if (this.currentExerciseType === "ALPHABET") {
            const durationSec = ((Date.now() - this.exerciseStartTime) / 1000).toFixed(1);
            resultMsg = LanguageManager.t("engine.trainingResultAlphabet") || "Pas mal ! Tu as tapé l'alphabet en {sec} secondes.";
            resultMsg = resultMsg.replace("{sec}", durationSec.toString());
        } else {
            const durationMin = (Date.now() - this.exerciseStartTime) / 60000;
            const wpm = Math.round((this.totalKeystrokes / 5) / durationMin);
            resultMsg = LanguageManager.t("engine.trainingResult") || "Bravo ! Ta vitesse est de {wpm} MPM.";
            resultMsg = resultMsg.replace("{wpm}", wpm.toString());
        }

        this.dBox.show(
            [resultMsg],
            "/asset/game_assets/models/sempai.glb",
            () => {
                this.exercisesDone = (this.exercisesDone || 0) + 1;
                this.promptExercise(); 
            }
        );
    }

    cancelExercise() {
        this.trainingState = "IDLE";
        this.ui.hide();
        this.gameEngine.isPaused = true;
        this.dBox = new DialogueBox();
        
        localStorage.setItem('unlockedFingersColors', 'true');

        this.dBox.show(
            [
                "engine.trainingRefused",
                "engine.trainingRefused2",
                "engine.trainingRefused3"
            ],
            "/asset/game_assets/models/sempai.glb",
            () => {
                if (this.dBox) {
                    this.dBox.destroy();
                    this.dBox = null;
                }
                this.gameEngine.isPaused = false;
                this.gameEngine.returnFromTraining();
            }
        );
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
        if (target) {
            if (!this.player.targetPosition || 
                this.player.targetPosition.x !== target.rawPosition.x || 
                this.player.targetPosition.y !== target.rawPosition.y) {
                target.isPressed = true;
                this.player.move({ x: target.rawPosition.x, y: target.rawPosition.y }, this.keyboard?.keyboardLayout);
                setTimeout(() => {
                    target.isPressed = false;
                }, 150);
            }
        }

        if (this.trainingState === "WAITING_ANSWER") {
            this.handleWaitingAnswerKey(event.key);
        } else if (this.trainingState === "EXERCISE") {
            this.handleExerciseKey(event.key);
        }
    }

    handleWaitingAnswerKey(key) {
        if (key === "Backspace") {
            if (this.errorTimeout) {
                clearTimeout(this.errorTimeout);
                this.errorTimeout = null;
                this.currentTyped = this.correctTyped || "";
            } else {
                this.currentTyped = this.currentTyped.slice(0, -1);
                this.correctTyped = this.currentTyped;
            }
        } else if (key.length === 1 && key.match(/[a-z]/i)) {
            if (this.errorTimeout) {
                clearTimeout(this.errorTimeout);
                this.errorTimeout = null;
                this.currentTyped = this.correctTyped || "";
            } else {
                this.correctTyped = this.currentTyped;
            }

            const char = key.toUpperCase();
            const tempTyped = this.currentTyped + char;
            
            const options = ["SIMON", "ALPHABET", "SYLLABES", "PHRASES", "REFUSER"];
            
            let isPrefix = false;
            for (const opt of options) {
                if (opt.startsWith(tempTyped)) {
                    isPrefix = true;
                    break;
                }
            }

            if (isPrefix) {
                this.currentTyped = tempTyped;
                this.correctTyped = this.currentTyped;
                
                if (options.includes(this.currentTyped)) {
                    if (this.currentTyped === "REFUSER") {
                        this.cancelExercise();
                    } else {
                        this.startExercise(this.currentTyped);
                    }
                    return;
                }
            } else {
                this.currentTyped = tempTyped;
                this.errorTimeout = setTimeout(() => {
                    this.currentTyped = this.correctTyped;
                    this.errorTimeout = null;
                    let promptKey = "engine.trainingPrompt";
                    if (this.exercisesDone >= 3) promptKey = "engine.trainingEncourage";
                    this.ui.showPrompt(LanguageManager.t(promptKey), options, this.currentTyped);
                }, 300);
            }
        }

        let promptKey = "engine.trainingPrompt";
        if (this.exercisesDone >= 3) promptKey = "engine.trainingEncourage";
        this.ui.showPrompt(LanguageManager.t(promptKey), ["SIMON", "ALPHABET", "SYLLABES", "PHRASES", "REFUSER"], this.currentTyped);
    }

    handleExerciseKey(key) {
        if (this.currentExerciseType === "SIMON") {
            if (key.length === 1 && key.match(/[a-z]/i)) {
                const char = key.toUpperCase();
                if (char === this.simonTargetKey) {
                    this.simonRoundTimes.push(Date.now() - this.simonRoundStartTime);
                    
                    const targetObj = this.keyboard?.find(this.simonTargetKey);
                    if (targetObj && targetObj.mesh && targetObj.mesh.children[1] && targetObj.tempSimonColor !== undefined) {
                        targetObj.mesh.children[1].material.color.setHex(targetObj.tempSimonColor);
                    }

                    this.exerciseIndex++;
                    if (this.exerciseIndex >= this.simonTotalRounds) {
                        this.finishExercise();
                    } else {
                        this.startSimonRound();
                    }
                }
            }
            return;
        }

        if (key === " ") key = "SPACE";

        if ((key.length === 1 && key.match(/[a-z]/i)) || key === "SPACE") {
            if (this.errorTimeout) {
                clearTimeout(this.errorTimeout);
                this.errorTimeout = null;
                this.currentTyped = this.correctTyped || "";
            } else {
                this.correctTyped = this.currentTyped;
            }

            const char = key === "SPACE" ? " " : key.toUpperCase();
            const currentWord = this.exerciseWords[this.exerciseIndex];
            
            if (char === currentWord[this.currentTyped.length]) {
                this.currentTyped += char;
                this.correctTyped = this.currentTyped;
                if (char !== " ") this.totalKeystrokes++;
            } else {
                this.currentTyped = this.correctTyped + char;
                this.errorTimeout = setTimeout(() => {
                    this.currentTyped = this.correctTyped;
                    this.errorTimeout = null;
                    
                    let label = "Syllabe";
                    if (this.currentExerciseType === "ALPHABET") label = "Sprint";
                    if (this.currentExerciseType === "PHRASES") label = "Phrase";
                    this.ui.showExercise(this.exerciseWords[this.exerciseIndex], this.currentTyped, `${label} ${this.exerciseIndex + 1} / ${this.exerciseWords.length}`);
                }, 300);
            }

            if (this.currentTyped === currentWord && !this.errorTimeout) {
                this.exerciseIndex++;
                this.currentTyped = "";
                this.correctTyped = "";
                
                if (this.exerciseIndex >= this.exerciseWords.length) {
                    this.finishExercise();
                    return;
                }
            }
            
            let label = "Syllabe";
            if (this.currentExerciseType === "ALPHABET") label = "Sprint";
            if (this.currentExerciseType === "PHRASES") label = "Phrase";

            this.ui.showExercise(this.exerciseWords[this.exerciseIndex], this.currentTyped, `${label} ${this.exerciseIndex + 1} / ${this.exerciseWords.length}`);
        }
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
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        if (this.dBox) {
            this.dBox.destroy();
            this.dBox = null;
        }
        if (this.sempaiModel && this.renderer.worldGroup) {
            this.renderer.worldGroup.remove(this.sempaiModel);
            this.sempaiModel = null;
        }
        if (this.settingsListener) {
            window.removeEventListener("settings_updated", this.settingsListener);
        }
    }
}
