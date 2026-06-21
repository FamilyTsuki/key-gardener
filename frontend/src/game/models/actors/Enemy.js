import Actor from "../Actor.js";
import { EnemyState } from "./enemy/EnemyState.js";
import { EnemyMovement } from "./enemy/EnemyMovement.js";
import { EnemyRenderer3D } from "./enemy/EnemyRenderer3D.js";
import { EnemyUI } from "./enemy/EnemyUI.js";
import { EnemyAI } from "./enemy/EnemyAI.js";
import { generateUUID } from "../../utilities/UUID.js";

export default class Enemy extends Actor {
    constructor(
        type,
        actualKey,
        scene,
        position,
        hp = 100,
        hpMax = 100,
        model = undefined,
        size = { width: 1, height: 1 },
        id = generateUUID(),
        scale = 1,
        projectileModel = null
    ) {
        super(id, hp, hpMax, position, position, size, model);
        this.scene = scene;
        this.size = size;
        this.projectileModel = projectileModel;

        this.state = new EnemyState(type, hp, hpMax);
        this.state.config.scale = scale;
        this.state.on("hp_changed", (data) => this.handleHpChanged(data));
        this.state.on("death", () => this.die());

        this.movement = new EnemyMovement(position, this.state.speed);
        this.movement.actualKey = actualKey;
        this.movement.setupSpawn(this.state.isWorm, position);

        this.renderer = new EnemyRenderer3D(scene, this.state);
        if (this.state.isWorm) {
            this.renderer.createSpawnZone(position);
        }
        this.renderer.loadModel(model);

        this.ui = new EnemyUI();
        this.ui.updateHpBar(this.state.hp, this.state.hpMax);
        this.ui.attachToModel(this.renderer.mesh);

        this.ai = new EnemyAI(this.state, this.movement);
    }

    get hp() { return this.state.hp; }
    set hp(val) { this.state.hp = val; }
    get hpMax() { return this.state.hpMax; }
    get type() { return this.state.type; }
    get isDead() { return this.state.isDead; }
    get isBlocking() { return this.movement.isBlocking; }
    get actualKey() { return this.movement.actualKey; }
    set actualKey(val) { this.movement.actualKey = val; }
    get targetedPosition() { return this.movement.targetedPosition; }
    get path() { return this.movement.path; }
    set path(val) { this.movement.setPath(val); }
    get mesh() { return this.renderer.mesh; }
    get isSpawning() { return this.movement.isSpawning; }
    get spawnProgress() { return this.movement.spawnProgress; }

    handleHpChanged(data) {
        if (this.renderer.mesh && this.renderer.mesh.position && data.damage) {
            this.ui.showFloatingDamage(this.renderer.mesh.position, data.damage);
        }
        if (!this.state.isDead) {
            this.ui.updateHpBar(data.hp, data.hpMax);
        }
    }

    takeDamage(amount) {
        this.state.takeDamage(amount);
    }

    attack(player) {
        if (!player) throw new Error("No player to attack!");
        player.damage(this.state.damage, "L'ennemi t'a dévoré");
    }

    move() {
        this.movement.startJump();
    }

    update(player, deltaTime = 0.016, keyboardLayout = null, projectiles = null) {
        this.renderer.updateAnimations(deltaTime);

        if (this.handleSpawn(deltaTime, keyboardLayout)) return;

        this.ai.updateSniperLogic(deltaTime, player, projectiles, this.projectileModel, this.scene);

        if (this.movement.isJumping || this.movement.jumpDelayTimer > 0) {
            const progression = this.movement.updateJump(deltaTime);
            this.renderer.renderMovement(this.movement, progression, keyboardLayout);
        }

        this.updateLookingDirection(player);
        this.handlePlayerCollision(player);
    }

    handleSpawn(deltaTime, keyboardLayout) {
        if (!this.movement.isSpawning) return false;

        const finished = this.movement.updateSpawn(deltaTime);
        if (finished) {
            this.renderer.finalizeSpawn(this.movement, keyboardLayout);
            this.ui.setVisible(true);
        } else {
            this.renderer.renderSpawnAnimation(this.movement, keyboardLayout);
            this.updateWormSpawnLookingDirection();
            this.ui.setVisible(false);
        }
        return true;
    }

    updateLookingDirection(player) {
        if (!this.movement.isJumping) {
            if ((this.state.isSniper || this.state.isWorm) && !this.state.isDead) {
                this.renderer.lookAtTarget(player.position.x, player.position.y);
            }
        } else if (this.movement.targetedPosition) {
            this.renderer.lookAtTarget(this.movement.targetedPosition.x, this.movement.targetedPosition.y);
        }
    }

    updateWormSpawnLookingDirection() {
        if (this.state.isWorm && this.renderer.mesh.parent) {

        }
    }

    handlePlayerCollision(player) {
        if (this.ai.checkPlayerCollision(player, this.size)) {
            this.state.hp = -1;
            player.damage(50, "Écrasé par un ennemi.");
            this.die();
        }
    }

    die() {
        this.renderer.destroy();
        this.ui.setVisible(false);
    }

    getTileSurfaceHeight(keyObj) {
        return this.renderer.getTileSurfaceHeight(keyObj);
    }
}
