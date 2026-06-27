import Actor from "../Actor.js";
import ProjectilePool from "../ProjectilePool.js";
import Bonk from "../Bonk.js";
import * as THREE from "three";

/**
 * Represents the Boss enemy in the game.
 */
export default class Boss extends Actor {
  /**
   * Creates a new Boss instance.
   * @param {any} name - The name.
   * @param {any} hp - The hp.
   * @param {any} rawPosition - The rawPosition.
   * @param {any} position - The position.
   * @param {any} size - The size.
   * @param {any} scene - The scene.
   * @param {any} fireballModel - The fireballModel.
   * @param {any} bossModel - The bossModel.
   */
  constructor(
    name,
    hp,
    rawPosition,
    position,
    size,
    scene,
    fireballModel,
    bossModel,
  ) {
    super(name, hp, hp, rawPosition, position, size);
    this.stateTimer = 0;
    this.attackInterval = 1400;
    this.scene = scene;
    this.fireballModel = fireballModel;
    this.totalTime = 0;
    this.container = new THREE.Group();
    this.scene.add(this.container);
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.attackPhase = "idle";
    this.attackStartTime = 0;
    this.isAttacking = false;
    this.isDying = false;
    this.deathProgress = 0;

    if (bossModel) {
      this.mesh = bossModel.scene.clone();

      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
          if (child.isSkinnedMesh) {
            child.frustumCulled = false;
          }
        }
      });

      this.scene.add(this.mesh);
      this.mesh.scale.set(
        this.size.width * 2,
        this.size.height * 2,
        this.size.width * 2,
      );
    }
    this.isEmerging = true;
    this.emergeProgress = 0;

    this.mesh.position.y = -10;
    this.mesh.scale.set(0, 0, 0);
    const bossUI = document.getElementById("boss-ui");
    if (bossUI)
      setTimeout(() => {
        bossUI.classList.remove("hidden");
      }, 1500);
    this.updateHpBar();
  }

  /**
   * Checks if the boss is dead.
   * @returns {boolean} True if dead, false otherwise.
   */
  get isDead() {
    return this.hp < 0;
  }
  /**
   * Updates the visual representation of the boss's HP bar.
   */
  updateHpBar() {
    const ratio = Math.max(0, (this.hp / this.hpMax) * 100);

    const fill = document.getElementById("boss-hp-fill");
    const currentTxt = document.getElementById("boss-hp-current");
    const maxTxt = document.getElementById("boss-hp-max");

    if (fill) fill.style.width = ratio + "%";
    if (currentTxt) currentTxt.innerText = Math.ceil(this.hp);
    if (maxTxt) maxTxt.innerText = this.hpMax;
  }
  /**
   * Updates the boss's logic each frame.
   * @param {any} deltaTime - The deltaTime.
   * @param {any} playerPos - The playerPos.
   * @param {any} projectiles - The projectiles.
   * @param {any} bonks - The bonks.
   */
  update(deltaTime, playerPos, projectiles, bonks) {
    if (this.hp < 0) return;

    if (this.isDying) {
      this.deathProgress += deltaTime / 1500;
      if (this.deathProgress >= 1) {
        this.deathProgress = 1;
        this.hp = -1;
        this.isDying = false;
        this.die();
      } else {
        const t = this.deathProgress;
        this.mesh.position.y = -10 * t;
        this.mesh.rotation.y += deltaTime * 0.005;
        const scaleFactor = 1 - t;
        const s_w = this.size.width * scaleFactor;
        const s_h = this.size.height * scaleFactor;
        this.mesh.scale.set(s_w * 2, s_h * 2, s_w * 2);
      }
      if (this.mesh) {
        this.mesh.updateMatrixWorld(true);
      }
      return;
    }

    if (this.isEmerging) {
      this.emergeProgress += deltaTime * 0.0005;

      if (this.emergeProgress < 1) {
        const t = this.emergeProgress;
        const smoothProgress = t * t * (3 - 2 * t);

        this.mesh.position.y = -10 * (1 - smoothProgress);

        const s_w = this.size.width * smoothProgress;
        const s_h = this.size.height * smoothProgress;
        this.mesh.scale.set(s_w * 2, s_h * 2, s_w * 2);

        if (window.startShake) window.startShake(0.3);

        this.mesh.updateMatrixWorld(true);
        return;
      } else {
        this.isEmerging = false;
        this.mesh.position.y = 0;
        this.mesh.scale.set(
          this.size.width * 2,
          this.size.height * 2,
          this.size.width * 2,
        );
      }
    }
    const spacing = 3.2;
    this.totalTime += deltaTime * 0.001;

    if (this.mesh) {
      let xToReach = this.isAttacking ? this.targetX : this.position.x;
      this.mesh.position.x = THREE.MathUtils.lerp(
        this.mesh.position.x,
        xToReach * spacing,
        0.05,
      );
      this.mesh.position.z = this.position.y * spacing;

      if (this.isAttacking) {
        const elapsed = this.totalTime - this.attackStartTime;

        if (elapsed < 0.8) {
          this.mesh.rotation.x = 0;
        } else if (elapsed < 1.0) {
          const strikeProgress = (elapsed - 0.8) / 0.2;
          this.mesh.rotation.x = strikeProgress * 1.4;
        } else if (elapsed < 1.2) {
          this.mesh.rotation.x = 1.4;
        } else if (elapsed < 1.6) {
          const recoveryProgress = (elapsed - 1.2) / 0.4;
          this.mesh.rotation.x = 1.4 * (1 - recoveryProgress);
        } else {
          this.isAttacking = false;
          this.mesh.rotation.x = 0;
        }
      } else {
        this.mesh.rotation.y = Math.sin(this.totalTime * 2) * 0.2;
      }

      this.mesh.updateMatrixWorld(true);
    }

    this.stateTimer += deltaTime;
    if (this.stateTimer >= this.attackInterval) {
      this.stateTimer = 0;
      if (Math.random() > 0.5) this.attackTentacle(playerPos, bonks);
      else this.attackInkRain(playerPos, projectiles);
    }
  }
  /**
   * Checks if the boss collides with another object.
   * @param {any} other - The other.
   * @returns {boolean} True if they collide.
   */
  checkCollision(other) {
    return (
      this.rawPosition.x < other.position.x + other.size.width &&
      this.rawPosition.x + this.size.width > other.position.x &&
      this.rawPosition.y < other.position.y + other.size.height &&
      this.rawPosition.y + this.size.height > other.position.y
    );
  }

  /**
   * Performs the Ink Rain attack.
   * @param {any} playerPos - The playerPos.
   * @param {any} projectiles - The projectiles.
   */
  attackInkRain(playerPos, projectiles) {
    const nbProjectiles = 5;

    const dx = playerPos.x - this.rawPosition.x;
    const dy = playerPos.y - this.rawPosition.y;
    const angleToPlayer = Math.atan2(dx, dy);

    for (let i = 0; i < nbProjectiles; i++) {
      const spread = Math.PI / 2;

      const finalAngle = angleToPlayer + (Math.random() - 0.5) * spread;

      const speed = 0.1;
      const velocity = {
        x: Math.sin(finalAngle) * speed,
        y: Math.cos(finalAngle) * speed,
      };

      projectiles.push(
        ProjectilePool.get(
          { x: this.rawPosition.x, y: this.rawPosition.y },
          { width: 0.4, height: 0.4 },
          10,
          velocity,
          this.scene,
          "boss",
          3.2,
          this.fireballModel
        )
      );
    }
  }
  /**
   * Performs the Tentacle (Bonk) attack.
   * @param {any} playerPos - The playerPos.
   * @param {any} bonks - The bonks.
   */
  attackTentacle(playerPos, bonks) {
    this.targetX = playerPos.x;
    this.attackStartTime = this.totalTime;
    this.isAttacking = true;

    bonks.push(
      new Bonk(
        { x: playerPos.x, y: playerPos.y },
        { width: 1, height: 4 },
        25,
        this.scene,
        3.2,
      ),
    );
  }
  /**
   * Handles the death of the boss.
   */
  die() {
    const bossUI = document.getElementById("boss-ui");
    if (bossUI) bossUI.classList.add("hidden");

    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
      this.mesh.visible = false;
    }
  }

  /**
   * Reduces the boss's health by the specified damage.
   * @param {any} nb - The nb.
   */
  takeDamage(nb) {
      if (this.isDying || this.hp < 0) return;
      this.hp -= nb;

      if (this.mesh && this.mesh.position) {
          window.dispatchEvent(new CustomEvent("spawn_floating_text", {
              detail: {
                  position: this.mesh.position,
                  text: `-${Math.round(nb)}`,
                  type: "damage"
              }
          }));
      }

      if (this.hp <= 0) {
          this.hp = 0;
          this.isDying = true;
          this.deathProgress = 0;
          const bossUI = document.getElementById("boss-ui");
          if (bossUI) bossUI.classList.add("hidden");
      }
      this.updateHpBar();
  }
}
