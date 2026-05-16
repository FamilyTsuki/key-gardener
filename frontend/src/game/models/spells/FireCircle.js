import Spell from "../Spell.js";
import * as THREE from "three";

export default class FireCircle extends Spell {
  #duration;
  #scene;
  #player;
  #enemies;

  #loopId;
  #attackSpeed;

  #mesh;
  #timer;
  #isActive;

  /**
   *
   * @param {String} word
   * @param {Number} damage
   * @param {Number} duration
   * @param {Scene} scene
   * @param {Player} player
   * @param {Enemies} enemies
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
   *
   * @param {Number} deltaTime
   */
  update(deltaTime) {
    if (this.#isActive && this.#mesh) {
      this.#timer += deltaTime;

      // --- FIXATION DE LA TAILLE ---
      // On s'assure que le scale reste à 1, peu importe le timer
      this.#mesh.scale.set(1, 1, 1);

      // Animation visuelle (Opacité et Couleur)
      this.#mesh.material.opacity = 0.5 + Math.sin(this.#timer * 0.01) * 0.2;

      this.#mesh.material.color.setHSL(
        Math.sin(this.#timer * 0.005) * 0.1 + 0.08,
        1,
        0.6 + Math.sin(this.#timer * 0.003) * 0.1,
      );

      // Suivre le joueur
      const playerPosWorld = {
        x: this.#player.position.x * 3.2,
        z: this.#player.position.y * 3.2, // Attention: utilise Z pour la profondeur en 3D
      };
      this.#mesh.position.set(playerPosWorld.x, 0.1, playerPosWorld.z);

      if (this.#timer >= this.#duration) {
        this.desactivate();
      }
    }
  }

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
