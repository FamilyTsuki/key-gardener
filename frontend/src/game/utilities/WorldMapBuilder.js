import * as THREE from "three";

/**
 * Utility class responsible for constructing the visual elements of the World Map.
 */
export class WorldMapBuilder {
    /**
     * Creates a texture with a letter on it.
     * @param {string} letter - The letter to draw.
     * @param {HTMLImageElement} [stoneImage] - Optional background image.
     * @returns {THREE.CanvasTexture|null} The generated texture or null.
     */
    static createLetterTexture(letter, stoneImage) {
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

    /**
     * Creates a beveled hexagon group.
     * @param {THREE.Material|THREE.Material[]} sideMaterial - The material for the sides.
     * @param {THREE.Material|THREE.Material[]} topMaterial - The material for the top.
     * @returns {THREE.Group} The constructed 3D group.
     */
    static createBeveledHexagon(sideMaterial, topMaterial) {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 120.0, 6);
        const bodyMesh = new THREE.Mesh(bodyGeometry, sideMaterial);
        bodyMesh.position.y = -58.4;

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

    /**
     * Generates the environment such as floor and walls and adds it to the group.
     * @param {THREE.Group} group - The parent group to add the environment to.
     * @param {THREE.Texture} [stoneTexture] - The texture for the floor.
     */
    static buildEnvironment(group, stoneTexture) {
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

        if (stoneTexture) {
            floorTexture = stoneTexture.clone();
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

        group.add(floorMesh);
    }

    /**
     * Constructs the hexagon meshes for the map layout and adds them to the group.
     * @param {THREE.Group} group - The parent group to add the hexagons to.
     * @param {Array} mapLayout - The map layout data.
     * @param {THREE.Texture} [stoneTexture] - The texture for the hexagons.
     * @returns {Object} An object containing references to leftDoorPivot and rightDoorPivot if a door exists.
     */
    static buildHexagons(group, mapLayout, stoneTexture) {
        mapLayout.forEach((tile) => {
            if (tile.renderMesh === false) return;

            const sideMaterial = new THREE.MeshStandardMaterial({
                map: stoneTexture,
                color: 0xffffff,
                roughness: 0.8,
                metalness: 0.2,
            });

            let topMaterial = sideMaterial;
            if (tile.letter) {
                const tex = this.createLetterTexture(
                    tile.letter,
                    stoneTexture ? stoneTexture.image : null
                );
                topMaterial = new THREE.MeshStandardMaterial({
                    map: tex,
                    color: 0xffffff,
                    roughness: 0.8,
                    metalness: 0.2,
                });
            }

            const hexMesh = this.createBeveledHexagon(sideMaterial, topMaterial);
            let randome_z = tile.baseY !== undefined ? tile.baseY : Math.random() * 1.3;

            tile.baseY = randome_z;

            hexMesh.position.set(tile.x, randome_z, tile.y);
            hexMesh.rotation.y = 0;

            tile.mesh = hexMesh;
            group.add(hexMesh);
        });
    }
}
