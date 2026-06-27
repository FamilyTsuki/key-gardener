import * as THREE from "three";

export class TrainingDecor {

    /**
     * Builds the decoration elements.
     * @param {any} scene - The scene.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static build(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0xdce0e5);
        scene.fog = new THREE.Fog(0xdce0e5, 30, 80);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        decorGroup.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5);
        dirLight.position.set(20, 30, 20);
        dirLight.castShadow = true;
        decorGroup.add(dirLight);

        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x8a9a5b,
            roughness: 1.0,
            metalness: 0.0
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5; 
        decorGroup.add(floor);

        const gridHelper = new THREE.GridHelper(200, 100, 0x4a5d23, 0x5c7a29);
        gridHelper.position.y = -0.48;
        decorGroup.add(gridHelper);
        const wallGeo = new THREE.PlaneGeometry(100, 40);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xfffcf2,
            roughness: 1.0,
            emissive: 0xfffcf2,
            emissiveIntensity: 0.1
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(15, 19.5, -18);
        decorGroup.add(wall);

        const shojiMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9 });
        for (let i = -3; i <= 3; i++) {
            const vBeamGeo = new THREE.BoxGeometry(0.5, 40, 0.5);
            const vBeam = new THREE.Mesh(vBeamGeo, shojiMat);
            vBeam.position.set(15 + i * 12, 19.5, -17.8);
            decorGroup.add(vBeam);
        }
        for (let i = 0; i <= 4; i++) {
            const hBeamGeo = new THREE.BoxGeometry(100, 0.5, 0.5);
            const hBeam = new THREE.Mesh(hBeamGeo, shojiMat);
            hBeam.position.set(15, i * 8, -17.8);
            decorGroup.add(hBeam);
        }
        const bottomTrimGeo = new THREE.BoxGeometry(100, 1, 1);
        const bottomTrim = new THREE.Mesh(bottomTrimGeo, shojiMat);
        bottomTrim.position.set(15, 0, -17.5);
        decorGroup.add(bottomTrim);

        const topTrimGeo = new THREE.BoxGeometry(100, 2, 2);
        const topTrim = new THREE.Mesh(topTrimGeo, shojiMat);
        topTrim.position.set(15, 39, -17.5);
        decorGroup.add(topTrim);

        return () => {
            return { y: 0, rotationX: 0, rotationZ: 0 };
        };
    }
}
