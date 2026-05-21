import * as THREE from "/node_modules/three/build/three.module.js";
import { gsap } from "/node_modules/gsap/index.js";
import { ScrollTrigger } from "/node_modules/gsap/ScrollTrigger.js";

export class TunnelAnimation {
    static init(containerElement) {
        gsap.registerPlugin(ScrollTrigger);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        camera.position.z = 0;

        const geometry = new THREE.BufferGeometry();

        const particleCount = 2000;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i++) {
            switch (i % 3) {
                case 0:
                    positions[i] = (Math.random() - 0.5) * 200;
                    break;
                case 1:
                    positions[i] = (Math.random() - 0.5) * 600;
                    break;
                case 2:
                    positions[i] = (Math.random() - 0.5) * 200;
                    break;
            }
        }

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
        });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = renderer.domElement;
        canvas.classList.add("tunnel-canvas");

        if (containerElement) {
            containerElement.appendChild(canvas);
        } else {
            document.body.appendChild(canvas);
        }

        gsap.to(camera.position, {
            y: -500,
            ease: "none",
            scrollTrigger: {
                trigger: ".content",
                start: "top top",
                end: "bottom bottom",
                scrub: 1,
            },
        });

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

        window.addEventListener("resize", () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}

