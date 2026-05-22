import * as THREE from "three";
import HexTile from "../models/HexTile.js";

function createLetterTexture(letter, stoneImage) {
    if (!letter) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (stoneImage) {
        ctx.drawImage(stoneImage, 0, 0, 512, 512);
    } else {
        ctx.fillStyle = "#667578";
        ctx.fillRect(0, 0, 512, 512);
    }

    ctx.fillStyle = "#000000ff";
    ctx.font = "bold 240px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(256, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(letter, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    return texture;
}

function createBeveledHexagon(sideMaterial, topMaterial) {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3.6, 6);
    const bodyMesh = new THREE.Mesh(bodyGeometry, sideMaterial);
    bodyMesh.position.y = -0.2;

    const bevelGeometry = new THREE.CylinderGeometry(1.3, 1.5, 0.4, 6);
    const bevelMesh = new THREE.Mesh(bevelGeometry, [
        sideMaterial,
        topMaterial,
        sideMaterial,
    ]);
    bevelMesh.position.y = 1.8;

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });

    const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
    const bodyLine = new THREE.LineSegments(bodyEdges, lineMaterial);
    bodyMesh.add(bodyLine);

    const bevelEdges = new THREE.EdgesGeometry(bevelGeometry);
    const bevelLine = new THREE.LineSegments(bevelEdges, lineMaterial);
    bevelMesh.add(bevelLine);

    group.add(bodyMesh);
    group.add(bevelMesh);

    group.material = [sideMaterial, topMaterial, sideMaterial];
    group.lineMaterial = lineMaterial;

    return group;
}

export default class WorldMap {
    #mapLayout;
    tileSize;
    group;

    constructor(mapLayout, tileSize, scene, stoneTexture) {
        this.#mapLayout = mapLayout;
        this.tileSize = tileSize;
        this.stoneTexture = stoneTexture;
        this.group = new THREE.Group();
        scene.add(this.group);

        scene.add(this.group);

        this.createEnvironment();
        this.createHexagons(scene);
    }

    createEnvironment() {
        const environmentWidth = 50;
        const environmentLength = 500;
        const widthSegments = 80;
        const lengthSegments = 300;

        const floorGeometry = new THREE.PlaneGeometry(
            environmentWidth,
            environmentLength,
            widthSegments,
            lengthSegments
        );

        floorGeometry.rotateX(-Math.PI / 2);

        const positions = floorGeometry.attributes.position;

        const leftArchStart = -5;
        const leftArchEnd = -25;
        const leftArchWidth = Math.abs(leftArchEnd - leftArchStart);

        const rightArchStart = 12;
        const rightArchEnd = 25;
        const rightArchWidth = Math.abs(rightArchEnd - rightArchStart);

        const archRadius = 14;
        const maxLeftFoldAngle = Math.PI * 0.85;

        const maxRightFoldAngle = Math.PI * 0.55;
        const rightArchCompressionX = 0.4;
        const rightArchStretchY = 1.8;

        for (let i = 0; i < positions.count; i++) {
            const originalX = positions.getX(i);
            const originalZ = positions.getZ(i);

            let newX = originalX;
            let newY = 0;
            let newZ = originalZ;

            const baseNoiseX =
                (Math.sin(originalX * 0.31 + originalZ * 0.47) +
                    Math.cos(originalX * 1.13 - originalZ * 0.89)) *
                0.5;
            const baseNoiseY =
                (Math.sin(originalX * 0.23 + originalZ * 0.53) +
                    Math.cos(originalX * 0.79 - originalZ * 0.31) * 0.5 +
                    Math.sin(originalX * 1.73 + originalZ * 1.17) * 0.25) *
                0.4;
            const baseNoiseZ =
                (Math.cos(originalX * 0.41 - originalZ * 0.67) +
                    Math.sin(originalX * 1.07 + originalZ * 0.93)) *
                0.5;

            let wallInfluence = 0;

            const baseRadiusOffset =
                Math.sin(originalX * 0.17) * Math.cos(originalZ * 0.11) * 3 +
                Math.sin(originalX * 0.61 + originalZ * 0.43) * 1.5;
            const currentRadius = archRadius + baseRadiusOffset;

            if (originalX < leftArchStart) {
                const normalizedDistance =
                    Math.abs(originalX - leftArchStart) / leftArchWidth;
                wallInfluence = THREE.MathUtils.clamp(normalizedDistance, 0, 1);

                const foldAngle = wallInfluence * maxLeftFoldAngle;
                newX = leftArchStart - currentRadius * Math.sin(foldAngle);
                newY = archRadius - currentRadius * Math.cos(foldAngle);
            } else if (originalX > rightArchStart) {
                const normalizedDistance =
                    Math.abs(originalX - rightArchStart) / rightArchWidth;
                wallInfluence = THREE.MathUtils.clamp(normalizedDistance, 0, 1);

                const curveAcceleration = Math.pow(wallInfluence, 0.7);
                const foldAngle = curveAcceleration * maxRightFoldAngle;

                newX =
                    rightArchStart +
                    currentRadius * rightArchCompressionX * Math.sin(foldAngle);
                newY =
                    (archRadius - currentRadius * Math.cos(foldAngle)) *
                    rightArchStretchY;
            }

            const wallNoiseX =
                Math.sin(originalX * 0.5 + originalZ * 0.3) * 2 +
                Math.sin(originalX * 1.5 - originalZ * 1.2) * 0.8;
            const wallNoiseY =
                Math.cos(originalX * 0.4 - originalZ * 0.5) * 2.5 +
                Math.sin(originalX * 1.2 + originalZ * 0.8) * 1.2;
            const wallNoiseZ =
                Math.cos(originalX * 0.6 + originalZ * 0.4) * 2 +
                Math.cos(originalX * 1.8 - originalZ * 1.5) * 0.7;

            const combinedChaosX = baseNoiseX + wallNoiseX * wallInfluence;
            const combinedChaosY = baseNoiseY + wallNoiseY * wallInfluence;
            const combinedChaosZ = baseNoiseZ + wallNoiseZ * wallInfluence;

            positions.setX(i, newX + combinedChaosX);
            positions.setY(i, newY + combinedChaosY - 3);
            positions.setZ(i, newZ + combinedChaosZ);
        }

        floorGeometry.computeVertexNormals();

        let floorTexture = null;

        if (this.stoneTexture) {
            floorTexture = this.stoneTexture.clone();
            floorTexture.wrapS = THREE.RepeatWrapping;
            floorTexture.wrapT = THREE.RepeatWrapping;
            floorTexture.repeat.set(4, 30);
            floorTexture.needsUpdate = true;
        }

        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            color: 0x555566,
            roughness: 1.0,
            metalness: 0.1,
            flatShading: true,
            side: THREE.DoubleSide,
        });

        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

        const edgesGeometry = new THREE.EdgesGeometry(floorGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
        });

        const floorEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        floorMesh.add(floorEdges);

        floorMesh.position.z = 35;
        floorMesh.rotateY(-Math.PI / 6);

        this.group.add(floorMesh);
    }

    get mapLayout() {
        return this.#mapLayout;
    }

    createHexagons(scene) {
        this.#mapLayout.forEach((tile) => {
            const sideMaterial = new THREE.MeshStandardMaterial({
                map: this.stoneTexture,
                color: 0xffffff,
                roughness: 0.8,
                metalness: 0.2,
            });

            let topMaterial = sideMaterial;
            if (tile.letter) {
                const tex = createLetterTexture(
                    tile.letter,
                    this.stoneTexture ? this.stoneTexture.image : null
                );
                topMaterial = new THREE.MeshStandardMaterial({
                    map: tex,
                    color: 0xffffff,
                    roughness: 0.8,
                    metalness: 0.2,
                });
            }

            const hexMesh = createBeveledHexagon(sideMaterial, topMaterial);
            let randome_z = Math.random() * 1.3;

            tile.baseY = randome_z;

            hexMesh.position.set(tile.x, randome_z, tile.y);

            hexMesh.rotation.y = 0;

            tile.mesh = hexMesh;
            this.group.add(hexMesh);

            if (tile.isDoorTile) {
                this.createDoor(hexMesh);
            }
        });
    }

    createDoor(parentMesh) {
        const doorGroup = new THREE.Group();

        const pillarMat = new THREE.MeshStandardMaterial({
            map: this.stoneTexture,
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1,
        });

        const pillarGeo = new THREE.BoxGeometry(1.5, 12, 1.5);
        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-3, 6, 0);

        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(3, 6, 0);

        const archGeo = new THREE.BoxGeometry(7.5, 2, 1.5);
        const arch = new THREE.Mesh(archGeo, pillarMat);
        arch.position.set(0, 13, 0);

        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033,
            roughness: 0.9,
            metalness: 0.1,
        });
        const doorGeo = new THREE.BoxGeometry(2.25, 12, 0.5);

        const leftDoorPivot = new THREE.Group();
        leftDoorPivot.position.set(-2.25, 6, 0);
        const leftDoorMesh = new THREE.Mesh(doorGeo, doorMat);
        leftDoorMesh.position.set(1.125, 0, 0);
        leftDoorPivot.add(leftDoorMesh);

        const rightDoorPivot = new THREE.Group();
        rightDoorPivot.position.set(2.25, 6, 0);
        const rightDoorMesh = new THREE.Mesh(doorGeo, doorMat);
        rightDoorMesh.position.set(-1.125, 0, 0);
        rightDoorPivot.add(rightDoorMesh);

        this.leftDoorPivot = leftDoorPivot;
        this.rightDoorPivot = rightDoorPivot;

        doorGroup.add(leftPillar);
        doorGroup.add(rightPillar);
        doorGroup.add(arch);
        doorGroup.add(leftDoorPivot);
        doorGroup.add(rightDoorPivot);

        doorGroup.position.set(0, 2, 0);
        doorGroup.rotation.y = -Math.PI / 6;
        parentMesh.add(doorGroup);
    }

    openDoor() {
        return new Promise((resolve) => {
            if (!this.leftDoorPivot || !this.rightDoorPivot) {
                resolve();
                return;
            }
            const duration = 1500;
            const startTime = performance.now();

            const animateFade = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const angle = progress * (Math.PI / 2);
                this.leftDoorPivot.rotation.y = -angle;
                this.rightDoorPivot.rotation.y = angle;

                if (progress < 1) {
                    requestAnimationFrame(animateFade);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animateFade);
        });
    }

    update(playerPosition) {
        this.#mapLayout.forEach((tile) => {
            if (tile.mesh) {
                if (tile.isPressed) {
                    tile.mesh.position.y = tile.baseY - 0.2;
                } else {
                    tile.mesh.position.y = tile.baseY;
                }

                if (playerPosition) {
                    const dx = tile.rawPosition.x - playerPosition.x;
                    const dy = tile.rawPosition.y - playerPosition.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const materials = tile.mesh.material;
                    let intensity = 1.0;
                    if (dist > 4) {
                        intensity = 0.05;
                    } else if (dist > 2.0) {
                        intensity = 1.0 - ((dist - 2.0) / 2.0) * 0.95;
                    }

                    const r = Math.floor(255 * intensity);
                    const hex = (r << 16) | (r << 8) | r;
                    materials[0].color.setHex(hex);
                    materials[1].color.setHex(hex);

                    if (tile.mesh.lineMaterial) {
                        const lineR = Math.floor(r * 0.2);
                        const lineHex = (lineR << 16) | (lineR << 8) | lineR;
                        tile.mesh.lineMaterial.color.setHex(lineHex);
                    }
                }
            }
        });
    }

    find(letterToFind, position_y_player) {
        let tile = null;
        const min_y = position_y_player - 3.5;
        const max_y = position_y_player + 3.5;
        for (let i = this.#mapLayout.length - 1; i >= 0; i--) {
            if (
                this.#mapLayout[i].letter === letterToFind &&
                this.#mapLayout[i].rawPosition.y <= max_y &&
                this.#mapLayout[i].rawPosition.y >= min_y
            ) {
                tile = this.#mapLayout[i];
                break;
            }
        }
        return tile;
    }

    static async init(scene, worldLayout) {
        const initialSize = 1;
        const layout = worldLayout.map((tileRaw) => {
            const hex = new HexTile(
                tileRaw.id || tileRaw.key,
                tileRaw.x,
                tileRaw.y,
                tileRaw.isPressed || false,
                initialSize,
                tileRaw.letter
            );
            hex.isDoorTile = tileRaw.isDoorTile;
            return hex;
        });

        const textureLoader = new THREE.TextureLoader();
        let stoneTexture = null;
        try {
            stoneTexture = await textureLoader.loadAsync(
                "/asset/game_assets/stone.jpg"
            );
        } catch (e) {
            console.error("Error loading stone texture:", e);
        }

        return new WorldMap(layout, initialSize, scene, stoneTexture);
    }
}
