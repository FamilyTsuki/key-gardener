import * as THREE from "three";

export class DuelDecorBuilder {
    static buildArena(scene) {
        const decorGroup = new THREE.Group();
        const disposables = [];
        
        scene.background = new THREE.Color(0x080606);
        scene.fog = new THREE.FogExp2(0x080606, 0.025);

        const ambientLight = new THREE.AmbientLight(0xffaa66, 0.15);
        decorGroup.add(ambientLight);

        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x151110,
            roughness: 0.9,
            metalness: 0.2
        });
        disposables.push(floorGeo, floorMat);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        decorGroup.add(floor);

        const gridHelper = new THREE.GridHelper(200, 100, 0xff5500, 0x2d1710);
        gridHelper.position.y = -0.49;
        decorGroup.add(gridHelper);

        const columnGeo = new THREE.CylinderGeometry(2, 2.5, 15, 8);
        const columnMat = new THREE.MeshStandardMaterial({
            color: 0x201a18,
            roughness: 1.0,
            metalness: 0.1
        });
        disposables.push(columnGeo, columnMat);

        const columns = [];
        const flameLights = [];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 28;
            
            const column = new THREE.Mesh(columnGeo, columnMat);
            column.position.set(
                Math.cos(angle) * radius,
                7,
                Math.sin(angle) * radius
            );
            decorGroup.add(column);
            columns.push(column);

            const bowlGeo = new THREE.CylinderGeometry(2.2, 1.5, 1.2, 8);
            const bowlMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            disposables.push(bowlGeo, bowlMat);
            const bowl = new THREE.Mesh(bowlGeo, bowlMat);
            bowl.position.y = 7.6;
            column.add(bowl);

            const flameLight = new THREE.PointLight(0xff6600, 8, 30, 1.5);
            flameLight.position.y = 8.5;
            column.add(flameLight);
            flameLights.push(flameLight);
        }

        const pCount = 300;
        const pPos = new Float32Array(pCount * 3);
        const pSpeed = new Float32Array(pCount);

        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 80;
            pPos[i * 3 + 1] = Math.random() * 30;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
            pSpeed[i] = 1.5 + Math.random() * 2;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 0.35,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        disposables.push(particleGeo, particleMat);
        const particleSystem = new THREE.Points(particleGeo, particleMat);
        decorGroup.add(particleSystem);

        const localLight = new THREE.PointLight(0xff3300, 5, 25, 1.5);
        localLight.position.set(0, 4, 6);
        decorGroup.add(localLight);

        const remoteLight = new THREE.PointLight(0xffaa44, 4, 25, 1.5);
        remoteLight.position.set(0, 4, -6);
        decorGroup.add(remoteLight);

        scene.add(decorGroup);

        let time = 0;
        const updateFn = (deltaTime) => {
            time += deltaTime;

            const positions = particleGeo.attributes.position.array;
            for (let i = 0; i < pCount; i++) {
                positions[i * 3 + 1] += pSpeed[i] * deltaTime;
                positions[i * 3] += Math.sin(time + i) * 0.02;
                if (positions[i * 3 + 1] > 30) {
                    positions[i * 3 + 1] = 0;
                    positions[i * 3] = (Math.random() - 0.5) * 80;
                }
            }
            particleGeo.attributes.position.needsUpdate = true;

            flameLights.forEach((light, index) => {
                light.intensity = 6 + Math.sin(time * 8 + index) * 2 + Math.random() * 1;
            });

            localLight.intensity = 4 + Math.sin(time * 6) * 1.5 + Math.random() * 0.5;
            remoteLight.intensity = 3.5 + Math.cos(time * 5) * 1.2 + Math.random() * 0.4;
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
