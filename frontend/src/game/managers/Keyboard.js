import * as THREE from "three";
import Key from "../models/Key.js";

/**
 * Manages the virtual keyboard rendering and logic.
 */
export default class Keyboard {
    #keyboardLayout;
    tileSize;
    group;

    /**
     * Creates an instance of Keyboard.
     * @param {Array<Key>} keyboardLayout - Array of instantiated Key objects.
     * @param {number} tileSize - The size of each tile/key.
     * @param {THREE.Scene} scene - The main three.js scene.
     * @param {string} theme - The theme of the keyboard ('mine' or 'styx').
     */
    constructor(keyboardLayout, tileSize, scene, theme = "mine") {
        this.#keyboardLayout = keyboardLayout;
        this.tileSize = tileSize;
        this.theme = theme;
        this.group = new THREE.Group();
        scene.add(this.group);

        this.loadAndCreateKeys(scene);
    }

    /**
     * Gets the keyboard layout.
     * @returns {Array<Key>} The array of key objects.
     */
    get keyboardLayout() {
        return this.#keyboardLayout;
    }

    /**
     * Creates instances for each key procedurally to match the visual theme.
     * @param {THREE.Scene} scene - The main three.js scene.
     */
    loadAndCreateKeys(scene) {
        const isStyx = this.theme === "styx";
        const isDungeon = this.theme === "dungeon";

        let stoneTexture = null;
        const dungeonFloorMats = [];
        let bronzeMat = null;
        let bronzeGeo = null;

        if (isDungeon) {
            stoneTexture = new THREE.TextureLoader().load('/asset/game_assets/textures/stone.webp');
            stoneTexture.wrapS = THREE.RepeatWrapping;
            stoneTexture.wrapT = THREE.RepeatWrapping;
            stoneTexture.repeat.set(1, 1);

            bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8c6d3b, roughness: 0.4, metalness: 0.8 });
            bronzeGeo = new THREE.CylinderGeometry(1.32, 1.32, 0.06, 8);

            const colors = [0x888888, 0x6e7d69, 0x918370, 0x4d4c4f];
            colors.forEach(col => {
                dungeonFloorMats.push(new THREE.MeshStandardMaterial({
                    map: stoneTexture,
                    color: col,
                    roughness: 1.0
                }));
            });
        }

        const ringGeo = isStyx 
            ? new THREE.CylinderGeometry(1.3, 1.5, 0.4, 6)
            : isDungeon
            ? new THREE.CylinderGeometry(1.3, 1.4, 0.35, 8)
            : new THREE.CylinderGeometry(1.4, 1.4, 0.3, 32);
            
        const ringMat = isStyx
            ? new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 })
            : isDungeon
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x555555, roughness: 1.0 })
            : new THREE.MeshStandardMaterial({ color: 0xc5a059, roughness: 0.3, metalness: 0.8 });

        const capGeo = isStyx
            ? new THREE.CylinderGeometry(1.2, 1.4, 0.45, 6)
            : isDungeon
            ? new THREE.CylinderGeometry(1.1, 1.1, 0.45, 8)
            : new THREE.CylinderGeometry(1.2, 1.2, 0.35, 32);
            
        const capMat = isStyx
            ? new THREE.MeshStandardMaterial({ color: 0x1d2432, roughness: 0.8 })
            : isDungeon
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xaaaaaa, roughness: 0.9 })
            : new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });

        const planeGeometry = new THREE.PlaneGeometry(1.8, 1.8);
        const textColor = isStyx ? "#00ffff" : isDungeon ? "#ff3300" : "#c5a059";

        this.#keyboardLayout.forEach((keyObj) => {
            const keyGroup = new THREE.Group();

            if (keyObj.isGround) {
                if (isDungeon) {
                    const groundGeo = new THREE.BoxGeometry(2.9, 0.4, 2.9);
                    const randMat = dungeonFloorMats[Math.floor(Math.random() * dungeonFloorMats.length)];
                    const groundMesh = new THREE.Mesh(groundGeo, randMat);
                    
                    groundMesh.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
                    groundMesh.rotation.x = (Math.random() - 0.5) * 0.05;
                    groundMesh.rotation.z = (Math.random() - 0.5) * 0.05;
                    groundMesh.scale.set(
                        0.95 + Math.random() * 0.1,
                        0.6 + Math.random() * 0.6,
                        0.95 + Math.random() * 0.1
                    );
                    groundMesh.position.set((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15);
                    keyGroup.add(groundMesh);
                } else {
                    const currentRingGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.2, 6);
                    const currentCapGeo = new THREE.CylinderGeometry(1.3, 1.4, 0.25, 6);
                    const currentRingMat = new THREE.MeshStandardMaterial({ 
                        color: 0x666666, 
                        roughness: 0.9,
                        transparent: true,
                        opacity: 0.4
                    });
                    const ringMesh = new THREE.Mesh(currentRingGeo, currentRingMat);
                    const capMesh = new THREE.Mesh(currentCapGeo, currentRingMat);
                    keyGroup.add(ringMesh);
                    keyGroup.add(capMesh);
                }
            } else {
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                const capMesh = new THREE.Mesh(capGeo, capMat.clone());
                keyGroup.add(ringMesh);
                keyGroup.add(capMesh);

                if (isDungeon) {
                    const bronzeMesh = new THREE.Mesh(bronzeGeo, bronzeMat);
                    bronzeMesh.position.y = 0.15;
                    keyGroup.add(bronzeMesh);
                }

                const letterTexture = createTextTexture(
                    keyObj.key.toUpperCase(),
                    textColor,
                    "rgba(0,0,0,0)",
                    180,
                    isDungeon
                );

                const planeMaterial = new THREE.MeshBasicMaterial({
                    map: letterTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                });
                
                const letterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
                const letterY = isStyx ? 0.24 : isDungeon ? 0.235 : 0.18;
                letterPlane.position.set(0, letterY, 0);
                letterPlane.rotation.x = -Math.PI / 2;

                keyGroup.add(letterPlane);
            }

            let yOffset = 0.15;
            
            if (keyObj.isGround) {
                if (isDungeon) {
                    yOffset = (Math.random() - 0.5) * 0.25;
                } else {
                    yOffset = 0.05;
                }
            }
            keyGroup.position.set(keyObj.x, yOffset, keyObj.y);

            keyObj.mesh = keyGroup;
            this.group.add(keyGroup);
        });

        if (isDungeon) {
            for (let y = -15; y <= 15; y++) {
                const offset = (Math.abs(y % 2) === 1) ? 0.5 : 0;
                for (let i = -15; i <= 25; i++) {
                    const x = i + offset;
                    
                    const exists = this.#keyboardLayout.some(
                        k => Math.abs(k.rawPosition.x - x) < 0.1 && Math.abs(k.rawPosition.y - y) < 0.1
                    );
                    
                    if (!exists) {
                        const groundGeo = new THREE.BoxGeometry(2.9, 0.4, 2.9);
                        const randMat = dungeonFloorMats[Math.floor(Math.random() * dungeonFloorMats.length)];
                        const groundMesh = new THREE.Mesh(groundGeo, randMat);
                        
                        groundMesh.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
                        groundMesh.rotation.x = (Math.random() - 0.5) * 0.05;
                        groundMesh.rotation.z = (Math.random() - 0.5) * 0.05;
                        groundMesh.scale.set(
                            0.95 + Math.random() * 0.1,
                            0.6 + Math.random() * 0.6,
                            0.95 + Math.random() * 0.1
                        );
                        
                        const yOffset = (Math.random() - 0.5) * 0.25;
                        const posX = x * 3.2 + (Math.random() - 0.5) * 0.15;
                        const posZ = y * 3.2 + (Math.random() - 0.5) * 0.15;
                        
                        groundMesh.position.set(posX, yOffset, posZ);
                        this.group.add(groundMesh);
                    }
                }
            }
        }
    }

    /**
     * Updates the visuals of the keys based on their state (e.g., pressed).
     */
    update(enemiesManager = null) {
        const isStyx = this.theme === "styx";
        const isDungeon = this.theme === "dungeon";
        
        const pressedColor = isStyx ? 0x00ffff : isDungeon ? 0xff3300 : 0xc5a059;
        const unpressedColor = isStyx ? 0x1d2432 : isDungeon ? 0xaaaaaa : 0x111111;
        const pressedY = isStyx ? 0.0 : isDungeon ? -0.1 : 0.05;


        this.#keyboardLayout.forEach((keyObj) => {
            if (keyObj.isGround) return;
            
            if (keyObj.mesh) {
                const capMaterial = keyObj.mesh.children[1].material;
                if (keyObj.isPressed) {
                    keyObj.mesh.position.y = pressedY;
                    capMaterial.color.setHex(pressedColor);
                } else {
                    keyObj.mesh.position.y = 0.15;
                    capMaterial.color.setHex(unpressedColor);
                }
            }
        });
    }

    /**
     * Finds a key by its character or identifier.
     * @param {string} keyToFind - The key identifier to find.
     * @returns {Key|undefined} The matched Key object, or undefined.
     */
    find(keyToFind) {
        return this.#keyboardLayout.find((key) => key.key === keyToFind);
    }

    /**
     * Rebuilds the keyboard layout dynamically (e.g. AZERTY to QWERTY).
     * @param {Array<Object>} newLayoutRaw - The new raw layout array.
     */
    rebuild(newLayoutRaw) {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            this.group.remove(child);
        }

        this.#keyboardLayout = newLayoutRaw.map(
            (keyRaw) =>
                new Key(
                    keyRaw.key,
                    keyRaw.x,
                    keyRaw.y,
                    keyRaw.isPressed,
                    this.tileSize,
                    keyRaw.isGround
                )
        );

        this.loadAndCreateKeys(null);
    }

    /**
     * Factory method to initialize the keyboard.
     * @param {THREE.Scene} scene - The main three.js scene.
     * @param {Array<Object>} keyboardLayout - The raw layout definition.
     * @param {string} theme - The theme of the keyboard ('mine' or 'styx').
     * @returns {Keyboard} A new Keyboard instance.
     */
    static init(scene, keyboardLayout, theme = "mine") {
        const initialSize = 1;
        const keys = keyboardLayout.map(
            (keyRaw) =>
                new Key(
                    keyRaw.key,
                    keyRaw.x,
                    keyRaw.y,
                    keyRaw.isPressed,
                    initialSize,
                    keyRaw.isGround
                )
        );
        return new Keyboard(keys, initialSize, scene, theme);
    }
}

/**
 * Creates a canvas-based texture displaying text.
 * @param {string} text - The text to display.
 * @param {string} [color="black"] - The text color.
 * @param {string} [bgColor="rgba(0,0,0,0)"] - The background color.
 * @param {number} [fontSize=90] - The font size.
 * @returns {THREE.CanvasTexture} The generated texture.
 */
function createTextTexture(
    text,
    color = "black",
    bgColor = "rgba(0,0,0,0)",
    fontSize = 90,
    isDungeon = false
) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 256;

    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (isDungeon) {
        context.shadowColor = "#ff2200";
        context.shadowBlur = 18;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    }

    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}
