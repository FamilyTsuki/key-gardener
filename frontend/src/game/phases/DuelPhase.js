import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import SocketService from "../../core/services/SocketService.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { DuelDecorBuilder } from "../utilities/DuelDecorBuilder.js";
import Keyboard from "../managers/Keyboard.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";
import Player from "../models/actors/Player.js";
import { gsap } from "/node_modules/gsap/index.js";
import { LightSpell, HeavySpell, StunSpell, HealSpell, JailSpell, SlowZone } from "../models/spells/DuelSpell.js";
import { el, clear } from "../../core/utils/DOMBuilder.js";

const loader = new GLTFLoader();

export class DuelPhase extends GamePhase {
    constructor(gameEngine, duelData) {
        super(gameEngine);
        this.duelData = duelData;
        this.localPlayer = null;
        this.remotePlayer = null;
        this.projectiles = [];
        this.spellsUI = null;
        this.defensesUI = null;
        this.isDuelOver = false;
        const localId = localStorage.getItem("userId");
        const currentUsername = (localStorage.getItem("username") || "Player").toLowerCase();
        let isLocalPlayer1 = false;
        if (localId) {
            isLocalPlayer1 = (duelData.player1.id == localId);
        } else {
            isLocalPlayer1 = (duelData.player1.username.toLowerCase() === currentUsername);
        }
        if (isLocalPlayer1) {
            this.localData = duelData.player1;
            this.remoteData = duelData.player2;
        } else {
            this.localData = duelData.player2;
            this.remoteData = duelData.player1;
        }

        this.currentTypedSpell = "";
        this.currentTypedDefense = "";
        this.currentTypedJail = "";
        this.jailEscapeWord = "";
        this.slowZones = [];
    }

    async init() {
        const scene = this.gameEngine.scene;

        this.decor = DuelDecorBuilder.buildArena(scene);

        this.gameEngine.camera.position.set(0, 11, 13.0);
        this.gameEngine.camera.lookAt(0, 0, 6.5);

        this.localKeyboardPivot = new THREE.Group();
        this.localKeyboardPivot.position.set(0, 0, 8);
        scene.add(this.localKeyboardPivot);

        this.localKeyboardGroup = new THREE.Group();
        this.localKeyboardGroup.position.set(-16, 0, -3.2);
        this.localKeyboardPivot.add(this.localKeyboardGroup);

        this.localKeyboard = Keyboard.init(this.localKeyboardGroup, KEYBOARD_LAYOUT, "styx");

        this.remoteKeyboardPivot = new THREE.Group();
        this.remoteKeyboardPivot.position.set(0, 0, -8);
        this.remoteKeyboardPivot.rotation.y = Math.PI;
        scene.add(this.remoteKeyboardPivot);

        this.remoteKeyboardGroup = new THREE.Group();
        this.remoteKeyboardGroup.position.set(-16, 0, -3.2);
        this.remoteKeyboardPivot.add(this.remoteKeyboardGroup);

        this.remoteKeyboard = Keyboard.init(this.remoteKeyboardGroup, KEYBOARD_LAYOUT, "styx");

        this.fireballGltf = await loader.loadAsync("/asset/game_assets/models/fireball.glb");
        
        this.localPlayer = new Player(
            this.localData.username,
            Infinity,
            100,
            { x: 0, y: 0, z: 0.225 },
            { width: 0.4, height: 0.4 },
            this.localKeyboardGroup,
            this.fireballGltf.scene,
            null,
            null,
            null
        );
        this.localPlayer.offsetY = 0.225;

        this.remotePlayer = new Player(
            this.remoteData.username,
            Infinity,
            100,
            { x: 0, y: 0, z: 0.225 },
            { width: 0.4, height: 0.4 },
            this.remoteKeyboardGroup,
            this.fireballGltf.scene,
            null,
            null,
            null
        );
        this.remotePlayer.offsetY = 0.225;

        if (this.localPlayer.loadPromise) await this.localPlayer.loadPromise;
        if (this.remotePlayer.loadPromise) await this.remotePlayer.loadPromise;

        this.localHealthBar = this.createFloatingHealthBar(this.localPlayer, 0x00ffff);
        this.remoteHealthBar = this.createFloatingHealthBar(this.remotePlayer, 0xff00ff);

        this.buildUI();

        SocketService.on('spell_spawned', this.onSpellSpawned.bind(this));
        SocketService.on('spell_blocked', this.onSpellBlocked.bind(this));
        SocketService.on('hp_update', this.onHpUpdate.bind(this));
        SocketService.on('duel_ended', this.onDuelEnded.bind(this));
        SocketService.on('opponent_move', this.onOpponentMove.bind(this));

        this.availableSpells = [
            { type: 'heavy', wordLength: 6, word: this.getRandomWord(6), cooldownDuration: 10000, cooldownRemaining: 0 },
            { type: 'light', wordLength: 4, word: this.getRandomWord(4), cooldownDuration: 1000, cooldownRemaining: 0 },
            { type: 'random', wordLength: 5, word: this.getRandomWord(5), cooldownDuration: 6000, cooldownRemaining: 0 }
        ];
        this.updateSpellsUI();
    }

    onOpponentMove(data) {
        if (this.remotePlayer) {
            this.remotePlayer.isJailed = false;
        }
        const { key } = data;
        const keyName = key.toUpperCase();
        const keyObj = this.remoteKeyboard.find(keyName);
        if (keyObj && this.remotePlayer) {
            this.remotePlayer.move({
                x: keyObj.rawPosition.x,
                y: keyObj.rawPosition.y
            });
        }
    }

    getRandomWord(length) {
        const words = LanguageManager.t("game.jumpWords") || ["fire", "ice", "bolt", "storm", "blast", "strike", "burn"];
        const filtered = words.filter(w => w.length === length || Math.abs(w.length - length) <= 1);
        if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
        return words[Math.floor(Math.random() * words.length)];
    }

    buildUI() {
        const hud = document.getElementById("player-hud");
        if (hud) hud.classList.remove("hidden");

        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");

        this.hpUI = el("div", { className: "duel-hp-ui" },
            el("div", { className: "duel-hud-panel glass-panel" },
                el("span", { className: "duel-hud-name duel-hud-name-local" }, this.localData.username),
                el("div", { className: "duel-hud-bar" },
                    el("div", { id: "hp-local-fill", className: "duel-hud-fill duel-hud-fill-local" })
                ),
                el("span", { className: "duel-hud-hp" },
                    el("span", { id: "hp-local" }, this.localData.hp),
                    " HP"
                )
            ),
            el("div", { className: "duel-hud-panel duel-hud-panel-right glass-panel" },
                el("span", { className: "duel-hud-name duel-hud-name-remote" }, this.remoteData.username),
                el("div", { className: "duel-hud-bar" },
                    el("div", { id: "hp-remote-fill", className: "duel-hud-fill duel-hud-fill-remote" })
                ),
                el("span", { className: "duel-hud-hp" },
                    el("span", { id: "hp-remote" }, this.remoteData.hp),
                    " HP"
                )
            )
        );
        document.body.appendChild(this.hpUI);

        this.spellsUI = document.getElementById("spell-list-container");
        if (this.spellsUI) {
            this.spellsUI.className = "duel-spells-ui";
            this.spellsUI.innerHTML = "";
        }

        this.defensesUI = el("div", { className: "duel-defenses-ui glass-panel p-20" });
        document.body.appendChild(this.defensesUI);

        const announcer = el("div", { id: "duel-announcer-container" });
        document.body.appendChild(announcer);
    }

    updateSpellsUI() {
        if (!this.spellsUI) return;
        clear(this.spellsUI);

        const h4 = el("h4", { className: "duel-spells-title" }, LanguageManager.t("duel.spellsTitle"));
        const ul = el("ul", { className: "duel-spells-list" });

        this.availableSpells.forEach(s => {
            const li = el("li", { className: "duel-spell-item" });
            
            let icon = "⚡";
            let label = LanguageManager.t("duel.labelLight");
            if (s.type === 'heavy') {
                icon = "🔥";
                label = LanguageManager.t("duel.labelHeavy");
            }
            if (s.type === 'random') {
                icon = "🎲";
                label = LanguageManager.t("duel.labelRandom");
            }

            if (s.cooldownRemaining > 0) {
                const secs = (s.cooldownRemaining / 1000).toFixed(1);
                li.appendChild(el("span", { className: "duel-spell-cooldown" }, 
                    `${icon} [${label}] (${secs}s)`
                ));
            } else {
                li.appendChild(document.createTextNode(`${icon} [${label}] `));
                let match = true;
                for (let i = 0; i < s.word.length; i++) {
                    if (i < this.currentTypedSpell.length && match) {
                        if (s.word[i].toLowerCase() === this.currentTypedSpell[i].toLowerCase()) {
                            li.appendChild(el("span", { className: "duel-spell-char-match" }, s.word[i]));
                        } else {
                            li.appendChild(el("span", { className: "duel-spell-char-error" }, s.word[i]));
                            match = false;
                        }
                    } else {
                        li.appendChild(el("span", { className: "duel-spell-char-normal" }, s.word[i]));
                    }
                }
            }
            ul.appendChild(li);
        });

        this.spellsUI.appendChild(h4);
        this.spellsUI.appendChild(ul);
    }

    updateDefensesUI() {
        if (!this.defensesUI) return;
        clear(this.defensesUI);

        const h3 = el("h3", { className: "duel-defenses-title" }, LanguageManager.t("duel.defensesTitle"));
        this.defensesUI.appendChild(h3);

        const incoming = this.projectiles.filter(p => p.targetId == this.localData.id);
        
        if (incoming.length === 0) {
            const p = el("p", { className: "duel-no-incoming" }, LanguageManager.t("duel.noProjectiles"));
            this.defensesUI.appendChild(p);
            return;
        }

        incoming.forEach(p => {
            const div = el("div", { className: "duel-defense-block" });
            div.appendChild(document.createTextNode("🛡️ "));

            let match = true;
            for (let i = 0; i < p.defenseWord.length; i++) {
                if (i < this.currentTypedDefense.length && match) {
                    if (p.defenseWord[i].toLowerCase() === this.currentTypedDefense[i].toLowerCase()) {
                        div.appendChild(el("span", { className: "duel-spell-char-match" }, p.defenseWord[i]));
                    } else {
                        div.appendChild(el("span", { className: "duel-spell-char-error" }, p.defenseWord[i]));
                        match = false;
                    }
                } else {
                    div.appendChild(el("span", { className: "duel-spell-char-normal" }, p.defenseWord[i]));
                }
            }
            this.defensesUI.appendChild(div);
        });
    }

    activateJailLocal() {
        if (this.localPlayer.isJailed) return;
        this.localPlayer.isJailed = true;
        this.currentTypedJail = "";
        this.jailEscapeWord = this.getRandomWord(5);
        
        this.jailUI = el("div", { id: "jail-ui", className: "jail-ui" });
        document.body.appendChild(this.jailUI);
        this.updateJailUI();

        const cageGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8, 1, true);
        const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true });
        this.localJailCage = new THREE.Mesh(cageGeo, cageMat);
        this.localJailCage.position.y = 1.25;
        this.localPlayer.mesh.add(this.localJailCage);
    }

    updateJailUI() {
        if (!this.jailUI) return;
        clear(this.jailUI);

        this.jailUI.appendChild(document.createTextNode(LanguageManager.t("duel.jailedTitle")));
        this.jailUI.appendChild(el("br"));

        const subtitle = el("span", { className: "jail-subtitle" }, LanguageManager.t("duel.jailedSubtitle"));
        this.jailUI.appendChild(subtitle);
        this.jailUI.appendChild(el("br"));
        this.jailUI.appendChild(el("br"));

        const wordSpan = el("span", { className: "jail-word" });
        for (let i = 0; i < this.jailEscapeWord.length; i++) {
            if (i < this.currentTypedJail.length) {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-match" }, this.jailEscapeWord[i]));
            } else {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-normal" }, this.jailEscapeWord[i]));
            }
        }
        this.jailUI.appendChild(wordSpan);
    }

    escapeJail() {
        this.localPlayer.isJailed = false;
        if (this.jailUI) {
            this.jailUI.remove();
            this.jailUI = null;
        }
        if (this.localJailCage && this.localJailCage.parent) {
            this.localJailCage.parent.remove(this.localJailCage);
            this.localJailCage = null;
        }
    }

    handleKeyDown(event) {
        if (this.isDuelOver) return;

        if (this.localPlayer && (this.localPlayer.stunTimer > 0 || this.localPlayer.isJailed)) {
            if (this.localPlayer.isJailed) {
                if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
                    const char = event.key.toLowerCase();
                    this.currentTypedJail += char;
                    this.updateJailUI();
                    
                    if (this.currentTypedJail.toLowerCase() === this.jailEscapeWord.toLowerCase()) {
                        this.escapeJail();
                    } else {
                        if (!this.jailEscapeWord.toLowerCase().startsWith(this.currentTypedJail.toLowerCase())) {
                            setTimeout(() => {
                                this.currentTypedJail = "";
                                this.updateJailUI();
                            }, 200);
                        }
                    }
                }
            }
            return;
        }

        if (event.key === "Backspace") {
            if (this.currentTypedDefense.length > 0) {
                this.currentTypedDefense = this.currentTypedDefense.slice(0, -1);
                this.updateDefensesUI();
                return;
            } else if (this.currentTypedSpell.length > 0) {
                this.currentTypedSpell = this.currentTypedSpell.slice(0, -1);
                this.updateSpellsUI();
                return;
            }
        }

        if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
            const char = event.key.toLowerCase();
            const keyName = event.key.toUpperCase();

            const keyObj = this.localKeyboard.find(keyName);
            if (keyObj && this.localPlayer) {
                SocketService.emit('player_move', { key: keyName });
                this.localPlayer.move({
                    x: keyObj.rawPosition.x,
                    y: keyObj.rawPosition.y
                });
            }
            
            const incoming = this.projectiles.filter(p => p.targetId == this.localData.id);
            if (incoming.length > 0) {
                this.currentTypedDefense += char;
                this.updateDefensesUI();
                
                const targetDef = incoming.find(p => p.defenseWord.toLowerCase() === this.currentTypedDefense.toLowerCase());
                if (targetDef) {
                    SocketService.emit('block_spell', { spellId: targetDef.id });
                    this.currentTypedDefense = "";
                    this.updateDefensesUI();
                } else {
                    let isValidPrefix = incoming.some(p => p.defenseWord.toLowerCase().startsWith(this.currentTypedDefense.toLowerCase()));
                    if (!isValidPrefix) {
                        setTimeout(() => {
                            this.currentTypedDefense = "";
                            this.updateDefensesUI();
                        }, 200);
                    }
                }
                return;
            }

            this.currentTypedSpell += char;
            this.updateSpellsUI();

            const completedSpell = this.availableSpells.find(s => s.cooldownRemaining === 0 && s.word.toLowerCase() === this.currentTypedSpell.toLowerCase());
            if (completedSpell) {
                let finalType = completedSpell.type;
                if (finalType === 'random') {
                    const pool = ['stun', 'slow', 'heal', 'jail'];
                    finalType = pool[Math.floor(Math.random() * pool.length)];
                }
                SocketService.emit('cast_spell', { spellType: finalType });
                completedSpell.cooldownRemaining = completedSpell.cooldownDuration;
                this.currentTypedSpell = "";
                this.updateSpellsUI();
            } else {
                let isValidPrefix = this.availableSpells.some(s => s.cooldownRemaining === 0 && s.word.toLowerCase().startsWith(this.currentTypedSpell.toLowerCase()));
                if (!isValidPrefix) {
                    setTimeout(() => {
                        this.currentTypedSpell = "";
                        this.updateSpellsUI();
                    }, 200);
                }
            }
        }
    }

    onSpellSpawned(data) {
        const { spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier } = data;
        
        const isLocalAttacker = attackerId == this.localData.id;
        const attackerModel = isLocalAttacker ? this.localPlayer : this.remotePlayer;
        const targetModel = targetId == this.localData.id ? this.localPlayer : this.remotePlayer;
        
        const startPos = new THREE.Vector3();
        if (attackerModel) {
            attackerModel.mesh.getWorldPosition(startPos);
        } else {
            startPos.copy(isLocalAttacker ? new THREE.Vector3(0, 0.2, 6) : new THREE.Vector3(0, 0.2, -6));
        }
        startPos.y += 1.0;

        const targetPos = new THREE.Vector3();
        if (targetModel) {
            targetModel.mesh.getWorldPosition(targetPos);
        } else {
            targetPos.copy(isLocalAttacker ? new THREE.Vector3(0, 0.2, -6) : new THREE.Vector3(0, 0.2, 6));
        }
        targetPos.y += 1.0;

        const defenseWord = this.getRandomWord(requiredLength);

        this.announceSpell(attackerId, spellType);

        if (spellType === 'slow') {
            if (attackerModel) {
                const slowZone = new SlowZone(attackerModel, this.gameEngine.scene);
                this.slowZones.push(slowZone);
            }
            return;
        }

        let projectile;
        const scene = this.gameEngine.scene;

        if (spellType === 'light') {
            projectile = new LightSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, this.fireballGltf, scene);
        } else if (spellType === 'heavy') {
            projectile = new HeavySpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, this.fireballGltf, scene);
        } else if (spellType === 'stun') {
            projectile = new StunSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, this.fireballGltf, scene);
        } else if (spellType === 'heal') {
            const healStart = startPos.clone();
            healStart.y += 4.0;
            projectile = new HealSpell(spellId, attackerId, attackerId, spellType, requiredLength, speedMultiplier, defenseWord, healStart, startPos, this.fireballGltf, scene);
        } else if (spellType === 'jail') {
            projectile = new JailSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, this.fireballGltf, scene);
        } else {
            projectile = new DuelSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, this.fireballGltf, scene);
        }

        this.projectiles.push(projectile);

        if (targetId == this.localData.id) {
            this.updateDefensesUI();
        }
    }

    onSpellBlocked(data) {
        const { spellId } = data;
        const index = this.projectiles.findIndex(p => p.id === spellId);
        if (index !== -1) {
            this.projectiles[index].destroy();
            this.projectiles.splice(index, 1);
            this.updateDefensesUI();
        }
    }

    playHitAnimation(model, isLocal) {
        if (!model) return;
        
        if (isLocal && window.startShake) {
            window.startShake(1.5);
        }

        model.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                const oldColor = child.material.color.clone();
                child.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (child.material) child.material.color.copy(oldColor);
                }, 200);
            }
        });
    }

    onHpUpdate(data) {
        let localHp, remoteHp;
        if (this.duelData.player1.id == this.localData.id) {
            localHp = data.player1Hp;
            remoteHp = data.player2Hp;
        } else {
            localHp = data.player2Hp;
            remoteHp = data.player1Hp;
        }
        
        const localEl = document.getElementById('hp-local');
        const remoteEl = document.getElementById('hp-remote');
        if (localEl) localEl.textContent = localHp;
        if (remoteEl) remoteEl.textContent = remoteHp;
        
        const localFill = document.getElementById('hp-local-fill');
        const remoteFill = document.getElementById('hp-remote-fill');
        if (localFill) localFill.style.width = `${Math.max(0, localHp)}%`;
        if (remoteFill) remoteFill.style.width = `${Math.max(0, remoteHp)}%`;
        
        if (this.localHealthBar) {
            const ratio = Math.max(0, localHp / 100);
            this.localHealthBar.fg.scale.x = ratio;
            this.localHealthBar.fg.position.x = -0.75 * (1 - ratio);
        }
        if (this.remoteHealthBar) {
            const ratio = Math.max(0, remoteHp / 100);
            this.remoteHealthBar.fg.scale.x = ratio;
            this.remoteHealthBar.fg.position.x = -0.75 * (1 - ratio);
        }

        if (localHp < this.localData.hp) {
            this.localData.hp = localHp;
            this.playHitAnimation(this.localPlayer, true);
        }
        if (remoteHp < this.remoteData.hp) {
            this.remoteData.hp = remoteHp;
            this.playHitAnimation(this.remotePlayer, false);
        }
    }

    onDuelEnded(data) {
        this.isDuelOver = true;
        const won = data.winnerId == this.localData.id;
        FlashMessageManager.show(
            won ? LanguageManager.t("duel.victory") : LanguageManager.t("duel.defeat"),
            won ? "success" : "error"
        );
        setTimeout(() => {
            window.location.hash = "#social";
        }, 3000);
    }

    createFloatingHealthBar(player, colorHex) {
        const group = new THREE.Group();

        const bgGeo = new THREE.PlaneGeometry(1.6, 0.16);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        group.add(bg);

        const fgGeo = new THREE.PlaneGeometry(1.5, 0.12);
        const fgMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.position.z = 0.01;
        group.add(fg);

        this.gameEngine.scene.add(group);
        return { group, fg, player };
    }

    updateFloatingHealthBar(bar) {
        if (!bar || !bar.player || !bar.player.mesh) return;

        const worldPos = new THREE.Vector3();
        bar.player.mesh.getWorldPosition(worldPos);

        bar.group.position.copy(worldPos);
        bar.group.position.y += 2.5;

        bar.group.quaternion.copy(this.gameEngine.camera.quaternion);
    }

    announceSpell(attackerId, spellType) {
        const isLocal = attackerId == this.localData.id;
        const attackerName = isLocal ? this.localData.username : this.remoteData.username;

        const spellNames = {
            light: LanguageManager.t("duel.spellLight"),
            heavy: LanguageManager.t("duel.spellHeavy"),
            stun: LanguageManager.t("duel.spellStun"),
            heal: LanguageManager.t("duel.spellHeal"),
            jail: LanguageManager.t("duel.spellJail"),
            slow: LanguageManager.t("duel.spellSlow")
        };

        const spellColors = {
            light: "#ffff00",
            heavy: "#ff3333",
            stun: "#00ffff",
            heal: "#00ff66",
            jail: "#ffaa00",
            slow: "#00aaff"
        };

        const name = spellNames[spellType] || LanguageManager.t("duel.spellDefault");
        const color = spellColors[spellType] || "#ffffff";
        const text = `${attackerName} : ${name}`;

        const container = document.getElementById("duel-announcer-container");
        if (!container) return;

        const announcement = el("div", { className: "spell-announcement", style: `color: ${color}` }, text);
        container.appendChild(announcement);

        gsap.fromTo(announcement,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.4 }
        );

        gsap.to(announcement, {
            opacity: 0,
            y: -30,
            duration: 0.5,
            delay: 1.8,
            onComplete: () => announcement.remove()
        });
    }

    update(deltaTime) {
        if (this.decor) {
            this.decor.update(deltaTime);
        }

        this.gameEngine.camera.position.set(0, 11, 13.0);
        this.gameEngine.camera.lookAt(0, 0, 6.5);

        this.updateFloatingHealthBar(this.localHealthBar);
        this.updateFloatingHealthBar(this.remoteHealthBar);

        this.availableSpells.forEach(s => {
            if (s.cooldownRemaining > 0) {
                s.cooldownRemaining = Math.max(0, s.cooldownRemaining - deltaTime * 1000);
            }
        });
        this.updateSpellsUI();

        if (this.isDuelOver) return;

        if (this.localPlayer && this.localPlayer.stunTimer > 0) {
            this.localPlayer.stunTimer = Math.max(0, this.localPlayer.stunTimer - deltaTime);
        }
        if (this.remotePlayer && this.remotePlayer.stunTimer > 0) {
            this.remotePlayer.remoteTimer = Math.max(0, this.remotePlayer.stunTimer - deltaTime);
        }

        if (this.localPlayer) {
            this.localPlayer.update(deltaTime);
        }
        if (this.remotePlayer) {
            this.remotePlayer.update(deltaTime);
        }

        if (this.remotePlayer && this.remotePlayer.isJailed) {
            if (!this.remoteJailCage) {
                const cageGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8, 1, true);
                const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true });
                this.remoteJailCage = new THREE.Mesh(cageGeo, cageMat);
                this.remoteJailCage.position.y = 1.25;
                this.remotePlayer.mesh.add(this.remoteJailCage);
            }
        } else {
            if (this.remoteJailCage) {
                if (this.remoteJailCage.parent) {
                    this.remoteJailCage.parent.remove(this.remoteJailCage);
                }
                this.remoteJailCage = null;
            }
        }

        for (let i = this.slowZones.length - 1; i >= 0; i--) {
            const sz = this.slowZones[i];
            sz.update(deltaTime, this.projectiles);
            if (sz.isExpired) {
                this.slowZones.splice(i, 1);
            }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const targetModel = p.targetId == this.localData.id ? this.localPlayer : this.remotePlayer;
            
            if (targetModel) {
                p.update(deltaTime, targetModel);

                if (p.isDestroyed) {
                    const finalTargetPos = new THREE.Vector3();
                    targetModel.mesh.getWorldPosition(finalTargetPos);
                    finalTargetPos.y += 1.0;
                    
                    if (p.mesh.position.distanceTo(finalTargetPos) < 2.0) {
                        if (p.targetId == this.localData.id) {
                            SocketService.emit('take_damage', { 
                                spellId: p.id, 
                                damage: p.damage 
                            });
                            
                            if (p instanceof JailSpell) {
                                this.activateJailLocal();
                            }
                        }
                    }
                    this.projectiles.splice(i, 1);
                    this.updateDefensesUI();
                }
            } else {
                p.destroy();
                this.projectiles.splice(i, 1);
            }
        }
    }

    draw() {
        if (this.localKeyboard && this.localPlayer) {
            this.localKeyboard.keyboardLayout.forEach((tile) => {
                tile.isPressed = (this.localPlayer.targetPosition.x === tile.rawPosition.x &&
                                  this.localPlayer.targetPosition.y === tile.rawPosition.y);
            });
            this.localKeyboard.update();
        }

        if (this.remoteKeyboard && this.remotePlayer) {
            this.remoteKeyboard.keyboardLayout.forEach((tile) => {
                tile.isPressed = (this.remotePlayer.targetPosition.x === tile.rawPosition.x &&
                                  this.remotePlayer.targetPosition.y === tile.rawPosition.y);
            });
            this.remoteKeyboard.update();
        }
    }

    cleanup() {
        if (this.localHealthBar) {
            this.gameEngine.scene.remove(this.localHealthBar.group);
        }
        if (this.remoteHealthBar) {
            this.gameEngine.scene.remove(this.remoteHealthBar.group);
        }
        const announcerContainer = document.getElementById("duel-announcer-container");
        if (announcerContainer) announcerContainer.remove();

        if (this.spellsUI) {
            this.spellsUI.style.position = "";
            this.spellsUI.style.bottom = "";
            this.spellsUI.style.right = "";
            this.spellsUI.style.top = "";
            this.spellsUI.style.left = "";
            this.spellsUI.classList.add("none");
        }
        if (this.defensesUI) this.defensesUI.remove();
        const hpUI = document.getElementById("duel-hp-ui");
        if (hpUI) hpUI.remove();

        if (this.jailUI) {
            this.jailUI.remove();
            this.jailUI = null;
        }
        if (this.localJailCage && this.localJailCage.parent) {
            this.localJailCage.parent.remove(this.localJailCage);
            this.localJailCage = null;
        }
        if (this.remoteJailCage && this.remoteJailCage.parent) {
            this.remoteJailCage.parent.remove(this.remoteJailCage);
            this.remoteJailCage = null;
        }
        
        this.slowZones.forEach(sz => sz.destroy());
        this.slowZones = [];

        if (this.localKeyboardPivot) {
            this.gameEngine.scene.remove(this.localKeyboardPivot);
        }
        if (this.remoteKeyboardPivot) {
            this.gameEngine.scene.remove(this.remoteKeyboardPivot);
        }
        if (this.localPlayer) {
            this.localPlayer.destroy();
        }
        if (this.remotePlayer) {
            this.remotePlayer.destroy();
        }

        if (this.decor) {
            this.decor.cleanup();
        }
        
        SocketService.off('spell_spawned', this.onSpellSpawned.bind(this));
        SocketService.off('spell_blocked', this.onSpellBlocked.bind(this));
        SocketService.off('hp_update', this.onHpUpdate.bind(this));
        SocketService.off('duel_ended', this.onDuelEnded.bind(this));
        SocketService.off('opponent_move', this.onOpponentMove.bind(this));
    }
}
