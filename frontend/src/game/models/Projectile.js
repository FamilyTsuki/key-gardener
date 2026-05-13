import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import DamageObject from "./DamageObject.js";

export default class Projectile extends DamageObject {
    constructor(
        position,
        size,
        damage,
        velocity,
        scene,
        team = "player",
        spacing = 3.2,
        modelSource
    ) {
        if (!modelSource) {
            throw new Error("No projectile model !");
        }
        super(position, size, damage);
        this.timer = 0;
        this.warmUpDuration = 400;
        this.isFlying = false;

        this.velocity = velocity;
        this.team = team;
        this.spacing = spacing;
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        if (this.team !== "player") {
            const lineLength = 10 * spacing;
            const lineGeo = new THREE.PlaneGeometry(0.3 * spacing, lineLength);
            lineGeo.translate(0, -lineLength / 2, 0);
            this.lineMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
            });
            this.lineMesh = new THREE.Mesh(lineGeo, this.lineMaterial);
            this.lineMesh.rotation.x = -Math.PI / 2;

            const angle = Math.atan2(velocity.x, velocity.y);
            this.lineMesh.rotation.z = angle;

            this.lineMesh.position.set(
                position.x * spacing,
                0.1,
                position.y * spacing
            );
            this.scene.add(this.lineMesh);
        }
        if (modelSource) {
            const model = modelSource.clone();
            model.visible = true;
            model.traverse((child) => {
                child.visible = true;
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0xff6600);
                    child.material.emissiveIntensity = 5;
                }
            });
            model.scale.set(0.9, 0.9, 0.9);
            this.mesh.add(model);
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0xff4400);
                    child.material.emissiveIntensity = 2;
                }
                this.projectileModel = model;
            });
        }

        this.fireSound = new Audio("/asset/game_assets/sounds/fire.wav");
        this.fireSound.volume = 0.5;
        this.fireSound.play();
        // À la fin de ton constructeur Projectile.js
        if (this.mesh) {
            const hitBoxGeo = new THREE.BoxGeometry(
                this.size.width * this.spacing,
                this.size.height * this.spacing,
                this.size.height * this.spacing
            );
            const hitBoxMat = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
            });

            this.debugBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
            this.mesh.add(this.debugBox);
        }
    }

    update(cible, deltaTime) {
        this.timer += deltaTime;
        if (this.team !== "player") {
            if (this.timer < this.warmUpDuration) {
                this.lineMaterial.opacity =
                    0.1 + Math.sin(this.timer * 0.02) * 0.1;
            } else {
                if (!this.isFlying) {
                    this.isFlying = true;
                    this.projectileModel.visible = true;
                    this.fireSound.play();

                    if (this.lineMesh) {
                        this.scene.remove(this.lineMesh);
                        this.lineMesh.geometry.dispose();
                        this.lineMaterial.dispose();
                    }
                }
                this.position.x += this.velocity.x;
                this.position.y += this.velocity.y;
                if (this.mesh) {
                    this.mesh.position.set(
                        this.position.x * this.spacing,
                        1.5,
                        this.position.y * this.spacing
                    );
                    this.mesh.rotation.x += 0.1;
                    this.mesh.rotation.z += 0.1;
                }
            }
        } else {
            if (!this.isFlying) {
                this.isFlying = true;
                this.projectileModel.visible = true;
                this.fireSound.play();
            }
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            if (this.mesh) {
                this.mesh.position.set(
                    this.position.x * this.spacing,
                    1.5,
                    this.position.y * this.spacing
                );
                this.mesh.rotation.x += 0.1;
                this.mesh.rotation.z += 0.1;
            }
        }
    }

    die() {
        this.isDead = true;
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.visible = false;
        }
    }

    draw(ctx) {}
}
