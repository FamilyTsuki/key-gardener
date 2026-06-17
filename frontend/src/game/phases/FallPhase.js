import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import Player from "../models/actors/Player.js";
import { SurviveDecorBuilder } from "../utilities/SurviveDecorBuilder.js";
export class FallPhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);

        this.decorType = typeof options === "string" ? options : (options.decorType || "default");
        this.decor = null;
        this.player = null;
        this.worldGroupPivot = null;
        this.worldGroup = null;
        this.isReady = false;
        this.scrollingWalls = [];
        this.particles = [];
        this.disposables = [];
        this.wallContainer = null;
        this.particleContainer = null;
        this.laneWords = ["left", "right", "center"];
        this.currentTypedWord = "";
        this.obstacles = [];
        this.pendingObstacles = [];
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 4.8;
        this.gravity = 15;
        this.terminalVelocity = 250;
        this.baseVelocity = 50;
        this.currentVelocity = this.baseVelocity;
        
        this.obstacleGeometry = new THREE.ConeGeometry(3, 8, 8);
        this.obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x00fcff });
        this.disposables.push(this.obstacleGeometry, this.obstacleMaterial);
        
        this.deep = 0;
        this.textScrambleInstances = []
    }

    async init() {
        const scene = this.gameEngine.scene;
        const textElements = document.querySelectorAll(".glitch-text");

        textElements.forEach(el => {
        const instance = new TextScramble(el);
        instance.revealSpeed = 2; 
        instance.setText(el.innerText); 
        
        this.textScrambleInstances.push(instance);
    });

        this.worldGroupPivot = new THREE.Group();
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup = new THREE.Group();
        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.player = new Player(
            "Hero",
            100,
            100,
            { x: 0, y: 15, z: 5 },
            { width: 0.4, height: 0.4 },
            this.worldGroup,
            null,
            null,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );

        this.player.allowSpeedUp = false;
        this.player.movementDuration = 35;

        this.decor = SurviveDecorBuilder.buildDecor(this.decorType, scene);
        
        this.buildMineWalls(scene);
        this.buildMineParticles(scene);
        this.updateColumnsText();

        this.gameEngine.camera.position.set(0, -10, 70);
        this.gameEngine.camera.lookAt(0, -10, 0);

        this.resetWarnIcons();

        if (this.player.loadPromise) {
            await this.player.loadPromise;
            
            if (this.player.mesh) {
                this.player.mesh.rotation.set(0, Math.PI, 0);
            }
            if (this.player.playerModel) {
                this.player.playerModel.rotation.set(-Math.PI, 0, 0);
                this.player.playerModel.position.y = 0;
            }
        }
        
        this.waitForLoader().then(() => {
            this.isReady = true;
        });
    }

    buildMineWalls(scene) {
        this.wallContainer = new THREE.Group();
        scene.add(this.wallContainer);

        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            metalness: 0.1,
            roughness: 0.9,
            flatShading: true
        });
        
        const wallEdgesMaterial = new THREE.LineBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.6 
        });

        const baseWallBack = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallBack.position.set(16, 0, 15);
        
        const baseWallLeft = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallLeft.rotation.y = Math.PI / 2;
        baseWallLeft.position.set(-40, 0, 40);
        
        const baseWallRight = this.createChaoticWall(200, 200, wallMaterial, wallEdgesMaterial);
        baseWallRight.rotation.y = -Math.PI / 2;
        baseWallRight.position.set(40, 0, 10);
        
        for (let i = 0; i < 4; i++) {
            const wallGroupSegment = new THREE.Group();
            wallGroupSegment.position.y = (i * 200) - 400;
            
            wallGroupSegment.add(baseWallBack.clone());
            wallGroupSegment.add(baseWallLeft.clone());
            wallGroupSegment.add(baseWallRight.clone());
            
            this.wallContainer.add(wallGroupSegment);
            this.scrollingWalls.push(wallGroupSegment);
        }
        
        this.disposables.push(wallMaterial, wallEdgesMaterial);
    }

    createChaoticWall(width, height, wallMaterial, wallEdgesMaterial) {
        const segmentsX = Math.floor(width / 10);
        const segmentsY = Math.floor(height / 10);
        const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            const isEdge = x <= -width / 2 || x >= width / 2 || y <= -height / 2 || y >= height / 2;
            
            if (!isEdge) {
                const chaosX = (Math.random() - 0.5) * 8.0;
                const chaosY = (Math.random() - 0.5) * 8.0;
                positions.setX(i, x + chaosX);
                positions.setY(i, y + chaosY);
            }

            const chaosZ = (Math.random() - 0.5) * 20.0 + Math.sin(x * 0.1) * 15.0 + Math.cos(y * 0.05) * 10.0;
            positions.setZ(i, chaosZ);
        }

        const columns = segmentsX + 1;
        const rows = segmentsY + 1;
        
        for (let row = 0; row < rows; row++) {
            const leftIndex = row * columns;
            const rightIndex = row * columns + (columns - 1);
            positions.setZ(rightIndex, positions.getZ(leftIndex));
        }
        
        for (let col = 0; col < columns; col++) {
            const topIndex = col;
            const bottomIndex = (rows - 1) * columns + col;
            positions.setZ(bottomIndex, positions.getZ(topIndex));
        }

        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMesh = new THREE.LineSegments(edgesGeometry, wallEdgesMaterial);
        
        mesh.add(edgesMesh);
        
        this.disposables.push(geometry, edgesGeometry);
        
        return mesh;
    }

    buildMineParticles(scene) {
        this.particleContainer = new THREE.Group();
        scene.add(this.particleContainer);

        const particleCount = 150; 
        const lineGeometry = new THREE.CylinderGeometry(0.04, 0.04, 8, 4);
        const lineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xaaaaaa, 
            transparent: true, 
            opacity: 0.4 
        });
        
        this.disposables.push(lineGeometry, lineMaterial);
        
        for (let i = 0; i < particleCount; i++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);

            line.position.set(
                Math.random() * 160 - 60,
                Math.random() * 300 - 200,
                Math.random() * 160 - 100
            );
            this.particleContainer.add(line);
            this.particles.push(line);
        }
    }

    updateColumnsText() {
        const leftColumn = document.getElementById("left-column");
        const centerColumn = document.getElementById("center-column");
        const rightColumn = document.getElementById("right-column");

        const updateElement = (el, targetWord) => {
            if (!el) return;
            const typed = this.currentTypedWord.toLowerCase();
            
            if (typed.length > 0 && targetWord.startsWith(typed)) {
                const matchedPart = targetWord.substring(0, typed.length).toUpperCase();
                const remainingPart = targetWord.substring(typed.length).toUpperCase();
                el.innerHTML = `<span style="color: #abff44ff;">${matchedPart}</span>${remainingPart}`;
            } else {
                el.innerHTML = targetWord.toUpperCase();
            }
        };

        updateElement(leftColumn, "left");
        updateElement(centerColumn, "center");
        updateElement(rightColumn, "right");
    }

    getWarnElement(laneX) {
        if (laneX === -6) return document.getElementById("left-warn-img");
        if (laneX === 0) return document.getElementById("center-warn-img");
        if (laneX === 6) return document.getElementById("right-warn-img");
        return null;
    }

    getDeepElement() {
        return document.getElementById("deep-container");
    }  
    updateDeep(currentDeep) {
        const deepElement = this.getDeepElement().children[1];
        if (deepElement) {
            deepElement.innerHTML = Math.trunc(currentDeep);
        }
    }

    resetWarnIcons() {
        const icons = ["left-warn-img", "center-warn-img", "right-warn-img"];
        icons.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.visibility = "hidden";
        });
    }

    spawnObstacle(targetLane) {
        const obstacleMesh = new THREE.Mesh(this.obstacleGeometry, this.obstacleMaterial);
        
        const playerSpacingX = this.player ? this.player.spacingX : 3.2;
        const playerSpacingZ = this.player ? this.player.spacingZ : 3.2;
        
        obstacleMesh.position.set(
            targetLane * playerSpacingX,
            -60,
            (this.player ? this.player.targetPosition.y : 0) * playerSpacingZ
        );
        
        obstacleMesh.userData = { lane: targetLane, isHit: false };
        
        this.wallContainer.add(obstacleMesh);
        this.obstacles.push(obstacleMesh);
    }

    movePlayerToLane(laneX) {
        this.player.move({ 
            x: laneX * 6, 
            y: this.player.targetPosition.y 
        });
        this.currentTypedWord = "";
        this.updateColumnsText();
    }
    
    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            if (!loader) return resolve();
            
            const checkHidden = setInterval(() => {
                if (loader.classList.contains("hidden")) {
                    clearInterval(checkHidden);
                    const onEnd = () => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    };
                    loader.addEventListener("transitionend", onEnd);
                    setTimeout(() => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    }, 600); 
                }
            }, 50);
        });
    }

    update(deltaTime) {
        if (!this.isReady) return;
        
        if (!this.player.isAlive()) return;

        this.currentVelocity = Math.min(this.currentVelocity + (this.gravity * deltaTime), this.terminalVelocity);
        const movementDelta = this.currentVelocity * deltaTime;

        this.deep += movementDelta;
        this.updateDeep(this.deep);

        this.textScrambleInstances.forEach(instance => {
            instance.updateIntensity(this.deep);
        });

        this.scrollingWalls.forEach(wallGroupSegment => {
            wallGroupSegment.position.y += movementDelta;
            if (wallGroupSegment.position.y >= 400) {
                wallGroupSegment.position.y -= 800;
            }
        });

    this.particles.forEach(particle => {
        particle.position.y += movementDelta * 1.5;
        if (particle.position.y > 60) {
            particle.position.y -= 100;
        }
    });

    this.obstacleSpawnTimer += deltaTime;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
        const lanes = [-6, 0, 6];
        const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
        
        this.pendingObstacles.push({
            lane: targetLane,
            timer: 0,
            toggles: 0,
            isVisible: false
        });
        this.obstacleSpawnTimer = 0;
    }

    for (let i = this.pendingObstacles.length - 1; i >= 0; i--) {
        const pending = this.pendingObstacles[i];
        pending.timer += deltaTime;

        if (pending.timer >= 0.40) {
            pending.timer = 0;
            pending.toggles++;
            pending.isVisible = !pending.isVisible;

            const warnEl = this.getWarnElement(pending.lane);
            if (warnEl) {
                warnEl.style.visibility = pending.isVisible ? "visible" : "hidden";
            }

            if (pending.toggles >= 6) {
                if (warnEl) warnEl.style.visibility = "hidden";
                this.spawnObstacle(pending.lane);
                this.pendingObstacles.splice(i, 1);
            }
        }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacleMesh = this.obstacles[i];
        obstacleMesh.position.y += movementDelta;

        if (this.player && this.player.mesh) {
            const distanceY = Math.abs(obstacleMesh.position.y - this.player.mesh.position.y);
            const distanceX = Math.abs(obstacleMesh.position.x - this.player.mesh.position.x);

            if (distanceY < 3.5 && distanceX < 8.0 && !obstacleMesh.userData.isHit) {
                this.player.damage(20, "Percuté par un obstacle en chute libre");
                obstacleMesh.userData.isHit = true;
                obstacleMesh.visible = false;
            }
        }

        if (obstacleMesh.position.y > 50) {
            this.wallContainer.remove(obstacleMesh);
            this.obstacles.splice(i, 1);
        }
    }

    if (this.player) {
        this.player.update(deltaTime, null);
        
        if (this.player.mesh) {
            this.player.mesh.rotation.set(0, Math.PI, 0); 
        }

        if (this.player.playerModel) {
            if (this.fallTime === undefined) this.fallTime = 0;
            this.fallTime += deltaTime;

            const positionShakeIntensity = 0.03;
            const positionShakeX = (Math.random() - 0.5) * positionShakeIntensity;
            const positionShakeZ = (Math.random() - 0.5) * positionShakeIntensity;

            const verticalFloatAmplitude = 0.5;
            const verticalFloatSpeedA = 1.2;
            const verticalFloatSpeedB = 0.7;
            const floatY = (Math.sin(this.fallTime * verticalFloatSpeedA) + Math.sin(this.fallTime * verticalFloatSpeedB)) * 0.5 * verticalFloatAmplitude;

            const horizontalFloatAmplitude = 0.3;
            const horizontalFloatSpeedA = 0.9;
            const horizontalFloatSpeedB = 1.4;
            const floatX = (Math.cos(this.fallTime * horizontalFloatSpeedA) + Math.sin(this.fallTime * horizontalFloatSpeedB)) * 0.5 * horizontalFloatAmplitude;

            this.player.playerModel.position.set(floatX + positionShakeX, floatY, positionShakeZ);
            this.player.playerModel.scale.set(1.95, 1.95, 1.95);
            
            const diveTiltX = -Math.PI; 
            let targetRoll = 0;
            
            if (this.player.isMoving) {
                const dx = this.player.targetPosition.x - this.player.startPosition.x;
                targetRoll = dx > 0 ? -0.4 : 0.4;
            }
            
            if (this.currentRoll === undefined) this.currentRoll = 0;

            this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, deltaTime * 6);
            
            const rotationShakeIntensity = 0.015;
            const rotationShakeX = (Math.random() - 0.5) * rotationShakeIntensity;
            const rotationShakeZ = (Math.random() - 0.5) * rotationShakeIntensity;

            this.player.playerModel.rotation.set(
                diveTiltX + rotationShakeX, 
                0, 
                -this.currentRoll + rotationShakeZ
            );
        }
    }

    if (this.decor) {
        const waveData = this.decor.update(deltaTime) || { y: 0, rotationX: 0, rotationZ: 0 };
        if (this.worldGroupPivot) {
            if (typeof waveData === "number") {
                this.worldGroupPivot.position.y = waveData;
            } else {
                this.worldGroupPivot.position.y = waveData.y;
                this.worldGroupPivot.rotation.x = waveData.rotationX;
                this.worldGroupPivot.rotation.z = waveData.rotationZ;
            }
        }
    }

    this.deep += movementDelta;
    this.updateDeep(this.deep);

    if (this.textScrambleInstance) {
        this.textScrambleInstance.updateIntensity(this.deep);
    }
}
    draw() {
    }
    
    handleKeyDown(event) {
        if (!this.isReady || !this.player || this.player.isMoving) return;

        if (event.key === "Backspace") {
            this.currentTypedWord = this.currentTypedWord.slice(0, -1);
            this.updateColumnsText();
            return;
        }

        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.currentTypedWord += event.key.toLowerCase();
            
            const isValidPrefix = this.laneWords.some(word => word.startsWith(this.currentTypedWord));

            if (!isValidPrefix) {
                this.currentTypedWord = "";
            } else {
                if (this.currentTypedWord === "left") {
                    this.movePlayerToLane(-1);
                } else if (this.currentTypedWord === "right") {
                    this.movePlayerToLane(1);
                } else if (this.currentTypedWord === "center") {
                    this.movePlayerToLane(0);
                }
            }
            this.updateColumnsText();
        }
    }

    cleanup() {
        if (this.player && this.player.mesh && this.worldGroup) {
            this.worldGroup.remove(this.player.mesh);
        }
        if (this.worldGroupPivot) {
            this.gameEngine.scene.remove(this.worldGroupPivot);
        }
        if (this.decor) {
            this.decor.cleanup();
        }
        
        if (this.wallContainer) {
            this.gameEngine.scene.remove(this.wallContainer);
        }
        if (this.particleContainer) {
            this.gameEngine.scene.remove(this.particleContainer);
        }

        const leftColumn = document.getElementById("left-column");
        const centerColumn = document.getElementById("center-column");
        const rightColumn = document.getElementById("right-column");
        if (leftColumn) leftColumn.innerHTML = "left";
        if (centerColumn) centerColumn.innerHTML = "center";
        if (rightColumn) rightColumn.innerHTML = "right";
        
        this.resetWarnIcons();

        this.disposables.forEach(resource => {
            if (resource.dispose) {
                resource.dispose();
            }
        });
        
        this.scrollingWalls = [];
        this.particles = [];
        this.obstacles = [];
        this.pendingObstacles = [];
        this.disposables = [];
    }
}
class TextScramble {
    constructor(el) {
        this.el = el;
        this.charSets = {
            tech1: '!<>-_\\/[]{}—=+*^?#_',
            tech2: '!<>-_\\/[]{}—=+*^?#$%&()~',
            math: '01︎10︎101︎01︎+=-×÷',
            cryptic: '¥¤§Ω∑∆√∞≈≠≤≥',
            mixed: 'あ㐀明る日¥£€$¢₽₹₿',
            alphabet: 'abcdefghijklmnopqrstuvwxyz',
            matrix1: 'ラドクリフマラソンわたしワタシんょンョたばこタバコとうきょうトウキョウ',
            matrix2: '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ',
            matrix3: '字型大小女巧偉周年',
            matrix4: '九七二人入八力十下三千上口土夕大女子小山川五天中六円手文日月木水火犬王正出本右四左玉生田白目石立百年休先名字早気竹糸耳虫村男町花見貝赤足車学林空金雨青草音',
            emoji1: Array.from('😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🤗🤔😐😑😶🙄😏😮😯😲😴🤤🤤😪😵🤯🤪🤩🥳🥺🥵🥴🥺'),
            emoji2: Array.from('🏠🏢🏥🏦🏨🏫🏬🏭🏯🏰🏟️🎡🎢🎠⛲🎪🗼🗽🗿🌉'),
            emoji3: Array.from('🍎🍊🍋🍌🍉🍇🍓🍈🍒🍑🥭🍍🥥🥝🥑🍆🥕🌽🌶️🍄🌰🍞')
        };
        
        this.chars = this.charSets.tech1;
        this.revealSpeed = 1;
        this.baseChangeFrequency = 0.28;
        this.changeFrequency = this.baseChangeFrequency;
        this.highlightColor = '#00ff88';
        this.glowIntensity = 8;
        this.activeGlowIntensity = 12;
        this.queue = [];
        this.frame = 0;
        this.frameRequest = null;
        this.resolve = null;

        this.update = this.update.bind(this);
    }

    updateIntensity(deep) {
    const startThreshold = 1500; // Pas de glitch avant 1500m
    const maxDepth = 20000;      // Intensité max à 20000m

    if (deep < startThreshold) {
        // En dessous de 1500m : aucun glitch
        this.changeFrequency = 0;
    } else {
        // On calcule le facteur de progression UNIQUEMENT sur la distance restante
        // (deep - 1500) permet de commencer à 0 à partir de 1500m
        const factor = Math.min((deep - startThreshold) / (maxDepth - startThreshold), 1);
        
        const minFrequency = 0.02;
        const maxFrequency = 0.9;
        
        this.changeFrequency = minFrequency + (factor * (maxFrequency - minFrequency));
    }
    
    // Règle une valeur fixe positive pour éviter la division par zéro
    this.revealSpeed = 5; 
}

    setCharSet(setName) {
        if (this.charSets[setName]) {
            this.chars = this.charSets[setName];
            return true;
        }
        return false;
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * (40 / this.revealSpeed));
            const end = start + Math.floor(Math.random() * (40 / this.revealSpeed));
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];

            // SI le caractère est déjà révélé (frame >= end)
            if (this.frame >= end) {
                // On glitch encore un peu selon la fréquence actuelle
                if (Math.random() < this.changeFrequency) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)];
                    output += `<span class="scrambling" style="color: ${this.highlightColor}; text-shadow: 0 0 ${this.activeGlowIntensity}px currentColor;">${char}</span>`;
                } else {
                    // Sinon on affiche le caractère réel
                    output += to;
                }
            } 
            // SINON on est dans la phase d'animation de révélation
            else if (this.frame >= start) {
                if (!char || Math.random() < this.changeFrequency) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)];
                    this.queue[i].char = char;
                }
                output += `<span class="scrambling" style="color: ${this.highlightColor}; text-shadow: 0 0 ${this.activeGlowIntensity}px currentColor;">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        // ON NE S'ARRÊTE JAMAIS : on demande la prochaine frame en continu
        this.frameRequest = requestAnimationFrame(this.update);
        this.frame++;
    }
}