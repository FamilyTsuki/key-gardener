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
            if (typeof e.key !== "string") return;
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
        document.body.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 15);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 10, 10);
        scene.add(directionalLight);

        const textureCanvas = document.createElement("canvas");
        textureCanvas.width = 1024;
        textureCanvas.height = 512;
        const textureContext = textureCanvas.getContext("2d");
        
        textureContext.fillStyle = "#707070";
        textureContext.fillRect(0, 0, 1024, 512);

        for(let i = 0; i < 2000; i++) {
            textureContext.fillStyle = Math.random() > 0.5 ? "#606060" : "#808080";
            textureContext.beginPath();
            textureContext.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 8, 0, Math.PI * 2);
            textureContext.fill();
        }

        textureContext.fillStyle = "#111111";

        textureContext.beginPath();
        textureContext.ellipse(180, 210, 30, 28, -0.2, 0, Math.PI * 2);
        textureContext.fill();

        textureContext.beginPath();
        textureContext.ellipse(330, 215, 28, 26, 0.15, 0, Math.PI * 2);
        textureContext.fill();

        textureContext.strokeStyle = "#111111";
        textureContext.lineWidth = 18;
        textureContext.lineCap = "round";
        textureContext.lineJoin = "round";

        textureContext.beginPath();
        textureContext.moveTo(230, 220);
        textureContext.quadraticCurveTo(256, 310, 282, 220);
        textureContext.stroke();

        const combinedTexture = new THREE.CanvasTexture(textureCanvas);
        
        const sphereRadius = 2.5;
        const eggGeometry = new THREE.SphereGeometry(sphereRadius, 64, 48);
        const vertexPositions = eggGeometry.attributes.position;
        
        for (let i = 0; i < vertexPositions.count; i++) {
            const vertexVector = new THREE.Vector3().fromBufferAttribute(vertexPositions, i);
            
            const normalizedY = vertexVector.y / sphereRadius;
            
            const taperFactor = 1.0 - 0.15 * Math.max(0, normalizedY);
            vertexVector.x *= taperFactor;
            vertexVector.z *= taperFactor;
            
            vertexVector.y *= 1.0 + 0.30 * Math.max(0, normalizedY);

            const noiseMultiplierX = 1 + (Math.random() * 0.02 - 0.01);
            const noiseMultiplierY = 1 + (Math.random() * 0.02 - 0.01);
            const noiseMultiplierZ = 1 + (Math.random() * 0.02 - 0.01);
            
            vertexVector.x *= noiseMultiplierX;
            vertexVector.y *= noiseMultiplierY;
            vertexVector.z *= noiseMultiplierZ;
            
            vertexPositions.setXYZ(i, vertexVector.x, vertexVector.y, vertexVector.z);
        }
        
        eggGeometry.computeVertexNormals();

        const eggMaterial = new THREE.MeshStandardMaterial({ 
            map: combinedTexture,
            roughness: 0.5,
            metalness: 0.1,
            flatShading: false
        });
        
        const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
        eggMesh.position.set(-20, -2.713, 0);
        eggMesh.scale.z = 0.35;
        
        scene.add(eggMesh);

        const profileSamples = 360;
        const profileRadii = [];
        for (let s = 0; s < profileSamples; s++) {
            const angle = (s / profileSamples) * Math.PI * 2;
            const sinA = Math.sin(angle);
            const cosA = Math.cos(angle);
            const nY = cosA;

            let px, py;
            if (nY > 0) {
                const taper = 1.0 - 0.15 * nY;
                px = sphereRadius * sinA * taper;
                py = sphereRadius * cosA * (1.0 + 0.30 * nY);
            } else {
                px = sphereRadius * sinA;
                py = sphereRadius * cosA;
            }

            profileRadii.push(Math.sqrt(px * px + py * py));
        }

        const getProfileRadius = (angle) => {
            const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const index = Math.floor((normalized / (Math.PI * 2)) * profileSamples) % profileSamples;
            return profileRadii[index];
        };

        let animationFrameId;
        let lastTimestamp = performance.now();
        let elapsedRotationAngle = 0;
        let cumulativeX = 0;
        const groundY = -6.213;

        const handleWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleWindowResize);

        const animateScene = () => {
            animationFrameId = requestAnimationFrame(animateScene);
            const currentTimestamp = performance.now();
            const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
            lastTimestamp = currentTimestamp;

            const contactRadius = getProfileRadius(elapsedRotationAngle);
            const angularSpeed = (4 / contactRadius) * deltaTime;
            elapsedRotationAngle += angularSpeed;

            cumulativeX += contactRadius * angularSpeed;

            eggMesh.rotation.z = Math.PI - elapsedRotationAngle;
            eggMesh.position.x = -20 + cumulativeX;
            eggMesh.position.y = groundY + contactRadius;

            renderer.render(scene, camera);

            if (eggMesh.position.x > 20) {
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener("resize", handleWindowResize);
                canvas.remove();
            }
        };

        animateScene();
    }
}