import * as THREE from "three";

/**
 * Manages floating HTML text overlays synced with 3D positions.
 * Useful for displaying damage numbers, heals, or status effects.
 */
export class FloatingTextManager {
    constructor() {
        this.activeTexts = [];
        this.container = document.getElementById("floating-text-container");

        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = "floating-text-container";
            document.body.appendChild(this.container);
        }
    }

    /**
     * Adds a new floating text instance.
     * @param {any} position3D - The position3D.
     * @param {any} text - The text.
     * @param {any} type - The type.
     */
    add(position3D, text, type = "damage") {
        const textElement = document.createElement("div");
        textElement.className = `floating-text ${type}`;
        textElement.textContent = text;
        this.container.appendChild(textElement);

        const driftX = (Math.random() - 0.5) * 1.5;
        const initialPosition = position3D.clone().add(new THREE.Vector3(0, 1.0, 0));

        this.activeTexts.push({
            el: textElement,
            pos3D: initialPosition,
            driftX,
            life: 1.5,
            maxLife: 1.5
        });
    }

    /**
     * Updates the position and opacity of all active floating texts.
     * @param {any} camera - The camera.
     * @param {any} deltaTime - The deltaTime.
     */
    update(camera, deltaTime) {
        if (!camera) return;

        const halfWidth = window.innerWidth / 2;
        const halfHeight = window.innerHeight / 2;

        for (let i = this.activeTexts.length - 1; i >= 0; i--) {
            const textInstance = this.activeTexts[i];
            
            textInstance.life -= deltaTime;
            if (textInstance.life <= 0) {
                this.removeTextElement(textInstance);
                this.activeTexts.splice(i, 1);
                continue;
            }

            this.updateTextPosition(textInstance, deltaTime);
            this.renderTextElement(textInstance, camera, halfWidth, halfHeight);
        }
    }

    /**
     * Updates the 3D position of a text instance over time (drifting effect).
     * @param {any} textInstance - The textInstance.
     * @param {any} deltaTime - The deltaTime.
     */
    updateTextPosition(textInstance, deltaTime) {
        textInstance.pos3D.y += 2.0 * deltaTime;
        textInstance.pos3D.x += textInstance.driftX * deltaTime;
    }

    /**
     * Projects the 3D position to 2D and applies CSS transforms to render the text.
     * @param {any} textInstance - The textInstance.
     * @param {any} camera - The camera.
     * @param {any} halfWidth - The halfWidth.
     * @param {any} halfHeight - The halfHeight.
     */
    renderTextElement(textInstance, camera, halfWidth, halfHeight) {
        const vector = textInstance.pos3D.clone();
        vector.project(camera);

        if (vector.z > 1) {
            textInstance.el.style.display = 'none';
            return;
        } 
        
        textInstance.el.style.display = 'block';

        const screenX = (vector.x * halfWidth) + halfWidth;
        const screenY = -(vector.y * halfHeight) + halfHeight;
        const opacity = Math.max(0, textInstance.life / textInstance.maxLife);

        textInstance.el.style.transform = `translate(-50%, -50%) translate(${screenX}px, ${screenY}px)`;
        textInstance.el.style.opacity = opacity;
    }

    /**
     * Removes the HTML element of a text instance from the DOM.
     * @param {any} textInstance - The textInstance.
     */
    removeTextElement(textInstance) {
        if (textInstance.el.parentNode) {
            textInstance.el.parentNode.removeChild(textInstance.el);
        }
    }

    /**
     * Clears all active floating texts and removes their HTML elements.
     */
    clear() {
        this.activeTexts.forEach(textInstance => this.removeTextElement(textInstance));
        this.activeTexts = [];
    }
}
