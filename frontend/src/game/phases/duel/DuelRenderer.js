import * as THREE from "three";
import Keyboard from "../../managers/Keyboard.js";
import { getKeyboardLayout } from "../../utilities/KEYBOARD.js";
import Player from "../../models/actors/Player.js";
import ModelLoader from "../../../core/utils/ModelLoader.js";
import { DuelDecorBuilder } from "../../utilities/DuelDecorBuilder.js";

export class DuelRenderer {
    constructor(phase) {
        this.phase = phase;
        this.localKeyboardPivot = null;
        this.remoteKeyboardPivot = null;
        this.localKeyboard = null;
        this.remoteKeyboard = null;
        this.decor = null;
        this.fireballGltf = null;
    }

    async init(scene, camera, localData, remoteData) {
        this.decor = DuelDecorBuilder.buildArena(scene);

        camera.position.set(0, 11, 13.0);
        camera.lookAt(0, 0, 6.5);

        this.localKeyboardPivot = new THREE.Group();
        this.localKeyboardPivot.position.set(0, 0, 8);
        scene.add(this.localKeyboardPivot);

        const localKeyboardGroup = new THREE.Group();
        localKeyboardGroup.position.set(-16, 0, -3.2);
        this.localKeyboardPivot.add(localKeyboardGroup);
        this.localKeyboard = Keyboard.init(localKeyboardGroup, getKeyboardLayout(), "styx");

        this.remoteKeyboardPivot = new THREE.Group();
        this.remoteKeyboardPivot.position.set(0, 0, -8);
        this.remoteKeyboardPivot.rotation.y = Math.PI;
        scene.add(this.remoteKeyboardPivot);

        const remoteKeyboardGroup = new THREE.Group();
        remoteKeyboardGroup.position.set(-16, 0, -3.2);
        this.remoteKeyboardPivot.add(remoteKeyboardGroup);
        this.remoteKeyboard = Keyboard.init(remoteKeyboardGroup, getKeyboardLayout(), "styx");

        this.fireballGltf = await ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb");

        this.phase.localPlayer = new Player(
            localData.username, Infinity, 100, { x: 0, y: 0, z: 0.225 }, { width: 0.4, height: 0.4 },
            localKeyboardGroup, this.fireballGltf.scene, null, null, null
        );
        this.phase.localPlayer.offsetY = 0.225;

        this.phase.remotePlayer = new Player(
            remoteData.username, Infinity, 100, { x: 0, y: 0, z: 0.225 }, { width: 0.4, height: 0.4 },
            remoteKeyboardGroup, this.fireballGltf.scene, null, null, null
        );
        this.phase.remotePlayer.offsetY = 0.225;

        if (this.phase.localPlayer.loadPromise) await this.phase.localPlayer.loadPromise;
        if (this.phase.remotePlayer.loadPromise) await this.phase.remotePlayer.loadPromise;
    }

    updateCamera(camera) {
        camera.position.set(0, 11, 13.0);
        camera.lookAt(0, 0, 6.5);
    }

    createStunVisual(playerModel) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
        
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 24), mat);
        ring1.rotation.x = Math.PI / 2;
        group.add(ring1);

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 24), mat);
        ring2.rotation.y = Math.PI / 4;
        group.add(ring2);

        group.position.y = 1.0;
        playerModel.mesh.add(group);
        return group;
    }

    updateStunVisual(visual, deltaTime) {
        if (!visual) return;
        visual.rotation.x += deltaTime * 10;
        visual.rotation.y += deltaTime * 15;
        const pulse = 0.9 + Math.sin(performance.now() * 0.03) * 0.15;
        visual.scale.set(pulse, pulse, pulse);
    }

    createJailVisual(playerModel) {
        const cageGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8, 1, true);
        const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true });
        const cage = new THREE.Mesh(cageGeo, cageMat);
        cage.position.y = 1.25;
        playerModel.mesh.add(cage);
        return cage;
    }

    updateJailVisual(visual, deltaTime) {
        if (!visual) return;
        visual.rotation.y += deltaTime * 2;
        const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.08;
        visual.scale.set(pulse, 1.0, pulse);
    }

    playHitAnimation(model, isLocal) {
        if (!model) return;
        if (isLocal && window.startShake) window.startShake(1.5);

        model.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                const oldColor = child.material.color.clone();
                child.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (child.material) child.material.color.copy(oldColor);
                }, 200);
            }
        });
    }

    draw(localPlayer, remotePlayer) {
        if (this.localKeyboard && localPlayer) {
            this.localKeyboard.keyboardLayout.forEach((tile) => {
                tile.isPressed = (localPlayer.targetPosition.x === tile.rawPosition.x && localPlayer.targetPosition.y === tile.rawPosition.y);
            });
            this.localKeyboard.update();
        }

        if (this.remoteKeyboard && remotePlayer) {
            this.remoteKeyboard.keyboardLayout.forEach((tile) => {
                tile.isPressed = (remotePlayer.targetPosition.x === tile.rawPosition.x && remotePlayer.targetPosition.y === tile.rawPosition.y);
            });
            this.remoteKeyboard.update();
        }
    }

    cleanup(scene) {
        if (this.localKeyboardPivot) scene.remove(this.localKeyboardPivot);
        if (this.remoteKeyboardPivot) scene.remove(this.remoteKeyboardPivot);
        if (this.decor) this.decor.cleanup();
    }
}
