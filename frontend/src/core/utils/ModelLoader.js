import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from '/node_modules/three/examples/jsm/utils/SkeletonUtils.js';

class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
        this.pending = new Map();
    }

    /**
     * Loads the async.
     * @param {any} url - The url.
     */
    async loadAsync(url) {
        if (this.cache.has(url)) {
            const cachedGltf = this.cache.get(url);
            const clonedScene = this._cloneScene(cachedGltf.scene);
            return { ...cachedGltf, scene: clonedScene };
        }

        if (this.pending.has(url)) {
            const cachedGltf = await this.pending.get(url);
            const clonedScene = this._cloneScene(cachedGltf.scene);
            return { ...cachedGltf, scene: clonedScene };
        }

        const loadPromise = this.loader.loadAsync(url).then(gltf => {
            this.cache.set(url, gltf);
            this.pending.delete(url);
            return gltf;
        });

        this.pending.set(url, loadPromise);

        const gltf = await loadPromise;
        const clonedScene = this._cloneScene(gltf.scene);
        return { ...gltf, scene: clonedScene };
    }

    /**
     * _clones the scene.
     * @param {any} scene - The scene.
     */
    _cloneScene(scene) {
        let hasBones = false;
        scene.traverse((child) => {
            if (child.isBone) {
                hasBones = true;
            }
        });
        return hasBones ? SkeletonUtils.clone(scene) : scene.clone(true);
    }

    /**
     * Loads the resource or data.
     * @param {any} url - The url.
     * @param {any} onLoad - The onLoad.
     * @param {any} onProgress - The onProgress.
     * @param {any} onError - The onError.
     */
    load(url, onLoad, onProgress, onError) {
        this.loadAsync(url).then(onLoad).catch(onError);
    }
}

export default new ModelLoader();
