import Spell from "../Spell.js";
import * as THREE from "three";

export default class HealSpell extends Spell {
    #healAmount;

    /**
     *
     * @param {String} word
     * @param {Number} healAmount
     * @param {Number} range
     */
    constructor(word, healAmount, range = Infinity) {
        super(word, healAmount, range);
        this.#healAmount = healAmount;
    }

    /**
     *
     * @param {Enemy} closestEnemy
     * @param {Player} player
     * @param {Scene} scene
     */
    effect(closestEnemy, player, scene) {
        if (player) {
            if (player.hp < 100) {
                player.hp += this.#healAmount;
                if (player.hp > 100) {
                    player.hp = 100;
                }
                const heal = new Audio("/asset/game_assets/sounds/heal.wav");
                heal.volume = 0.5;
                heal.play();
                this.triggerVisualEffect(player.position, scene);
            }
            return true;
        }
        return false;
    }

    /**
     *
     * @param {Object} playerPos = {x: Number, y: Number}
     * @param {Scene} scene
     */
    triggerVisualEffect(playerPos, scene) {
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            wireframe: true,
        });

        const sphere = new THREE.Mesh(geometry, material);

        const spacing = 3.2;
        sphere.position.set(playerPos.x * spacing, 1.5, playerPos.y * spacing);

        scene.add(sphere);

        let scale = 1;
        let opacity = 0.5;

        const animateHeal = () => {
            scale += 0.05;
            opacity -= 0.02;

            sphere.scale.set(scale, scale, scale);
            material.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animateHeal);
            } else {
                scene.remove(sphere);
                geometry.dispose();
                material.dispose();
            }
        };

        animateHeal();
    }
}
