import * as THREE from "three";
import { StyxDecor } from "./decors/StyxDecor.js";
import { MineDecor } from "./decors/MineDecor.js";
import { DungeonDecor } from "./decors/DungeonDecor.js";
import { DefaultDecor } from "./decors/DefaultDecor.js";

/**
 * Utility class acting as a Director for building various decorative environments using the Strategy pattern.
 */
export class SurviveDecorBuilder {
    /**
     * Main entry point to build and add the requested decor to the scene.
     *
     * @param {string} type - The type of decor to build (e.g., 'mine', 'styx', 'dungeon').
     * @param {THREE.Scene} scene - The Three.js scene to attach the decor to.
     * @returns {{decorGroup: THREE.Group, update: Function, cleanup: Function}} Object containing the decor group, the update loop function, and the memory cleanup function.
     */
    static buildDecor(type, scene) {
        const decorGroup = new THREE.Group();
        const disposables = [];
        let updateFn = () => { return { y: 0, rotationX: 0, rotationZ: 0 }; };

        scene.add(decorGroup);

        const strategies = {
            "styx": StyxDecor,
            "mine": MineDecor,
            "dungeon": DungeonDecor
        };

        const BuilderStrategy = strategies[type] || DefaultDecor;
        updateFn = BuilderStrategy.build(scene, decorGroup, disposables);

        const cleanupFn = () => {
            disposables.forEach(item => item.dispose());
            scene.remove(decorGroup);
        };

        return { decorGroup, update: updateFn, cleanup: cleanupFn };
    }
}
