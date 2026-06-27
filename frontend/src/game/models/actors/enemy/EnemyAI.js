import ProjectilePool from "../../ProjectilePool.js";

export class EnemyAI {
    constructor(state, movement) {
        this.state = state;
        this.movement = movement;
        this.shootTimer = 0;
    }

    /**
     * Updates the sniper logic.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} player - The player.
     * @param {any} projectiles - The projectiles.
     * @param {any} projectileModel - The projectileModel.
     * @param {any} scene - The scene.
     */
    updateSniperLogic(deltaTime, player, projectiles, projectileModel, scene) {
        if (!this.state.isSniper || this.state.isDead) return;

        this.shootTimer += deltaTime;
        if (this.shootTimer >= 3.0) {
            this.shootTimer = 0;
            this.shootProjectile(player, projectiles, projectileModel, scene);
        }
    }

    /**
     * Shoots the projectile.
     * @param {any} player - The player.
     * @param {any} projectiles - The projectiles.
     * @param {any} projectileModel - The projectileModel.
     * @param {any} scene - The scene.
     */
    shootProjectile(player, projectiles, projectileModel, scene) {
        if (!projectiles || !projectileModel) return;

        const dx = player.position.x - this.movement.position.x;
        const dy = player.position.y - this.movement.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            const speed = 0.08;
            const velocity = { x: (dx / dist) * speed, y: (dy / dist) * speed };
            
            projectiles.push(
                ProjectilePool.get(
                    { x: this.movement.position.x, y: this.movement.position.y },
                    { width: 0.4, height: 0.4 },
                    15,
                    velocity,
                    scene,
                    "enemy",
                    3.2,
                    projectileModel
                )
            );
        }
    }

    /**
     * Checks the player collision.
     * @param {any} player - The player.
     * @param {any} size - The size.
     */
    checkPlayerCollision(player, size) {
        if (this.state.isWorm) return false;

        let collision = this.checkAABBCollision(this.movement.position, size, player.position, player.size);

        if (!collision && player.isMoving && player.lastX !== undefined) {
            const minX = Math.min(player.lastX, player.x);
            const maxX = Math.max(player.lastX, player.x) + player.size.width;
            const minY = Math.min(player.lastY, player.y);
            const maxY = Math.max(player.lastY, player.y) + player.size.height;

            const enemyMinX = this.movement.position.x;
            const enemyMaxX = this.movement.position.x + size.width;
            const enemyMinY = this.movement.position.y;
            const enemyMaxY = this.movement.position.y + size.height;

            if (enemyMinX < maxX && enemyMaxX > minX && enemyMinY < maxY && enemyMaxY > minY) {
                collision = true;
            }
        }
        return collision;
    }

    /**
     * Checks a a b b collision.
     * @param {any} posA - The posA.
     * @param {any} sizeA - The sizeA.
     * @param {any} posB - The posB.
     * @param {any} sizeB - The sizeB.
     */
    checkAABBCollision(posA, sizeA, posB, sizeB) {
        return posA.x < posB.x + sizeB.width &&
               posA.x + sizeA.width > posB.x &&
               posA.y < posB.y + sizeB.height &&
               posA.y + sizeA.height > posB.y;
    }
}
