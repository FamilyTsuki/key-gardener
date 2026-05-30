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
     */
    constructor(keyboardLayout, tileSize, scene) {
        this.#keyboardLayout = keyboardLayout;
        this.tileSize = tileSize;
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
     * Creates instances for each key procedurally to match the vintage typewriter style.
     * @param {THREE.Scene} scene - The main three.js scene.
     */
    loadAndCreateKeys(scene) {
        const ringGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.3, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xc5a059,
            roughness: 0.3,
            metalness: 0.8,
        });

        const capGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.35, 32);
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.1,
        });

        const planeGeometry = new THREE.PlaneGeometry(1.8, 1.8);

        this.#keyboardLayout.forEach((keyObj) => {
            const keyGroup = new THREE.Group();
            
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            const capMesh = new THREE.Mesh(capGeo, capMat);
            
            keyGroup.add(ringMesh);
            keyGroup.add(capMesh);

            const letterTexture = createTextTexture(
                keyObj.key.toUpperCase(),
                "#c5a059",
                "rgba(0,0,0,0)",
                180
            );

            const planeMaterial = new THREE.MeshBasicMaterial({
                map: letterTexture,
                transparent: true,
                side: THREE.DoubleSide,
            });
            
            const letterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
            letterPlane.position.set(0, 0.18, 0);
            letterPlane.rotation.x = -Math.PI / 2;

            keyGroup.add(letterPlane);

            keyGroup.position.set(keyObj.x, 0.15, keyObj.y);

            keyObj.mesh = keyGroup;
            this.group.add(keyGroup);
        });
    }

    /**
     * Updates the visuals of the keys based on their state (e.g., pressed).
     */
    update() {
        this.#keyboardLayout.forEach((keyObj) => {
            if (keyObj.mesh) {
                if (keyObj.isPressed) {
                    keyObj.mesh.position.y = -0.2;
                } else {
                    keyObj.mesh.position.y = 0;
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
     * Factory method to initialize the keyboard.
     * @param {THREE.Scene} scene - The main three.js scene.
     * @param {Array<Object>} keyboardLayout - The raw layout definition.
     * @returns {Keyboard} A new Keyboard instance.
     */
    static init(scene, keyboardLayout) {
        const initialSize = 1;
        const keys = keyboardLayout.map(
            (keyRaw) =>
                new Key(
                    keyRaw.key,
                    keyRaw.x,
                    keyRaw.y,
                    keyRaw.isPressed,
                    initialSize
                )
        );
        return new Keyboard(keys, initialSize, scene);
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
    fontSize = 90
) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 256;

    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}
