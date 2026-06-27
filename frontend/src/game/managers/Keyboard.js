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
     * @param {any} keyboardLayout - The keyboardLayout.
     * @param {any} tileSize - The tileSize.
     * @param {any} scene - The scene.
     * @param {any} theme - The theme.
     * @param {any} options - The options.
     */
    constructor(keyboardLayout, tileSize, scene, theme = "mine", options = {}) {
        this.#keyboardLayout = keyboardLayout;
        this.tileSize = tileSize;
        this.theme = theme;
        this.options = options;
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
     * @param {any} scene - The scene.
     */
    loadAndCreateKeys(scene) {
        const isStyx = this.theme === "styx";
        const isGrotte = this.theme === "grotte";
        const isDungeon = this.theme === "dungeon" || isGrotte;
        const isTraining = this.theme === "training";

        const padSides = this.options && this.options.paddingSides !== undefined ? this.options.paddingSides : 3;
        const padTB = this.options && this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 5;
        const hasPadding = (padSides > 0 || padTB > 0);

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

            const colors = isGrotte 
                ? [0x3a332d, 0x4a413a, 0x2e2924, 0x5a5046]
                : [0x888888, 0x6e7d69, 0x918370, 0x4d4c4f];
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
            : isTraining
            ? new THREE.BoxGeometry(2.6, 0.3, 2.6)
            : new THREE.CylinderGeometry(1.3 * Math.SQRT2, 1.4 * Math.SQRT2, 0.3, 4);
            
        const ringMat = isStyx
            ? new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 })
            : isGrotte
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x3a332d, roughness: 1.0 })
            : isDungeon
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x555555, roughness: 1.0 })
            : isTraining
            ? new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })
            : new THREE.MeshStandardMaterial({ color: 0xc5a059, roughness: 0.3, metalness: 0.8 });

        const capGeo = isStyx
            ? new THREE.CylinderGeometry(1.2, 1.4, 0.45, 6)
            : isDungeon
            ? new THREE.CylinderGeometry(1.1, 1.1, 0.45, 8)
            : isTraining
            ? new THREE.BoxGeometry(2.4, 0.4, 2.4)
            : new THREE.CylinderGeometry(1.0 * Math.SQRT2, 1.2 * Math.SQRT2, 0.35, 4);
            
        const capMat = isStyx
            ? new THREE.MeshStandardMaterial({ color: 0x1d2432, roughness: 0.8 })
            : isGrotte
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x5c5043, roughness: 0.9 })
            : isDungeon
            ? new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xaaaaaa, roughness: 0.9 })
            : isTraining
            ? new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
            : new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });

        const planeGeometry = new THREE.PlaneGeometry(1.8, 1.8);
        const textColor = isStyx ? "#00ffff" : isGrotte ? "#00ffaa" : isDungeon ? "#ff3300" : isTraining ? "#ffffff" : "#c5a059";

        this.#keyboardLayout.forEach((keyObj) => {
            const keyGroup = new THREE.Group();

            if (keyObj.isGround) {
                if (!hasPadding) return;
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
                if (!isStyx && !isDungeon && !isTraining) {
                    ringMesh.rotation.y = Math.PI / 4;
                    capMesh.rotation.y = Math.PI / 4;
                }
                keyGroup.add(ringMesh);
                keyGroup.add(capMesh);

                if (isDungeon && !isGrotte) {
                    const bronzeMesh = new THREE.Mesh(bronzeGeo, bronzeMat);
                    bronzeMesh.position.y = 0.15;
                    keyGroup.add(bronzeMesh);
                }

                const letterTexture = createTextTexture(
                    keyObj.key.toUpperCase(),
                    textColor,
                    "rgba(0,0,0,0)",
                    180,
                    this.theme
                );

                const planeMaterial = new THREE.MeshBasicMaterial({
                    map: letterTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                });
                
                const letterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
                const letterY = isStyx ? 0.24 : isDungeon ? 0.235 : isTraining ? 0.21 : 0.18;
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

        if (isDungeon && !isGrotte && hasPadding) {
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
     * @param {any} enemiesManager - The enemiesManager.
     */
    update(enemiesManager = null) {
        const isStyx = this.theme === "styx";
        const isGrotte = this.theme === "grotte";
        const isDungeon = this.theme === "dungeon" || isGrotte;
        const isTraining = this.theme === "training";
        
        const pressedColor = isStyx ? 0x00ffff : isGrotte ? 0x00ffaa : isDungeon ? 0xff3300 : isTraining ? 0x999999 : 0xc5a059;
        const unpressedColor = isStyx ? 0x1d2432 : isGrotte ? 0x5c5043 : isDungeon ? 0xaaaaaa : isTraining ? 0x222222 : 0x111111;
        const pressedY = isStyx ? 0.0 : isDungeon ? -0.1 : isTraining ? 0.0 : 0.05;

        this.#keyboardLayout.forEach((keyObj) => {
            if (keyObj.isGround) return;
            
            if (keyObj.mesh) {
                const capMaterial = keyObj.mesh.children[1].material;
                if (keyObj.isPressed) {
                    keyObj.mesh.position.y = pressedY;
                    capMaterial.color.setHex(pressedColor);
                } else {
                    keyObj.mesh.position.y = 0.15;
                    if (keyObj.defaultTrainingColor !== undefined) {
                        capMaterial.color.setHex(keyObj.defaultTrainingColor);
                    } else {
                        capMaterial.color.setHex(unpressedColor);
                    }
                }
            }
        });
    }

    /**
     * Finds a key by its character or identifier.
     * @param {any} keyToFind - The keyToFind.
     * @returns {Key|undefined} The matched Key object, or undefined.
     */
    find(keyToFind) {
        return this.#keyboardLayout.find((key) => key.key === keyToFind);
    }

    /**
     * Rebuilds the keyboard layout dynamically (e.g. AZERTY to QWERTY).
     * @param {any} newLayoutRaw - The newLayoutRaw.
     * @param {any} newOptions - The newOptions.
     */
    rebuild(newLayoutRaw, newOptions = null) {
        if (newOptions) {
            this.options = { ...this.options, ...newOptions };
        }
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
     * @param {any} scene - The scene.
     * @param {any} keyboardLayout - The keyboardLayout.
     * @param {any} theme - The theme.
     * @param {any} options - The options.
     * @returns {Keyboard} A new Keyboard instance.
     */
    static init(scene, keyboardLayout, theme = "mine", options = {}) {
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
        return new Keyboard(keys, initialSize, scene, theme, options);
    }
}

/**
 * Creates a canvas-based texture displaying text.
 * @param {any} text - The text.
 * @param {any} color - The color.
 * @param {any} bgColor - The bgColor.
 * @param {any} 0 - The 0.
 * @param {any} 0 - The 0.
 * @param {any} 0 - The 0.
 * @returns {THREE.CanvasTexture} The generated texture.
 */
function createTextTexture(
    text,
    color = "black",
    bgColor = "rgba(0,0,0,0)",
    fontSize = 90,
    theme = "mine"
) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 256;

    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (theme === "dungeon") {
        context.shadowColor = "#ff2200";
        context.shadowBlur = 18;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    } else if (theme === "grotte") {
        context.shadowColor = "#00ffaa";
        context.shadowBlur = 18;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    } else if (theme === "styx") {
        context.shadowColor = "#00ffff";
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
