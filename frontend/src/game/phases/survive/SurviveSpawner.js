import { ENEMY_TYPES } from "../../constants/EnemyTypes.js";

export class SurviveSpawner {
    constructor(phase) {
        this.phase = phase;
        this.active = phase.options.spawnInterval > 0;
        this.time = 0;
        this.enemiesSpawned = 0;
        this.kills = 0;
        
        this.interval = phase.options.spawnInterval || null;
        this.maxEnemies = phase.options.maxEnemies || 0;
        
        this.endCondition = phase.options.spawnerEndCondition || "none";
        this.duration = phase.options.spawnerDuration || null;
        this.spawnLimit = phase.options.spawnerSpawnLimit || null;
        this.killTarget = phase.options.spawnerKillTarget || null;
    }

    /**
     * Updates.
 * @param {any} deltaTime - The deltaTime.
     */
    update(deltaTime) {
        if (!this.active) return;
        
        this.time += deltaTime;
        
        if (this.checkEndConditions()) {
            this.active = false;
            return;
        }

        if (this.interval > 0 && !this.phase.isTransitioningToNextLevel) {
            this.phase.spawnTimer += deltaTime;
            if (this.phase.spawnTimer >= this.interval) {
                const regularEnemies = this.phase.enemies.container.filter(e => e !== this.phase.enemies.boss);
                if (regularEnemies.length < this.maxEnemies) {
                    this.phase.spawnTimer = 0;
                    this.spawnEnemy();
                }
            }
        }
    }

    /**
     * Checks the end conditions.
     */
    checkEndConditions() {
        if (this.endCondition === "time" && this.duration) {
            return this.time >= this.duration;
        }
        if (this.endCondition === "spawn_count" && this.spawnLimit) {
            return this.enemiesSpawned >= this.spawnLimit;
        }
        if (this.endCondition === "kills" && this.killTarget) {
            return this.kills >= this.killTarget;
        }
        return false;
    }

    /**
     * Spawns the enemy.
 * @param {any} type - The type.
 * @param {any} options - The options.
     */
    spawnEnemy(type = null, options = {}) {
        if (!this.phase.keyboard || !this.phase.enemies) return;

        const maxMapDist = this.getMaxMapDistance();
        const { minSpawnDist, maxSpawnDist } = this.getSpawnDistances(options, maxMapDist);
        
        const enemyType = type || this.getRandomEnemyType();
        const validKeys = this.getValidSpawnKeys(enemyType, minSpawnDist, maxSpawnDist);

        if (validKeys.length > 0) {
            const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
            this.phase.enemies.spawnAt(randomKey, this.phase.renderer.worldGroup, enemyType, options);
            if (this.active) this.enemiesSpawned++;
            if (this.phase.lastPlayerKey) this.phase.enemies.updatePath(this.phase.lastPlayerKey, this.phase.keyboard);
        }
    }

    /**
     * Get the max map distance.
     */
    getMaxMapDistance() {
        let maxMapDist = 0;
        if (!this.phase.player) return 0;
        for (const key of this.phase.keyboard.keyboardLayout) {
            const dx = key.rawPosition.x - this.phase.player.x;
            const dy = key.rawPosition.y - this.phase.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxMapDist) maxMapDist = dist;
        }
        return maxMapDist;
    }

    /**
     * Get the spawn distances.
 * @param {any} options - The options.
 * @param {boolean} maxMapDist - The maxMapDist.
     */
    getSpawnDistances(options, maxMapDist) {
        let minDist = options.minSpawnDistance ?? this.phase.options.minSpawnDistance ?? this.phase.options.spawnDistance ?? 5;
        let maxDist = options.maxSpawnDistance ?? this.phase.options.maxSpawnDistance ?? 999;
        if (maxMapDist > 0) {
            maxDist = Math.min(maxDist, maxMapDist);
            minDist = Math.min(minDist, maxMapDist * 0.7);
        }
        return { minSpawnDist: minDist, maxSpawnDist: maxDist };
    }

    /**
     * Get the random enemy type.
     */
    getRandomEnemyType() {
        const keys = this.phase.keyboard.keyboardLayout;
        const hasGround = keys.some(k => k.isGround);
        
        let totalWeight = 0;
        const activeWeights = {};
        
        for (const key of Object.keys(ENEMY_TYPES)) {
            if (!hasGround && key === "sniper") continue;
            const weight = this.phase.options.enemyWeights?.[key] || 0;
            if (weight > 0) {
                activeWeights[key] = weight;
                totalWeight += weight;
            }
        }

        if (totalWeight <= 0) {
            const enemyKeys = Object.keys(ENEMY_TYPES).filter(k => hasGround || k !== "sniper");
            return enemyKeys[Math.floor(Math.random() * enemyKeys.length)];
        }

        let randomNum = Math.random() * totalWeight;
        for (const [key, weight] of Object.entries(activeWeights)) {
            if (randomNum < weight) return key;
            randomNum -= weight;
        }
        return "basic";
    }

    /**
     * Get the valid spawn keys.
 * @param {any} type - The type.
 * @param {boolean} minSpawnDist - The minSpawnDist.
 * @param {boolean} maxSpawnDist - The maxSpawnDist.
     */
    getValidSpawnKeys(type, minSpawnDist, maxSpawnDist) {
        const keys = this.phase.keyboard.keyboardLayout;
        const allowedKeys = keys.filter(key => {
            if (type === "sniper") return key.isGround;
            if (type === "blocker_worm" || type === "hazard_worm") return !key.isGround;
            return key.isGround || minSpawnDist === 0;
        });

        return allowedKeys.filter(key => this.isKeyAvailable(key, type, minSpawnDist, maxSpawnDist));
    }

    /**
     * Checks whether is key available.
 * @param {any} key - The key.
 * @param {any} type - The type.
 * @param {boolean} minSpawnDist - The minSpawnDist.
 * @param {boolean} maxSpawnDist - The maxSpawnDist.
     */
    isKeyAvailable(key, type, minSpawnDist, maxSpawnDist) {
        if (this.isOccupiedByEnemy(key) || this.isOccupiedByPlayer(key)) return false;

        if (type !== "blocker_worm" && type !== "hazard_worm" && this.phase.player) {
            const dx = key.rawPosition.x - this.phase.player.x;
            const dy = key.rawPosition.y - this.phase.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist >= minSpawnDist && dist <= maxSpawnDist;
        }
        return true;
    }

    /**
     * Checks whether is occupied by enemy.
 * @param {any} key - The key.
     */
    isOccupiedByEnemy(key) {
        return this.phase.enemies.container.some(e => 
            e.actualKey === key.key || 
            (e.targetedPosition && e.targetedPosition.x === key.rawPosition.x && e.targetedPosition.y === key.rawPosition.y) ||
            (e.path && e.path.length > 0 && e.path[0].key === key.key)
        );
    }

    /**
     * Checks whether is occupied by player.
 * @param {any} key - The key.
     */
    isOccupiedByPlayer(key) {
        if (!this.phase.player) return false;
        return key.key === this.phase.lastPlayerKey ||
            (this.phase.player.targetPosition && 
             this.phase.player.targetPosition.x === key.rawPosition.x && 
             this.phase.player.targetPosition.y === key.rawPosition.y);
    }
}
