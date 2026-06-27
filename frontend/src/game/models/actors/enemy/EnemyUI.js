import * as THREE from "three";

export class EnemyUI {
    constructor() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        this.hpContext = canvas.getContext("2d");
        this.hpCanvas = canvas;

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        this.hpSprite = new THREE.Sprite(spriteMaterial);
        
        this.hpSprite.scale.set(2, 0.5, 1);
        this.hpSprite.position.y = 4.0;
        this.hpSprite.renderOrder = 999;
    }

    /**
     * Updates the hp bar.
     * @param {any} hp - The hp.
     * @param {any} hpMax - The hpMax.
     */
    updateHpBar(hp, hpMax) {
        const ctx = this.hpContext;
        const width = this.hpCanvas.width;
        const height = this.hpCanvas.height;
        const ratio = Math.max(0, hp / hpMax);

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = ratio > 0.3 ? "#2ecc71" : "#e74c3c";
        ctx.fillRect(5, 5, (width - 10) * ratio, height - 10);

        ctx.fillStyle = "#000000";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            `${Math.ceil(Math.max(0, hp))}/${hpMax}`,
            width / 2,
            height / 2 + 10
        );

        this.hpSprite.material.map.needsUpdate = true;
    }

    /**
     * Shows the floating damage.
     * @param {any} position - The position.
     * @param {any} amount - The amount.
     */
    showFloatingDamage(position, amount) {
        if (!position) return;
        window.dispatchEvent(new CustomEvent("spawn_floating_text", {
            detail: {
                position: position,
                text: `-${Math.round(amount)}`,
                type: "damage"
            }
        }));
    }

    /**
     * Set the visible.
     * @param {any} isVisible - The isVisible.
     */
    setVisible(isVisible) {
        this.hpSprite.visible = isVisible;
    }

    /**
     * Attaches to model.
     * @param {any} model - The model.
     */
    attachToModel(model) {
        model.add(this.hpSprite);
    }
}
