import * as THREE from "three";

export class DungeonDecor {
    static build(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0x0a0a0f);
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.007);

        const textureLoader = new THREE.TextureLoader();
        
        const soilTexture = textureLoader.load('/asset/game_assets/textures/soil.webp');
        soilTexture.wrapS = THREE.RepeatWrapping;
        soilTexture.wrapT = THREE.RepeatWrapping;
        soilTexture.repeat.set(60, 60);

        const floorGeo = new THREE.PlaneGeometry(400, 400);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: soilTexture,
            color: 0x2b241e, 
            roughness: 1.0,
            metalness: 0.0
        });
        
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -0.35;
        decorGroup.add(floorMesh);

        disposables.push(floorGeo, floorMat);

        const torchLights = [];
        const lightsConfig = [
            { x: -16, z: -18 },
            { x: 16, z: -21 },
            { x: 48, z: -18 },
            { x: -16, z: 24 },
            { x: 16, z: 27 },
            { x: 48, z: 24 }
        ];

        lightsConfig.forEach(cfg => {
            const light = new THREE.PointLight(0xff7700, 320.0, 160, 1.4);
            light.position.set(cfg.x, 7.8, cfg.z);
            decorGroup.add(light);
            torchLights.push(light);
        });

        const ambientLight = new THREE.AmbientLight(0x282030, 2.5);
        decorGroup.add(ambientLight);

        let time = 0;
        return (deltaTime) => {
            time += deltaTime;
            
            for (let i = 0; i < torchLights.length; i++) {
                const light = torchLights[i];
                const flicker = Math.sin(time * (12 + i * 2)) * 25.0 + Math.random() * 15.0;
                light.intensity = 280.0 + flicker;
            }

            return { y: 0, rotationX: 0, rotationZ: 0 };
        };
    }
}
