import * as THREE from "/node_modules/three/build/three.module.js";
import ModelLoader from "../../core/utils/ModelLoader.js";

export class BlackHoleAnimation {
    constructor(containerElement) {
        this.containerElement = containerElement;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        this.animationFrameId = null;
        this.blackHoleObject = null;
    }

    /**
     * Initializes the .
     */
    async init() {
        this.setupEnvironment();
        this.setupLights();
        this.createSpace();
        await this.loadBlackHole();
        this.setupRenderer();
        this.attachEvents();
        this.startRendering();

        const canvas = this.renderer.domElement;
        if (canvas) {
            requestAnimationFrame(() => {
                canvas.style.opacity = "1";
            });
        }
    }

    /**
     * Initializes the environment.
     */
    setupEnvironment() {
        this.scene.fog = new THREE.FogExp2(0x0a0a14, 0.0025);
        this.scene.add(this.camera);
        this.camera.position.set(0, 0, 0);
    }

    /**
     * Initializes the lights.
     */
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x505055, 12.0);
        this.scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffeedd, 15000, 1000);
        flashLight.position.set(0, 0, 0);
        this.camera.add(flashLight);
    }

    /**
     * Creates the space.
     */
    createSpace() {
        const starsGeometry = new THREE.BufferGeometry();
        const count = 500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 12000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 8000; 
            positions[i * 3 + 2] = -2500 + (Math.random() - 0.5) * 6000;
            
            color.setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        this.starsMaterial = new THREE.PointsMaterial({
            size: 4,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: false,
            fog: false
        });
        
        this.starsMaterial.userData.uniforms = {
            uTime: { value: 0 }
        };
        
        this.starsMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.starsMaterial.userData.uniforms.uTime;
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                uniform float uTime;
                void main() {
                `
            ).replace(
                'gl_PointSize = size;',
                `
                float phase = sin(position.x * 0.02 + position.y * 0.03 + position.z * 0.05) * 6.28;
                float speed = 1.2 + sin(position.x * 0.1 + position.y * 0.1) * 0.5;
                gl_PointSize = size * (0.3 + 0.7 * abs(sin(uTime * speed + phase)));
                `
            );
        };
        
        const starField = new THREE.Points(starsGeometry, this.starsMaterial);
        this.scene.add(starField);
    }

    /**
     * Loads the black hole.
     */
    loadBlackHole() {
        return new Promise((resolve) => {
            ModelLoader.load('/asset/game_assets/models/black_hole.glb', (gltf) => {
                this.blackHoleObject = gltf.scene;
                
                this.blackHoleObject.scale.set(1000, 1000, 1000);
                
                this.blackHoleObject.position.set(0, -50, -1000);
                
                this.blackHoleObject.rotation.x = Math.PI / 6;
                this.blackHoleObject.rotation.z = -Math.PI / 8;
                this.blackHoleObject.rotation.y = Math.PI / 6;
                
                this.blackHoleObject.traverse((sceneNode) => {
                    if (sceneNode.isMesh && sceneNode.material) {
                        sceneNode.material.fog = false;
                    }
                });
                
                this.scene.add(this.blackHoleObject);
                resolve();
            });
        });
    }

    /**
     * Initializes the renderer.
     */
    setupRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = this.renderer.domElement;
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.zIndex = "0";
        canvas.style.pointerEvents = "none";
        canvas.style.opacity = "0";
        canvas.style.transition = "opacity 1s ease";

        if (this.containerElement) {
            this.containerElement.appendChild(canvas);
        } else {
            document.body.appendChild(canvas);
        }
    }

    /**
     * Attaches the events.
     */
    attachEvents() {
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener("resize", this.resizeHandler);
    }

    /**
     * Handles the resize event/action.
     */
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Starts the rendering.
     */
    startRendering() {
        const renderLoop = () => {
            this.animationFrameId = requestAnimationFrame(renderLoop);
            
            const time = performance.now() * 0.001;
            if (this.starsMaterial && this.starsMaterial.userData.uniforms) {
                this.starsMaterial.userData.uniforms.uTime.value = time;
            }
            if (this.blackHoleObject) {
                this.blackHoleObject.rotateY(-0.0003);
            }

            this.renderer.render(this.scene, this.camera);
        };
        renderLoop();
    }

    /**
     * Destroies.
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
        }
        if (this.renderer && this.renderer.domElement) {
            const canvas = this.renderer.domElement;
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            this.renderer.dispose();
        }
    }
}
