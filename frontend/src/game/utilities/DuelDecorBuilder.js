import * as THREE from "three";

export class DuelDecorBuilder {

    /**
     * Builds the arena.
     * @param {any} scene - The scene.
     */
    static buildArena(scene) {
        const decorGroup = new THREE.Group();
        const disposables = [];
        
        scene.background = new THREE.Color(0x05070f);
        scene.fog = new THREE.FogExp2(0x05070f, 0.015);

        const ambientLight = new THREE.AmbientLight(0xdbe3f0, 1.25);
        decorGroup.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(20, 50, 20);
        decorGroup.add(sunLight);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x070b12,
            roughness: 1.0,
            metalness: 0.1
        });
        disposables.push(groundGeo, groundMat);
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.0;
        decorGroup.add(ground);

        const arenaMat = new THREE.MeshStandardMaterial({
            color: 0x4a5b78,
            roughness: 0.7,
            metalness: 0.2
        });
        disposables.push(arenaMat);

        const centralPlatformGeo = new THREE.CylinderGeometry(19.5, 20, 1, 48);
        disposables.push(centralPlatformGeo);
        const centralPlatform = new THREE.Mesh(centralPlatformGeo, arenaMat);
        centralPlatform.position.y = -0.5;
        decorGroup.add(centralPlatform);

        const arenaRadius = 16;
        const ringGeo = new THREE.RingGeometry(arenaRadius - 0.3, arenaRadius + 0.3, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide
        });
        disposables.push(ringGeo, ringMat);
        const arenaRing = new THREE.Mesh(ringGeo, ringMat);
        arenaRing.rotation.x = -Math.PI / 2;
        arenaRing.position.y = 0.02;
        decorGroup.add(arenaRing);

        const columnGeo = new THREE.CylinderGeometry(0.9, 1.2, 11, 16);
        const columnMat = new THREE.MeshStandardMaterial({
            color: 0x4a5b78,
            roughness: 0.8,
            metalness: 0.2
        });
        disposables.push(columnGeo, columnMat);

        const wallGeo = new THREE.BoxGeometry(6.5, 1.8, 1.0);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2e3d52,
            roughness: 0.9,
            metalness: 0.1
        });
        disposables.push(wallGeo, wallMat);

        const flameLights = [];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 18.5;
            
            const column = new THREE.Mesh(columnGeo, columnMat);
            column.position.set(
                Math.cos(angle) * radius,
                5.0,
                Math.sin(angle) * radius
            );
            decorGroup.add(column);

            const orbGeo = new THREE.SphereGeometry(0.4, 16, 16);
            const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            disposables.push(orbGeo, orbMat);
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.y = 5.7;
            column.add(orb);

            const orbLight = new THREE.PointLight(0x00ffff, 2.5, 20, 1.5);
            orbLight.position.y = 5.7;
            column.add(orbLight);
            flameLights.push(orbLight);
        }

        for (let i = 0; i < 8; i++) {
            const angle = ((i + 0.5) / 8) * Math.PI * 2;
            const radius = 18.5;
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(
                Math.cos(angle) * radius,
                0.4,
                Math.sin(angle) * radius
            );
            wall.rotation.y = -angle;
            decorGroup.add(wall);
        }

        const starCount = 1200;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 100 + Math.random() * 40;
            starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 2;
            starPos[i * 3 + 2] = r * Math.cos(phi);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.6,
            transparent: true,
            opacity: 0.85
        });
        disposables.push(starGeo, starMat);
        const starField = new THREE.Points(starGeo, starMat);
        decorGroup.add(starField);

        const nebCount = 500;
        const nebPos = new Float32Array(nebCount * 3);
        const nebColors = new Float32Array(nebCount * 3);
        const nebColorsPool = [new THREE.Color(0x00ffff), new THREE.Color(0xff00ff), new THREE.Color(0x1a0d3d)];
        
        for (let i = 0; i < nebCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 30;
            const height = (Math.random() - 0.25) * 35;
            nebPos[i * 3] = Math.cos(angle) * radius;
            nebPos[i * 3 + 1] = height;
            nebPos[i * 3 + 2] = Math.sin(angle) * radius;
            
            const col = nebColorsPool[Math.floor(Math.random() * nebColorsPool.length)];
            nebColors[i * 3] = col.r;
            nebColors[i * 3 + 1] = col.g;
            nebColors[i * 3 + 2] = col.b;
        }
        
        const nebGeo = new THREE.BufferGeometry();
        nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
        nebGeo.setAttribute('color', new THREE.BufferAttribute(nebColors, 3));
        
        const nebMat = new THREE.PointsMaterial({
            size: 5.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        disposables.push(nebGeo, nebMat);
        const nebula = new THREE.Points(nebGeo, nebMat);
        decorGroup.add(nebula);

        const pCount = 200;
        const pPos = new Float32Array(pCount * 3);
        const pSpeed = new Float32Array(pCount);

        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 50;
            pPos[i * 3 + 1] = Math.random() * 20;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
            pSpeed[i] = 0.8 + Math.random() * 1.2;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.22,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });
        disposables.push(particleGeo, particleMat);
        const particleSystem = new THREE.Points(particleGeo, particleMat);
        decorGroup.add(particleSystem);

        const localLight = new THREE.PointLight(0x00ffff, 4, 25, 1.2);
        localLight.position.set(0, 4, 6);
        decorGroup.add(localLight);

        const remoteLight = new THREE.PointLight(0xff00ff, 4, 25, 1.2);
        remoteLight.position.set(0, 4, -6);
        decorGroup.add(remoteLight);

        scene.add(decorGroup);

        let time = 0;
        const updateFn = (deltaTime) => {
            time += deltaTime;

            nebula.rotation.y = time * 0.015;
            starField.rotation.y = time * 0.003;

            const positions = particleGeo.attributes.position.array;
            for (let i = 0; i < pCount; i++) {
                positions[i * 3 + 1] += pSpeed[i] * deltaTime;
                positions[i * 3] += Math.sin(time + i) * 0.02;
                if (positions[i * 3 + 1] > 20) {
                    positions[i * 3 + 1] = 0;
                    positions[i * 3] = (Math.random() - 0.5) * 50;
                }
            }
            particleGeo.attributes.position.needsUpdate = true;

            flameLights.forEach((light, index) => {
                light.intensity = 2.0 + Math.sin(time * 5 + index) * 0.8 + Math.random() * 0.3;
            });

            localLight.intensity = 3.0 + Math.sin(time * 4) * 0.8 + Math.random() * 0.2;
            remoteLight.intensity = 3.0 + Math.cos(time * 3) * 0.8 + Math.random() * 0.2;
        };

        const cleanupFn = () => {
            disposables.forEach(item => item.dispose());
            scene.remove(decorGroup);
            scene.fog = null;
            scene.background = null;
        };

        return { decorGroup, update: updateFn, cleanup: cleanupFn };
    }
}
