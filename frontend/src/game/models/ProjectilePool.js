import Projectile from "./Projectile.js";

class ProjectilePool {
    constructor() {
        this.inactive = [];
    }

    get(
        position,
        size,
        damage,
        velocity,
        scene,
        team = "player",
        spacing = 3.2,
        modelSource
    ) {
        if (this.inactive.length > 0) {
            const projectile = this.inactive.pop();
            projectile.reset(
                position,
                size,
                damage,
                velocity,
                team,
                spacing
            );
            return projectile;
        }

        return new Projectile(
            position,
            size,
            damage,
            velocity,
            scene,
            team,
            spacing,
            modelSource
        );
    }

    recycle(projectile) {
        if (!projectile || this.inactive.includes(projectile)) return;
        this.inactive.push(projectile);
    }

    clear() {
        for (const projectile of this.inactive) {
            projectile.destroy();
        }
        this.inactive = [];
    }
}

export default new ProjectilePool();
