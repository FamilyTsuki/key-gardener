import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import Player from "../models/actors/Player.js";
import { SurviveDecorBuilder } from "../utilities/SurviveDecorBuilder.js";

export class FallPhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        
        this.decorType = typeof options === "string" ? options : (options.decorType || "default");
        
        this.decor = null;
        this.player = null;
        this.worldGroupPivot = null;
        this.worldGroup = null;
        this.isReady = false;

        this.scrollingWalls = [];
        this.particles = [];
        this.disposables = [];
        this.wallContainer = null;
        this.particleContainer = null;

        this.laneWords = ["left", "right", "center"];
        this.currentTypedWord = "";
        this.uiCurrentWord = null;

        this.obstacles = [];
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 1.5;
        this.obstacleSpeed = 20;

        this.obstacleGeometry = new THREE.BoxGeometry(10.5, 4.5, 30.5);
        this.obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.disposables.push(this.obstacleGeometry, this.obstacleMaterial);
    }

    async init() {
        const scene = this.gameEngine.scene;
        
        this.worldGroupPivot = new THREE.Group();
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup = new THREE.Group();
        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.player = new Player(
            "Hero",
            100,
            100,
            { x: 0, y: 15, z: 5 },
            { width: 0.4, height: 0.4 },
            this.worldGroup,
            null,
            null,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );

        this.player.allowSpeedUp = false;
        this.player.movementDuration = 35;

        this.decor = SurviveDecorBuilder.buildDecor(this.decorType, scene);
        
        this.buildMineWalls(scene);
        this.buildMineParticles(scene);

        this.uiCurrentWord = document.getElementById("currentWord");
        if (this.uiCurrentWord && this.uiCurrentWord.parentElement) {
            this.uiCurrentWord.parentElement.classList.remove("none");
            this.uiCurrentWord.textContent = "";
        }

        this.gameEngine.camera.position.set(0, -10, 70);
        this.gameEngine.camera.lookAt(0, -10, 0);

        if (this.player.loadPromise) {
            await this.player.loadPromise;
            
            if (this.player.mesh) {
                this.player.mesh.rotation.set(0, Math.PI, 0);
            }
            if (this.player.playerModel) {
                this.player.playerModel.rotation.set(-Math.PI, 0, 0);
                this.player.playerModel.position.y = 0;
            }
        }
        this.waitForLoader().then(() => {
            this.isReady = true;
        });
    }

    buildMineWalls(scene) {
        this.wallContainer = new THREE.Group();
        scene.add(this.wallContainer);

        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            metalness: 0.1,
            roughness: 0.9,
            flatShading: true
        });
        
        const wallEdgesMaterial = new THREE.LineBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.6 
        });

        const baseWallBack = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallBack.position.set(16, 0, 15);
        
        const baseWallLeft = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallLeft.rotation.y = Math.PI / 2;
        baseWallLeft.position.set(-40, 0, 40);
        
        const baseWallRight = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallRight.rotation.y = -Math.PI / 2;
        baseWallRight.position.set(40, 0, 10);
        
        for (let i = 0; i < 4; i++) {
            const wallGroupSegment = new THREE.Group();
            wallGroupSegment.position.y = (i * 200) - 400;
            
            wallGroupSegment.add(baseWallBack.clone());
            wallGroupSegment.add(baseWallLeft.clone());
            wallGroupSegment.add(baseWallRight.clone());
            
            this.wallContainer.add(wallGroupSegment);
            this.scrollingWalls.push(wallGroupSegment);
        }
        
        this.disposables.push(wallMaterial, wallEdgesMaterial);
    }

    createChaoticWall(width, height, wallMaterial, wallEdgesMaterial) {
        const segmentsX = Math.floor(width / 10);
        const segmentsY = Math.floor(height / 10);
        const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            const isEdge = x <= -width / 2 || x >= width / 2 || y <= -height / 2 || y >= height / 2;
            
            if (!isEdge) {
                const chaosX = (Math.random() - 0.5) * 8.0;
                const chaosY = (Math.random() - 0.5) * 8.0;
                positions.setX(i, x + chaosX);
                positions.setY(i, y + chaosY);
            }

            const chaosZ = (Math.random() - 0.5) * 20.0 + Math.sin(x * 0.1) * 15.0 + Math.cos(y * 0.05) * 10.0;
            positions.setZ(i, chaosZ);
        }

        const columns = segmentsX + 1;
        const rows = segmentsY + 1;
        
        for (let row = 0; row < rows; row++) {
            const leftIndex = row * columns;
            const rightIndex = row * columns + (columns - 1);
            positions.setZ(rightIndex, positions.getZ(leftIndex));
        }
        
        for (let col = 0; col < columns; col++) {
            const topIndex = col;
            const bottomIndex = (rows - 1) * columns + col;
            positions.setZ(bottomIndex, positions.getZ(topIndex));
        }

        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMesh = new THREE.LineSegments(edgesGeometry, wallEdgesMaterial);
        
        mesh.add(edgesMesh);
        
        this.disposables.push(geometry, edgesGeometry);
        
        return mesh;
    }

    buildMineParticles(scene) {
        this.particleContainer = new THREE.Group();
        scene.add(this.particleContainer);

        const particleCount = 150; 
        const lineGeometry = new THREE.CylinderGeometry(0.04, 0.04, 8, 4);
        const lineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xaaaaaa, 
            transparent: true, 
            opacity: 0.4 
        });
        
        this.disposables.push(lineGeometry, lineMaterial);
        
        for (let i = 0; i < particleCount; i++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);

            line.position.set(
                Math.random() * 160 - 60,
                Math.random() * 300 - 200,
                Math.random() * 160 - 100
            );
            this.particleContainer.add(line);
            this.particles.push(line);
        }
    }
    buildLaneLabels(scene) {
        this.laneLabelsContainer = new THREE.Group();
        scene.add(this.laneLabelsContainer);

        const lanes = [
            { word: "LEFT", x: -3.2 },
            { word: "CENTER", x: 0 },
            { word: "RIGHT", x: 3.2 }
        ];

        lanes.forEach(lane => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 128;
            const context = canvas.getContext("2d");

            context.clearRect(0, 0, canvas.width, canvas.height);
            
            context.fillStyle = "rgba(0, 0, 0, 0.5)";
            context.beginPath();
            context.roundRect(10, 20, 236, 88, 15);
            context.fill();

            context.font = "bold 42px sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = "#ffffff";
            context.fillText(lane.word, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(material);

            sprite.scale.set(10, 5, 1);
            sprite.position.set(lane.x, 40, 0);

            this.laneLabelsContainer.add(sprite);
            this.disposables.push(texture, material);
        });
    }

    spawnObstacle() {
        const lanes = [-6, 0, 6];
        const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
        const obstacleMesh = new THREE.Mesh(this.obstacleGeometry, this.obstacleMaterial);
        
        const playerSpacingX = this.player ? this.player.spacingX : 3.2;
        const playerSpacingZ = this.player ? this.player.spacingZ : 3.2;
        
        obstacleMesh.position.set(
            targetLane * playerSpacingX,
            -200,
            (this.player ? this.player.targetPosition.y : 0) * playerSpacingZ
        );
        
        obstacleMesh.userData = { lane: targetLane, isHit: false };
        
        this.wallContainer.add(obstacleMesh);
        this.obstacles.push(obstacleMesh);
    }

    updateUIWord() {
        if (this.uiCurrentWord) {
            this.uiCurrentWord.textContent = this.currentTypedWord;
        }
    }

    movePlayerToLane(laneX) {
        this.player.move({ 
            x: laneX * 6, 
            y: this.player.targetPosition.y 
        });
        this.currentTypedWord = "";
        this.updateUIWord();
    }
    
    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            if (!loader) return resolve();
            
            const checkHidden = setInterval(() => {
                if (loader.classList.contains("hidden")) {
                    clearInterval(checkHidden);
                    const onEnd = () => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    };
                    loader.addEventListener("transitionend", onEnd);
                    setTimeout(() => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    }, 600); 
                }
            }, 50);
        });
    }

    update(deltaTime) {
        if (!this.isReady) return;
        
        const wallScrollSpeed = 30;
        if (!this.player.isAlive()) {
            return;
        }
        this.scrollingWalls.forEach(wallGroupSegment => {
            wallGroupSegment.position.y += wallScrollSpeed * deltaTime;
            if (wallGroupSegment.position.y >= 400) {
                wallGroupSegment.position.y -= 800;
            }
        });

        const particleScrollSpeed = 70;
        this.particles.forEach(particle => {
            particle.position.y += particleScrollSpeed * deltaTime;
            if (particle.position.y > 60) {
                particle.position.y -= 100;
            }
        });

        this.obstacleSpawnTimer += deltaTime;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacleMesh = this.obstacles[i];
            obstacleMesh.position.y += this.obstacleSpeed * deltaTime;

            if (this.player && this.player.mesh) {
                const distanceY = Math.abs(obstacleMesh.position.y - this.player.mesh.position.y);
                if (distanceY < 1.5 && !obstacleMesh.userData.isHit && obstacleMesh.userData.lane === this.player.targetPosition.x) {
                    this.player.damage(20, "Percuté par un obstacle en chute libre");
                    obstacleMesh.userData.isHit = true;
                    obstacleMesh.visible = false;
                }
            }

            if (obstacleMesh.position.y > 50) {
                this.wallContainer.remove(obstacleMesh);
                this.obstacles.splice(i, 1);
            }
        }

        if (this.player) {
            this.player.update(deltaTime, null);
            
            if (this.player.mesh) {
                this.player.mesh.rotation.set(0, Math.PI, 0); 
            }

            if (this.player.playerModel) {
                this.player.playerModel.position.y = 0;
                this.player.playerModel.scale.set(1.95, 1.95, 1.95);
                
                const diveTiltX = -Math.PI; 
                
                let targetRoll = 0;
                
                if (this.player.isMoving) {
                    const dx = this.player.targetPosition.x - this.player.startPosition.x;
                    targetRoll = dx > 0 ? -0.4 : 0.4;
                }
                
                if (this.currentRoll === undefined) this.currentRoll = 0;

                this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, deltaTime * 6);
                
                this.player.playerModel.rotation.set(diveTiltX, 0, -this.currentRoll);
            }
            
        }

        if (this.decor) {
            const waveData = this.decor.update(deltaTime) || { y: 0, rotationX: 0, rotationZ: 0 };
            if (this.worldGroupPivot) {
                if (typeof waveData === "number") {
                    this.worldGroupPivot.position.y = waveData;
                } else {
                    this.worldGroupPivot.position.y = waveData.y;
                    this.worldGroupPivot.rotation.x = waveData.rotationX;
                    this.worldGroupPivot.rotation.z = waveData.rotationZ;
                }
            }
        }
    }
    draw() {
    }

    handleKeyDown(event) {
        if (!this.isReady || !this.player || this.player.isMoving) return;

        if (event.key === "Backspace") {
            this.currentTypedWord = this.currentTypedWord.slice(0, -1);
            this.updateUIWord();
            return;
        }

        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.currentTypedWord += event.key.toLowerCase();
            
            const isValidPrefix = this.laneWords.some(word => word.startsWith(this.currentTypedWord));

            if (!isValidPrefix) {
                this.currentTypedWord = "";
            } else {
                if (this.currentTypedWord === "left") {
                    this.movePlayerToLane(-1);
                } else if (this.currentTypedWord === "right") {
                    this.movePlayerToLane(1);
                } else if (this.currentTypedWord === "center") {
                    this.movePlayerToLane(0);
                }
            }
            this.updateUIWord();
        }
    }

    cleanup() {
        if (this.player && this.player.mesh && this.worldGroup) {
            this.worldGroup.remove(this.player.mesh);
        }
        if (this.worldGroupPivot) {
            this.gameEngine.scene.remove(this.worldGroupPivot);
        }
        if (this.decor) {
            this.decor.cleanup();
        }
        
        if (this.wallContainer) {
            this.gameEngine.scene.remove(this.wallContainer);
        }
        if (this.particleContainer) {
            this.gameEngine.scene.remove(this.particleContainer);
        }

        if (this.uiCurrentWord) {
            this.uiCurrentWord.textContent = "";
            if (this.uiCurrentWord.parentElement) {
                this.uiCurrentWord.parentElement.classList.add("none");
            }
        }
        
        this.disposables.forEach(resource => {
            if (resource.dispose) {
                resource.dispose();
            }
        });
        
        this.scrollingWalls = [];
        this.particles = [];
        this.obstacles = [];
        this.disposables = [];
    }
}