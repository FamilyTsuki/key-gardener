import * as THREE from "three";
import { SurviveDecorBuilder } from "../../utilities/SurviveDecorBuilder.js";

export class FallRenderer {
    constructor(phase) {
        this.phase = phase;
        this.worldGroupPivot = new THREE.Group();
        this.worldGroup = new THREE.Group();
        this.wallContainer = null;
        this.particleContainer = null;
        this.decor = null;
        
        this.scrollingWalls = [];
        this.particles = [];
        this.disposables = [];
        this.fallTime = 0;
        this.currentRoll = 0;
    }

    /**
     * Initializes the .
 * @param {any} scene - The scene.
 * @param {any} camera - The camera.
 * @param {any} decorType - The decorType.
     */
    init(scene, camera, decorType) {
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.decor = SurviveDecorBuilder.buildDecor(decorType, scene);
        this.buildMineWalls(scene);
        this.buildMineParticles(scene);

        camera.position.set(0, -10, 70);
        camera.lookAt(0, -10, 0);
    }

    /**
     * Builds the mine walls.
 * @param {any} scene - The scene.
     */
    buildMineWalls(scene) {
        this.wallContainer = new THREE.Group();
        scene.add(this.wallContainer);

        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a, metalness: 0.1, roughness: 0.9, flatShading: true
        });
        const wallEdgesMaterial = new THREE.LineBasicMaterial({ 
            color: 0x555555, transparent: true, opacity: 0.6 
        });

        const baseWallBack = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallBack.position.set(0, 0, 15);
        
        const baseWallLeft = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallLeft.rotation.y = Math.PI / 2;
        baseWallLeft.position.set(-40, 0, 40);
        
        const baseWallRight = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallRight.rotation.y = -Math.PI / 2;
        baseWallRight.position.set(40, 0, 10);
        
        for (let i = 0; i < 4; i++) {
            const wallGroupSegment = new THREE.Group();
            wallGroupSegment.position.y = (i * 200) - 400;
            wallGroupSegment.add(baseWallBack.clone(), baseWallLeft.clone(), baseWallRight.clone());
            this.wallContainer.add(wallGroupSegment);
            this.scrollingWalls.push(wallGroupSegment);
        }
        
        this.disposables.push(wallMaterial, wallEdgesMaterial);
    }

    /**
     * Creates the chaotic wall.
 * @param {string} width - The width.
 * @param {any} height - The height.
 * @param {any} wallMaterial - The wallMaterial.
 * @param {any} wallEdgesMaterial - The wallEdgesMaterial.
     */
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
                positions.setX(i, x + (Math.random() - 0.5) * 8.0);
                positions.setY(i, y + (Math.random() - 0.5) * 8.0);
            }
            positions.setZ(i, (Math.random() - 0.5) * 20.0 + Math.sin(x * 0.1) * 15.0 + Math.cos(y * 0.05) * 10.0);
        }

        const columns = segmentsX + 1;
        const rows = segmentsY + 1;
        for (let row = 0; row < rows; row++) positions.setZ(row * columns + (columns - 1), positions.getZ(row * columns));
        for (let col = 0; col < columns; col++) positions.setZ((rows - 1) * columns + col, positions.getZ(col));

        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wallEdgesMaterial));
        
        this.disposables.push(geometry, mesh.children[0].geometry);
        return mesh;
    }

    /**
     * Builds the mine particles.
 * @param {any} scene - The scene.
     */
    buildMineParticles(scene) {
        this.particleContainer = new THREE.Group();
        scene.add(this.particleContainer);

        const lineGeometry = new THREE.CylinderGeometry(0.04, 0.04, 8, 4);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 });
        this.disposables.push(lineGeometry, lineMaterial);
        
        for (let i = 0; i < 150; i++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(Math.random() * 160 - 80, Math.random() * 300 - 200, Math.random() * 160 - 100);
            this.particleContainer.add(line);
            this.particles.push(line);
        }
    }

    /**
     * Updates the decor.
 * @param {any} deltaTime - The deltaTime.
     */
    updateDecor(deltaTime) {
        if (!this.decor) return;
        const waveData = this.decor.update(deltaTime) || { y: 0, rotationX: 0, rotationZ: 0 };
        if (this.worldGroupPivot) {
            if (typeof waveData === "number") this.worldGroupPivot.position.y = waveData;
            else {
                this.worldGroupPivot.position.y = waveData.y;
                this.worldGroupPivot.rotation.x = waveData.rotationX;
                this.worldGroupPivot.rotation.z = waveData.rotationZ;
            }
        }
    }

    /**
     * Updates the scrolling visuals.
 * @param {any} movementDelta - The movementDelta.
     */
    updateScrollingVisuals(movementDelta) {
        this.scrollingWalls.forEach(wallGroup => {
            wallGroup.position.y += movementDelta;
            if (wallGroup.position.y >= 400) wallGroup.position.y -= 800;
        });

        this.particles.forEach(particle => {
            particle.position.y += movementDelta * 1.5;
            if (particle.position.y > 60) particle.position.y -= 100;
        });
    }

    /**
     * Updates the player visuals.
 * @param {any} player - The player.
 * @param {any} deltaTime - The deltaTime.
     */
    updatePlayerVisuals(player, deltaTime) {
        if (!player || !player.playerModel) return;

        if (player.mesh) player.mesh.rotation.set(0, Math.PI, 0);

        this.fallTime += deltaTime;

        const floatY = (Math.sin(this.fallTime * 1.2) + Math.sin(this.fallTime * 0.7)) * 0.5 * 0.5;
        const floatX = (Math.cos(this.fallTime * 0.9) + Math.sin(this.fallTime * 1.4)) * 0.5 * 0.3;

        const pShakeX = (Math.random() - 0.5) * 0.03;
        const pShakeZ = (Math.random() - 0.5) * 0.03;

        player.playerModel.position.set(floatX + pShakeX, floatY, pShakeZ);
        player.playerModel.scale.set(1.95, 1.95, 1.95);
        
        const targetRoll = player.isMoving ? (player.targetPosition.x - player.startPosition.x > 0 ? -0.4 : 0.4) : 0;
        this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, deltaTime * 6);
        
        const rShakeX = (Math.random() - 0.5) * 0.015;
        const rShakeZ = (Math.random() - 0.5) * 0.015;

        player.playerModel.rotation.set(-Math.PI + rShakeX, 0, -this.currentRoll + rShakeZ);
    }

    /**
     * Cleanups.
 * @param {any} scene - The scene.
     */
    cleanup(scene) {
        if (this.worldGroupPivot) scene.remove(this.worldGroupPivot);
        if (this.wallContainer) scene.remove(this.wallContainer);
        if (this.particleContainer) scene.remove(this.particleContainer);
        if (this.decor) this.decor.cleanup();
        
        this.disposables.forEach(d => { if (d.dispose) d.dispose(); });
        this.scrollingWalls = [];
        this.particles = [];
        this.disposables = [];
    }
}
