import * as THREE from "three";

export class DefaultDecor {
    static build(scene, decorGroup, disposables) {
        scene.background = new THREE.Color(0x0a0c10);
        scene.fog = new THREE.Fog(0x0a0c10, 40, 100);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        decorGroup.add(ambientLight);

        return () => {
            return { y: 0, rotationX: 0, rotationZ: 0 };
        };
    }
}
