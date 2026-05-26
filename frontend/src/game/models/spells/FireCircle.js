import Spell from "../Spell.js";
import * as THREE from "three";

/**
 * FireCircle spell that damages enemies within a radius over time.
 * Inherits from Spell.
 */
export default class FireCircle extends Spell {
  /** @type {number} */
  #duration;
  /** @type {THREE.Scene} */
  #scene;
  /** @type {Player} */
  #player;
  /** @type {Object} */
  #enemies;

  /** @type {number} */
  #loopId;
  /** @type {number} */
  #attackSpeed;

  /** @type {THREE.Mesh|null} */
  #mesh;
  /** @type {number} */
  #timer;
  /** @type {boolean} */
  #isActive;

  /**
   * Constructs a FireCircle spell.
   * @param {string} word - The trigger word for the spell.
   * @param {number} damage - The damage dealt per tick.
   * @param {number} range - The radius of the fire circle.
   * @param {number} duration - The duration the spell remains active.
   * @param {THREE.Scene} scene - The scene to render the spell in.
   * @param {Player} player - The player casting the spell.
   * @param {Object} enemies - The enemies manager containing targetable enemies.
   */
  constructor(word, damage, range, duration, scene, player, enemies) {
    super(word, damage, range);

    this.#duration = duration;
    this.#scene = scene;
    this.#player = player;
    this.#enemies = enemies;

    this.#attackSpeed = 40;

    this.#timer = 0;
    this.#isActive = false;

    this.#mesh = null;
  }

  /**
   * Activates the spell's effect.
   * @returns {boolean} True if activated, false if already active.
   */
  effect() {
    if (this.#isActive) return false;

    this.#isActive = true;
    this.#timer = 0;

    const geometry = new THREE.CylinderGeometry(
      this.range * 3.2,
      this.range * 3.2,
      0.5,
      32,
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    this.#mesh = new THREE.Mesh(geometry, material);

    const playerPosWorld = {
      x: this.#player.position.x * 3.2,
      y: this.#player.position.y * 3.2,
    };
    this.#mesh.position.set(playerPosWorld.x, 0.1, playerPosWorld.y);
    this.#scene.add(this.#mesh);

    this.#loopId = setInterval(() => {
      this.#enemies.container.forEach((enemy) => {
        const enemyPos = new THREE.Vector3();
        enemy.mesh.getWorldPosition(enemyPos);

        const dist = Math.sqrt(
          (this.#mesh.position.x - enemyPos.x) ** 2 +
            (this.#mesh.position.z - enemyPos.z) ** 2,
        );

        if (dist <= this.range * 3.2) {
          if (enemy.takeDamage) {
            enemy.takeDamage(this.damage);
          } else {
            enemy.hp -= this.damage;
          }

          console.log(`Brûle l'ennemi ! HP restant: ${enemy.hp}`);
        }
      });
    }, this.#attackSpeed);

    return true;
  }

  /**
   * Updates the spell's visual effect and state over time.
   * @param {number} deltaTime - The time elapsed since the last frame.
   */
  update(deltaTime) {
    if (this.#isActive && this.#mesh) {
      this.#timer += deltaTime;

      this.#mesh.scale.set(1, 1, 1);

      this.#mesh.material.opacity = 0.5 + Math.sin(this.#timer * 0.01) * 0.2;

      this.#mesh.material.color.setHSL(
        Math.sin(this.#timer * 0.005) * 0.1 + 0.08,
        1,
        0.6 + Math.sin(this.#timer * 0.003) * 0.1,
      );

      const playerPosWorld = {
        x: this.#player.position.x * 3.2,
        z: this.#player.position.y * 3.2,
      };
      this.#mesh.position.set(playerPosWorld.x, 0.1, playerPosWorld.z);

      if (this.#timer >= this.#duration) {
        this.desactivate();
      }
    }
  }

  /**
   * Deactivates the spell and removes its visual effects.
   */
  desactivate() {
    if (this.#mesh) {
      this.#scene.remove(this.#mesh);
      this.#mesh.geometry.dispose();
      this.#mesh.material.dispose();
      this.#mesh = null;
    }

    clearInterval(this.#loopId);
    this.#isActive = false;
  }
}
