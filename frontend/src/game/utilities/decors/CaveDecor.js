import * as THREE from "three";

export class CaveDecor {
    static build(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0x090a12);
        scene.fog = new THREE.FogExp2(0x090a12, 0.015);

        this._buildLighting(decorGroup);
        const crystals = this._buildCrystals(decorGroup, disposables);
        const particles = this._buildDustParticles(decorGroup, disposables);
        this._buildWalls(decorGroup, disposables);
        this._buildCaveFloor(decorGroup, disposables);

        let time = 0;
        return (deltaTime) => {
            time += deltaTime;
            
            crystals.forEach((crystal, index) => {
                const pulse = 1.0 + Math.sin(time * 2 + index) * 0.25;
                crystal.scale.set(pulse, pulse, pulse);
                if (crystal.material && crystal.material.emissiveIntensity !== undefined) {
                    crystal.material.emissiveIntensity = 1.0 + Math.sin(time * 2 + index) * 0.5;
                }
            });

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

    static _buildLighting(decorGroup) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        decorGroup.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x222233, 0.8);
        decorGroup.add(hemiLight);

        const topLight = new THREE.DirectionalLight(0xddffff, 1.0);
        topLight.position.set(16, 30, 20);
        decorGroup.add(topLight);
    }

    static _buildCrystals(decorGroup, disposables) {
        const crystals = [];
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff66,
            emissiveIntensity: 2.0,
            roughness: 0.1,
            metalness: 0.9
        });
        disposables.push(crystalMat);

        const coneGeo = new THREE.ConeGeometry(0.8, 3.0, 6);
        disposables.push(coneGeo);

        const positions = [
            [-12, -2, -18], [-10, 5, -15], [38, -1, -16], [40, 6, -14],
            [16, -3, -22], [-8, 2, 8], [39, 1, 10], [15, 15, -10]
        ];

        positions.forEach((pos, index) => {
            const cluster = new THREE.Group();
            
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const subMesh = new THREE.Mesh(coneGeo, crystalMat);
                subMesh.rotation.x = (Math.random() - 0.5) * 0.8;
                subMesh.rotation.z = (Math.random() - 0.5) * 0.8;
                subMesh.rotation.y = Math.random() * Math.PI;
                subMesh.scale.set(0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6);
                subMesh.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
                cluster.add(subMesh);
                crystals.push(subMesh);
            }

            cluster.position.set(pos[0], pos[1], pos[2]);
            decorGroup.add(cluster);

            const light = new THREE.PointLight(0x00ffaa, 6, 40);
            light.position.set(pos[0], pos[1] + 1, pos[2]);
            decorGroup.add(light);
        });

        return crystals;
    }

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
