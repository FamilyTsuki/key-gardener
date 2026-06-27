import * as THREE from "three";

export class CaveDecor {

    /**
     * Builds the decoration elements.
     * @param {any} scene - The scene.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static build(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0x090a12);
        scene.fog = new THREE.FogExp2(0x090a12, 0.015);

        this._buildLighting(decorGroup);
        const particles = this._buildDustParticles(decorGroup, disposables);
        this._buildWalls(decorGroup, disposables);
        this._buildCaveFloor(decorGroup, disposables);

        let time = 0;
        return (deltaTime) => {
            time += deltaTime;

            particles.forEach(p => {
                p.position.y += Math.sin(time + p.userData.seed) * 0.01;
                p.position.x += Math.cos(time * 0.5 + p.userData.seed) * 0.005;
                p.position.z += Math.sin(time * 0.5 + p.userData.seed) * 0.005;
                
                if (p.position.y > 30) p.position.y = -10;
                if (p.position.y < -10) p.position.y = 30;
            });

            return { y: 0, rotationX: 0, rotationZ: 0 };
        };
    }

    /**
     * _builds the lighting.
     * @param {any} decorGroup - The decorGroup.
     */
    static _buildLighting(decorGroup) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        decorGroup.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x222233, 0.8);
        decorGroup.add(hemiLight);

        const topLight = new THREE.DirectionalLight(0xddffff, 1.0);
        topLight.position.set(16, 30, 20);
        decorGroup.add(topLight);
    }

    /**
     * _builds the dust particles.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static _buildDustParticles(decorGroup, disposables) {
        const particles = [];
        const geo = new THREE.DodecahedronGeometry(0.12, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x55ffaa,
            transparent: true,
            opacity: 0.6
        });
        disposables.push(geo, mat);

        for (let i = 0; i < 50; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                Math.random() * 60 - 15,
                Math.random() * 30 - 5,
                Math.random() * 60 - 30
            );
            mesh.userData = { seed: Math.random() * 100 };
            decorGroup.add(mesh);
            particles.push(mesh);
        }

        return particles;
    }

    /**
     * _builds the cave floor.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static _buildCaveFloor(decorGroup, disposables) {
        const floorGeo = new THREE.PlaneGeometry(80, 80, 20, 20);
        
        const pos = floorGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const chaosZ = (Math.random() - 0.5) * 1.5 - 1.0;
            pos.setZ(i, chaosZ);
        }
        floorGeo.computeVertexNormals();

        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x3a332d,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(16, -1.0, 0);
        decorGroup.add(floor);

        disposables.push(floorGeo, floorMat);
    }

    /**
     * _builds the walls.
     * @param {any} decorGroup - The decorGroup.
     * @param {any} disposables - The disposables.
     */
    static _buildWalls(decorGroup, disposables) {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x443a35,
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true
        });

        const wallBack = this._createStaticWall(100, 50, wallMat, disposables);
        wallBack.position.set(16, 15, -45);
        decorGroup.add(wallBack);

        const wallLeft = this._createStaticWall(100, 50, wallMat, disposables);
        wallLeft.rotation.y = Math.PI / 2;
        wallLeft.position.set(-25, 15, 0);
        decorGroup.add(wallLeft);

        const wallRight = this._createStaticWall(100, 50, wallMat, disposables);
        wallRight.rotation.y = -Math.PI / 2;
        wallRight.position.set(57, 15, 0);
        decorGroup.add(wallRight);

        disposables.push(wallMat);
    }

    /**
     * _creates the static wall.
     * @param {any} width - The width.
     * @param {any} height - The height.
     * @param {any} wallMat - The wallMat.
     * @param {any} disposables - The disposables.
     */
    static _createStaticWall(width, height, wallMat, disposables) {
        const segsX = Math.floor(width / 5);
        const segsY = Math.floor(height / 5);
        const geo = new THREE.PlaneGeometry(width, height, segsX, segsY);
        const pos = geo.attributes.position;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const isEdge = x <= -width / 2 || x >= width / 2 || y <= -height / 2 || y >= height / 2;
            
            if (!isEdge) {
                const chaosX = (Math.random() - 0.5) * 2.0;
                const chaosY = (Math.random() - 0.5) * 2.0;
                pos.setX(i, x + chaosX);
                pos.setY(i, y + chaosY);
            }
            
            const chaosZ = (Math.random() - 0.5) * 8.0 + Math.sin(x * 0.05) * 10.0 + Math.cos(y * 0.05) * 10.0;
            pos.setZ(i, chaosZ);
        }

        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, wallMat);
        
        disposables.push(geo);
        return mesh;
    }
}
