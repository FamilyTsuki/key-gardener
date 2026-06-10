import * as THREE from "three";
import HexTile from "../models/HexTile.js";
import { WorldMapBuilder } from "../utilities/WorldMapBuilder.js";

/**
 * Manages the data and logic of the world map.
 */
export default class WorldMap {
    #mapLayout;
    tileSize;
    group;

    /**
     * Creates a new world map instance.
     * @param {Array} mapLayout - The layout configuration of the map.
     * @param {number} tileSize - The size of each tile.
     * @param {THREE.Scene} scene - The main 3D scene.
     * @param {THREE.Texture} [stoneTexture] - The texture for the tiles.
     */
    constructor(mapLayout, tileSize, scene, stoneTexture, buildEnv = true) {
        this.#mapLayout = mapLayout;
        this.tileSize = tileSize;
        this.stoneTexture = stoneTexture;
        this.group = new THREE.Group();
        scene.add(this.group);

        if (buildEnv) {
            WorldMapBuilder.buildEnvironment(this.group, this.stoneTexture);
        }
        WorldMapBuilder.buildHexagons(
            this.group,
            this.#mapLayout,
            this.stoneTexture
        );
    }

    get mapLayout() {
        return this.#mapLayout;
    }

    /**
     * Updates map tiles based on the player's position.
     * @param {Object} playerPosition - The current position of the player.
     */
    update(playerPosition) {
        this.#mapLayout.forEach((tile) => {
            if (tile.mesh) {
                tile.mesh.position.y = tile.baseY;

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

    /**
     * Finds a specific tile by its associated letter.
     * @param {string} letterToFind - The letter to search for.
     * @param {number} position_y_player - The Y position of the player to filter tiles.
     * @returns {Object|null} The found tile object or null.
     */
    find(letterToFind, position_y_player) {
        let tile = null;
        let min_dist = Infinity;
        const min_y = position_y_player - 3.5;
        const max_y = position_y_player + 3.5;
        for (let i = 0; i < this.#mapLayout.length; i++) {
            if (
                this.#mapLayout[i].letter === letterToFind &&
                this.#mapLayout[i].rawPosition.y <= max_y &&
                this.#mapLayout[i].rawPosition.y >= min_y &&
                !this.#mapLayout[i].isRavine
            ) {
                const dist = Math.abs(this.#mapLayout[i].rawPosition.y - position_y_player);
                if (dist < min_dist) {
                    min_dist = dist;
                    tile = this.#mapLayout[i];
                }
            }
        }
        return tile;
    }

    /**
     * Adds new tiles dynamically to the map.
     * @param {Array} newTilesRaw - Array of raw tile data to add.
     */
    addTiles(newTilesRaw) {
        const newTiles = newTilesRaw.map((tileRaw) => {
            const hex = new HexTile(
                tileRaw.id || tileRaw.key,
                tileRaw.x,
                tileRaw.y,
                tileRaw.isPressed || false,
                this.tileSize,
                tileRaw.letter
            );
            hex.renderMesh = tileRaw.renderMesh !== false;
            hex.role = tileRaw.role || null;
            if (tileRaw.baseY !== undefined) hex.baseY = tileRaw.baseY;
            return hex;
        });

        WorldMapBuilder.buildHexagons(this.group, newTiles, this.stoneTexture);
        this.#mapLayout = this.#mapLayout.concat(newTiles);
        return newTiles;
    }

    /**
     * Removes tiles that match a certain condition to free memory.
     * @param {Function} predicate - Condition function (returns true to remove).
     */
    removeTiles(predicate) {
        const remainingTiles = [];
        for (let i = 0; i < this.#mapLayout.length; i++) {
            const tile = this.#mapLayout[i];
            if (predicate(tile)) {
                if (tile.mesh) {
                    this.group.remove(tile.mesh);
                    if (tile.mesh.geometry) tile.mesh.geometry.dispose();
                    if (tile.mesh.material) {
                        if (Array.isArray(tile.mesh.material)) {
                            tile.mesh.material.forEach(m => m.dispose());
                        } else {
                            tile.mesh.material.dispose();
                        }
                    }
                    if (tile.mesh.lineGeometry) tile.mesh.lineGeometry.dispose();
                    if (tile.mesh.lineMaterial) tile.mesh.lineMaterial.dispose();
                    if (tile.lineMesh) this.group.remove(tile.lineMesh);
                }
            } else {
                remainingTiles.push(tile);
            }
        }
        this.#mapLayout = remainingTiles;
    }

    /**
     * Initializes the world map asynchronously.
     * @param {THREE.Scene} scene - The main 3D scene.
     * @param {Array} worldLayout - The initial layout data for the world.
     * @returns {Promise<WorldMap>} The instantiated world map.
     */
    static async init(scene, worldLayout, buildEnv = true) {
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
            hex.renderMesh = tileRaw.renderMesh !== false;
            hex.role = tileRaw.role || null;
            if (tileRaw.baseY !== undefined) hex.baseY = tileRaw.baseY;
            return hex;
        });

        const textureLoader = new THREE.TextureLoader();
        let stoneTexture = null;
        try {
            stoneTexture = await textureLoader.loadAsync(
                "/asset/game_assets/textures/stone.webp"
            );
            stoneTexture.wrapS = THREE.RepeatWrapping;
            stoneTexture.wrapT = THREE.RepeatWrapping;
        } catch (e) {
            console.error("Error loading stone texture:", e);
        }

        return new WorldMap(layout, initialSize, scene, stoneTexture, buildEnv);
    }
}
