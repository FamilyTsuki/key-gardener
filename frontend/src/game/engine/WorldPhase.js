import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import { WORLD_LAYOUT } from "../utilities/WORLD_LAYOUT.js";
import Player from "../models/actors/Player.js";

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
        
    }

    async init() {
        const scene = this.gameEngine.scene;
        this.worldMap = await WorldMap.init(this.gameEngine.scene, WORLD_LAYOUT);
        console.log(this.worldMap)
        this.draw_bg();
        this.player = new Player(
                    "Héros",
                    100,
                    100,
                    { x: this.worldMap.mapLayout[0].rawPosition.x, y: this.worldMap.mapLayout[0].rawPosition.y, z: 5 },
                    { width: 0.4, height: 0.4 },
                    scene,
                );
        this.player.spacingX = Math.sqrt(3) * 1.5;
        this.player.spacingZ = 1.5 * 1.5;
        this.player.offsetX = 12;
        this.player.offsetY = 3.5;
        this.player.offsetZ = 0;
        
    }

    update(deltaTime) {
        this.player.update();
        if (this.player && this.player.mesh) {
            const playerPos = this.player.mesh.position;
            
            this.camera.position.set(
                playerPos.x+5,
                playerPos.y + 23    ,
                playerPos.z + 17
            );
            
            this.camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
        }
    }

    draw() {
        if (this.worldMap) {
            this.worldMap.update(this.player ? { x: this.player.x, y: this.player.y } : null);
        }
    }

    draw_bg() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.gameEngine.scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(10, 20, 10);
        this.gameEngine.scene.add(sunLight);
        
        const fillLight = new THREE.PointLight(0x0088ff, 0.5);
        fillLight.position.set(-10, 10, -10);
        this.gameEngine.scene.add(fillLight);
    }

    handleKeyDown(event) {
        const keyName = event.key.toUpperCase();
        
        let target = null;
        if (this.worldMap) {
            target = this.worldMap.find(keyName , this.player.position.y);
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
        if (this.worldMap) {
            this.gameEngine.scene.remove(this.worldMap.group);
        }
    }
}
