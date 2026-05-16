import Projectile from "../Projectile.js";
import Spell from "../Spell.js";

export default class ProjectileLuncher extends Spell {
  #projectileModel;

  /**
   *
   * @param {String} word
   * @param {Number} damage
   * @param {Number} range
   */
  constructor(word, damage, range, projectileModel) {
    super(word, damage, range);

    this.#projectileModel = projectileModel;
  }

  /**
   * @param {Object} target = { x: Number, y: Number }
   * @param {Player} player
   * @param {Scene} scene
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
    @param {Object} closestEnemy = { instance: Enemy, dist = Number }
    @param {Player} player
    @param {Scene} scene
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
