import * as THREE from "/node_modules/three/build/three.module.js";
import { gsap } from "/node_modules/gsap/index.js";
import { ScrollTrigger } from "/node_modules/gsap/ScrollTrigger.js";

export class CaveAnimation {
    constructor(containerElement) {
        this.containerElement = containerElement;
        this.config = this.initializeConfiguration();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        
        this.caveMesh = null;
        this.instancedPebbles = null;
        this.animationFrameId = null;
    }

    initializeConfiguration() {
        return {
            fogDensity: 0.0025,
            fogColor: 0x0a0a14,
            ambientLightColor: 0x404040,
            ambientLightIntensity: 3.0,
            caveHeight: 1000,
            caveRadius: 75,
            holeRadius: 26.0,
            holePosition: new THREE.Vector3(31.7, 450, -67.9),
            colors: {
                dirt: new THREE.Color(0x4d3b2e),
                compactDirt: new THREE.Color(0x261C14),
                stone: new THREE.Color(0x2a2c30),
                deep: new THREE.Color(0x110502),
                minerals: [
                    new THREE.Color(0xffaa00),
                    new THREE.Color(0x00aaff),
                    new THREE.Color(0xff2222)
                ]
            },
            pebbleCount: 30000
        };
    }

    init() {
        gsap.registerPlugin(ScrollTrigger);
        this.setupEnvironment();
        this.setupLights();
        this.buildCaveEnvironment();
        this.setupRenderer();
        this.setupScrollTrigger();
        this.attachEvents();
        this.startRendering();
    }

    setupEnvironment() {
        this.scene.fog = new THREE.FogExp2(this.config.fogColor, this.config.fogDensity);
        this.scene.add(this.camera);
        this.camera.position.set(0, 100, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(this.config.ambientLightColor, this.config.ambientLightIntensity);
        this.scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffeedd, 8000, 1000);
        flashLight.position.set(0, 0, 0);
        this.camera.add(flashLight);

        const midLight = new THREE.PointLight(0x5577aa, 5000, 600);
        midLight.position.set(0, -400, 0);
        this.scene.add(midLight);
    }

    buildCaveEnvironment() {
        this.caveMesh = this.createCaveMesh();
        this.scene.add(this.caveMesh);

        this.instancedPebbles = this.createPebbles();
        this.scene.add(this.instancedPebbles);
    }

    createCaveMesh() {
        const geometry = new THREE.CylinderGeometry(
            this.config.caveRadius,
            this.config.caveRadius - 20,
            this.config.caveHeight,
            100,
            300,
            true
        );

        this.applyDeformationAndColors(geometry);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.BackSide,
            flatShading: true 
        });

        const modifiedMaterial = this.applyHoleShader(material);
        const mesh = new THREE.Mesh(geometry, modifiedMaterial);

        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
        });

        const modifiedEdgesMaterial = this.applyHoleShader(edgesMaterial);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), modifiedEdgesMaterial);
        mesh.add(edges);

        const holeSphere = this.createHoleSphere(material, edgesMaterial);
        mesh.add(holeSphere);

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
            const nx = x / length;
            const nz = z / length;
            const normalizedY = (y + caveHeight / 2) / caveHeight;

            let deformationMultiplier = 1.0;
            if (normalizedY > 0.5) {
                deformationMultiplier += (normalizedY - 0.5) * 1.5; 
            }
            
            const noiseX = (Math.sin(x * 0.05 + y * 0.03) * 6 + Math.sin(x * 0.15 - y * 0.12) * 2.5) * deformationMultiplier;
            const noiseZ = (Math.cos(x * 0.04 - y * 0.05) * 7.5 + Math.sin(x * 0.12 + y * 0.08) * 3.5) * deformationMultiplier;
            const noiseY = (Math.cos(x * 0.06 + y * 0.04) * 5 + Math.cos(x * 0.18 - y * 0.15) * 2) * deformationMultiplier;

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

            const dx = x - holePosition.x;
            const dy = y - holePosition.y;
            const dz = z - holePosition.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            const rimThickness = 14;

            if (dist >= holeRadius && dist < holeRadius + rimThickness) {
                const progress = (dist - holeRadius) / rimThickness;
                const bump = Math.sin(progress * Math.PI);
                const rimHeight = -12;
                caveOffsetX = dirX * (bump * rimHeight);
                caveOffsetZ = dirZ * (bump * rimHeight);
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

    applyHoleShader(baseMaterial) {
        const material = baseMaterial.clone();
        
        material.onBeforeCompile = (shader) => {
            shader.uniforms.holeCenter = { value: this.config.holePosition };
            shader.uniforms.holeRadius = { value: this.config.holeRadius };
            
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>\nvarying vec3 vLocalPos;`
            ).replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>\nvLocalPos = position;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>\nuniform vec3 holeCenter;\nuniform float holeRadius;\nvarying vec3 vLocalPos;`
            ).replace(
                'void main() {',
                `void main() {\nif (distance(vLocalPos, holeCenter) < holeRadius) discard;`
            );
        };

        return material;
    }

    createHoleSphere(baseMaterial, edgesMaterial) {
        const sphereRadius = this.config.holeRadius + 1.5;
        const geometry = new THREE.SphereGeometry(sphereRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        
        const positionAttribute = geometry.attributes.position;
        const bowlColors = [];
        const bowlRimColor = new THREE.Color(0x2a1f18);
        const bowlDepthColor = new THREE.Color(0x080605);
        
        for (let i = 0; i < positionAttribute.count; i++) {
            let x = positionAttribute.getX(i);
            let y = positionAttribute.getY(i);
            let z = positionAttribute.getZ(i);
            
            const noise = Math.sin(x * 0.2 + y * 0.1) * 1.5 + Math.cos(z * 0.2 - x * 0.1) * 1.5;
            
            const length = Math.sqrt(x*x + y*y + z*z);
            const nx = x / length;
            const ny = y / length;
            const nz = z / length;
            
            positionAttribute.setXYZ(i, x + nx * noise, y + ny * noise, z + nz * noise);

            const t = y / sphereRadius;
            bowlColors.push(...bowlRimColor.clone().lerp(bowlDepthColor, t).toArray());
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(bowlColors, 3));
        geometry.computeVertexNormals();

        const material = baseMaterial.clone();
        material.vertexColors = true;
        material.side = THREE.BackSide;
        material.flatShading = true;
        
        const mesh = new THREE.Mesh(geometry, material);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgesMaterial);
        mesh.add(edges);

        mesh.position.copy(this.config.holePosition);
        
        const dir = new THREE.Vector3(this.config.holePosition.x, 0, this.config.holePosition.z).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        
        return mesh;
    }

    createPebbles() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 0);
        const material = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.2,
            flatShading: true
        });
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, this.config.pebbleCount);
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < this.config.pebbleCount; i++) {
            this.positionPebble(dummy, instancedMesh, i);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;
        instancedMesh.position.y = this.caveMesh.position.y;
        
        return instancedMesh;
    }

    positionPebble(dummy, instancedMesh, index) {
        let y, normalizedY, isMineral;
        let color = new THREE.Color();
        let scale = 1.0;
        const { caveHeight, caveRadius, colors } = this.config;

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
                break;
            } else if (normalizedY > 0.45) {
                isMineral = false;
                color.setHex(0x4a4c50);
                scale = Math.random() * 3.0 + 7.0;
                break;
            } else {
                isMineral = Math.random() < 0.008;
                if (isMineral) {
                    const mineralIndex = Math.floor(Math.random() * colors.minerals.length);
                    color.copy(colors.minerals[mineralIndex]);
                    scale = Math.random() * 2.0 + 7.0;
                } else {
                    color.setHex(0x2a2c30);
                    scale = Math.random() * 3.0 + 7.0;
                }
                break;
            }
        }

        const theta = Math.random() * Math.PI * 2;
        const currentRadius = caveRadius * normalizedY + (caveRadius - 20) * (1 - normalizedY);
        
        let vx = Math.cos(theta) * currentRadius;
        let vy = y;
        let vz = Math.sin(theta) * currentRadius;

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
        vy += nY;
        vz += nz * (nZ - embedDepth);

        dummy.position.set(vx, vy, vz);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(index, dummy.matrix);
        instancedMesh.setColorAt(index, color);
    }

    setupRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = this.renderer.domElement;
        canvas.classList.add("tunnel-canvas");
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.zIndex = "-1";
        canvas.style.pointerEvents = "none";

        if (this.containerElement) {
            this.containerElement.appendChild(canvas);
        } else {
            document.body.appendChild(canvas);
        }
    }

    setupScrollTrigger() {
        const deltaY = 900;
        
        gsap.to(this.camera.position, {
            y: this.camera.position.y - deltaY,
            ease: "none",
            scrollTrigger: {
                trigger: ".content",
                start: "top top",
                end: "bottom bottom",
                scrub: true,
            },
        });
    }

    attachEvents() {
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    startRendering() {
        const renderLoop = () => {
            this.animationFrameId = requestAnimationFrame(renderLoop);
            this.renderer.render(this.scene, this.camera);
        };
        renderLoop();
    }
}