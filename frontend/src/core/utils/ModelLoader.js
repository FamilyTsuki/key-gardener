import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
        this.pending = new Map();
    }

    async loadAsync(url) {
        if (this.cache.has(url)) {
            const cachedGltf = this.cache.get(url);
            const clonedScene = SkeletonUtils.clone(cachedGltf.scene);
            return { ...cachedGltf, scene: clonedScene };
        }

        if (this.pending.has(url)) {
            const cachedGltf = await this.pending.get(url);
            const clonedScene = SkeletonUtils.clone(cachedGltf.scene);
            return { ...cachedGltf, scene: clonedScene };
        }

        const loadPromise = this.loader.loadAsync(url).then(gltf => {
            this.cache.set(url, gltf);
            this.pending.delete(url);
            return gltf;
        });

        this.pending.set(url, loadPromise);

        const gltf = await loadPromise;
        const clonedScene = SkeletonUtils.clone(gltf.scene);
        return { ...gltf, scene: clonedScene };
    }

    load(url, onLoad, onProgress, onError) {
        this.loadAsync(url).then(onLoad).catch(onError);
    }
}

export default new ModelLoader();
