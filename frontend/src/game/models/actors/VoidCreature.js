import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class VoidCreature {
    constructor(scene, playerPosition) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        // Position behind the player (south)
        this.mesh.position.set(playerPosition.x, playerPosition.y + 6, playerPosition.z + 30);
        this.scene.add(this.mesh);
        
        this.floatTime = 0;
        this.particles = [];
        this.isDying = false;
    }

    async init() {
        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync("/asset/game_assets/models/bug.glb");
            this.model = gltf.scene;
            
            this.model.scale.set(2.8, 2.8, 2.8);
            // Face the player
            this.model.rotation.x = 0;
            this.model.rotation.y = Math.PI;

            // Change color and add glow
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x220033,
                        emissive: 0x8a2be2,
                        emissiveIntensity: 0.8,
                        roughness: 0.1,
                        metalness: 0.8
                    });
                }
            });

            this.mesh.add(this.model);

            // Add Void Light
            this.light = new THREE.PointLight(0x8a2be2, 500, 20);
            this.light.position.set(0, 0, 2);
            this.mesh.add(this.light);

            // Create floating things (orbs/particles) around it
            const sphereGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            for(let i = 0; i < 5; i++) {
                const p = new THREE.Mesh(sphereGeo, sphereMat);
                p.angle = (Math.PI * 2 / 5) * i;
                p.radius = 2 + Math.random();
                this.particles.push(p);
                this.mesh.add(p);
            }

        } catch (error) {
            console.error("Failed to load VoidCreature model", error);
        }
    }

    update(deltaTime) {
        if (this.isDying) {
            this.mesh.scale.multiplyScalar(0.95);
            this.model.rotation.y += 20;
            if (this.mesh.scale.x < 0.01) {
                this.cleanup();
            }
            return;
        }

        this.floatTime += deltaTime;
        
        // Bobbing up and down
        if (this.model) {
            this.model.position.z = Math.sin(this.floatTime * 2) * 0.5;
        }

        // Orbiting particles
        this.particles.forEach((p, index) => {
            p.angle += deltaTime * (1 + index * 0.2);
            p.position.x = Math.cos(p.angle) * p.radius;
            p.position.y = Math.sin(p.angle) * p.radius;
            p.position.z = Math.sin(this.floatTime * 3 + p.angle) * 1;
        });
    }

    die() {
        this.isDying = true;

    }

    cleanup() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }
}
