import * as THREE from "three";
import { SurviveDecorBuilder } from "../../../game/utilities/SurviveDecorBuilder.js";
import ModelLoader from "../../../core/utils/ModelLoader.js";
import Keyboard from "../../../game/managers/Keyboard.js";
import { getExtendedMapLayout } from "../../../game/utilities/KEYBOARD.js";
import WorldMap from "../../../game/managers/WorldMap.js";
import { createWordlLayout } from "../../../game/utilities/WORLD_LAYOUT.js";
import { applyTriplanarMapping } from '../../../game/utilities/TextureUtils.js';
import { VoidCreature } from "../../../game/models/actors/VoidCreature.js";

export class AdminPreview3D {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.currentDecor = null;
        this.decorUpdateFn = null;
        this.keyboardGroup = null;
        this.eventMeshes = [];
        this.playerMesh = null;
        this.targetPlayerPos = new THREE.Vector3(15, 1.35, 3);
        this.hasRendered = false;

        this.setupScene();
        this.loadPlayerModel();
        this.startAnimationLoop();
        this.setupResizeObserver();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);

        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.camera.position.set(15, 18, 7);
        this.camera.lookAt(15, 0, 3);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffddaa, 1.5);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    loadPlayerModel() {
        ModelLoader.load("/asset/game_assets/models/player.glb", (gltf) => {
            this.playerMesh = gltf.scene;
            this.playerMesh.scale.set(1.7, 1.7, 1.7);
            this.playerMesh.position.copy(this.targetPlayerPos);
            this.playerMesh.rotation.y = Math.PI / 2;
            this.scene.add(this.playerMesh);
        });
    }

    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.decorUpdateFn) {
                this.decorUpdateFn(0.016);
            }
            if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            if (w > 0 && h > 0) {
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h);
                if (!this.hasRendered) {
                    this.hasRendered = true;
                    // Initial render is handled externally by renderPreview
                }
            }
        });
        resizeObserver.observe(this.container);
    }

    clearScene() {
        if (this.currentDecor) {
            this.scene.remove(this.currentDecor);
        }
        if (this.keyboardGroup) {
            this.scene.remove(this.keyboardGroup);
            this.keyboardGroup = null;
        }
        this.eventMeshes.forEach(m => this.scene.remove(m));
        this.eventMeshes = [];
    }

    renderPreview(phaseType, options, events) {
        this.clearScene();

        if (phaseType === "survive") {
            this.renderSurvivePreview(options);
        } else if (phaseType === "void" || phaseType === "fall") {
            this.renderVoidOrFallPreview();
        } else {
            this.renderWorldPreview(options);
        }

        this.renderEventsPreviews(phaseType, events);
    }

    renderSurvivePreview(options) {
        this.camera.position.set(15, 18, 7);
        this.camera.lookAt(15, 0, 3);
        this.scene.background = new THREE.Color(0x0a0c10);

        const decorType = options.decorType || "default";
        const decorObj = SurviveDecorBuilder.buildDecor(decorType, this.scene);
        
        this.currentDecor = decorObj.decorGroup;
        this.decorUpdateFn = decorObj.update;
        this.currentDecor.position.set(0, 0, 0);

        const padSides = options.paddingSides !== undefined ? Number(options.paddingSides) : 3;
        const padTB = options.paddingTopBottom !== undefined ? Number(options.paddingTopBottom) : 5;

        this.keyboardGroup = new THREE.Group();
        Keyboard.init(this.keyboardGroup, getExtendedMapLayout(padSides, padTB), decorType);
        this.keyboardGroup.position.set(0, 0, 0);
        this.scene.add(this.keyboardGroup);

        if (this.playerMesh) {
            this.playerMesh.position.set(15, 1.35, 5);
        } else {
            this.targetPlayerPos.set(15, 1.35, 5);
        }
    }

    renderVoidOrFallPreview() {
        this.camera.position.set(20, 20, 10);
        this.camera.lookAt(0, 0, 0);
        this.scene.background = new THREE.Color(0x0a0c10);
        
        const creature = new VoidCreature(this.scene, { x: 0, y: -6, z: -30 });
        creature.init();
        this.currentDecor = creature.mesh;
        
        if (this.playerMesh) {
            this.playerMesh.position.set(0, 1.35, 10);
        } else {
            this.targetPlayerPos.set(0, 1.35, 10);
        }
    }

    renderWorldPreview(options) {
        this.camera.position.set(12, 110, 15);
        this.camera.lookAt(12, 0, -38);
        this.scene.background = new THREE.Color(0x0a0c10);

        const introType = options.introType || "staircase";
        const outroType = options.outroType || "DoorEvent";
        const worldDistance = options.worldDistance ? Number(options.worldDistance) : 30;
        
        const layout = createWordlLayout(introType, worldDistance);

        if (options.storyEvents) {
            options.storyEvents.forEach(evt => {
                if (evt.actionType === 'bridge' || evt.actionType === 'jumpword') {
                    const d = evt.tileDistance || 15;
                    layout.forEach(tile => {
                        if (tile.y <= -d && tile.y > -(d + 5)) {
                            tile.renderMesh = false;
                        }
                    });
                }
            });
        }

        if (outroType === "HoleEvent") {
            const doorRow = layout.filter((t) => t.isDoorRow);
            if (doorRow.length > 0) {
                doorRow.sort((a, b) => a.x - b.x);
                const centerTile = doorRow[Math.floor(doorRow.length / 2)];
                if (centerTile) centerTile.renderMesh = false;
            }
        }

        WorldMap.init(this.scene, layout).then((wMap) => {
            this.currentDecor = wMap.group;
            this.setupWorldPlayerPos(wMap);
            this.setupWorldOutro(wMap, outroType);
        });
    }

    setupWorldPlayerPos(wMap) {
        const spawnTile = wMap.mapLayout.find(t => t.isSpawn) || wMap.mapLayout[1] || wMap.mapLayout[0];
        const spawnPos = spawnTile.mesh.position;

        if (this.playerMesh) {
            this.playerMesh.position.set(spawnPos.x, spawnPos.y + 1.35, spawnPos.z);
        } else {
            this.targetPlayerPos.set(spawnPos.x, spawnPos.y + 1.35, spawnPos.z);
        }
    }

    setupWorldOutro(wMap, outroType) {
        const doorRow = wMap.mapLayout.filter((t) => t.isDoorRow);
        if (doorRow.length === 0) return;

        doorRow.sort((a, b) => a.rawPosition.x - b.rawPosition.x);
        const exitTile = doorRow[Math.floor(doorRow.length / 2)];
        
        if (!exitTile || !exitTile.mesh) return;

        if (outroType === "DoorEvent") {
            this.buildDoorEvent(wMap, exitTile);
        } else if (outroType === "HoleEvent") {
            this.buildHoleEvent(exitTile);
        }
    }

    buildDoorEvent(wMap, exitTile) {
        const doorGroup = new THREE.Group();
        const pillarMat = new THREE.MeshStandardMaterial({
            map: wMap.stoneTexture,
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1,
        });
        applyTriplanarMapping(pillarMat);
        
        const pillarGeo = new THREE.BoxGeometry(1.5, 12, 1.5);
        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-3, 6, 0);
        
        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(3, 6, 0);
        
        const archGeo = new THREE.BoxGeometry(7.5, 2, 1.5);
        const arch = new THREE.Mesh(archGeo, pillarMat);
        arch.position.set(0, 13, 0);
        
        doorGroup.add(leftPillar, rightPillar, arch);
        doorGroup.position.set(0, 2, 0);
        doorGroup.rotation.y = -Math.PI / 6;
        exitTile.mesh.add(doorGroup);
    }

    buildHoleEvent(exitTile) {
        const holeGeo = new THREE.CylinderGeometry(1.3, 1.3, 15, 32);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
        const holeMesh = new THREE.Mesh(holeGeo, holeMat);
        holeMesh.position.set(exitTile.mesh.position.x, (exitTile.baseY || 0) - 7.5, exitTile.mesh.position.z);
        this.currentDecor.add(holeMesh);
    }

    renderEventsPreviews(phaseType, events) {
        if (!events) return;

        events.forEach(evt => {
            const size = 1.5;
            let color = 0xffffff;
            if (evt.actionType === 'spawn') color = 0xff0000;
            else if (evt.actionType === 'heal') color = 0x00ff00;
            else if (evt.actionType === 'dialogue') color = 0x0000ff;

            const geo = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
            const mesh = new THREE.Mesh(geo, mat);

            const tileDistance = evt.tileDistance || 0;

            if (phaseType === 'survive') {
                mesh.position.set(0, size / 2, tileDistance * 3.2);
                this.scene.add(mesh);
                this.eventMeshes.push(mesh);
            } else if (evt.actionType !== 'bridge' && evt.actionType !== 'jumpword' && evt.actionType !== 'flamewall') {
                mesh.position.set(12, 2.0 + size / 2, -tileDistance * 2.25);
                this.scene.add(mesh);
                this.eventMeshes.push(mesh);
            }
        });
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.container.innerHTML = "";
        }
    }
}
