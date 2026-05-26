import Projectile from "../Projectile.js";
import Spell from "../Spell.js";

/**
 * ProjectileLuncher spell that shoots a projectile at an enemy.
 * Inherits from Spell.
 */
export default class ProjectileLuncher extends Spell {
  /** @type {THREE.Group} */
  #projectileModel;

  /**
   * Constructs a ProjectileLuncher spell.
   * @param {string} word - The trigger word for the spell.
   * @param {number} damage - The damage dealt by the projectile.
   * @param {number} range - The range of the spell.
   * @param {THREE.Group} projectileModel - The 3D model for the projectile.
   */
  constructor(word, damage, range, projectileModel) {
    super(word, damage, range);

    this.#projectileModel = projectileModel;
  }

  /**
   * Shoots a projectile towards the target.
   * @param {Object} target - The target position {x, y}.
   * @param {Player} player - The player shooting the projectile.
   * @param {THREE.Scene} scene - The scene to add the projectile to.
   * @returns {Projectile} The created projectile.
   * @throws {Error} If no target is provided.
   */
  shootProjectile(target, player, scene) {
    if (!target) {
      throw new Error("No target !");
    }

    const projectileSpeed = 0.2;
    const projectileSize = { width: 0.4, height: 0.4 };

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);

    const velocity = {
      x: (dx / distance) * projectileSpeed,
      y: (dy / distance) * projectileSpeed,
    };

    const startPosition = {
      x: player.x,
      y: player.y,
    };

    return new Projectile(
      startPosition,
      projectileSize,
      this.damage,
      velocity,
      scene,
      "player",
      3.2,
      this.#projectileModel,
    );
  }

  /**
   * Activates the spell's effect, shooting at the closest enemy.
   * @param {Object} closestEnemy - The closest enemy data {instance: Enemy, dist: number}.
   * @param {Player} player - The player casting the spell.
   * @param {THREE.Scene} scene - The scene to render the spell in.
   * @returns {Projectile|boolean} The created projectile, or false if out of range.
   */
  effect(closestEnemy, player, scene) {
    if (closestEnemy) {
      if (closestEnemy.dist <= this.range) {
        return this.shootProjectile(
          closestEnemy.instance.rawPosition,
          player,
          scene,
        );
      }
    }

    return false;
  }
}
