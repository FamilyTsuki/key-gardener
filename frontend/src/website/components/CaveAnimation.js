import * as THREE from "/node_modules/three/build/three.module.js";
import { CaveGeometryBuilder } from "./cave/CaveGeometryBuilder.js";
import { CaveModelLoader } from "./cave/CaveModelLoader.js";
import { CaveScrollController } from "./cave/CaveScrollController.js";
import { GLTFExporter } from '/node_modules/three/examples/jsm/exporters/GLTFExporter.js';

export class CaveAnimation {
    constructor(containerElement) {
        this.containerElement = containerElement;
        this.config = this.initializeConfiguration();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
        
        this.animationFrameId = null;
        
        this.geometryBuilder = new CaveGeometryBuilder(this.scene, this.config);
        this.modelLoader = new CaveModelLoader(this.scene, this.config);
        this.scrollController = new CaveScrollController(this.camera);

        window.exportCave = () => this.exportToGLTF();
    }

    initializeConfiguration() {
        return {
            fogDensity: 0.0025,
            fogColor: 0x0a0a14,
            ambientLightColor: 0x505055,
            ambientLightIntensity: 12.0,
            caveHeight: 1000,
            caveRadius: 75,
            holeRadius: 30.0,
            holePosition: new THREE.Vector3(21.7, 450, -67.9),
            colors: {
                dirt: new THREE.Color(0x6b5341),
                compactDirt: new THREE.Color(0x3d2f25),
                stone: new THREE.Color(0x2a2c30),
                deep: new THREE.Color(0x110502),
                minerals: [
                    new THREE.Color(0xffaa00),
                    new THREE.Color(0x00aaff),
                    new THREE.Color(0xff2222)
                ]
            },
            pebbleCount: 3000
        };
    }

    async init() {
        if (window.incrementLoader) window.incrementLoader();
        this.setupEnvironment();
        this.setupLights();
        
        await this.geometryBuilder.buildCaveEnvironment();
        await this.modelLoader.loadModels();

        this.setupRenderer();
        this.scrollController.setupScrollTrigger();
        this.attachEvents();
        this.startRendering();

        const canvas = this.renderer.domElement;
        if (canvas) {
            requestAnimationFrame(() => {
                canvas.style.opacity = "1";
            });
        }
        if (window.decrementLoader) window.decrementLoader();
    }

    setupEnvironment() {
        this.scene.fog = new THREE.FogExp2(this.config.fogColor, this.config.fogDensity);
        this.scene.add(this.camera);
        this.camera.position.set(0, 100, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(this.config.ambientLightColor, this.config.ambientLightIntensity);
        this.scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffeedd, 15000, 1000);
        flashLight.position.set(0, 0, 0);
        this.camera.add(flashLight);

        const midLight = new THREE.PointLight(0x5577aa, 9000, 600);
        midLight.position.set(0, -400, 0);
        this.scene.add(midLight);
    }

    setupRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = this.renderer.domElement;
        canvas.classList.add("tunnel-canvas");

        if (this.containerElement) {
            this.containerElement.appendChild(canvas);
        } else {
            document.body.appendChild(canvas);
        }
    }

    attachEvents() {
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.scrollController.setupScrollTrigger();
    }

    startRendering() {
        const renderLoop = () => {
            this.animationFrameId = requestAnimationFrame(renderLoop);
            
            const time = performance.now() * 0.001;
            if (this.geometryBuilder.starsMaterial && this.geometryBuilder.starsMaterial.userData.uniforms) {
                this.geometryBuilder.starsMaterial.userData.uniforms.uTime.value = time;
            }
            if (this.modelLoader.blackHoleObject) {
                this.modelLoader.blackHoleObject.rotateY(-0.0003);
            }

            this.renderer.render(this.scene, this.camera);
        };
        renderLoop();
    }

    exportToGLTF() {
        if (!this.geometryBuilder.caveMesh) {
            console.error("Cave mesh not found!");
            return;
        }
        const exporter = new GLTFExporter();
        exporter.parse(this.geometryBuilder.caveMesh, (gltf) => {
            const output = JSON.stringify(gltf, null, 2);
            const blob = new Blob([output], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = 'cave_model.gltf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, (error) => {
            console.error('An error happened during GLTF export:', error);
        });
    }
}