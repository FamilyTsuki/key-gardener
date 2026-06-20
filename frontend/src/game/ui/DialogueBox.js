import * as THREE from "three";
import ModelLoader from "../../core/utils/ModelLoader.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { AudioManager } from "../managers/AudioManager.js";
import { el } from "../../core/utils/DOMBuilder.js";

/**
 * Reusable component for displaying dialogues with an optional speaker portrait (2D or 3D).
 */
export class DialogueBox {
    /**
     * Creates a new DialogueBox instance.
     * @param {HTMLElement} parentElement - The DOM element to attach the dialogue container to.
     */
    constructor(parentElement = document.body) {
        this.parentElement = parentElement;
        this.container = null;
        this.bubble = null;
        this.textElement = null;
        this.speakerContainer = null;

        AudioManager.preloadSound("/asset/game_assets/sounds/tic.wav");

        this.dialogues = [];
        this.dialogueStep = 0;
        this.onComplete = null;
        
        this.typewriterInterval = null;
        this.dialogueTimeout = null;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.animationId = null;

        this.createDOM();
    }

    /**
     * Creates the basic DOM structure for the dialogue box.
     */
    createDOM() {
        this.textElement = el("span", { className: "dialogue-box-text" });
        this.skipIndicator = el("div", 
            { className: "dialogue-skip-indicator" }, 
            LanguageManager.t("common.skipIndicator") 
        );

        this.bubble = el("div", { className: "dialogue-box-bubble" }, 
            this.textElement, 
            this.skipIndicator
        );

        this.speakerContainer = el("div", { className: "dialogue-box-speaker" });

        this.container = el("div", { className: "dialogue-box-container" }, 
            this.bubble, 
            this.speakerContainer
        );

        this.parentElement.appendChild(this.container);

        this.container.addEventListener("click", () => this.advanceDialogue());
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        window.addEventListener("keydown", this.handleKeyDown);
    }

    /**
     * Handle key presses (e.g. Space or Enter) to advance dialogue.
     * @param {KeyboardEvent} e - The keyboard event.
     */
    handleKeyDown(e) {
        if (e.repeat) return;
        if (!this.container.classList.contains("visible")) return;
        if (e.code === "Space" || e.code === "Enter") {
            e.preventDefault();
            this.advanceDialogue();
        }
    }

    /**
     * Shows the dialogue box with a set of dialogues and a speaker model/image.
     * @param {string[]} dialogues - Array of strings to display sequentially.
     * @param {string} speakerPath - Path to the image (.webp/.webp) or 3D model (.glb/.gltf).
     * @param {Function} [onComplete] - Callback function executed when dialogue ends.
     */
    show(dialogues, speakerPath, onComplete = null) {
        this.dialogues = dialogues.map(d => LanguageManager.t(d));
        this.dialogueStep = 0;
        this.onComplete = onComplete;
        
        this.setupSpeaker(speakerPath);
        
        document.body.classList.add("dialogue-active");
        this.container.classList.add("visible");
        this.showNextDialogue();
    }

    /**
     * Sets up the speaker container, loading either a 2D image or initializing a 3D scene.
     * @param {string} path - Path to the speaker resource.
     */
    setupSpeaker(path) {
        this.cleanupSpeaker();

        if (!path) return;

        const is3D = path.endsWith(".glb") || path.endsWith(".gltf");

        if (!is3D) {
            const img = el("img", { src: path, alt: "Speaker Portrait", className: "dialogue-speaker-image" });
            this.speakerContainer.appendChild(img);
        } else {
            this.init3DScene(path);
        }
    }

    /**
     * Initializes a secondary Three.js scene to render the speaker's 3D model.
     * @param {string} modelPath - Path to the .glb/.gltf file.
     */
    init3DScene(modelPath) {
        this.scene = new THREE.Scene();

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        this.camera = new THREE.PerspectiveCamera(45, 400 / 500, 0.1, 100);
        this.camera.position.set(0, 1.0, 9);

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(400, 500);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.speakerContainer.appendChild(this.renderer.domElement);

        ModelLoader.load(modelPath, (gltf) => {
            this.model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            this.model.position.x = -center.x;
            this.model.position.y = -center.y;
            this.model.position.z = -center.z;
            
            this.model.rotation.y = Math.PI / 8;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 5.0;
            const scale = targetSize / (maxDim || 1);
            this.model.scale.setScalar(scale);
            
            this.model.position.y -= 0.5;

            if (!this.scene) return;
            this.scene.add(this.model);
            
            this.camera.lookAt(0, -0.5, 0);

            const animate = () => {
                if (!this.renderer || !this.scene || !this.camera) return;
                this.animationId = requestAnimationFrame(animate);
                
                if (this.model) {
                    this.model.rotation.y = Math.PI / 8 + Math.sin(performance.now() * 0.001) * 0.1;
                }
                
                this.renderer.render(this.scene, this.camera);
            };
            animate();
        }, undefined, (error) => {
            console.error("Failed to load speaker model:", error);
        });
    }

    /**
     * Displays the next line of dialogue using a typewriter effect.
     */
    showNextDialogue() {
        this.clearTimeouts();

        if (this.dialogueStep < this.dialogues.length) {
            const fullText = this.dialogues[this.dialogueStep];
            this.textElement.textContent = "";
            this.dialogueStep++;
            let charIndex = 0;

            this.typewriterInterval = setInterval(() => {
                const char = fullText[charIndex];
                this.textElement.textContent += char;
                charIndex++;
                
                if (char.trim() !== "") {
                    AudioManager.playSFX("/asset/game_assets/sounds/tic.wav", "ui", 0.5);
                }
                
                if (charIndex >= fullText.length) {
                    clearInterval(this.typewriterInterval);
                    this.typewriterInterval = null;
                    
                    const autoSkipDelay = Math.max(3000, fullText.length * 80);
                    this.dialogueTimeout = setTimeout(() => {
                        this.advanceDialogue();
                    }, autoSkipDelay);
                }
            }, 30);
        } else {
            this.hide();
        }
    }

    /**
     * Instantly completes the current line or moves to the next one.
     */
    advanceDialogue() {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
            const fullText = this.dialogues[this.dialogueStep - 1];
            this.textElement.textContent = fullText;

            if (this.dialogueTimeout) clearTimeout(this.dialogueTimeout);
            const autoSkipDelay = Math.max(3000, (fullText || '').length * 80);
            this.dialogueTimeout = setTimeout(() => {
                this.advanceDialogue();
            }, autoSkipDelay);
        } else {
            this.showNextDialogue();
        }
    }

    /**
     * Clears any active typing or auto-advance timeouts.
     */
    clearTimeouts() {
        if (this.dialogueTimeout) {
            clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = null;
        }
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }
    }

    /**
     * Cleans up the speaker container (removes image or 3D scene).
     */
    cleanupSpeaker() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        this.scene = null;
        this.camera = null;
        this.model = null;

        this.speakerContainer.innerHTML = "";
    }

    /**
     * Hides the dialogue box and fires the onComplete callback.
     */
    hide() {
        document.body.classList.remove("dialogue-active");
        this.container.classList.remove("visible");
        this.clearTimeouts();
        this.cleanupSpeaker();
        
        if (this.onComplete) {
            const cb = this.onComplete;
            this.onComplete = null;
            cb();
        }
    }

    /**
     * Completely removes the component from the DOM and removes listeners.
     */
    destroy() {
        this.hide();
        window.removeEventListener("keydown", this.handleKeyDown);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
