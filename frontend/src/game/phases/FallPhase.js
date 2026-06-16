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

        this.decor = SurviveDecorBuilder.buildDecor(this.decorType, scene);
        
        this.buildMineWalls(scene);
        this.buildMineParticles(scene);

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

        const baseWallBack = this.createChaoticWall(160, 200, wallMaterial, wallEdgesMaterial);
        baseWallBack.position.set(16, 0, -25);
        
        const baseWallLeft = this.createChaoticWall(160, 200, wallMaterial, wallEdgesMaterial);
        baseWallLeft.rotation.y = Math.PI / 2;
        baseWallLeft.position.set(-40, 0, 0);
        
        const baseWallRight = this.createChaoticWall(160, 200, wallMaterial, wallEdgesMaterial);
        baseWallRight.rotation.y = -Math.PI / 2;
        baseWallRight.position.set(72, 0, 0);
        
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

            const chaosZ = (Math.random() - 0.5) * 20.0 + Math.sin(x * 0.1) * 15.0 + Math.cos(y * 0.1) * 15.0;
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

        if (this.player) {
            this.player.update(deltaTime, null);
            
            if (this.player.mesh) {
                const playerWorldPosition = new THREE.Vector3();
                this.player.mesh.getWorldPosition(playerWorldPosition);
                
                this.gameEngine.camera.position.lerp(
                    new THREE.Vector3(
                        playerWorldPosition.x,
                        playerWorldPosition.y + 10,
                        playerWorldPosition.z + 15
                    ),
                    0.05
                );
                
                this.gameEngine.camera.lookAt(playerWorldPosition);
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
        
        this.disposables.forEach(resource => {
            if (resource.dispose) {
                resource.dispose();
            }
        });
        
        this.scrollingWalls = [];
        this.particles = [];
        this.disposables = [];
    }
}