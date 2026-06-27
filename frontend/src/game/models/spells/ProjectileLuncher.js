import ProjectilePool from "../ProjectilePool.js";
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
   * @param {any} word - The word.
   * @param {any} damage - The damage.
   * @param {any} range - The range.
   * @param {any} projectileModel - The projectileModel.
   */
  constructor(word, damage, range, projectileModel) {
    super(word, damage, range);

    this.#projectileModel = projectileModel;
  }

  /**
   * Shoots a projectile towards the target.
   * @throws {Error} If no target is provided.
   * @param {any} target - The target.
   * @param {any} player - The player.
   * @param {any} scene - The scene.
   * @returns {Projectile} The created projectile.
   */
  shootProjectile(target, player, scene) {
    if (!target) {
      throw new Error("No target !");
    }

    const projectileSpeed = 0.2;
    const projectileSize = { width: 0.4, height: 0.4 };

    const dx = target.x - player.position.x;
    const dy = target.y - player.position.y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2) || 0.0001;

    const velocity = {
      x: (dx / distance) * projectileSpeed,
      y: (dy / distance) * projectileSpeed,
    };

    const startPosition = {
      x: player.x,
      y: player.y,
    };

    return ProjectilePool.get(
      startPosition,
      projectileSize,
      this.damage,
      velocity,
      scene,
      "player",
      3.2,
      this.#projectileModel
    );
  }

  /**
   * Activates the spell's effect, shooting at the closest enemy.
   * @param {any} closestEnemy - The closestEnemy.
   * @param {any} player - The player.
   * @param {any} scene - The scene.
   * @returns {Projectile|boolean} The created projectile, or false if out of range.
   */
  effect(closestEnemy, player, scene) {
    if (closestEnemy && closestEnemy.dist <= this.range) {
      return this.shootProjectile(
        closestEnemy.instance.position,
        player,
        scene,
      );
    }
    
    const forwardTarget = {
      x: player.position.x + (player.facingDirection?.x || 0) * 10,
      y: player.position.y + (player.facingDirection?.y || -1) * 10
    };
    
    return this.shootProjectile(
      forwardTarget,
      player,
      scene
    );
  }
}
