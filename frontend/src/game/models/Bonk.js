import * as THREE from "three";
import DamageObject from "./DamageObject.js";
import { AudioManager } from "../managers/AudioManager.js";

/**
 * Represents a Bonk attack in the game.
 */
export default class Bonk extends DamageObject {
    /**
     * Creates a new Bonk attack.
     * @param {{x: number, y: number}} position - The position of the attack.
     * @param {{width: number, height: number}} size - The size of the attack area.
     * @param {number} damage - The amount of damage dealt.
     * @param {THREE.Scene} scene - The THREE.js scene.
     * @param {number} spacing - The spacing multiplier for the position.
     */
    constructor(position, size, damage, scene, spacing, duration = 500) {
        super(position, size, damage);

        this.timer = 0;
        this.isAttacking = false;
        this.duration = duration;
        this.attackWindow = 250;
        this.spacing = spacing;
        const geoWidth = size.width * spacing * 0.9;
        const geoHeight = size.height * spacing * 0.9;

        const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);

        this.mesh.position.set(position.x * spacing, 1.2, position.y * spacing);
        this.mesh.rotation.x = -Math.PI / 2;

        scene.add(this.mesh);
    }

    /**
     * Updates the Bonk attack state.
     * @param {number} deltaTime - The time elapsed since the last update.
     * @param {Object} player - The player object to check for collisions.
     */
    update(deltaTime, player) {
        this.timer += deltaTime;

        if (this.timer < this.duration) {
            this.isAttacking = false;
            const remaining = this.duration - this.timer;
            let blinkInterval = 200;
            if (remaining < 300) {
                blinkInterval = 70;
            } else if (remaining < 600) {
                blinkInterval = 120;
            }
            const isBlinkOn = Math.floor(this.timer / blinkInterval) % 2 === 0;
            this.material.opacity = isBlinkOn ? 0.4 : 0.1;
            this.material.color.set(0xff0000);
        } else if (this.timer < this.duration + this.attackWindow) {
            if (!this.isAttacking) {
                this.isAttacking = true;
                AudioManager.playSFX("/asset/game_assets/sounds/bonk.wav", "enemy", 0.5);
                if (typeof window.startShake === "function") {
                    window.startShake(4.5);
                }
                if (this.checkCollision(player)) {
                    player.damage(this.damage, "Touché par une attaque de zone.");
                }
            }
            this.material.opacity = 0.8;
            this.material.color.set(0xffffff);
        } else {
            this.isDead = true;
            if (this.mesh) {
                this.mesh.parent.remove(this.mesh);
                this.mesh.geometry.dispose();
                this.material.dispose();
            }
        }
    }

    /**
     * Draws the Bonk attack area on the 2D canvas.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     */
    draw(ctx) {
        ctx.save();
        if (!this.isAttacking) {
            const remaining = this.duration - this.timer;
            let blinkInterval = 200;
            if (remaining < 300) {
                blinkInterval = 70;
            } else if (remaining < 600) {
                blinkInterval = 120;
            }
            const isBlinkOn = Math.floor(this.timer / blinkInterval) % 2 === 0;
            ctx.fillStyle = isBlinkOn ? "rgba(255, 0, 0, 0.4)" : "rgba(255, 0, 0, 0.1)";
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.fillRect(
                this.position.x,
                this.position.y,
                this.size.width,
                this.size.height
            );
            ctx.strokeRect(
                this.position.x,
                this.position.y,
                this.size.width,
                this.size.height
            );
        } else {
            ctx.fillStyle = "white";
            ctx.fillRect(
                this.position.x,
                this.position.y,
                this.size.width,
                this.size.height
            );
            ctx.fillStyle = "red";
            ctx.globalAlpha = 0.8;
            ctx.fillRect(
                this.position.x,
                this.position.y,
                this.size.width,
                this.size.height
            );
        }
        ctx.restore();
    }
}
