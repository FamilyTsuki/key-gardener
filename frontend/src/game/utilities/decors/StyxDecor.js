import * as THREE from "three";

export class StyxDecor {

    /**
     * Builds the decoration elements.
     * @param {any} scene - The scene.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static build(scene, decorGroup, disposables) {
        const raft = new THREE.Group();
        raft.position.set(16, -1.5, 3.2); 
        decorGroup.add(raft);

        const textureLoader = new THREE.TextureLoader();
        const woodTexture = textureLoader.load('/asset/game_assets/textures/log.webp');
        woodTexture.wrapS = THREE.RepeatWrapping;
        woodTexture.wrapT = THREE.RepeatWrapping;
        woodTexture.repeat.set(0.5, 1); 
        woodTexture.center.set(0.5, 0.5);

        const logGeo = new THREE.CylinderGeometry(1.5, 1.5, 34, 16); 
        const logMat = new THREE.MeshStandardMaterial({ 
            map: woodTexture,
            color: 0x8b5a2b, 
            roughness: 0.9,
            bumpMap: woodTexture,
            bumpScale: 0.05
        });
        
        const ropeGeo = new THREE.TorusGeometry(1.6, 0.15, 8, 16);
        const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6e5c47, roughness: 1.0 });

        for (let i = -2; i <= 2; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            log.rotation.z = Math.PI / 2; 
            log.position.set(0, 0, i * 2.8); 
            
            log.position.y += (Math.random() - 0.5) * 0.2;
            log.rotation.y += (Math.random() - 0.5) * 0.05;

            const ropeL = new THREE.Mesh(ropeGeo, ropeMat);
            ropeL.rotation.x = Math.PI / 2;
            ropeL.position.set(0, -16, 0); 
            log.add(ropeL);
            
            const ropeR = new THREE.Mesh(ropeGeo, ropeMat);
            ropeR.rotation.x = Math.PI / 2;
            ropeR.position.set(0, 16, 0);
            log.add(ropeR);

            raft.add(log);
        }

        const waterGeo = new THREE.PlaneGeometry(200, 200, 50, 50); 
        const positionAttribute = waterGeo.attributes.position;
        const originalZ = new Float32Array(positionAttribute.count);
        for (let i = 0; i < positionAttribute.count; i++) {
            originalZ[i] = positionAttribute.getZ(i);
        }
        
        const waterNorm = textureLoader.load("/asset/game_assets/textures/Water_002_SD/Water_002_NORM.webp");
        waterNorm.wrapS = THREE.RepeatWrapping;
        waterNorm.wrapT = THREE.RepeatWrapping;
        waterNorm.repeat.set(4, 4); 
        waterNorm.center.set(0.5, 0.5);
        waterNorm.rotation = Math.PI / 2; 

        const waterMat = new THREE.MeshPhongMaterial({ 
            color: 0x050B0D,
            transparent: true, 
            opacity: 0.75,
            shininess: 120,
            specular: 0x55aaaa,
            normalMap: waterNorm,
            normalScale: new THREE.Vector2(1.5, 1.5)
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -1.0;
        decorGroup.add(water);

        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x0a1c1c,
            metalness: 0.1,
            roughness: 0.9,
            flatShading: true
        });
        const floorEdgesMat = new THREE.LineBasicMaterial({ color: 0x153030, transparent: true, opacity: 0.15 });
        
        const scrollingFloors = [];
        const baseFloorBlock = this._createChaoticWall(200, 200, floorMat, floorEdgesMat, disposables);
        
        for (let i = 0; i < 2; i++) {
            const floorBlock = i === 0 ? baseFloorBlock : baseFloorBlock.clone();
            floorBlock.rotation.x = -Math.PI / 2;
            floorBlock.scale.z = 0.15;
            floorBlock.position.set(i * 200, -10.0, 0); 
            decorGroup.add(floorBlock);
            scrollingFloors.push(floorBlock);
        }

        const acidGeo = new THREE.PlaneGeometry(400, 400);
        const acidMat = new THREE.MeshStandardMaterial({
            color: 0x11ff44,
            emissive: 0x11ff44,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.2
        });
        const acidLake = new THREE.Mesh(acidGeo, acidMat);
        acidLake.rotation.x = -Math.PI / 2;
        acidLake.position.set(0, -12.5, 0);
        decorGroup.add(acidLake);

        const ambientLight = new THREE.AmbientLight(0x88ffff, 2.0);
        decorGroup.add(ambientLight);

        const topLight = new THREE.PointLight(0xaaffff, 4, 150);
        topLight.position.set(16, 12, 5);
        decorGroup.add(topLight);

        const moonLight = new THREE.DirectionalLight(0x88ffff, 3.0);
        moonLight.position.set(16, 10, -40); 
        moonLight.target.position.set(16, 0, 10); 
        decorGroup.add(moonLight);
        decorGroup.add(moonLight.target);

        disposables.push(logGeo, logMat, ropeGeo, ropeMat, waterGeo, waterMat, floorMat, floorEdgesMat, acidGeo, acidMat);

        let time = 0;
        return (deltaTime) => {
            time += deltaTime;
            
            scrollingFloors.forEach(floor => {
                floor.position.x -= 4 * deltaTime;
                if (floor.position.x < -200) {
                    floor.position.x += 400;
                }
            });

            waterNorm.offset.x = 0;
            waterNorm.offset.y += 0.01 * deltaTime;
            
            const posAttr = waterGeo.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                
                const wave1 = Math.sin(x * 0.1 - time * 2.0) * 0.4;
                const wave2 = Math.sin(y * 0.2 + time * 1.5) * 0.15;
                
                posAttr.setZ(i, originalZ[i] + wave1 + wave2);
            }
            posAttr.needsUpdate = true;
            waterGeo.computeVertexNormals(); 
            
            const raftX = 16;
            const raftY = 3.2;
            const raftWaveHeight = 
                Math.sin(raftX * 0.1 - time * 2.0) * 0.4 + 
                Math.sin(raftY * 0.2 + time * 1.5) * 0.15;
                
            const slopeX = Math.cos(raftX * 0.1 - time * 2.0) * 0.04;
            const slopeY = Math.cos(raftY * 0.2 + time * 1.5) * 0.03;
            
            water.position.y = -1.1; 
            raft.position.y = -1.5 + raftWaveHeight;
            
            raft.rotation.z = slopeX; 
            raft.rotation.x = -slopeY;

            return {
                y: raftWaveHeight,
                rotationX: -slopeY,
                rotationZ: slopeX
            };
        };
    }

    /**
     * _creates the chaotic wall.
     * @param {any} width - The width.
     * @param {any} height - The height.
     * @param {any} wallMat - The wallMat.
     * @param {any} wallEdgesMat - The wallEdgesMat.
     * @param {any} disposables - The disposables.
     */
    static _createChaoticWall(width, height, wallMat, wallEdgesMat, disposables) {
        const segsX = Math.floor(width / 10);
        const segsY = Math.floor(height / 10);
        const geo = new THREE.PlaneGeometry(width, height, segsX, segsY);
        const pos = geo.attributes.position;
        
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            
            const isEdge = x <= -width / 2 || x >= width / 2 || y <= -height / 2 || y >= height / 2;
            
            if (!isEdge) {
                const chaosX = (Math.random() - 0.5) * 8.0;
                const chaosY = (Math.random() - 0.5) * 8.0;
                pos.setX(i, x + chaosX);
                pos.setY(i, y + chaosY);
            }

            const chaosZ = (Math.random() - 0.5) * 20.0 + Math.sin(x * 0.1) * 15.0 + Math.cos(y * 0.1) * 15.0;
            pos.setZ(i, chaosZ);
        }

        const cols = segsX + 1;
        const rows = segsY + 1;
        for (let r = 0; r < rows; r++) {
            const leftIndex = r * cols;
            const rightIndex = r * cols + (cols - 1);
            pos.setZ(rightIndex, pos.getZ(leftIndex));
        }
        for (let c = 0; c < cols; c++) {
            const topIndex = c;
            const bottomIndex = (rows - 1) * cols + c;
            pos.setZ(bottomIndex, pos.getZ(topIndex));
        }

        geo.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geo, wallMat);
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMesh = new THREE.LineSegments(edgesGeo, wallEdgesMat);
        mesh.add(edgesMesh);
        
        disposables.push(geo, edgesGeo);
        return mesh;
    }
}
