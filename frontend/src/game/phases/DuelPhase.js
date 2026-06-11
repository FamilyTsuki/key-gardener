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
    /**
     * Creates an instance of DuelPhase.
     * @param {Object} gameEngine - The game engine instance.
     * @param {Object} duelData - Data containing information about the duel and players.
     */
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
        this.isCountdownActive = true;
        this.successfulStrokesCount = 0;
        this.baseWpm = this.localData.wpm || 30;
        this.duelStartTime = null;
        this.wpmUpdateTimer = 0;
    }

    /**
     * Initializes the duel phase, loading assets, placing keyboards,
     * creating actors, setting up event listeners, and emitting player ready.
     * @returns {Promise<void>}
     */
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

        this.buildUI();

        SocketService.on('spell_spawned', this.onSpellSpawned.bind(this));
        SocketService.on('spell_blocked', this.onSpellBlocked.bind(this));
        SocketService.on('hp_update', this.onHpUpdate.bind(this));
        SocketService.on('duel_ended', this.onDuelEnded.bind(this));
        SocketService.on('opponent_move', this.onOpponentMove.bind(this));
        SocketService.on('start_countdown', this.onStartCountdown.bind(this));

        const baseLightLen = Math.max(3, Math.floor(this.baseWpm / 15));
        const baseRandomLen = Math.max(4, Math.floor(this.baseWpm / 12));
        const baseHeavyLen = Math.max(5, Math.floor(this.baseWpm / 10));

        this.availableSpells = [
            { type: 'heavy', wordLength: baseHeavyLen, word: this.getRandomWord(baseHeavyLen), cooldownDuration: 10000, cooldownRemaining: 0 },
            { type: 'light', wordLength: baseLightLen, word: this.getRandomWord(baseLightLen), cooldownDuration: 1000, cooldownRemaining: 0 },
            { type: 'random', wordLength: baseRandomLen, word: this.getRandomWord(baseRandomLen), cooldownDuration: 6000, cooldownRemaining: 0 }
        ];
        this.updateSpellsUI();

        SocketService.emit('player_ready');
    }

    /**
     * Handles the opponent movement event from socket data, translating tile keys to positions.
     * @param {Object} data - Payload containing the target keyboard tile key.
     * @returns {void}
     */
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

    /**
     * Animates and handles the starting countdown for the duel.
     * Prevents inputs while active and records the start time on completion.
     * @returns {void}
     */
    onStartCountdown() {
        const countdownOverlay = el("div", { id: "duel-countdown-overlay", className: "duel-countdown-overlay" });
        const countdownText = el("div", { className: "duel-countdown-text" });
        countdownOverlay.appendChild(countdownText);
        document.body.appendChild(countdownOverlay);

        const steps = ["3", "2", "1", LanguageManager.t("duel.go") || "GO !"];
        const timeline = gsap.timeline({
            onComplete: () => {
                countdownOverlay.remove();
                this.isCountdownActive = false;
                this.duelStartTime = Date.now();
            }
        });

        timeline.fromTo(countdownOverlay,
            { opacity: 0 },
            { opacity: 1, duration: 0.3 }
        );

        steps.forEach((text) => {
            timeline.call(() => {
                countdownText.textContent = text;
            });
            timeline.fromTo(countdownText, 
                { scale: 0.5, opacity: 0 },
                { scale: 1.2, opacity: 1, duration: 0.4, ease: "back.out(2)" }
            );
            timeline.to(countdownText, 
                { scale: 1.5, opacity: 0, duration: 0.4, delay: 0.2, ease: "power2.in" }
            );
        });

        timeline.to(countdownOverlay, {
            opacity: 0,
            duration: 0.3
        }, "-=0.3");
    }

    /**
     * Gets a random word from the locale dict that fits the requested length.
     * @param {number} length - Desired word length.
     * @returns {string} The randomly picked word.
     */
    getRandomWord(length) {
        const words = LanguageManager.t("game.jumpWords") || ["fire", "ice", "bolt", "storm", "blast", "strike", "burn"];
        const filtered = words.filter(w => w.length === length || Math.abs(w.length - length) <= 1);
        if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
        return words[Math.floor(Math.random() * words.length)];
    }

    /**
     * Computes the current real-time WPM of the local player during active gameplay.
     * @returns {number} The calculated WPM bounded between 15 and 120.
     */
    getCurrentWpm() {
        if (!this.duelStartTime) return this.baseWpm;
        const now = Date.now();
        const durationMinutes = (now - this.duelStartTime) / 60000;
        if (durationMinutes < 0.05) {
            return this.baseWpm;
        }
        const wpm = (this.successfulStrokesCount / 5) / durationMinutes;
        return Math.max(15, Math.min(120, Math.round(wpm)));
    }

    /**
     * Builds and appends the HUD, player panel fills, and DOM containers for spell and defense lists.
     * @returns {void}
     */
    buildUI() {
        const hud = document.getElementById("player-hud");
        if (hud) hud.classList.remove("hidden");

        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");

        this.hpUI = el("div", { className: "duel-hp-ui" },
            el("div", { className: "duel-hud-panel" },
                el("span", { className: "duel-hud-name duel-hud-name-local" }, this.localData.username),
                el("div", { className: "duel-hud-bar" },
                    el("div", { id: "hp-local-fill", className: "duel-hud-fill duel-hud-fill-local" })
                ),
                el("span", { className: "duel-hud-hp" },
                    el("span", { id: "hp-local" }, this.localData.hp),
                    " HP"
                )
            ),
            el("div", { className: "duel-hud-panel duel-hud-panel-right" },
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

        this.defensesUI = el("div", { className: "duel-defenses-ui" });
        document.body.appendChild(this.defensesUI);

        const announcer = el("div", { id: "duel-announcer-container" });
        document.body.appendChild(announcer);
    }

    /**
     * Updates the spells list DOM overlay showing cooldowns and current typing state characters.
     * @returns {void}
     */
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

    /**
     * Updates the incoming defenses list DOM showing required shielding words and character match feedback.
     * @returns {void}
     */
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

    /**
     * Activates the jail state locally, generating an escape word, displaying UI, and rendering the 3D cage.
     * @returns {void}
     */
    activateJailLocal() {
        if (this.localPlayer.isJailed) return;
        this.localPlayer.isJailed = true;
        this.currentTypedJail = "";
        this.jailEscapeWord = this.getRandomWord(5);
        
        this.jailUI = el("div", { id: "jail-ui", className: "jail-ui" },
            el("div", { className: "status-overlay-jail" }),
            el("div", { className: "status-message-box jail-message" },
                el("span", { className: "status-icon" }, "🔒"),
                el("div", { id: "jail-content-box" })
            )
        );
        document.body.appendChild(this.jailUI);
        this.updateJailUI();

        const cageGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8, 1, true);
        const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true });
        this.localJailCage = new THREE.Mesh(cageGeo, cageMat);
        this.localJailCage.position.y = 1.25;
        this.localPlayer.mesh.add(this.localJailCage);
    }

    /**
     * Updates the jail UI box with the correct escape word characters typed so far.
     * @returns {void}
     */
    updateJailUI() {
        if (!this.jailUI) return;
        const contentBox = document.getElementById("jail-content-box");
        if (!contentBox) return;
        clear(contentBox);

        contentBox.appendChild(el("span", { className: "status-title" }, LanguageManager.t("duel.jailedTitle") || "EMPRISONNÉ !"));
        contentBox.appendChild(el("br"));

        const subtitle = el("span", { className: "jail-subtitle" }, LanguageManager.t("duel.jailedSubtitle") || "Tapez le mot ci-dessous pour briser la cage et vous échapper :");
        contentBox.appendChild(subtitle);
        contentBox.appendChild(el("br"));
        contentBox.appendChild(el("br"));

        const wordSpan = el("span", { className: "jail-word" });
        for (let i = 0; i < this.jailEscapeWord.length; i++) {
            if (i < this.currentTypedJail.length) {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-match" }, this.jailEscapeWord[i]));
            } else {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-normal" }, this.jailEscapeWord[i]));
            }
        }
        contentBox.appendChild(wordSpan);
    }

    /**
     * Creates and attaches a 3D rotating electrical ring visual to the given player model.
     * @param {Object} playerModel - The player model instance.
     * @returns {THREE.Group} The 3D visual group.
     */
    createStunVisual(playerModel) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
        
        const ringGeo1 = new THREE.TorusGeometry(0.8, 0.04, 8, 24);
        const ring1 = new THREE.Mesh(ringGeo1, mat);
        ring1.rotation.x = Math.PI / 2;
        group.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(0.8, 0.04, 8, 24);
        const ring2 = new THREE.Mesh(ringGeo2, mat);
        ring2.rotation.y = Math.PI / 4;
        group.add(ring2);

        group.position.y = 1.0;
        playerModel.mesh.add(group);
        return group;
    }

    /**
     * Updates the stun UI warning box and vignette overlay based on the local player's stun timer.
     * @returns {void}
     */
    updateStunUI() {
        if (this.localPlayer && this.localPlayer.stunTimer > 0) {
            if (!this.stunUI) {
                this.stunUI = el("div", { id: "stun-ui", className: "stun-ui" },
                    el("div", { className: "status-overlay-stun" }),
                    el("div", { className: "status-message-box stun-message" },
                        el("span", { className: "status-icon" }, "⚡"),
                        el("span", { className: "status-text" }, LanguageManager.t("duel.stunnedMessage") || "PARALYSÉ ! Vous avez été foudroyé, impossible d'agir !")
                    )
                );
                document.body.appendChild(this.stunUI);
            }
        } else {
            if (this.stunUI) {
                this.stunUI.remove();
                this.stunUI = null;
            }
        }
    }

    /**
     * Frees the local player from jail, removing the UI and the 3D cage mesh.
     * @returns {void}
     */
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

    /**
     * Handles keyboard events for local player movements, spell casts, defenses, and jail escapes.
     * @param {KeyboardEvent} event - The keyboard event.
     * @returns {void}
     */
    handleKeyDown(event) {
        if (this.isDuelOver || this.isCountdownActive) return;

        if (this.localPlayer && (this.localPlayer.stunTimer > 0 || this.localPlayer.isJailed)) {
            if (this.localPlayer.isJailed) {
                if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
                    const char = event.key.toLowerCase();
                    if (this.jailEscapeWord.toLowerCase().startsWith(this.currentTypedJail + char)) {
                        this.successfulStrokesCount++;
                    }
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
                if (incoming.some(p => p.defenseWord.toLowerCase().startsWith(this.currentTypedDefense + char))) {
                    this.successfulStrokesCount++;
                }
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

            if (this.availableSpells.some(s => s.cooldownRemaining === 0 && s.word.toLowerCase().startsWith(this.currentTypedSpell + char))) {
                this.successfulStrokesCount++;
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
                
                const currentWpm = this.getCurrentWpm();
                let newLength = 5;
                if (completedSpell.type === 'light') {
                    newLength = Math.max(3, Math.floor(currentWpm / 15));
                } else if (completedSpell.type === 'heavy') {
                    newLength = Math.max(5, Math.floor(currentWpm / 10));
                } else if (completedSpell.type === 'random') {
                    newLength = Math.max(4, Math.floor(currentWpm / 12));
                }

                completedSpell.wordLength = newLength;
                completedSpell.word = this.getRandomWord(newLength);
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
           /**
     * Handles the spawn of a spell projectile in the 3D scene.
     * @param {Object} data - Payload containing spell metadata (attacker, target, speed, etc.).
     * @returns {void}
     */
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

    /**
     * Handles the successful block of a spell projectile.
     * @param {Object} data - Payload containing the blocked spell ID.
     * @returns {void}
     */
    onSpellBlocked(data) {
        const { spellId } = data;
        const index = this.projectiles.findIndex(p => p.id === spellId);
        if (index !== -1) {
            this.projectiles[index].destroy();
            this.projectiles.splice(index, 1);
            this.updateDefensesUI();
        }
    }

    /**
     * Triggers a hit animation (camera shake and model flashing red).
     * @param {Object} model - The actor model instance that took damage.
     * @param {boolean} isLocal - True if the hit actor is the local player.
     * @returns {void}
     */
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

    /**
     * Synchronizes and updates the health bars and values of both players.
     * @param {Object} data - Payload containing new HP values for player 1 and player 2.
     * @returns {void}
     */
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
        


        if (localHp < this.localData.hp) {
            this.localData.hp = localHp;
            this.playHitAnimation(this.localPlayer, true);
        }
        if (remoteHp < this.remoteData.hp) {
            this.remoteData.hp = remoteHp;
            this.playHitAnimation(this.remotePlayer, false);
        }
    }

    /**
     * Handles the termination of the duel, displaying victory/defeat messages and redirecting to the social view.
     * @param {Object} data - Payload containing the winner ID or disconnect reason.
     * @returns {void}
     */
    onDuelEnded(data) {
        this.isDuelOver = true;
        let won = false;
        if (data.reason === "disconnect") {
            won = data.loserId != this.localData.id;
        } else {
            won = data.winnerId == this.localData.id;
        }
        FlashMessageManager.show(
            won ? LanguageManager.t("duel.victory") : LanguageManager.t("duel.defeat"),
            won ? "success" : "error"
        );
        setTimeout(() => {
            window.location.hash = "#social";
        }, 3000);
    }

    /**
     * Appends a colored spell announcement text overlay onto the HUD screen.
     * @param {string} attackerId - The socket user ID of the attacker.
     * @param {string} spellType - Type of the cast spell (light, heavy, stun, slow, etc.).
     * @returns {void}
     */
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

    /**
     * Updates actors, camera positions, spell cooldowns, dynamic WPM updates, and projectiles.
     * @param {number} deltaTime - Time elapsed since last frame in seconds.
     * @returns {void}
     */
    update(deltaTime) {
        if (this.decor) {
            this.decor.update(deltaTime);
        }

        this.gameEngine.camera.position.set(0, 11, 13.0);
        this.gameEngine.camera.lookAt(0, 0, 6.5);



        this.availableSpells.forEach(s => {
            if (s.cooldownRemaining > 0) {
                s.cooldownRemaining = Math.max(0, s.cooldownRemaining - deltaTime * 1000);
            }
        });
        this.updateSpellsUI();

        if (this.isDuelOver) return;

        this.wpmUpdateTimer += deltaTime;
        if (this.wpmUpdateTimer >= 2.0) {
            this.wpmUpdateTimer = 0;
            SocketService.emit('update_wpm', { wpm: this.getCurrentWpm() });
        }

        if (this.localPlayer && this.localPlayer.stunTimer > 0) {
            this.localPlayer.stunTimer = Math.max(0, this.localPlayer.stunTimer - deltaTime);
            if (!this.localStunVisual) {
                this.localStunVisual = this.createStunVisual(this.localPlayer);
            }
            this.localStunVisual.rotation.x += deltaTime * 10;
            this.localStunVisual.rotation.y += deltaTime * 15;
            const pulse = 0.9 + Math.sin(performance.now() * 0.03) * 0.15;
            this.localStunVisual.scale.set(pulse, pulse, pulse);
        } else {
            if (this.localStunVisual) {
                if (this.localStunVisual.parent) {
                    this.localStunVisual.parent.remove(this.localStunVisual);
                }
                this.localStunVisual = null;
            }
        }
        this.updateStunUI();

        if (this.remotePlayer && this.remotePlayer.stunTimer > 0) {
            this.remotePlayer.stunTimer = Math.max(0, this.remotePlayer.stunTimer - deltaTime);
            if (!this.remoteStunVisual) {
                this.remoteStunVisual = this.createStunVisual(this.remotePlayer);
            }
            this.remoteStunVisual.rotation.x += deltaTime * 10;
            this.remoteStunVisual.rotation.y += deltaTime * 15;
            const pulse = 0.9 + Math.sin(performance.now() * 0.03) * 0.15;
            this.remoteStunVisual.scale.set(pulse, pulse, pulse);
        } else {
            if (this.remoteStunVisual) {
                if (this.remoteStunVisual.parent) {
                    this.remoteStunVisual.parent.remove(this.remoteStunVisual);
                }
                this.remoteStunVisual = null;
            }
        }

        if (this.localPlayer) {
            this.localPlayer.update(deltaTime);
        }
        if (this.remotePlayer) {
            this.remotePlayer.update(deltaTime);
        }

        if (this.localJailCage) {
            this.localJailCage.rotation.y += deltaTime * 2;
            const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.08;
            this.localJailCage.scale.set(pulse, 1.0, pulse);
        }

        if (this.remotePlayer && this.remotePlayer.isJailed) {
            if (!this.remoteJailCage) {
                const cageGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8, 1, true);
                const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true });
                this.remoteJailCage = new THREE.Mesh(cageGeo, cageMat);
                this.remoteJailCage.position.y = 1.25;
                this.remotePlayer.mesh.add(this.remoteJailCage);
            }
            this.remoteJailCage.rotation.y += deltaTime * 2;
            const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.08;
            this.remoteJailCage.scale.set(pulse, 1.0, pulse);
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
                                spellId: p.id 
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

    /**
     * Updates key tiles highlight state and rendering details on every frame.
     * @returns {void}
     */
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

    /**
     * Cleans up scene groups, HUD elements, status UIs, slow zones, and event listeners.
     * @returns {void}
     */
    cleanup() {
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
        if (this.stunUI) {
            this.stunUI.remove();
            this.stunUI = null;
        }
        if (this.localJailCage && this.localJailCage.parent) {
            this.localJailCage.parent.remove(this.localJailCage);
            this.localJailCage = null;
        }
        if (this.remoteJailCage && this.remoteJailCage.parent) {
            this.remoteJailCage.parent.remove(this.remoteJailCage);
            this.remoteJailCage = null;
        }
        if (this.localStunVisual && this.localStunVisual.parent) {
            this.localStunVisual.parent.remove(this.localStunVisual);
            this.localStunVisual = null;
        }
        if (this.remoteStunVisual && this.remoteStunVisual.parent) {
            this.remoteStunVisual.parent.remove(this.remoteStunVisual);
            this.remoteStunVisual = null;
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
        SocketService.off('start_countdown', this.onStartCountdown.bind(this));
    }
}
