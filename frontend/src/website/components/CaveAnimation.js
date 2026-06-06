import * as THREE from "/node_modules/three/build/three.module.js";
import { gsap } from "/node_modules/gsap/index.js";
import { ScrollTrigger } from "/node_modules/gsap/ScrollTrigger.js";
import { GLTFLoader } from "/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { applyTriplanarMapping } from '../../game/utilities/TextureUtils.js';

export class CaveAnimation {
    constructor(containerElement) {
        this.containerElement = containerElement;
        this.config = this.initializeConfiguration();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
        
        this.caveMesh = null;
        this.instancedPebbles = null;
        this.animationFrameId = null;
        this.scrollTween = null;
        this.hasInitializedTimeout = false;
        
        this.mixers = [];
    }

    initializeConfiguration() {
        return {
            fogDensity: 0.0025,
            fogColor: 0x0a0a14,
            ambientLightColor: 0x505055,
            ambientLightIntensity: 12.0,
            caveHeight: 1000,
            caveRadius: 75,
            holeRadius: 30.0,
            holePosition: new THREE.Vector3(21.7, 450, -67.9),
            colors: {
                dirt: new THREE.Color(0x6b5341),
                compactDirt: new THREE.Color(0x3d2f25),
                stone: new THREE.Color(0x2a2c30),
                deep: new THREE.Color(0x110502),
                minerals: [
                    new THREE.Color(0xffaa00),
                    new THREE.Color(0x00aaff),
                    new THREE.Color(0xff2222)
                ]
            },
            pebbleCount: 4000
        };
    }

    async init() {
        gsap.registerPlugin(ScrollTrigger);
        this.setupEnvironment();
        this.setupLights();
        await this.buildCaveEnvironment();
        this.setupRenderer();
        this.setupScrollTrigger();
        this.attachEvents();
        this.startRendering();

        this.generateDetailsProgressively();

        const canvas = this.renderer.domElement;
        if (canvas) {
            requestAnimationFrame(() => {
                canvas.style.opacity = "1";
            });
        }
    }

    setupEnvironment() {
        this.scene.fog = new THREE.FogExp2(this.config.fogColor, this.config.fogDensity);
        this.scene.add(this.camera);
        this.camera.position.set(0, 100, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(this.config.ambientLightColor, this.config.ambientLightIntensity);
        this.scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffeedd, 15000, 1000);
        flashLight.position.set(0, 0, 0);
        this.camera.add(flashLight);

        const midLight = new THREE.PointLight(0x5577aa, 9000, 600);
        midLight.position.set(0, -400, 0);
        this.scene.add(midLight);
    }

    async buildCaveEnvironment() {
        this.caveMesh = this.createCaveMesh();
        this.scene.add(this.caveMesh);

        this.createSpace();
        this.createStalactites();

        await this.loadModels();
    }

    loadModels() {
        return new Promise((resolve) => {
            const loader = new GLTFLoader();
            let loadedCount = 0;
            const checkDone = () => {
                loadedCount++;
                if (loadedCount === 3) resolve();
            };
            
            loader.load('/asset/game_assets/models/bone.glb', (gltf) => {
                const boneModel = gltf.scene;
                
                for (let i = 0; i < 20; i++) { 
                    const s = 1.2 + (i / 15);
                    boneModel.scale.set(s, s, s);
                    const bone = boneModel.clone();
                    this.positionModelOnWall(bone, 0.8, 1.0, i);
                    this.scene.add(bone);
                }

                const arrowGroup = new THREE.Group();
                const arrowScale = 2.0;

                const stemBone = boneModel.clone();
                stemBone.scale.set(arrowScale, arrowScale, arrowScale);
                stemBone.position.set(0, 3, 0);
                stemBone.rotation.reorder("ZYX");
                stemBone.rotation.set(Math.PI / 2, -Math.PI / 11, Math.PI / 2);
                arrowGroup.add(stemBone);

                const rightWing = boneModel.clone();
                rightWing.scale.set(arrowScale/1.8, arrowScale/1.5, arrowScale/1.5);
                rightWing.position.set(3.2, 0.6, -0.5);
                rightWing.rotation.reorder("ZYX");
                rightWing.rotation.set(Math.PI / 3, -Math.PI / 9, Math.PI / 4);
                arrowGroup.add(rightWing);

                const leftWing = boneModel.clone();
                leftWing.scale.set(arrowScale/1.8, arrowScale/1.8, arrowScale/1.8);
                leftWing.position.set(-3, 1.2, 1);
                leftWing.rotation.reorder("ZYX");
                leftWing.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
                arrowGroup.add(leftWing);

                arrowGroup.position.set(33, 68, -71);
                arrowGroup.rotation.set(0, -0.3, 0);
                this.scene.add(arrowGroup);
                this.scrollArrowGroup = arrowGroup;

                checkDone();
            });
            
            loader.load('/asset/game_assets/models/player.glb', (gltf) => {
                const playerMesh = gltf.scene;
                
                const absoluteHolePos = this.config.holePosition.clone();
                absoluteHolePos.y += -this.config.caveHeight / 2 + 150;
                const dir = new THREE.Vector3(this.config.holePosition.x, 0, this.config.holePosition.z).normalize();

                const right = dir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

                const dioramaCenter = absoluteHolePos.clone().add(dir.clone().multiplyScalar(50));

                const playerPos = dioramaCenter.clone().add(right.clone().multiplyScalar(14));
                const bugPos = dioramaCenter.clone().add(right.clone().multiplyScalar(-14));

                const eyeGeo = new THREE.SphereGeometry(2.5, 16, 16);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x850000, fog: false }); 
                
                const eyesGroup = new THREE.Group();
                
                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-5, 0, 0);
                leftEye.scale.set(0.4, 2, 2); 
                
                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(5, 0, 0);
                rightEye.scale.set(0.4, 2, 2);
                
                eyesGroup.add(leftEye);
                eyesGroup.add(rightEye);

                const depth = 400; 
                const basePos = absoluteHolePos.clone().add(dir.clone().multiplyScalar(depth));

                eyesGroup.position.copy(basePos);

                eyesGroup.lookAt(absoluteHolePos.x, absoluteHolePos.y, absoluteHolePos.z);

                const eyeLight = new THREE.PointLight(0xff0000, 100, 40);
                eyesGroup.add(eyeLight);
                
                this.scene.add(eyesGroup);

                const keycapGroup = new THREE.Group();
                const keyBaseMat = new THREE.MeshStandardMaterial({color: 0x333333, roughness: 0.6, flatShading: true});
                const keyTopMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8});

                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#111111';
                ctx.fillRect(0, 0, 256, 256);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 160px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('A', 128, 140);
                const letterTexture = new THREE.CanvasTexture(canvas);

                const letterMat = new THREE.MeshStandardMaterial({map: letterTexture, roughness: 0.8, color: 0xffffff});
                const keyTopMaterials = [
                    keyTopMat, keyTopMat,
                    letterMat, keyTopMat,
                    keyTopMat, keyTopMat
                ];
                
                const keyBase = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), keyBaseMat);
                const keyTop = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 12), keyTopMaterials);
                keyTop.position.y = 3.5;
                
                keycapGroup.add(keyBase);
                keycapGroup.add(keyTop);
                
                keycapGroup.position.copy(playerPos);
                keycapGroup.position.y -= 14;

                keycapGroup.rotation.set(Math.random() * 0.2, Math.random() * 0.5, Math.random() * 0.2);
                this.scene.add(keycapGroup);

                const playerContainer = new THREE.Group();
                playerContainer.scale.set(12.5, 12.5, 12.5);
                playerContainer.position.copy(playerPos);
                playerContainer.position.y += 2;
                playerContainer.position.x += 0;

                playerContainer.lookAt(bugPos);

                playerMesh.rotation.y = Math.PI / 6;
                playerMesh.rotation.x = Math.PI / 13;
                playerMesh.rotation.z = 0;
                
                playerContainer.add(playerMesh);
                this.scene.add(playerContainer);

                const spellOrbGroup = new THREE.Group();
                spellOrbGroup.position.copy(dioramaCenter);
                spellOrbGroup.position.y += 5;
                
                const spellGeo = new THREE.SphereGeometry(1.5, 16, 16);
                const spellMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
                const spellOrb = new THREE.Mesh(spellGeo, spellMat);

                const glowGeo = new THREE.SphereGeometry(2.5, 16, 16);
                const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 });
                const spellGlow = new THREE.Mesh(glowGeo, glowMat);
                spellOrbGroup.add(spellOrb);
                spellOrbGroup.add(spellGlow);

                const spellLight = new THREE.PointLight(0x00ff88, 2000, 250);
                spellOrbGroup.add(spellLight);
                
                this.scene.add(spellOrbGroup);

                checkDone();
            });
            
            loader.load('/asset/game_assets/models/bug.glb', (gltf) => {
                const bug = gltf.scene;
                bug.scale.set(12, 12, 12);
                
                const absoluteHolePos = this.config.holePosition.clone();
                absoluteHolePos.y += -this.config.caveHeight / 2 + 150;
                const dir = new THREE.Vector3(this.config.holePosition.x, 0, this.config.holePosition.z).normalize();
                
                const right = dir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
                const dioramaCenter = absoluteHolePos.clone().add(dir.clone().multiplyScalar(50));
                
                const playerPos = dioramaCenter.clone().add(right.clone().multiplyScalar(14));
                const bugPos = dioramaCenter.clone().add(right.clone().multiplyScalar(-14));

                bug.position.copy(bugPos);
                bug.position.y += 2;
                
                bug.lookAt(playerPos);

                bug.rotateX(-Math.PI / 6);
                bug.rotateZ((Math.random() - 0.5) * Math.PI / 4);
                
                this.scene.add(bug);

                const impactGroup = new THREE.Group();
                impactGroup.position.copy(bugPos);
                impactGroup.position.y += 6;

                const toPlayer = playerPos.clone().sub(bugPos).normalize();
                impactGroup.position.add(toPlayer.multiplyScalar(5));
                impactGroup.position.add(dir.clone().multiplyScalar(-4));

                const impactLight = new THREE.PointLight(0x00ff88, 1000, 150);
                impactGroup.add(impactLight);
                
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });

                const tiltY = -Math.PI / 8;
                const tiltX = -Math.PI / 8;

                const mainRingGeo = new THREE.TorusGeometry(8, 0.1, 8, 64);
                const mainRing = new THREE.Mesh(mainRingGeo, ringMat);
                mainRing.lookAt(toPlayer);
                mainRing.rotateY(tiltY);
                mainRing.rotateX(tiltX);
                impactGroup.add(mainRing);

                const secRingGeo = new THREE.TorusGeometry(3, 0.4, 16, 64);
                const secRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
                const secRing = new THREE.Mesh(secRingGeo, secRingMat);
                secRing.lookAt(toPlayer);
                secRing.rotateY(tiltY);
                secRing.rotateX(tiltX);
                impactGroup.add(secRing);

                const coreGeo = new THREE.SphereGeometry(1.5, 16, 16);
                const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
                const impactCore = new THREE.Mesh(coreGeo, coreMat);
                impactCore.scale.set(1.5, 0.8, 1.5);
                impactCore.lookAt(toPlayer);
                impactCore.rotateY(tiltY);
                impactCore.rotateX(tiltX);
                impactGroup.add(impactCore);

                const sparkGeo = new THREE.TetrahedronGeometry(0.3, 0);
                const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
                const numSparks = 20;
                for(let i = 0; i < numSparks; i++) {
                    const spark = new THREE.Mesh(sparkGeo, sparkMat);

                    const radius = 2 + (i / numSparks) * 6;
                    const phi = Math.acos(1 - 2 * (i + 0.5) / numSparks);
                    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                    
                    spark.position.x = radius * Math.sin(phi) * Math.cos(theta);
                    spark.position.y = radius * Math.sin(phi) * Math.sin(theta);
                    spark.position.z = radius * Math.cos(phi);

                    spark.lookAt(0, 0, 0);
                    spark.scale.set(0.2, 0.2, 3.0);
                    
                    impactGroup.add(spark);
                }
                
                this.scene.add(impactGroup);

                checkDone();
            });
        });
    }

    positionModelOnWall(model, minNormY = 0, maxNormY = 1, seed = -1, isBone = true) {

        const prng = (s) => {
            let x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
            return x - Math.floor(x);
        };

        let y, normalizedY, vx, vy, vz, theta, currentRadius;
        const { caveHeight, caveRadius, holePosition, holeRadius } = this.config;
        
        let validPosition = false;
        let attempt = 0;

        while (!validPosition && attempt < 50) {
            const r1 = seed >= 0 ? prng(seed * 13 + attempt * 3 + 1) : Math.random();
            const r2 = seed >= 0 ? prng(seed * 13 + attempt * 3 + 2) : Math.random();
            
            normalizedY = minNormY + r1 * (maxNormY - minNormY);
            y = (normalizedY * caveHeight) - caveHeight / 2;
            theta = r2 * Math.PI * 2;
            
            currentRadius = caveRadius * normalizedY + (caveRadius - 20) * (1 - normalizedY);
            vx = Math.cos(theta) * currentRadius;
            vy = y;
            vz = Math.sin(theta) * currentRadius;
            
            const dx = vx - holePosition.x;
            const dy = vy - holePosition.y;
            const dz = vz - holePosition.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (dist > holeRadius + 20) {
                validPosition = true;
            }
            attempt++;
        }

        let defMult = 1.0;
        if (normalizedY > 0.5) {
            defMult += (normalizedY - 0.5) * 1.5; 
        }
        
        const nx = vx / currentRadius;
        const nz = vz / currentRadius;
        const nX = (Math.sin(vx * 0.05 + vy * 0.03) * 6 + Math.sin(vx * 0.15 - vy * 0.12) * 2.5) * defMult;
        const nZ = (Math.cos(vx * 0.04 - vy * 0.05) * 7.5 + Math.sin(vx * 0.12 + y * 0.08) * 3.5) * defMult;
        const nY = (Math.cos(vx * 0.06 + vy * 0.04) * 5 + Math.cos(vx * 0.18 - vy * 0.15) * 2) * defMult;

        const embedDepth = 0.0;
        vx += nx * (nX - embedDepth);
        vy += nY;
        vz += nz * (nZ - embedDepth);

        vy += -this.config.caveHeight / 2 + 150;

        model.position.set(vx, vy, vz);
        
        if (isBone) {

            model.lookAt(0, vy, 0);
            model.rotateX(Math.PI / 2);

            const r3 = seed >= 0 ? prng(seed * 7 + 1) : Math.random();
            model.rotateY(r3 * Math.PI * 2);

            model.rotateX(15 * Math.PI / 180);
        } else {

            model.lookAt(0, vy, 0); 

        }
    }

    createCaveMesh() {
        const geometry = new THREE.CylinderGeometry(
            this.config.caveRadius,
            this.config.caveRadius - 20,
            this.config.caveHeight,
            200,
            400,
            true
        );

        this.applyDeformationAndColors(geometry);

        const textureLoader = new THREE.TextureLoader();
        this.soilTexture = textureLoader.load('/asset/game_assets/textures/soil.jpg');
        this.soilTexture.wrapS = THREE.RepeatWrapping;
        this.soilTexture.wrapT = THREE.RepeatWrapping;
        this.soilTexture.repeat.set(15, 60);

        const material = new THREE.MeshStandardMaterial({
            map: this.soilTexture,
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

    createSpace() {
        const starsGeometry = new THREE.BufferGeometry();
        const count = 500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 12000;
            positions[i * 3 + 1] = 500 - Math.random() * 4300;
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

        const planetGeo = new THREE.SphereGeometry(400, 64, 64);
        const planetMat = new THREE.MeshBasicMaterial({ 
            color: 0x4422ff, 
            transparent: false, 
            fog: false 
        });
        const planet = new THREE.Mesh(planetGeo, planetMat);
        planet.position.set(0, -1000, -2500);
        this.scene.add(planet);

        const ringGeo = new THREE.TorusGeometry(650, 15, 2, 64);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x88aaff, 
            transparent: true, 
            opacity: 0.6,
            fog: false,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(planet.position);
        ring.rotation.x = Math.PI / 2.2;
        ring.rotation.y = Math.PI / 8;
        this.scene.add(ring);
    }

    createStalactites() {
        const count = 100;
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
            const theta = Math.random() * Math.PI * 2;
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
        let iterations = 0;
        
        for (let i = 0; i < this.config.pebbleCount; i++) {
            const data = this.calculatePebbleData(dummy);
            if (data.type === 'mineral') {
                mineralsData.push(data);
            } else if (data.type === 'rock') {
                rocksData.push(data);
            } else {
                pebblesData.push(data);
            }

            iterations++;
            if (iterations % 1500 === 0) {

                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        await new Promise(resolve => setTimeout(resolve, 400));
        this.addInstancedMeshFromData(pebblesData, geometry, material);

        await new Promise(resolve => setTimeout(resolve, 600));
        this.addInstancedMeshFromData(rocksData, geometry, material);

        await new Promise(resolve => setTimeout(resolve, 600));
        this.addInstancedMeshFromData(mineralsData, geometry, material);
    }

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

    calculatePebbleData(dummy) {
        let y, normalizedY, isMineral;
        let color = new THREE.Color();
        let scale = 1.0;
        const { caveHeight, caveRadius, colors } = this.config;

        let type = 'pebble';

        while (true) {
            y = (Math.random() - 0.5) * caveHeight;
            normalizedY = (y + caveHeight / 2) / caveHeight;

            if (normalizedY > 0.8) {
                continue;
            } else if (normalizedY > 0.6) {
                const progress = (0.8 - normalizedY) / 0.2;
                if (Math.random() > Math.pow(progress, 0.5)) continue;

                isMineral = false;
                const topColor = new THREE.Color(0x8c7362);
                const bottomColor = new THREE.Color(0x5a5c60);
                color.copy(topColor).lerp(bottomColor, progress);
                scale = Math.random() * 2.0 + 1.0 + (progress * 6.0);
                type = scale > 4.5 ? 'rock' : 'pebble';
                break;
            } else if (normalizedY > 0.45) {
                isMineral = false;
                color.setHex(0x4a4c50);
                scale = Math.random() * 3.0 + 7.0;
                type = 'rock';
                break;
            } else {
                isMineral = Math.random() < 0.008;
                if (isMineral) {
                    const mineralIndex = Math.floor(Math.random() * colors.minerals.length);
                    color.copy(colors.minerals[mineralIndex]);
                    scale = Math.random() * 2.0 + 7.0;
                    type = 'mineral';
                } else {
                    color.setHex(0x2a2c30);
                    scale = Math.random() * 3.0 + 7.0;
                    type = 'rock';
                }
                break;
            }
        }

        const theta = Math.random() * Math.PI * 2;
        let currentRadius = caveRadius * normalizedY + (caveRadius - 20) * (1 - normalizedY);
        if (normalizedY < 0.35) {
            const t = normalizedY / 0.35;
            currentRadius += 18 * Math.sqrt(1 - t * t);
        }
        
        let vx = Math.cos(theta) * currentRadius;
        let vy = y;
        let vz = Math.sin(theta) * currentRadius;

        let archOffset = 0;
        if (normalizedY < 0.25) {
            const xRatio = Math.abs(vx) / this.config.caveRadius;
            if (xRatio < 1.0) {
                const archFactor = 1.0 - (xRatio * xRatio);
                archOffset = 70 * archFactor * Math.pow(1.0 - normalizedY / 0.25, 2);
            }
        }

        let defMult = 1.0;
        if (normalizedY > 0.5) {
            defMult += (normalizedY - 0.5) * 1.5; 
        }
        
        const nx = vx / currentRadius;
        const nz = vz / currentRadius;
        const nX = (Math.sin(vx * 0.05 + vy * 0.03) * 6 + Math.sin(vx * 0.15 - vy * 0.12) * 2.5) * defMult;
        const nZ = (Math.cos(vx * 0.04 - vy * 0.05) * 7.5 + Math.sin(vx * 0.12 + y * 0.08) * 3.5) * defMult;
        const nY = (Math.cos(vx * 0.06 + vy * 0.04) * 5 + Math.cos(vx * 0.18 - vy * 0.15) * 2) * defMult;

        const embedDepth = isMineral ? 4.5 : 0.8;
        vx += nx * (nX - embedDepth);
        vy += nY + archOffset;
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

    setupRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = this.renderer.domElement;
        canvas.classList.add("tunnel-canvas");

        if (this.containerElement) {
            this.containerElement.appendChild(canvas);
        } else {
            document.body.appendChild(canvas);
        }
    }

    setupScrollTrigger() {
        if (this.scrollTween) {
            this.scrollTween.kill();
        }

        const selectors = [
            ".home-contaner-1",
            ".home-contaner-2",
            ".home-contaner-3",
            ".home-contaner-4",
            ".home-footer"
        ];
        
        const containers = selectors
            .map(selector => document.querySelector(selector))
            .filter(Boolean);

        if (containers.length === 0) {
            return;
        }

        const images = document.querySelectorAll(".content img");
        images.forEach(img => {
            if (!img.complete && !img.dataset.hasLoadListener) {
                img.dataset.hasLoadListener = "true";
                img.addEventListener("load", () => {
                    this.setupScrollTrigger();
                });
            }
        });

        if (!this.hasInitializedTimeout) {
            this.hasInitializedTimeout = true;
            setTimeout(() => this.setupScrollTrigger(), 500);
        }

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) {
            return;
        }

        const scrollTop = window.scrollY;
        const containerData = containers.map(container => {
            const rect = container.getBoundingClientRect();
            const topEdge = rect.top + scrollTop;
            const bottomEdge = rect.bottom + scrollTop;
            return { topEdge, bottomEdge };
        });

        const numSamples = 100;
        const cameraPositions = [100];
        let cumulativeIntegral = 0;
        const integrals = [0];

        for (let j = 1; j <= numSamples; j++) {
            const y = (j / numSamples) * maxScroll;
            const viewportCenter = y + window.innerHeight / 2;

            let minDistance = Infinity;
            containerData.forEach(data => {
                let dist = 0;
                if (viewportCenter < data.topEdge) {
                    dist = data.topEdge - viewportCenter;
                } else if (viewportCenter > data.bottomEdge) {
                    dist = viewportCenter - data.bottomEdge;
                } else {
                    dist = 0;
                }
                if (dist < minDistance) {
                    minDistance = dist;
                }
            });

            let localSpeed = 1400;
            if (containerData.length > 0) {
                const minThreshold = 150;
                const maxThreshold = 600;
                if (minDistance <= minThreshold) {
                    localSpeed = 350;
                } else if (minDistance >= maxThreshold) {
                    localSpeed = 1400;
                } else {
                    const t = (minDistance - minThreshold) / (maxThreshold - minThreshold);
                    localSpeed = 350 + t * (1400 - 350);
                }
            } else {
                localSpeed = 350;
            }

            cumulativeIntegral += localSpeed * (maxScroll / numSamples);
            integrals.push(cumulativeIntegral);
        }

        const totalIntegral = integrals[numSamples];
        for (let j = 1; j <= numSamples; j++) {
            const cameraY = 100 - (integrals[j] / totalIntegral) * 1050;
            cameraPositions.push(cameraY);
        }

        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: ".content",
                start: 0,
                end: "bottom bottom",
                scrub: true
            }
        });

        this.camera.position.y = 100;

        for (let j = 1; j <= numSamples; j++) {
            const startProgress = (j - 1) / numSamples;
            timeline.to(this.camera.position, {
                y: cameraPositions[j],
                duration: 1 / numSamples,
                ease: "none"
            }, startProgress);
        }

        this.scrollTween = timeline;
    }

    attachEvents() {
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.setupScrollTrigger();
    }

    startRendering() {
        const renderLoop = () => {
            this.animationFrameId = requestAnimationFrame(renderLoop);
            
            const time = performance.now() * 0.001;
            if (this.starsMaterial && this.starsMaterial.userData.uniforms) {
                this.starsMaterial.userData.uniforms.uTime.value = time;
            }

            this.renderer.render(this.scene, this.camera);
        };
        renderLoop();
    }
}