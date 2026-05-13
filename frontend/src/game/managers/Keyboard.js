import * as THREE from "three";
import Key from "../models/Key.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Keyboard {
    #keyboardLayout;
    tileSize;
    group;

    constructor(keyboardLayout, tileSize, scene) {
        this.#keyboardLayout = keyboardLayout;
        this.tileSize = tileSize;
        this.group = new THREE.Group();
        scene.add(this.group);

        this.loadAndCreateKeys(scene);
    }

    get keyboardLayout() {
        return this.#keyboardLayout;
    }

    loadAndCreateKeys(scene) {
        const loader = new GLTFLoader();

        loader.load(
            "/asset/game_assets/key.glb",
            (gltf) => {
                const keyModel = gltf.scene;

                this.#keyboardLayout.forEach((keyObj) => {
                    const keyMesh = keyModel.clone();

                    keyMesh.position.set(keyObj.x, 0, keyObj.y);

                    keyMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xaaaaaa,
                                roughness: 0.5,
                                metalness: 0.2,
                            });
                        }
                    });

                    const letterTexture = createTextTexture(
                        keyObj.key.toUpperCase()
                    );

                    const planeGeometry = new THREE.PlaneGeometry(1.2, 1.2);
                    const planeMaterial = new THREE.MeshBasicMaterial({
                        map: letterTexture,
                        transparent: true,
                        side: THREE.DoubleSide,
                    });
                    const letterPlane = new THREE.Mesh(
                        planeGeometry,
                        planeMaterial
                    );

                    letterPlane.position.set(0, 1, 0);
                    letterPlane.rotation.x = -Math.PI / 2;

                    keyMesh.add(letterPlane);

                    keyObj.mesh = keyMesh;
                    this.group.add(keyMesh);
                });
            },
            undefined,
            (error) => {
                throw new Error(
                    `Erreur lors du chargement du modèle GLB: ${error}`
                );
            }
        );
    }

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

    find(keyToFind) {
        return this.#keyboardLayout.find((key) => key.key === keyToFind);
    }

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
