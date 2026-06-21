import * as THREE from 'three';
import { applyTriplanarMapping } from '../../utilities/TextureUtils.js';

export class BridgeWordAnimation {
    constructor() {
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startCameraLookAt = new THREE.Vector3();
        this.targetCameraLookAt = new THREE.Vector3();
        
        this.eventCameraPos = new THREE.Vector3();
        this.eventCameraLookAt = new THREE.Vector3();
        this.endCameraPos = new THREE.Vector3();
        this.endCameraLookAt = new THREE.Vector3();
        
        this.transitionProgress = 0;
        this.transitioningToEvent = false;
        this.transitioningToWorld = false;

        this.bridgeMeshes = [];
        this.animatingTiles = [];
        this.tilesToBuild = [];
        
        this.sharedSideMaterial = null;
        this.sharedParticleMaterial = null;
        this.sharedLineMaterial = null;
    }

    startEventTransition(worldPhase, triggerY) {
        worldPhase.isTransitioning = true; 
        this.transitioningToEvent = true;
        this.transitionProgress = 0;
        
        const playerPos = worldPhase.player.mesh.position;
        this.startCameraPos.copy(worldPhase.camera.position);
        this.startCameraLookAt.copy(playerPos);
        this.tilesToBuild = [];
        
        const triggerRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY);
        const islandRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === triggerY - 6);
        
        let triggerCenter = 0;
        if (triggerRow.length > 0) triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;

        let islandCenter = 0;
        if (islandRow.length > 0) islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;

        const startX = (triggerCenter * Math.sqrt(3) * 1.5) + 12;
        const startZ = triggerY * 2.25;

        const endX = (islandCenter * Math.sqrt(3) * 1.5) + 12;
        const endZ = (triggerY - 6) * 2.25;

        const bridgeWorldX = (startX + endX) / 2;
        const bridgeWorldZ = (startZ + endZ) / 2;

        const dirX = endX - startX;
        const dirZ = endZ - startZ;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

        const perpX = -dirZ / length;
        const perpZ = dirX / length;

        const distance = 18;
        this.eventCameraPos = new THREE.Vector3(
            bridgeWorldX + perpX * distance,
            14,
            bridgeWorldZ + perpZ * distance
        );
        this.eventCameraLookAt = new THREE.Vector3(
            bridgeWorldX,
            2,
            bridgeWorldZ
        );

        for (let progress = 1; progress <= 5; progress++) {
            const targetGridY = triggerY - progress;
            const rowTiles = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === targetGridY);
            if (rowTiles.length === 0) continue;
            
            const currentCenterX = rowTiles.reduce((sum, t) => sum + t.rawPosition.x, 0) / rowTiles.length;
            const fraction = progress / 6;
            const expectedCenterX = triggerCenter + fraction * (islandCenter - triggerCenter);
            const shiftX = Math.round(expectedCenterX - currentCenterX);
            
            let archHeight = 0;
            if (progress === 1 || progress === 5) archHeight = 0.8;
            else if (progress === 2 || progress === 4) archHeight = 1.8;
            else if (progress === 3) archHeight = 2.8;

            for (const tile of rowTiles) {
                tile.rawPosition.x += shiftX;
                tile.x = (tile.rawPosition.x * Math.sqrt(3) * 1.5) + 12;
                
                this.tilesToBuild.push({
                    tile: tile,
                    archHeight: archHeight,
                    progress: progress
                });
            }
        }
        
        this.tilesToBuild.sort((a, b) => {
            if (b.tile.rawPosition.y !== a.tile.rawPosition.y) {
                return b.tile.rawPosition.y - a.tile.rawPosition.y;
            }
            return Math.random() - 0.5;
        });
    }

    handleCameraTransition(worldPhase, deltaTime, intoEvent, onComplete) {
        this.transitionProgress += deltaTime * 0.5;
        
        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            if (intoEvent) {
                this.transitioningToEvent = false;
            } else {
                this.transitioningToWorld = false;
                worldPhase.isTransitioning = false; 
            }
            if (onComplete) onComplete();
        }

        const t = this.transitionProgress;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        let startP = intoEvent ? this.startCameraPos : this.eventCameraPos;
        let targetP = intoEvent ? this.eventCameraPos : this.endCameraPos;
        let startL = intoEvent ? this.startCameraLookAt : this.eventCameraLookAt;
        let targetL = intoEvent ? this.eventCameraLookAt : this.endCameraLookAt;
        
        worldPhase.camera.position.lerpVectors(startP, targetP, ease);
        const currentLookAt = new THREE.Vector3().lerpVectors(startL, targetL, ease);
        worldPhase.camera.lookAt(currentLookAt);
    }

    finishEvent(worldPhase) {
        this.transitioningToWorld = true;
        this.transitionProgress = 0;
        
        const playerPos = worldPhase.player.mesh.position;
        
        this.endCameraPos = new THREE.Vector3(
            playerPos.x + 5,
            playerPos.y + 21,
            playerPos.z + 14
        );
        this.endCameraLookAt = new THREE.Vector3(
            playerPos.x,
            playerPos.y,
            playerPos.z
        );
    }

    ensureSharedMaterials(worldPhase) {
        if (!this.sharedSideMaterial) {
            this.sharedSideMaterial = new THREE.MeshStandardMaterial({
                map: worldPhase.worldMap.stoneTexture,
                color: 0xffffff,
                roughness: 0.8,
                metalness: 0.2,
            });
            applyTriplanarMapping(this.sharedSideMaterial);
            
            this.sharedParticleMaterial = new THREE.PointsMaterial({
                color: 0xa855f7,
                size: 0.15,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            this.sharedLineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        }
    }

    createBridgeTileGroup(data, worldPhase) {
        const tile = data.tile;
        const archHeight = data.archHeight;
        const progress = data.progress;
        tile.renderMesh = true;
        
        const group = new THREE.Group();
        
        const sideMaterial = new THREE.MeshStandardMaterial({
            map: worldPhase.worldMap.stoneTexture,
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.2,
        });
        applyTriplanarMapping(sideMaterial);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        
        let thickness = 1.5;
        if (progress === 1 || progress === 5) thickness = 14.0;
        else if (progress === 2 || progress === 4) thickness = 3.0;

        const H = thickness - 0.4;
        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, H, 6);
        const bodyMesh = new THREE.Mesh(bodyGeometry, sideMaterial);
        bodyMesh.position.y = 1.6 - (H / 2);
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const bodyLine = new THREE.LineSegments(bodyEdges, lineMaterial);
        bodyMesh.add(bodyLine);

        const bevelGeometry = new THREE.CylinderGeometry(1.3, 1.5, 0.4, 6);
        
        let topMaterial = sideMaterial;
        if (tile.letter && worldPhase.worldMap.generateLetterTexture) {
            const tex = worldPhase.worldMap.generateLetterTexture(
                tile.letter,
                worldPhase.worldMap.stoneTexture ? worldPhase.worldMap.stoneTexture.image : null
            );
            topMaterial = new THREE.MeshStandardMaterial({
                map: tex,
                color: 0xffffff,
                roughness: 0.8,
            });
        }

        const bevelMesh = new THREE.Mesh(bevelGeometry, [
            sideMaterial,
            topMaterial,
            sideMaterial,
        ]);
        bevelMesh.position.y = 1.8;
        
        const bevelEdges = new THREE.EdgesGeometry(bevelGeometry);
        const bevelLine = new THREE.LineSegments(bevelEdges, lineMaterial);
        bevelMesh.add(bevelLine);

        group.add(bodyMesh);
        group.add(bevelMesh);

        group.material = [sideMaterial, topMaterial, sideMaterial];
        group.lineMaterial = lineMaterial;
        
        const random_z = archHeight + Math.random() * 0.4;
        tile.baseY = random_z;
        
        group.position.set(tile.x, tile.baseY - 15, tile.y);
        group.rotation.y = 0;

        worldPhase.gameEngine.scene.add(group);
        this.bridgeMeshes.push(group);

        return group;
    }

    addBridgePiece(worldPhase, targetCompletedCount, completedCount) {
        const batchesLeft = targetCompletedCount - completedCount + 1;
        if (batchesLeft <= 0 || !this.tilesToBuild || this.tilesToBuild.length === 0) return;
        
        const tilesToTake = Math.ceil(this.tilesToBuild.length / batchesLeft);
        const tilesData = this.tilesToBuild.splice(0, tilesToTake);

        this.ensureSharedMaterials(worldPhase);

        const avgX = tilesData.reduce((sum, d) => sum + d.tile.rawPosition.x, 0) / tilesData.length;
        let centerTile = tilesData[0].tile;
        let minDiff = Math.abs(centerTile.rawPosition.x - avgX);

        for (const data of tilesData) {
            const diff = Math.abs(data.tile.rawPosition.x - avgX);
            if (diff < minDiff) {
                minDiff = diff;
                centerTile = data.tile;
            }
        }

        for (const data of tilesData) {
            const group = this.createBridgeTileGroup(data, worldPhase);
            const tile = data.tile;

            this.animatingTiles.push({
                mesh: group,
                targetY: tile.baseY,
                currentY: tile.baseY - 15,
                archHeight: data.archHeight,
                isCenter: false,
                tile: tile,
                worldPhase: worldPhase
            });
        }
        
        for (const anim of this.animatingTiles) {
            if (anim.tile === centerTile) {
                anim.isCenter = true;
            }
        }
    }

    updateTileAnimations(deltaTime) {
        if (this.animatingTiles.length === 0) return;
        
        for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
            const anim = this.animatingTiles[i];
            
            if (anim.progress === undefined) {
                anim.progress = 0;
                anim.startY = anim.currentY;
                anim.duration = 0.5 + Math.random() * 0.2;
            }
            
            anim.progress += deltaTime / anim.duration;
            let finished = false;
            if (anim.progress >= 1) {
                anim.progress = 1;
                finished = true;
            }

            const t = anim.progress;
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

            anim.currentY = anim.startY + (anim.targetY - anim.startY) * ease;
            anim.mesh.position.y = anim.currentY;

            if (finished) {
                anim.mesh.position.y = anim.targetY;
                anim.tile.mesh = anim.mesh; 
                this.animatingTiles.splice(i, 1);
                
                if (anim.isCenter && anim.worldPhase) {
                    anim.worldPhase.player.move({ 
                        x: anim.tile.rawPosition.x, 
                        y: anim.tile.rawPosition.y,
                        offsetY: 2.0 + anim.tile.baseY
                    });
                }
            }
        }
    }

    cleanup(worldPhase) {
        for (const group of this.bridgeMeshes) {
            worldPhase.gameEngine.scene.remove(group);
            group.traverse((child) => {
                if (child.isMesh || child.isLineSegments) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                }
            });
        }
        this.bridgeMeshes = [];
    }
}
