import * as THREE from "three";

export class EasterEgg {
    static init() {
        const konamiCode = [
            "arrowup", "arrowup", "arrowdown", "arrowdown", 
            "arrowleft", "arrowright", "arrowleft", "arrowright", 
            "b", "a"
        ];
        let keyBuffer = [];

        window.addEventListener("keydown", (e) => {
            keyBuffer.push(e.key.toLowerCase());
            if (keyBuffer.length > konamiCode.length) {
                keyBuffer.shift();
            }

            if (keyBuffer.join('') === konamiCode.join('')) {
                keyBuffer = [];
                EasterEgg.triggerRockAnimation();
            }
        });
    }

    static triggerRockAnimation() {
        if (document.getElementById("easter-egg-canvas")) return;

        const canvas = document.createElement("canvas");
        canvas.id = "easter-egg-canvas";
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "9999";
        document.body.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 15);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 10, 10);
        scene.add(dirLight);

        const texCanvas = document.createElement("canvas");
        texCanvas.width = 1024;
        texCanvas.height = 512;
        const ctx = texCanvas.getContext("2d");
        
        ctx.fillStyle = "#707070";
        ctx.fillRect(0, 0, 1024, 512);

        for(let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? "#606060" : "#808080";
            ctx.beginPath();
            ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#111111";
        ctx.strokeStyle = "#111111";
        
        ctx.beginPath();
        ctx.arc(194, 200, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(318, 200, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(256, 256, 90, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 18;
        ctx.lineCap = "round";
        ctx.stroke();

        const combinedTexture = new THREE.CanvasTexture(texCanvas);
        
        const rockGeo = new THREE.SphereGeometry(2.5, 32, 24);
        const positions = rockGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(positions, i);
            v.x *= 1 + (Math.random() * 0.04 - 0.02);
            v.y *= 1 + (Math.random() * 0.04 - 0.02);
            v.z *= 1 + (Math.random() * 0.04 - 0.02);
            positions.setXYZ(i, v.x, v.y, v.z);
        }
        rockGeo.computeVertexNormals();

        const rockMaterial = new THREE.MeshStandardMaterial({ 
            map: combinedTexture,
            roughness: 0.5,
            metalness: 0.1,
            flatShading: false
        });
        const rock = new THREE.Mesh(rockGeo, rockMaterial);
        rock.position.set(-20, -3, 0);
        rock.scale.z = 0.35;
        
        scene.add(rock);

        let animationId;
        let lastTime = performance.now();
        let elapsedAngle = 0;

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const time = performance.now();
            const delta = (time - lastTime) / 1000;
            lastTime = time;

            const angleDelta = (12 / 2.5) * delta;
            elapsedAngle += angleDelta;

            rock.rotation.z = -elapsedAngle;
            
            const k = 0.22;
            const R = 2.5;
            
            rock.position.x = -20 + R * (elapsedAngle - k * Math.sin(elapsedAngle));
            rock.position.y = -3 + R * k * Math.cos(elapsedAngle);

            renderer.render(scene, camera);

            if (rock.position.x > 20) {
                cancelAnimationFrame(animationId);
                window.removeEventListener("resize", handleResize);
                canvas.remove();
            }
        };

        animate();
    }
}
