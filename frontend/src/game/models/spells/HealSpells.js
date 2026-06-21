import Spell from "../Spell.js";
import * as THREE from "three";
import { AudioManager } from "../../managers/AudioManager.js";

/**
 * HealSpell that restores the player's health points.
 * Inherits from Spell.
 */
export default class HealSpell extends Spell {
    constructor(word, healAmount, range = Infinity) {
        super(word, healAmount, range);
    }

    /**
     * Activates the healing effect on the player.
     * @param {Enemy} closestEnemy - The closest enemy (unused for heal).
     * @param {Player} player - The player to be healed.
     * @param {THREE.Scene} scene - The scene to render visual effects in.
     * @returns {boolean} True if healed, false otherwise.
     */
    effect(closestEnemy, player, scene) {
        if (player) {
            if (player.hp < player.hpMax) {
                player.heal(this.damage);
            }
            
            AudioManager.playSFX("/asset/game_assets/sounds/heal.wav", "player", 0.5);
            this.triggerVisualEffect(player);
            
            return true;
        }
        return false;
    }

    /**
     * Triggers the visual healing effect around the player.
     * @param {Player} player - The player instance.
     */
    triggerVisualEffect(player) {
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            wireframe: true,
        });

        const sphere = new THREE.Mesh(geometry, material);

        sphere.position.set(0, 1.5, 0);

        player.mesh.add(sphere);

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
                player.mesh.remove(sphere);
                geometry.dispose();
                material.dispose();
            }
        };

        animateHeal();
    }
}
