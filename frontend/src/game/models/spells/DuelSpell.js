import * as THREE from "three";

export class DuelSpell {
    constructor(id, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene) {
        this.id = id;
        this.attackerId = attackerId;
        this.targetId = targetId;
        this.spellType = spellType;
        this.requiredLength = requiredLength;
        this.speedMultiplier = speedMultiplier;
        this.defenseWord = defenseWord;
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(startPos);
        
        this.visualGroup = new THREE.Group();
        this.mesh.add(this.visualGroup);
        
        this.damage = 10;
        this.healAmount = 0;
        this.isHoming = true;
        this.speed = 15;
        this.color = new THREE.Color(0xff0000);
        this.scale = new THREE.Vector3(0.5, 0.5, 0.5);
        this.direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        this.isDestroyed = false;
        this.slowFactor = 1.0;

        this.initVisuals(fireballGltf);
        this.initTextSprite();
        this.scene.add(this.mesh);
    }

    initVisuals(fireballGltf) {
        if (fireballGltf) {
            const model = fireballGltf.scene.clone();
            model.scale.copy(this.scale);
            model.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshBasicMaterial({ color: this.color });
                }
            });
            this.visualGroup.add(model);
        }

        const pCount = 50;
        const pPos = new Float32Array(pCount * 3);
        const particlesGeo = new THREE.BufferGeometry();
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({
            color: this.color,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(particlesGeo, particlesMat);
        this.visualGroup.add(this.trail);
        this.trailTime = 0;
    }

    resetVisuals(fireballGltf) {
        while (this.visualGroup.children.length > 0) {
            this.visualGroup.remove(this.visualGroup.children[0]);
        }
        if (this.textSprite && this.textSprite.parent === this.mesh) {
            this.mesh.remove(this.textSprite);
        }
        this.initVisuals(fireballGltf);
        this.initTextSprite();
    }

    initTextSprite() {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext("2d");
        
        const x = 8;
        const y = 8;
        const w = 496;
        const h = 112;
        const r = 24;
        
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
        
        context.fillStyle = "rgba(10, 12, 16, 0.85)";
        context.fill();
        
        context.strokeStyle = "#" + this.color.getHexString();
        context.lineWidth = 6;
        context.shadowColor = "#" + this.color.getHexString();
        context.shadowBlur = 15;
        context.stroke();
        
        context.shadowBlur = 0;
        context.font = "bold 60px monospace";
        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(this.defenseWord.toUpperCase(), 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.textSprite = new THREE.Sprite(spriteMaterial);
        this.textSprite.scale.set(2.0, 0.5, 1.0);
        this.textSprite.position.y = 1.0 + this.scale.y * 1.8;
        this.mesh.add(this.textSprite);
    }

    update(deltaTime, targetModel) {
        if (this.isDestroyed) return;

        let activeSpeedMultiplier = this.speedMultiplier * this.slowFactor;
        const currentSpeed = this.speed * activeSpeedMultiplier * deltaTime;
        this.slowFactor = 1.0;

        this.trailTime += deltaTime * 20;
        if (this.trail) {
            const pos = this.trail.geometry.attributes.position.array;
            for (let j = 0; j < 50; j++) {
                pos[j*3] = Math.sin(this.trailTime + j) * 0.4;
                pos[j*3+1] = Math.cos(this.trailTime + j*1.1) * 0.4;
                const tailLength = this.targetId === this.attackerId ? -(j * 0.1) : (j * 0.1);
                pos[j*3+2] = Math.sin(this.trailTime + j*1.2) * 0.4 + tailLength;
            }
            this.trail.geometry.attributes.position.needsUpdate = true;
        }

        const targetPos = new THREE.Vector3();
        targetModel.mesh.getWorldPosition(targetPos);
        targetPos.y += 1.0;

        if (this.isHoming) {
            this.direction.subVectors(targetPos, this.mesh.position).normalize();
            this.mesh.position.addScaledVector(this.direction, currentSpeed);
            this.visualGroup.lookAt(targetPos);
        } else {
            this.mesh.position.addScaledVector(this.direction, currentSpeed);
            this.visualGroup.lookAt(this.mesh.position.clone().add(this.direction));
        }

        if (Math.abs(this.mesh.position.z) > 18.0) {
            this.destroy();
            return;
        }

        const dist = this.mesh.position.distanceTo(targetPos);
        if (dist < 1.0) {
            this.onHit(targetModel);
        }
    }

    onHit(targetModel) {
        this.destroy();
    }

    destroy() {
        this.isDestroyed = true;
        this.scene.remove(this.mesh);
    }
}

export class LightSpell extends DuelSpell {
    constructor(...args) {
        super(...args);
        this.damage = 10;
        this.speed = 24;
        this.isHoming = false;
        this.color = new THREE.Color(0xffff00);
        this.scale.set(0.3, 0.3, 0.3);
        this.resetVisuals(args[9]);
    }

    initVisuals(fireballGltf) {
        const geo = new THREE.SphereGeometry(0.3, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: this.color });
        const mesh = new THREE.Mesh(geo, mat);
        this.visualGroup.add(mesh);

        const pCount = 30;
        const pPos = new Float32Array(pCount * 3);
        const particlesGeo = new THREE.BufferGeometry();
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({
            color: this.color,
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(particlesGeo, particlesMat);
        this.visualGroup.add(this.trail);
        this.trailTime = 0;
    }
}

export class HeavySpell extends DuelSpell {
    constructor(...args) {
        super(...args);
        this.damage = 20;
        this.speed = 6;
        this.isHoming = true;
        this.color = new THREE.Color(0xff0000);
        this.scale.set(0.85, 0.85, 0.85);
        this.resetVisuals(args[9]);
    }
}

export class StunSpell extends DuelSpell {
    constructor(...args) {
        super(...args);
        this.damage = 10;
        this.speed = 15;
        this.isHoming = true;
        this.color = new THREE.Color(0x00ffff);
        this.scale.set(0.5, 0.5, 0.5);
        this.resetVisuals(args[9]);
    }

    initVisuals(fireballGltf) {
        const geo = new THREE.OctahedronGeometry(0.4);
        const mat = new THREE.MeshBasicMaterial({ color: this.color });
        const mesh = new THREE.Mesh(geo, mat);
        this.visualGroup.add(mesh);

        const pCount = 40;
        const pPos = new Float32Array(pCount * 3);
        const particlesGeo = new THREE.BufferGeometry();
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({
            color: this.color,
            size: 0.25,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(particlesGeo, particlesMat);
        this.visualGroup.add(this.trail);
        this.trailTime = 0;
    }

    onHit(targetModel) {
        super.onHit(targetModel);
        if (targetModel) {
            targetModel.stunTimer = 1.0;
        }
    }
}

export class HealSpell extends DuelSpell {
    constructor(...args) {
        super(...args);
        this.damage = -20;
        this.speed = 25;
        this.isHoming = true;
        this.color = new THREE.Color(0x00ff66);
        this.scale.set(0.7, 0.7, 0.7);
        this.resetVisuals(args[9]);
    }

    initVisuals(fireballGltf) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: this.color });
        const horiz = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.22), mat);
        const vert = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), mat);
        group.add(horiz);
        group.add(vert);
        this.visualGroup.add(group);

        const pCount = 45;
        const pPos = new Float32Array(pCount * 3);
        const particlesGeo = new THREE.BufferGeometry();
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({
            color: this.color,
            size: 0.2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(particlesGeo, particlesMat);
        this.visualGroup.add(this.trail);
        this.trailTime = 0;
    }
}

export class JailSpell extends DuelSpell {
    constructor(...args) {
        super(...args);
        this.damage = 10;
        this.speed = 14;
        this.isHoming = true;
        this.color = new THREE.Color(0xffaa00);
        this.scale.set(0.6, 0.6, 0.6);
        this.resetVisuals(args[9]);
    }

    initVisuals(fireballGltf) {
        const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8, 1);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        this.visualGroup.add(mesh);

        const pCount = 35;
        const pPos = new Float32Array(pCount * 3);
        const particlesGeo = new THREE.BufferGeometry();
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({
            color: this.color,
            size: 0.22,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.trail = new THREE.Points(particlesGeo, particlesMat);
        this.visualGroup.add(this.trail);
        this.trailTime = 0;
    }

    onHit(targetModel) {
        super.onHit(targetModel);
        if (targetModel) {
            targetModel.isJailed = true;
        }
    }
}

export class SlowZone {
    constructor(player, scene) {
        this.player = player;
        this.scene = scene;
        this.duration = 5.0;
        this.radius = 6.0;
        this.isExpired = false;

        const geo = new THREE.RingGeometry(0.1, this.radius, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.05;
        this.player.mesh.add(this.mesh);
    }

    update(deltaTime, enemyProjectiles) {
        if (this.isExpired) return;

        this.duration -= deltaTime;
        if (this.duration <= 0) {
            this.destroy();
            return;
        }

        const playerPos = new THREE.Vector3();
        this.player.mesh.getWorldPosition(playerPos);

        enemyProjectiles.forEach(p => {
            if (p.attackerId !== this.player.id && !p.isDestroyed) {
                const dist = p.mesh.position.distanceTo(playerPos);
                if (dist <= this.radius) {
                    p.slowFactor = 0.33;
                }
            }
        });
    }

    destroy() {
        this.isExpired = true;
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
