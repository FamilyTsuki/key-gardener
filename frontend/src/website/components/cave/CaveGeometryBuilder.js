import * as THREE from "/node_modules/three/build/three.module.js";
import { applyTriplanarMapping } from '../../../game/utilities/TextureUtils.js';

export class CaveGeometryBuilder {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.caveMesh = null;
    }

    /**
     * Builds the cave environment.
     */
    async buildCaveEnvironment() {
        const textureLoader = new THREE.TextureLoader();
        const [soilTexture, soilNormalTexture] = await Promise.all([
            textureLoader.loadAsync('/asset/game_assets/textures/soil.webp'),
            textureLoader.loadAsync('/asset/game_assets/textures/soil_normal.webp')
        ]);
        this.soilTexture = soilTexture;
        this.soilNormalTexture = soilNormalTexture;

        this.caveMesh = this.createCaveMesh();
        this.scene.add(this.caveMesh);
        this.createSpace();
        this.createStalactites();
        await this.generateDetailsProgressively();
        return this.caveMesh;
    }

    /**
     * Creates the cave mesh.
     */
    createCaveMesh() {
        const geometry = new THREE.CylinderGeometry(
            this.config.caveRadius,
            this.config.caveRadius - 20,
            this.config.caveHeight,
            66,
            400,
            true,
            2 * Math.PI / 3,
            2 * Math.PI / 3
        );

        this.applyDeformationAndColors(geometry);

        this.soilTexture.wrapS = THREE.RepeatWrapping;
        this.soilTexture.wrapT = THREE.RepeatWrapping;
        this.soilTexture.repeat.set(15, 60);

        this.soilNormalTexture.wrapS = THREE.RepeatWrapping;
        this.soilNormalTexture.wrapT = THREE.RepeatWrapping;
        this.soilNormalTexture.repeat.set(15, 60);

        const material = new THREE.MeshStandardMaterial({
            map: this.soilTexture,
            normalMap: this.soilNormalTexture,
            normalScale: new THREE.Vector2(1.5, 1.5),
            vertexColors: true,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.DoubleSide,
            flatShading: false 
        });

        applyTriplanarMapping(material, 0.02);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -this.config.caveHeight / 2 + 150;
        
        return mesh;
    }

    /**
     * Applies the deformation and colors.
 * @param {any} geometry - The geometry.
     */
    applyDeformationAndColors(geometry) {
        const positionAttribute = geometry.attributes.position;
        const vertexColors = [];
        const { holePosition, holeRadius, caveHeight, colors } = this.config;

        for (let i = 0; i < positionAttribute.count; i++) {
            let x = positionAttribute.getX(i);
            let y = positionAttribute.getY(i);
            let z = positionAttribute.getZ(i);

            const length = Math.sqrt(x * x + z * z);
            const nx = length > 0 ? x / length : 0;
            const nz = length > 0 ? z / length : 0;
            const normalizedY = (y + caveHeight / 2) / caveHeight;

            let r = length;
            if (normalizedY < 0.35) {
                const t = normalizedY / 0.35;
                r += 18 * Math.sqrt(1 - t * t);
            }
            x = nx * r;
            z = nz * r;

            let archOffset = 0;
            if (normalizedY < 0.25) {
                const xRatio = Math.abs(x) / this.config.caveRadius;
                if (xRatio < 1.0) {
                    const archFactor = 1.0 - (xRatio * xRatio);
                    archOffset = 70 * archFactor * Math.pow(1.0 - normalizedY / 0.25, 2);
                    y += archOffset;
                }
            }

            let deformationMultiplier = 1.0;
            if (normalizedY > 0.5) {
                deformationMultiplier += (normalizedY - 0.5) * 1.5; 
            }
            
            const dx = x - holePosition.x;
            const dy = y - holePosition.y;
            const dz = z - holePosition.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            let holeNoiseMultiplier = 1.0;
            if (dist < holeRadius + 15) {
                holeNoiseMultiplier = 0.15 + 0.85 * (dist / (holeRadius + 15));
            }

            const bottomNoiseFade = Math.min(1.0, normalizedY / 0.05);

            const noiseX = (Math.sin(x * 0.05 + y * 0.03) * 6 + Math.sin(x * 0.15 - y * 0.12) * 2.5) * deformationMultiplier * holeNoiseMultiplier * bottomNoiseFade;
            const noiseZ = (Math.cos(x * 0.04 - y * 0.05) * 7.5 + Math.sin(x * 0.12 + y * 0.08) * 3.5) * deformationMultiplier * holeNoiseMultiplier * bottomNoiseFade;
            const noiseY = (Math.cos(x * 0.06 + y * 0.04) * 5 + Math.cos(x * 0.18 - y * 0.15) * 2) * deformationMultiplier * holeNoiseMultiplier * bottomNoiseFade;

            let finalColor = new THREE.Color();

            if (normalizedY > 0.9) {
                finalColor.copy(colors.dirt);
            } else if (normalizedY > 0.8) {
                const t = (normalizedY - 0.8) / 0.1;
                finalColor.copy(colors.compactDirt).lerp(colors.dirt, t);
            } else if (normalizedY > 0.6) {
                const t = (normalizedY - 0.6) / 0.2;
                finalColor.copy(colors.stone).lerp(colors.compactDirt, t);
            } else if (normalizedY > 0.45) {
                finalColor.copy(colors.stone);
            } else {
                const t = normalizedY / 0.45;
                finalColor.copy(colors.deep).lerp(colors.stone, t);
            }

            let caveOffsetX = 0;
            let caveOffsetZ = 0;
            
            const dirX = holePosition.x / this.config.caveRadius;
            const dirZ = holePosition.z / this.config.caveRadius;

            if (dist < holeRadius) {
                const maxDepth = 500; 
                const progress = dist / holeRadius;
                
                let cavityDepth;
                if (progress < 0.7) {
                    cavityDepth = maxDepth;
                } else {
                    const edgeProgress = (progress - 0.7) / 0.3;
                    cavityDepth = maxDepth * (Math.cos(edgeProgress * Math.PI) + 1) / 2;
                }

                caveOffsetX = dirX * cavityDepth;
                caveOffsetZ = dirZ * cavityDepth;

                const depthRatio = cavityDepth / maxDepth;
                const caveDarkness = new THREE.Color(0x050508);
                finalColor.lerp(caveDarkness, depthRatio * 0.9);
            }

            x += nx * noiseX + caveOffsetX;
            y += noiseY;
            z += nz * noiseZ + caveOffsetZ;

            positionAttribute.setXYZ(i, x, y, z);
            vertexColors.push(finalColor.r, finalColor.g, finalColor.b);
        }

        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    }

    /**
     * Creates the space.
     */
    createSpace() {
        const starsGeometry = new THREE.BufferGeometry();
        const count = 500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 12000;
            positions[i * 3 + 1] = 3000 - Math.random() * 8000; 
            positions[i * 3 + 2] = -2500 + (Math.random() - 0.5) * 6000;
            
            color.setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        this.starsMaterial = new THREE.PointsMaterial({
            size: 4,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: false,
            fog: false
        });
        
        this.starsMaterial.userData.uniforms = {
            uTime: { value: 0 }
        };
        
        this.starsMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.starsMaterial.userData.uniforms.uTime;
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                uniform float uTime;
                void main() {
                `
            ).replace(
                'gl_PointSize = size;',
                `
                float phase = sin(position.x * 0.02 + position.y * 0.03 + position.z * 0.05) * 6.28;
                float speed = 1.2 + sin(position.x * 0.1 + position.y * 0.1) * 0.5;
                gl_PointSize = size * (0.3 + 0.7 * abs(sin(uTime * speed + phase)));
                `
            );
        };
        
        const starField = new THREE.Points(starsGeometry, this.starsMaterial);
        this.scene.add(starField);
    }

    /**
     * Creates the stalactites.
     */
    createStalactites() {
        const count = 35;
        const geometry = new THREE.CylinderGeometry(8, 2.0, 60, 10);
        geometry.translate(0, -15, 0);
        
        const material = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.2,
            flatShading: true
        });
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        const dummy = new THREE.Object3D();
        const caveY = this.caveMesh.position.y;
        const caveHeight = this.config.caveHeight;
        
        for (let i = 0; i < count; i++) {
            const theta = (7 * Math.PI / 6) + Math.random() * (2 * Math.PI / 3);
            const normalizedY = 0.0 + Math.random() * 0.08;
            const yInit = (normalizedY * caveHeight) - caveHeight / 2;
            
            let r = 55 + 20 * normalizedY;
            if (normalizedY < 0.35) {
                const t = normalizedY / 0.35;
                r += 18 * Math.sqrt(1 - t * t);
            }
            
            const xInit = Math.cos(theta) * r;
            const zInit = Math.sin(theta) * r;
            
            const noiseX = (Math.sin(xInit * 0.05 + yInit * 0.03) * 6 + Math.sin(xInit * 0.15 - yInit * 0.12) * 1.5);
            const noiseZ = (Math.cos(xInit * 0.04 - yInit * 0.05) * 7.5 + Math.sin(xInit * 0.12 + yInit * 0.08) * 2.5);
            const noiseY = (Math.cos(xInit * 0.06 + yInit * 0.04) * 5 + Math.cos(xInit * 0.18 - yInit * 0.15) * 2);
            
            const nx = xInit / r;
            const nz = zInit / r;
            
            const xFinal = xInit + nx * noiseX -10;
            const zFinal = zInit + nz * noiseZ - 30;

            let archOffset = 0;
            if (normalizedY < 0.25) {
                const xRatio = Math.abs(xInit) / this.config.caveRadius;
                if (xRatio < 1.0) {
                    const archFactor = 1.0 - (xRatio * xRatio);
                    archOffset = 70 * archFactor * Math.pow(1.0 - normalizedY / 0.25, 2);
                }
            }
            const yFinal = yInit + noiseY + caveY + archOffset;
            
            dummy.position.set(xFinal, yFinal, zFinal);
            
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.15,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.15
            );
            
            const scaleY = 0.4 + Math.random() * 0.9;
            const scaleXZ = 0.5 + Math.random() * 0.6;
            dummy.scale.set(scaleXZ, scaleY, scaleXZ);
            
            dummy.updateMatrix();
            const col = new THREE.Color();
            col.setHex(0x2a2c30);
            instancedMesh.setColorAt(i, col);
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
    }

    /**
     * Generates the details progressively.
     */
    async generateDetailsProgressively() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 0);
        const material = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.2,
            flatShading: true
        });
        
        const pebblesData = [];
        const rocksData = [];
        const mineralsData = [];

        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < this.config.pebbleCount; i++) {
            const data = this.calculatePebbleData(dummy);
            if (data.type === 'mineral') {
                mineralsData.push(data);
            } else if (data.type === 'rock') {
                rocksData.push(data);
            } else {
                pebblesData.push(data);
            }
        }

        this.addInstancedMeshFromData(pebblesData, geometry, material);
        this.addInstancedMeshFromData(rocksData, geometry, material);
        this.addInstancedMeshFromData(mineralsData, geometry, material);
    }

    /**
     * Adds the instanced mesh from data.
 * @param {any} dataArray - The dataArray.
 * @param {any} geometry - The geometry.
 * @param {any} material - The material.
     */
    addInstancedMeshFromData(dataArray, geometry, material) {
        if (dataArray.length === 0) return;
        const instancedMesh = new THREE.InstancedMesh(geometry, material, dataArray.length);
        
        for (let i = 0; i < dataArray.length; i++) {
            const data = dataArray[i];
            instancedMesh.setMatrixAt(i, data.matrix);
            instancedMesh.setColorAt(i, data.color);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;
        instancedMesh.position.y = this.caveMesh.position.y;
        
        this.scene.add(instancedMesh);
    }

    /**
     * Calculates the pebble data.
 * @param {any} dummy - The dummy.
     */
    calculatePebbleData(dummy) {
        let y, normalizedY, isMineral;
        let color = new THREE.Color();
        let scale = 1.0;
        const { caveHeight, caveRadius, colors, holePosition, holeRadius } = this.config;

        let type = 'pebble';
        let vx, vy, vz, nx, nz, nX, nY, nZ, archOffset;
        let finalHoleNoiseMultiplier = 1.0;
        let finalBottomNoiseFade = 1.0;

        while (true) {
            y = (Math.random() - 0.5) * caveHeight;
            normalizedY = (y + caveHeight / 2) / caveHeight;

            if (normalizedY > 0.8) {
                continue;
            }

            const theta = (7 * Math.PI / 6) + Math.random() * (2 * Math.PI / 3);
            let currentRadius = caveRadius * normalizedY + (caveRadius - 20) * (1 - normalizedY);
            if (normalizedY < 0.35) {
                const t = normalizedY / 0.35;
                currentRadius += 18 * Math.sqrt(1 - t * t);
            }
            
            vx = Math.cos(theta) * currentRadius;
            vy = y;
            vz = Math.sin(theta) * currentRadius;

            archOffset = 0;
            if (normalizedY < 0.25) {
                const xRatio = Math.abs(vx) / caveRadius;
                if (xRatio < 1.0) {
                    const archFactor = 1.0 - (xRatio * xRatio);
                    archOffset = 70 * archFactor * Math.pow(1.0 - normalizedY / 0.25, 2);
                }
            }

            const dx = vx - holePosition.x;
            const dy = (vy + archOffset) - holePosition.y;
            const dz = vz - holePosition.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (dist < holeRadius + 10) {
                continue;
            }

            if (dist < holeRadius + 15) {
                finalHoleNoiseMultiplier = 0.15 + 0.85 * (dist / (holeRadius + 15));
            } else {
                finalHoleNoiseMultiplier = 1.0;
            }

            finalBottomNoiseFade = Math.min(1.0, normalizedY / 0.05);

            if (normalizedY > 0.6) {
                const progress = (0.8 - normalizedY) / 0.2;
                if (Math.random() > Math.pow(progress, 0.5)) continue;
            }

            isMineral = (normalizedY <= 0.45) ? Math.random() < 0.008 : false;

            if (isMineral) {
                const mineralIndex = Math.floor(Math.random() * colors.minerals.length);
                color.copy(colors.minerals[mineralIndex]);
                scale = Math.random() * 2.0 + 7.0;
                type = 'mineral';
            } else {
                const cTop = new THREE.Color(0x8c7362);
                const cMidHigh = new THREE.Color(0x5a5c60);
                const cMidLow = new THREE.Color(0x4a4c50);
                const cBottom = new THREE.Color(0x2a2c30);
                const cDeep = colors.deep;

                if (normalizedY > 0.7) {
                    const t = (normalizedY - 0.7) / 0.1;
                    color.copy(cMidHigh).lerp(cTop, t);
                } else if (normalizedY > 0.6) {
                    const t = (normalizedY - 0.6) / 0.1;
                    color.copy(cMidLow).lerp(cMidHigh, t);
                } else if (normalizedY > 0.5) {
                    const t = (normalizedY - 0.5) / 0.1;
                    color.copy(cBottom).lerp(cMidLow, t);
                } else {
                    const t = Math.max(0, normalizedY / 0.5);
                    color.copy(cDeep).lerp(cBottom, t);
                }

                if (normalizedY > 0.6) {
                    const progress = (0.8 - normalizedY) / 0.2;
                    scale = Math.random() * 2.0 + 1.0 + (progress * 6.0);
                } else {
                    scale = Math.random() * 3.0 + 7.0;
                }
                type = scale > 4.5 ? 'rock' : 'pebble';
            }

            break;
        }

        let defMult = 1.0;
        if (normalizedY > 0.5) {
            defMult += (normalizedY - 0.5) * 1.5; 
        }
        
        nx = vx / Math.sqrt(vx*vx + vz*vz);
        nz = vz / Math.sqrt(vx*vx + vz*vz);
        
        let yWithArch = vy + archOffset;

        nX = (Math.sin(vx * 0.05 + yWithArch * 0.03) * 6 + Math.sin(vx * 0.15 - yWithArch * 0.12) * 2.5) * defMult * finalHoleNoiseMultiplier * finalBottomNoiseFade;
        nZ = (Math.cos(vx * 0.04 - yWithArch * 0.05) * 7.5 + Math.sin(vx * 0.12 + yWithArch * 0.08) * 3.5) * defMult * finalHoleNoiseMultiplier * finalBottomNoiseFade;
        nY = (Math.cos(vx * 0.06 + yWithArch * 0.04) * 5 + Math.cos(vx * 0.18 - yWithArch * 0.15) * 2) * defMult * finalHoleNoiseMultiplier * finalBottomNoiseFade;

        const embedDepth = isMineral ? 4.5 : 0.8;
        vx += nx * (nX - embedDepth);
        vy = yWithArch + nY;
        vz += nz * (nZ - embedDepth);

        dummy.position.set(vx, vy, vz);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        return {
            matrix: dummy.matrix.clone(),
            color: color.clone(),
            type: type
        };
    }
}
