import * as THREE from "/node_modules/three/build/three.module.js";
import ModelLoader from "../../../core/utils/ModelLoader.js";

export class CaveModelLoader {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.blackHoleObject = null;
    }

    async loadModels() {
        return new Promise((resolve) => {
            let loadedAssetCount = 0;
            const totalAssetsToLoad = 2;

            const verifyLoadingStatus = () => {
                loadedAssetCount++;
                if (loadedAssetCount === totalAssetsToLoad) {
                    resolve();
                }
            };
            
            ModelLoader.load('/asset/game_assets/models/bone.glb', (gltf) => {
                const boneModel = gltf.scene;
                
                for (let index = 0; index < 20; index++) { 
                    const scaleModifier = 1.2 + (index / 15);
                    boneModel.scale.set(scaleModifier, scaleModifier, scaleModifier);
                    const boneObject = boneModel.clone();
                    this.positionModelOnWall(boneObject, 0.8, 1.0, index);
                    this.scene.add(boneObject);
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
                rightWing.scale.set(arrowScale / 1.8, arrowScale / 1.5, arrowScale / 1.5);
                rightWing.position.set(3.2, 0.6, -0.5);
                rightWing.rotation.reorder("ZYX");
                rightWing.rotation.set(Math.PI / 3, -Math.PI / 9, Math.PI / 4);
                arrowGroup.add(rightWing);

                const leftWing = boneModel.clone();
                leftWing.scale.set(arrowScale / 1.8, arrowScale / 1.8, arrowScale / 1.8);
                leftWing.position.set(-3, 1.2, 1);
                leftWing.rotation.reorder("ZYX");
                leftWing.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
                arrowGroup.add(leftWing);

                arrowGroup.position.set(33, 68, -71);
                arrowGroup.rotation.set(0, -0.3, 0);
                this.scene.add(arrowGroup);
            });
            
            ModelLoader.load('/asset/game_assets/models/player_3.glb', (gltf) => {
                const playerMesh = gltf.scene;
                
                const absoluteHolePos = this.config.holePosition.clone();
                absoluteHolePos.y += -this.config.caveHeight / 2 + 150;
                const directionVector = new THREE.Vector3(this.config.holePosition.x, 0, this.config.holePosition.z).normalize();
                const rightDirection = directionVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
                const dioramaCenter = absoluteHolePos.clone().add(directionVector.clone().multiplyScalar(50));

                const playerPosition = dioramaCenter.clone().add(rightDirection.clone().multiplyScalar(14));
                const bugPosition = dioramaCenter.clone().add(rightDirection.clone().multiplyScalar(-14));

                const eyeGeometry = new THREE.SphereGeometry(2.5, 16, 16);
                const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x850000, fog: false }); 
                
                const eyesGroup = new THREE.Group();
                const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                leftEye.position.set(-5, 0, 0);
                leftEye.scale.set(0.4, 2, 2); 
                
                const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                rightEye.position.set(5, 0, 0);
                rightEye.scale.set(0.4, 2, 2);
                
                eyesGroup.add(leftEye);
                eyesGroup.add(rightEye);

                const lookDepth = 400; 
                const basePosition = absoluteHolePos.clone().add(directionVector.clone().multiplyScalar(lookDepth));

                eyesGroup.position.copy(basePosition);
                eyesGroup.lookAt(absoluteHolePos.x, absoluteHolePos.y, absoluteHolePos.z);

                const eyePointLight = new THREE.PointLight(0xff0000, 100, 40);
                eyesGroup.add(eyePointLight);
                this.scene.add(eyesGroup);

                const keycapGroup = new THREE.Group();
                const keyBaseMaterial = new THREE.MeshStandardMaterial({color: 0x333333, roughness: 0.6, flatShading: true});
                const keyTopMaterial = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8});

                const canvasElement = document.createElement('canvas');
                canvasElement.width = 256;
                canvasElement.height = 256;
                const canvasContext = canvasElement.getContext('2d');
                canvasContext.fillStyle = '#111111';
                canvasContext.fillRect(0, 0, 256, 256);
                canvasContext.fillStyle = '#ffffff';
                canvasContext.font = 'bold 160px sans-serif';
                canvasContext.textAlign = 'center';
                canvasContext.textBaseline = 'middle';
                canvasContext.fillText('A', 128, 140);
                const letterCanvasTexture = new THREE.CanvasTexture(canvasElement);

                const letterMaterial = new THREE.MeshStandardMaterial({map: letterCanvasTexture, roughness: 0.8, color: 0xffffff});
                const keyTopMaterialsArray = [
                    keyTopMaterial, keyTopMaterial,
                    letterMaterial, keyTopMaterial,
                    keyTopMaterial, keyTopMaterial
                ];
                
                const keyBaseMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), keyBaseMaterial);
                const keyTopMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 12), keyTopMaterialsArray);
                keyTopMesh.position.y = 3.5;
                
                keycapGroup.add(keyBaseMesh);
                keycapGroup.add(keyTopMesh);
                
                keycapGroup.position.copy(playerPosition);
                keycapGroup.position.y -= 14;
                keycapGroup.rotation.set(Math.random() * 0.2, Math.random() * 0.5, Math.random() * 0.2);
                this.scene.add(keycapGroup);

                const playerContainerGroup = new THREE.Group();
                playerContainerGroup.scale.set(12.5, 12.5, 12.5);
                playerContainerGroup.position.copy(playerPosition);
                playerContainerGroup.position.y += 2;
                playerContainerGroup.lookAt(bugPosition);

                playerMesh.rotation.y = Math.PI / 6;
                playerMesh.rotation.x = Math.PI / 13;
                playerMesh.rotation.z = 0;
                
                playerContainerGroup.add(playerMesh);
                this.scene.add(playerContainerGroup);

                const spellOrbGroup = new THREE.Group();
                spellOrbGroup.position.copy(dioramaCenter);
                spellOrbGroup.position.y += 5;
                
                const spellOrbGeometry = new THREE.SphereGeometry(1.5, 16, 16);
                const spellOrbMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
                const spellOrbMesh = new THREE.Mesh(spellOrbGeometry, spellOrbMaterial);

                const glowOrbGeometry = new THREE.SphereGeometry(2.5, 16, 16);
                const glowOrbMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 });
                const spellGlowMesh = new THREE.Mesh(glowOrbGeometry, glowOrbMaterial);
                
                spellOrbGroup.add(spellOrbMesh);
                spellOrbGroup.add(spellGlowMesh);

                const spellPointLight = new THREE.PointLight(0x00ff88, 2000, 250);
                spellOrbGroup.add(spellPointLight);
                
                this.scene.add(spellOrbGroup);

                verifyLoadingStatus();
            });
            
            ModelLoader.load('/asset/game_assets/models/bug.glb', (gltf) => {
                const bugMeshObject = gltf.scene;
                bugMeshObject.scale.set(12, 12, 12);
                
                const absoluteHolePos = this.config.holePosition.clone();
                absoluteHolePos.y += -this.config.caveHeight / 2 + 150;
                const directionVector = new THREE.Vector3(this.config.holePosition.x, 0, this.config.holePosition.z).normalize();
                
                const rightDirection = directionVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
                const dioramaCenter = absoluteHolePos.clone().add(directionVector.clone().multiplyScalar(50));
                
                const playerPosition = dioramaCenter.clone().add(rightDirection.clone().multiplyScalar(14));
                const bugPosition = dioramaCenter.clone().add(rightDirection.clone().multiplyScalar(-14));

                bugMeshObject.position.copy(bugPosition);
                bugMeshObject.position.y += 6;
                bugMeshObject.lookAt(playerPosition);
                bugMeshObject.rotateX(-Math.PI / 6);
                bugMeshObject.rotateZ((Math.random() - 0.5) * Math.PI / 4);
                
                this.scene.add(bugMeshObject);

                const impactEffectGroup = new THREE.Group();
                impactEffectGroup.position.copy(bugPosition);
                impactEffectGroup.position.y += 6;

                const vectorToPlayer = playerPosition.clone().sub(bugPosition).normalize();
                impactEffectGroup.position.add(vectorToPlayer.multiplyScalar(5));
                impactEffectGroup.position.add(directionVector.clone().multiplyScalar(-4));

                const impactPointLight = new THREE.PointLight(0x00ff88, 1000, 150);
                impactEffectGroup.add(impactPointLight);
                
                const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });

                const rotationTiltY = -Math.PI / 8;
                const rotationTiltX = -Math.PI / 8;

                const mainRingGeometry = new THREE.TorusGeometry(8, 0.1, 8, 64);
                const mainRingMesh = new THREE.Mesh(mainRingGeometry, ringMaterial);
                mainRingMesh.lookAt(vectorToPlayer);
                mainRingMesh.rotateY(rotationTiltY);
                mainRingMesh.rotateX(rotationTiltX);
                impactEffectGroup.add(mainRingMesh);

                const secondaryRingGeometry = new THREE.TorusGeometry(3, 0.4, 16, 64);
                const secondaryRingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
                const secondaryRingMesh = new THREE.Mesh(secondaryRingGeometry, secondaryRingMaterial);
                secondaryRingMesh.lookAt(vectorToPlayer);
                secondaryRingMesh.rotateY(rotationTiltY);
                secondaryRingMesh.rotateX(rotationTiltX);
                impactEffectGroup.add(secondaryRingMesh);

                const impactCoreGeometry = new THREE.SphereGeometry(1.5, 16, 16);
                const impactCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
                const impactCoreMesh = new THREE.Mesh(impactCoreGeometry, impactCoreMaterial);
                impactCoreMesh.scale.set(1.5, 0.8, 1.5);
                impactCoreMesh.lookAt(vectorToPlayer);
                impactCoreMesh.rotateY(rotationTiltY);
                impactCoreMesh.rotateX(rotationTiltX);
                impactEffectGroup.add(impactCoreMesh);

                const sparkGeometry = new THREE.TetrahedronGeometry(0.3, 0);
                const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
                const totalSparksCount = 20;
                
                for(let index = 0; index < totalSparksCount; index++) {
                    const sparkMesh = new THREE.Mesh(sparkGeometry, sparkMaterial);

                    const sparkRadius = 2 + (index / totalSparksCount) * 6;
                    const sparkPhi = Math.acos(1 - 2 * (index + 0.5) / totalSparksCount);
                    const sparkTheta = Math.PI * (1 + Math.sqrt(5)) * index;
                    
                    sparkMesh.position.x = sparkRadius * Math.sin(sparkPhi) * Math.cos(sparkTheta);
                    sparkMesh.position.y = sparkRadius * Math.sin(sparkPhi) * Math.sin(sparkTheta);
                    sparkMesh.position.z = sparkRadius * Math.cos(sparkPhi);

                    sparkMesh.lookAt(0, 0, 0);
                    sparkMesh.scale.set(0.2, 0.2, 3.0);
                    
                    impactEffectGroup.add(sparkMesh);
                }
                
                this.scene.add(impactEffectGroup);

                verifyLoadingStatus();
            });
            
            ModelLoader.load('/asset/game_assets/models/black_hole.glb', (gltf) => {
                this.blackHoleObject = gltf.scene;
                
                this.blackHoleObject.scale.set(1000, 1000, 1000);
                this.blackHoleObject.position.set(0, -1000, -1000);
                this.blackHoleObject.rotation.x = Math.PI / 6;
                this.blackHoleObject.rotation.z = -Math.PI / 8;
                this.blackHoleObject.rotation.y = Math.PI / 6;
                
                this.blackHoleObject.traverse((sceneNode) => {
                    if (sceneNode.isMesh && sceneNode.material) {
                        sceneNode.material.fog = false;
                    }
                });
                
                this.scene.add(this.blackHoleObject);
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
            theta = (7 * Math.PI / 6) + r2 * (2 * Math.PI / 3);
            
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
}
