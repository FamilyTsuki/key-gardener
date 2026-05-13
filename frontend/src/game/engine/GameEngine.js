import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Game from "../systems/Game.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";
export class GameEngine {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        if (!this.canvas) {
            throw new Error("Canvas element #game-canvas not found.");
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x434343, 1);

        this.isRunning = false;
        this.lastTime = 0;
        this.myGame = null;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(10, 20, 10);
        this.scene.add(sunLight);
        const fillLight = new THREE.PointLight(0x0088ff, 0.5);

        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        this.resize();
        window.addEventListener("resize", () => this.resize());

        window.addEventListener("keydown", (e) => {
            const keyName = e.key.toUpperCase();
            const keyTile = this.myGame.keyboard.find(keyName);
            if (keyTile) keyTile.isPressed = true;

            if (this.myGame.player) {
                const target = this.myGame.keyboard.find(keyName);

                if (target) {
                    this.myGame.enemies.updatePath(
                        target.key,
                        this.myGame.keyboard
                    );

                    this.myGame.player.move({
                        x: target.rawPosition.x,
                        y: target.rawPosition.y,
                    });
                }
            }
        });
    }

    async init() {
        this.myGame = await Game.init(this.scene, KEYBOARD_LAYOUT);
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }

        const referenceWidth = 1200;
        const ratio = width / referenceWidth;

        if (ratio < 1) {
            const zoomOut = 1 / ratio;
            this.camera?.position.set(16, 15 * zoomOut, 10 * zoomOut);
        } else {
            this.camera?.position.set(16, 15, 10);
        }

        this.camera?.lookAt(16, 2, 2);
        console.log("Resizing canvas...");
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

    loop(currentTime) {
        this.myGame.update();

        if (!this.isRunning) return;
        if (!this.renderer || !this.myGame?.player) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.loop(time));

        this.myGame.player.update();

        if (this.myGame.player.mesh) {
            const spacing = 3.2;

            const targetX = this.myGame.player.position.x;
            const targetY = this.myGame.player.position.y;

            this.myGame.player.mesh.position.set(
                targetX * spacing,
                1.5,
                targetY * spacing
            );
        }
        if (this.myGame && this.myGame.keyboard) {
            this.myGame.keyboard.keyboardLayout.forEach((tile) => {
                const isPlayerOnTile =
                    Math.abs(this.myGame.player.position.x * 3.2 - tile.x) <
                        0.4 &&
                    Math.abs(this.myGame.player.position.y * 3.2 - tile.y) <
                        0.4;

                tile.isPressed = isPlayerOnTile;
            });

            this.myGame.keyboard.update();
        }
    }

    update(deltaTime) {}

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }
}
