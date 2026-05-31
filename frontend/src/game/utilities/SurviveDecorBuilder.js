import * as THREE from "three";

/**
 * Utility class responsible for building various decorative environments for the SurvivePhase.
 */
export class SurviveDecorBuilder {
    /**
     * Main entry point to build and add the requested decor to the scene.
     *
     * @param {string} type - The type of decor to build (e.g., 'mine', 'styx').
     * @param {THREE.Scene} scene - The Three.js scene to attach the decor to.
     * @returns {{decorGroup: THREE.Group, update: Function, cleanup: Function}} Object containing the decor group, the update loop function, and the memory cleanup function.
     */
    static buildDecor(type, scene) {
        const decorGroup = new THREE.Group();
        const disposables = [];
        let updateFn = () => {};

        scene.add(decorGroup);

        if (type === "styx") {
            updateFn = this._buildStyxDecor(scene, decorGroup, disposables);
        } else if (type === "mine") {
            updateFn = this._buildMineDecor(scene, decorGroup, disposables);
        } else {
            this._buildDefaultDecor(scene, decorGroup);
        }

        const cleanupFn = () => {
            disposables.forEach(item => item.dispose());
            scene.remove(decorGroup);
        };

        return { decorGroup, update: updateFn, cleanup: cleanupFn };
    }

    /**
     * Builds the "styx" environment featuring a raft on a moving river.
     *
     * @param {THREE.Scene} scene - The Three.js scene.
     * @param {THREE.Group} decorGroup - The parent group for all decor meshes.
     * @param {Array<{dispose: Function}>} disposables - Array accumulating materials and geometries for cleanup.
     * @returns {Function} The update loop function for this specific decor.
     */
    static _buildStyxDecor(scene, decorGroup, disposables) {
        const raft = new THREE.Group();
        raft.position.set(16, -1.5, 3.2); 
        decorGroup.add(raft);

        const textureLoader = new THREE.TextureLoader();
        const woodTexture = textureLoader.load('/asset/game_assets/log.jpg');
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
        
        const waterNorm = textureLoader.load("/asset/game_assets/Water_002_SD/Water_002_NORM.jpg");
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
            color: 0x0a1c1c, // Darker color
            metalness: 0.1,
            roughness: 0.9,
            flatShading: true
        });
        const floorEdgesMat = new THREE.LineBasicMaterial({ color: 0x153030, transparent: true, opacity: 0.15 });
        
        const scrollingFloors = [];
        for (let i = 0; i < 2; i++) {
            const floorBlock = this._createChaoticWall(200, 200, floorMat, floorEdgesMat, disposables);
            floorBlock.rotation.x = -Math.PI / 2;
            floorBlock.scale.z = 0.15; // Flatten the chaotic spikes so they stay safely underwater
            floorBlock.position.set(i * 200, -10.0, 0); 
            decorGroup.add(floorBlock);
            scrollingFloors.push(floorBlock);
        }

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

        disposables.push(logGeo, logMat, ropeGeo, ropeMat, waterGeo, waterMat, floorMat, floorEdgesMat);

        let time = 0;
        return (deltaTime) => {
            time += deltaTime;
            
            scrollingFloors.forEach(floor => {
                floor.position.x -= 4 * deltaTime; // Slower scrolling speed
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
     * Builds the "mine" environment featuring a falling vintage elevator and scrolling chaotic walls.
     *
     * @param {THREE.Scene} scene - The Three.js scene.
     * @param {THREE.Group} decorGroup - The parent group for all decor meshes.
     * @param {Array<{dispose: Function}>} disposables - Array accumulating materials and geometries for cleanup.
     * @returns {Function} The update loop function for this specific decor.
     */
    static _buildMineDecor(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0x222222);
        scene.fog = new THREE.FogExp2(0x222222, 0.0035);

        this._buildMineElevator(decorGroup, disposables);
        const topLight = this._buildMineLighting(decorGroup);
        const lines = this._buildMineParticles(decorGroup, disposables);
        const scrollingWalls = this._buildMineWalls(decorGroup, disposables);
        this._buildMineClutter(decorGroup, disposables);

        return () => {
            topLight.intensity = 3.5 + Math.random() * 1.5;
            
            lines.forEach(line => {
                line.position.y += 2.0; 
                if (line.position.y > 60) {
                    line.position.y = -20;
                    line.position.x = Math.random() * 60 - 15;
                    line.position.z = Math.random() * 60 - 30;
                }
            });

            scrollingWalls.forEach(wallGroup => {
                wallGroup.position.y += 2;
                if (wallGroup.position.y > 150) {
                    wallGroup.position.y -= 400;
                }
            });

            return { y: 0, rotationX: 0, rotationZ: 0 };
        };
    }

    /**
     * Builds additional clutter (crates, control panel, barrels) to fill the empty space in the elevator.
     * @param {THREE.Group} decorGroup - The parent group.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     */
    static _buildMineClutter(decorGroup, disposables) {
        const woodMat = new THREE.MeshStandardMaterial({ 
            color: 0x3d2314,
            roughness: 0.9,
            metalness: 0.1
        });
        const crateGeo1 = new THREE.BoxGeometry(4, 4, 4);
        const crateGeo2 = new THREE.BoxGeometry(6, 3, 4);
        const plankGeo = new THREE.BoxGeometry(8, 0.2, 1.5);
        disposables.push(woodMat, crateGeo1, crateGeo2, plankGeo);

        const crate1 = new THREE.Mesh(crateGeo1, woodMat);
        crate1.position.set(-1, 2, -15);
        crate1.rotation.y = 0.2;
        decorGroup.add(crate1);

        const crate2 = new THREE.Mesh(crateGeo1, woodMat);
        crate2.position.set(2, 2, -17);
        crate2.rotation.y = -0.1;
        decorGroup.add(crate2);

        const crate3 = new THREE.Mesh(crateGeo2, woodMat);
        crate3.position.set(32, 1.5, -14);
        crate3.rotation.y = 0.4;
        decorGroup.add(crate3);

        const crate4 = new THREE.Mesh(crateGeo1, woodMat);
        crate4.position.set(31, 4.5, -15);
        crate4.rotation.y = 0.1;
        decorGroup.add(crate4);

        const crate5 = new THREE.Mesh(crateGeo1, woodMat);
        crate5.position.set(34, 2, -17);
        crate5.rotation.y = -0.3;
        decorGroup.add(crate5);

        for(let i=0; i<3; i++) {
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(
                Math.random() * 26 + 2, 
                0.1, 
                -12 - Math.random() * 5
            );
            plank.rotation.y = Math.random() * Math.PI;
            decorGroup.add(plank);
        }

        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x444455,
            metalness: 0.6,
            roughness: 0.7
        });
        const barrelGeo = new THREE.CylinderGeometry(1.5, 1.5, 4, 16);
        disposables.push(metalMat, barrelGeo);

        const barrel1 = new THREE.Mesh(barrelGeo, metalMat);
        barrel1.position.set(-2, 2, -8);
        decorGroup.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, metalMat);
        barrel2.position.set(0, 2, -10);
        decorGroup.add(barrel2);

        const barrel3 = new THREE.Mesh(barrelGeo, metalMat);
        barrel3.position.set(34, 2, -8);
        decorGroup.add(barrel3);

        const brassMat = new THREE.MeshStandardMaterial({ 
            color: 0xc5a059,
            metalness: 0.8,
            roughness: 0.2
        });
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.5,
            roughness: 0.5
        });
        const pedestalGeo = new THREE.CylinderGeometry(0.5, 1, 4, 16);
        const consoleGeo = new THREE.BoxGeometry(3, 0.5, 2);
        disposables.push(brassMat, panelMat, pedestalGeo, consoleGeo);

        const controlGroup = new THREE.Group();
        const pedestal = new THREE.Mesh(pedestalGeo, brassMat);
        pedestal.position.set(0, 2, 0);
        controlGroup.add(pedestal);

        const consoleMesh = new THREE.Mesh(consoleGeo, panelMat);
        consoleMesh.position.set(0, 4, 0);
        consoleMesh.rotation.x = 0.3;
        controlGroup.add(consoleMesh);

        controlGroup.position.set(16, 0, -17);
        decorGroup.add(controlGroup);
    }

    /**
     * Builds the internal elevator structure (pillars, frames, and wooden floor).
     *
     * @param {THREE.Group} decorGroup - The parent group for the elevator meshes.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     */
    static _buildMineElevator(decorGroup, disposables) {
        const brassMat = new THREE.MeshStandardMaterial({ 
            color: 0xc5a059,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const pillarGeo = new THREE.BoxGeometry(2, 60, 2);
        const beamHGeo = new THREE.BoxGeometry(42, 2, 2);
        const beamDGeo = new THREE.BoxGeometry(2, 2, 42);
        
        disposables.push(brassMat, pillarGeo, beamHGeo, beamDGeo);

        const corners = [
            [-4, 20], [36, 20], [-4, -20], [36, -20]
        ];
        
        corners.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeo, brassMat);
            pillar.position.set(pos[0], 10, pos[1]);
            decorGroup.add(pillar);
        });

        this._buildMineGrates(decorGroup, disposables, brassMat, beamHGeo, beamDGeo);
        
        [35, 50].forEach(y => {
            const tBack = new THREE.Mesh(beamHGeo, brassMat);
            tBack.position.set(16, y, -20);
            decorGroup.add(tBack);
            
            const tFront = new THREE.Mesh(beamHGeo, brassMat);
            tFront.position.set(16, y, 20);
            decorGroup.add(tFront);
            
            const tLeft = new THREE.Mesh(beamDGeo, brassMat);
            tLeft.position.set(-4, y, 0);
            decorGroup.add(tLeft);
            
            const tRight = new THREE.Mesh(beamDGeo, brassMat);
            tRight.position.set(36, y, 0);
            decorGroup.add(tRight);
        });

        const floorGeo = new THREE.PlaneGeometry(42, 42);
        const textureLoader = new THREE.TextureLoader();
        const woodTexture = textureLoader.load('/asset/game_assets/wood.jpg');
        woodTexture.wrapS = THREE.RepeatWrapping;
        woodTexture.wrapT = THREE.RepeatWrapping;
        woodTexture.repeat.set(1, 4);
        
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: woodTexture,
            color: 0xa08060,
            roughness: 0.8 
        });
        
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(16, -0.5, 0);
        decorGroup.add(floor);

        disposables.push(floorGeo, floorMat);
    }

    /**
     * Builds the accordion-style metal grates around the elevator.
     *
     * @param {THREE.Group} decorGroup - The parent group.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     * @param {THREE.Material} brassMat - The brass material for the handrails.
     * @param {THREE.Geometry} beamHGeo - The horizontal beam geometry for the trims.
     * @param {THREE.Geometry} beamDGeo - The depth beam geometry for the trims.
     */
    static _buildMineGrates(decorGroup, disposables, brassMat, beamHGeo, beamDGeo) {
        const grateMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.5
        });
        disposables.push(grateMat);

        const createAccordionGrate = (w, h, segs) => {
            const group = new THREE.Group();
            const segW = w / segs;
            const diag = Math.sqrt(segW * segW + h * h);
            const angle = Math.atan2(h, segW);
            const cylGeo = new THREE.CylinderGeometry(0.3, 0.3, diag, 4);
            disposables.push(cylGeo);
            
            for(let i = 0; i < segs; i++) {
                const x = -w / 2 + segW / 2 + i * segW;
                
                const cross1 = new THREE.Mesh(cylGeo, grateMat);
                cross1.position.set(x, h / 2, 0);
                cross1.rotation.z = angle;
                group.add(cross1);
                
                const cross2 = new THREE.Mesh(cylGeo, grateMat);
                cross2.position.set(x, h / 2, 0);
                cross2.rotation.z = -angle;
                group.add(cross2);
            }
            return group;
        };

        const grateH = 8;
        
        const gBack = createAccordionGrate(40, grateH, 10);
        gBack.position.set(16, -0.5, -20);
        decorGroup.add(gBack);

        const gFront = createAccordionGrate(40, grateH, 10);
        gFront.position.set(16, -0.5, 20);
        decorGroup.add(gFront);

        const gLeft = createAccordionGrate(40, grateH, 10);
        gLeft.rotation.y = Math.PI / 2;
        gLeft.position.set(-4, -0.5, 0);
        decorGroup.add(gLeft);

        const gRight = createAccordionGrate(40, grateH, 10);
        gRight.rotation.y = Math.PI / 2;
        gRight.position.set(36, -0.5, 0);
        decorGroup.add(gRight);

        const trimBack = new THREE.Mesh(beamHGeo, brassMat);
        trimBack.position.set(16, 7.5, -20);
        decorGroup.add(trimBack);
        
        const trimFront = new THREE.Mesh(beamHGeo, brassMat);
        trimFront.position.set(16, 7.5, 20);
        decorGroup.add(trimFront);
        
        const trimLeft = new THREE.Mesh(beamDGeo, brassMat);
        trimLeft.position.set(-4, 7.5, 0);
        decorGroup.add(trimLeft);
        
        const trimRight = new THREE.Mesh(beamDGeo, brassMat);
        trimRight.position.set(36, 7.5, 0);
        decorGroup.add(trimRight);
    }

    /**
     * Sets up the lighting specific to the mine decor.
     *
     * @param {THREE.Group} decorGroup - The parent group for the lights.
     * @returns {THREE.PointLight} The main point light inside the elevator used for flickering.
     */
    static _buildMineLighting(decorGroup) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
        decorGroup.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x222233, 0.8);
        decorGroup.add(hemiLight);

        const topLight = new THREE.PointLight(0xffb74d, 5, 150);
        topLight.position.set(16, 20, 0);
        decorGroup.add(topLight);

        return topLight;
    }

    /**
     * Builds ascending speed lines to simulate the elevator falling rapidly.
     *
     * @param {THREE.Group} decorGroup - The parent group.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     * @returns {Array<THREE.Mesh>} The array of particle meshes to update in the loop.
     */
    static _buildMineParticles(decorGroup, disposables) {
        const particleCount = 40;
        const lineGeo = new THREE.CylinderGeometry(0.04, 0.04, 8, 4);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 });
        disposables.push(lineGeo, lineMat);
        
        const lines = [];
        for(let i = 0; i < particleCount; i++) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(
                Math.random() * 60 - 15,
                Math.random() * 80 - 20,
                Math.random() * 60 - 30
            );
            decorGroup.add(line);
            lines.push(line);
        }
        return lines;
    }

    /**
     * Builds the giant rocky walls outside the elevator that scroll upwards.
     *
     * @param {THREE.Group} decorGroup - The parent group.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     * @returns {Array<THREE.Group>} The array of wall groups to scroll in the update loop.
     */
    static _buildMineWalls(decorGroup, disposables) {
        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            metalness: 0.1,
            roughness: 0.9,
            flatShading: true
        });
        const wallEdgesMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.6 });
        
        const scrollingWalls = [];
        
        for (let i = 0; i < 2; i++) {
            const wallGroup = new THREE.Group();
            wallGroup.position.y = i * 200 - 50;
            
            const wallBack = this._createChaoticWall(160, 200, wallMat, wallEdgesMat, disposables);
            wallBack.position.set(16, 0, -55);
            wallGroup.add(wallBack);
            
            const wallLeft = this._createChaoticWall(160, 200, wallMat, wallEdgesMat, disposables);
            wallLeft.rotation.y = Math.PI / 2;
            wallLeft.position.set(-40, 0, 0);
            wallGroup.add(wallLeft);
            
            const wallRight = this._createChaoticWall(160, 200, wallMat, wallEdgesMat, disposables);
            wallRight.rotation.y = -Math.PI / 2;
            wallRight.position.set(72, 0, 0);
            wallGroup.add(wallRight);
            
            decorGroup.add(wallGroup);
            scrollingWalls.push(wallGroup);
        }
        
        disposables.push(wallMat, wallEdgesMat);
        return scrollingWalls;
    }

    /**
     * Procedurally generates a highly chaotic rock wall mesh with displaced vertices.
     *
     * @param {number} width - The width of the wall.
     * @param {number} height - The height of the wall.
     * @param {THREE.Material} wallMat - The material for the rocky faces.
     * @param {THREE.Material} wallEdgesMat - The material for the wireframe edges.
     * @param {Array<{dispose: Function}>} disposables - Array for memory cleanup.
     * @returns {THREE.Mesh} The generated wall mesh.
     */
    static _createChaoticWall(width, height, wallMat, wallEdgesMat, disposables) {
        const geo = new THREE.PlaneGeometry(width, height, Math.floor(width / 10), Math.floor(height / 10));
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
        geo.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geo, wallMat);
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMesh = new THREE.LineSegments(edgesGeo, wallEdgesMat);
        mesh.add(edgesMesh);
        
        disposables.push(geo, edgesGeo);
        return mesh;
    }

    /**
     * Builds a basic fallback or default decor.
     *
     * @param {THREE.Scene} scene - The Three.js scene.
     * @param {THREE.Group} decorGroup - The parent group.
     */
    static _buildDefaultDecor(scene, decorGroup) {
        scene.background = new THREE.Color(0x0a0c10);
        scene.fog = new THREE.Fog(0x0a0c10, 40, 100);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        decorGroup.add(ambientLight);
    }
}
