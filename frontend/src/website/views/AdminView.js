import * as THREE from "three";
import { SurviveDecorBuilder } from "../../game/utilities/SurviveDecorBuilder.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Keyboard from "../../game/managers/Keyboard.js";
import { KEYBOARD_LAYOUT } from "../../game/utilities/KEYBOARD.js";
import WorldMap from "../../game/managers/WorldMap.js";
import { createWordlLayout } from "../../game/utilities/WORLD_LAYOUT.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from '../../core/utils/LanguageManager.js';
import { applyTriplanarMapping } from '../../game/utilities/TextureUtils.js';
import { el, clear } from '../../core/utils/DOMBuilder.js';
import { VoidCreature } from "../../game/models/actors/VoidCreature.js";
import { createCustomSelect } from "../components/CustomSelect.js";

export class AdminView {
    constructor() {
        this.container = document.createElement("div");
        this.container.classList.add("view-container");
        this.levels = [];
        this.activeLevelNumber = null;
    }

    getCss() {
        return ["/asset/css/admin.css"];
    }

    async init() {
        clear(this.container);
        this.container.appendChild(
            el("div", { className: "admin-dashboard" },
                el("aside", { className: "admin-sidebar" },
                    el("h2", { className: "sidebar-title" }, LanguageManager.t("admin.title")),
                    el("div", { className: "flex-row-gap10 mb-15" },
                        el("button", { className: "btn-secondary btn-sm flex-1", onclick: () => this.exportLevels() }, LanguageManager.t("admin.exportLevels")),
                        el("button", { className: "btn-secondary btn-sm flex-1", onclick: () => this.importLevels() }, LanguageManager.t("admin.importLevels"))
                    ),
                    el("div", { id: "levels-list", className: "levels-list" },
                        el("div", { className: "admin-loading" }, LanguageManager.t("admin.loading"))
                    )
                ),
                el("main", { className: "admin-main" },
                    el("div", { id: "admin-error", className: "admin-error-msg" }),
                    el("div", { id: "level-detail-container" },
                        el("div", { className: "admin-welcome-screen" },
                            el("h3", {}, LanguageManager.t("admin.selectLevelTitle")),
                            el("p", {}, LanguageManager.t("admin.selectLevelDesc"))
                        )
                    )
                )
            )
        );

        await this.loadLevels();
    }

    async loadLevels() {
        try {
            const response = await fetch("/api/levels");
            const data = await response.json();

            if (!data.success) {
                document.getElementById("admin-error").textContent = data.message || LanguageManager.t("admin.errorLoad");
                return;
            }

            this.levels = data.configs;
            this.renderLevels();
        } catch (e) {
            console.error(e);
            document.getElementById("admin-error").textContent = LanguageManager.t("admin.errorServer");
        }
    }

    renderLevels() {
        const listContainer = document.getElementById("levels-list");
        if (!listContainer) return;
        clear(listContainer);

        const maxLevel = this.levels.reduce((max, l) => Math.max(max, l.level_number), 0);
        const newLevel = {
            level_number: maxLevel + 1,
            phase_type: "survive",
            options: { decorType: "styx", duration: 60, spawnInterval: 3, maxEnemies: 20 },
            isNew: true
        };
        const allLevels = [...this.levels, newLevel];

        if (this.activeLevelNumber === null && allLevels.length > 0) {
            this.activeLevelNumber = allLevels[0].level_number;
        }

        allLevels.forEach((level) => {
            const btn = document.createElement("button");
            btn.className = "level-item-btn";
            if (level.level_number === this.activeLevelNumber) {
                btn.classList.add("active");
            }

            const displayName = level.isNew ? LanguageManager.t("admin.addLevel") : `${LanguageManager.t("admin.level")} ${level.level_number}`;
            const phaseLabel = level.isNew ? LanguageManager.t("admin.createNewLevel") : this.getPhaseLabel(level.phase_type);

            btn.appendChild(el("span", { className: "level-btn-number" }, displayName));
            btn.appendChild(el("span", { className: "level-btn-type" }, phaseLabel));

            btn.addEventListener("click", () => {
                this.selectLevel(level, allLevels);
            });

            listContainer.appendChild(btn);
        });

        const activeLevel = allLevels.find(l => l.level_number === this.activeLevelNumber);
        if (activeLevel) {
            this.renderLevelEditor(activeLevel);
        } else {
            const detailContainer = document.getElementById("level-detail-container");
            if (detailContainer) {
                clear(detailContainer);
                detailContainer.appendChild(
                    el("div", { className: "admin-welcome-screen" },
                        el("h3", {}, LanguageManager.t("admin.selectLevelTitle")),
                        el("p", {}, LanguageManager.t("admin.selectLevelDesc"))
                    )
                );
            }
        }
    }

    getPhaseLabel(phaseType) {
        switch (phaseType) {
            case "survive": return LanguageManager.t("admin.survivePhase");
            case "world": return LanguageManager.t("admin.worldPhase");
            case "void": return LanguageManager.t("admin.voidPhase");
            default: return phaseType;
        }
    }

    selectLevel(level, allLevels) {
        this.activeLevelNumber = level.level_number;
        const buttons = document.querySelectorAll(".level-item-btn");
        buttons.forEach((btn, idx) => {
            const lvl = allLevels[idx];
            if (lvl && lvl.level_number === this.activeLevelNumber) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        this.renderLevelEditor(level);
    }

    renderLevelEditor(level) {
        const container = document.getElementById("level-detail-container");
        if (!container) return;

        const options = level.options || {};
        const isSurvive = level.phase_type === "survive";
        const isWorld = level.phase_type === "world";
        const isVoid = level.phase_type === "void";

        const surviveForm = this.buildSurviveForm(options, isSurvive);
        const worldForm = this.buildWorldForm(options, isWorld);
        const voidForm = this.buildVoidForm(isVoid);
        const storyEvents = this.buildStoryEvents(level.level_number);

        clear(container);

        const levelTitleText = `${LanguageManager.t("admin.level")} ${level.level_number} `;
        const newLevelSpan = level.isNew ? el("span", { className: "admin-new-level" }, LanguageManager.t("admin.new")) : null;
        const deleteBtn = !level.isNew ? el("button", { className: "btn-delete-level", dataset: { level: level.level_number } }, LanguageManager.t("admin.deleteLevel")) : null;

        container.appendChild(
            el("div", { className: "admin-view-header" },
                el("div", { className: "admin-title-group" },
                    el("h1", { className: "admin-title" }, levelTitleText, newLevelSpan),
                    el("p", { className: "admin-subtitle" }, LanguageManager.t("admin.editConfig"))
                ),
                el("div", { className: "admin-header-actions" }, deleteBtn)
            )
        );

        container.appendChild(
            el("div", { className: `preview-container-${level.level_number} preview-container` },
                el("div", { className: "preview-badge" }, LanguageManager.t("admin.preview3D"))
            )
        );

        container.appendChild(
            el("div", { className: "admin-editor-card" },
                el("div", { className: "admin-phase-row" },
                    el("label", { className: "admin-label m-0" }, LanguageManager.t("admin.phaseType")),
                    createCustomSelect([
                        { value: "survive", label: LanguageManager.t("admin.survivePhase") },
                        { value: "world", label: LanguageManager.t("admin.worldPhase") },
                        { value: "void", label: LanguageManager.t("admin.voidPhase") }
                    ], level.phase_type || "survive", null, "phase-type-select admin-compact-select max-w-250")
                ),
                surviveForm,
                worldForm,
                voidForm,
                storyEvents,
                el("div", { className: "mt-15" },
                    el("button", { className: "save-btn btn-primary" }, `${LanguageManager.t("admin.saveLevel")} ${level.level_number}`)
                )
            )
        );

                this.attachCardEventListeners(container, level, options);
    }

    attachCardEventListeners(card, level, options) {
        const deleteBtn = card.querySelector('.btn-delete-level');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await FlashMessageManager.confirm(`${LanguageManager.t("admin.confirmDelete")} ${level.level_number} ?`);
                if (confirmed) {
                    this.deleteLevel(level.level_number);
                }
            });
        }

        const storyContainer = card.querySelector(`.story-events-container-${level.level_number}`);
        const typeSelect = card.querySelector('.phase-type-select');

        const initialStoryEvents = [];

        if (level.phase_type === 'world') {
            const eventsArray = options.events || [];
            options.outroType = 'DoorEvent';
            eventsArray.forEach(eType => {
                if (eType === 'DoorEvent' || eType === 'HoleEvent') {
                    options.outroType = eType;
                } else if (eType === 'BridgeWordEvent') {
                    initialStoryEvents.push({ actionType: 'bridge' });
                } else if (eType === 'JumpWordEvent') {
                    initialStoryEvents.push({ actionType: 'jumpword' });
                } else if (eType === 'FlameWallEvent') {
                    initialStoryEvents.push({ actionType: 'flamewall' });
                }
            });
            if (options.dialogue && options.dialogue.length > 0) {
                initialStoryEvents.push({
                    actionType: 'dialogue',
                    triggerType: 'time',
                    triggerValue: 0,
                    dialogueModel: options.dialogueModel || '/asset/game_assets/models/player.glb',
                    dialogue: options.dialogue
                });
            }
        }

        (options.storyEvents || []).forEach(evt => initialStoryEvents.push(evt));

        initialStoryEvents.forEach(evt => this.createStoryEventBlock(storyContainer, typeSelect, evt));

        card.querySelector('.add-story-event-btn').addEventListener('click', () => {
            this.createStoryEventBlock(storyContainer, typeSelect);
        });

        const surviveDiv = card.querySelector('.survive-form');
        const worldDiv = card.querySelector('.world-form');
        const voidDiv = card.querySelector('.void-form');

        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'survive') {
                surviveDiv.classList.remove('none');
                worldDiv.classList.add('none');
                voidDiv.classList.add('none');
            } else if (e.target.value === 'world') {
                surviveDiv.classList.add('none');
                worldDiv.classList.remove('none');
                voidDiv.classList.add('none');
            } else if (e.target.value === 'void') {
                surviveDiv.classList.add('none');
                worldDiv.classList.add('none');
                voidDiv.classList.remove('none');
            }
            storyContainer.innerHTML = '';
        });

        const saveBtn = card.querySelector('.save-btn');
        saveBtn.addEventListener("click", () => {
            const phaseType = typeSelect.value;
            let parsedOptions = {};

            const gatheredStoryEvents = Array.from(storyContainer.querySelectorAll('.story-event-block')).map(block => {
                const actionType = block.querySelector('.evt-action-type').value || 'dialogue';
                const dText = block.querySelector('.evt-dialogue').value;
                return {
                    actionType: actionType,
                    triggerType: block.querySelector('.evt-trigger-type').value,
                    triggerValue: Number(block.querySelector('.evt-trigger-value').value) || 0,
                    dialogueModel: block.querySelector('.evt-model').value,
                    dialogue: actionType === 'dialogue' ? dText.split('\n').map(l => l.trim()).filter(l => l.length > 0) : [],
                    healAmount: Number(block.querySelector('.evt-heal-amount').value) || 50,
                    spawnEnemy: block.querySelector('.evt-spawn-type').value,
                    spawnInterval: Number(block.querySelector('.evt-spawn-interval').value) || 3,
                    maxEnemies: Number(block.querySelector('.evt-spawn-max').value) || 20,
                    isTriggered: false
                };
            });

            if (phaseType === 'survive') {
                parsedOptions = {
                    decorType: card.querySelector('.survive-decor').value,
                    duration: card.querySelector('.survive-duration').value ? Number(card.querySelector('.survive-duration').value) : null,
                    playerHp: card.querySelector('.survive-hp').value ? Number(card.querySelector('.survive-hp').value) : null,
                    spawnInterval: card.querySelector('.survive-spawn-interval').value ? Number(card.querySelector('.survive-spawn-interval').value) : null,
                    maxEnemies: card.querySelector('.survive-max-enemies').value ? Number(card.querySelector('.survive-max-enemies').value) : 0,
                    storyEvents: gatheredStoryEvents
                };
            } else if (phaseType === 'void') {
                parsedOptions = {};
            } else {
                const eventsList = [];
                const filteredStoryEvents = [];

                gatheredStoryEvents.forEach(evt => {
                    if (evt.actionType === 'bridge') eventsList.push('BridgeWordEvent');
                    else if (evt.actionType === 'jumpword') eventsList.push('JumpWordEvent');
                    else if (evt.actionType === 'flamewall') eventsList.push('FlameWallEvent');
                    else filteredStoryEvents.push(evt);
                });

                const outroType = card.querySelector('.world-outro').value;
                if (outroType) eventsList.push(outroType);

                let globalDialogue = [];
                let globalDialogueModel = null;
                const finalStoryEvents = [];

                filteredStoryEvents.forEach(evt => {
                    if (evt.actionType === 'dialogue' && Number(evt.triggerValue) === 0 && globalDialogue.length === 0) {
                        globalDialogue = evt.dialogue;
                        globalDialogueModel = evt.dialogueModel;
                    } else {
                        finalStoryEvents.push(evt);
                    }
                });

                parsedOptions = {
                    introType: card.querySelector('.world-intro').value,
                    playerHp: card.querySelector('.world-hp').value ? Number(card.querySelector('.world-hp').value) : null,
                    events: eventsList,
                    dialogue: globalDialogue,
                    dialogueModel: globalDialogueModel,
                    storyEvents: finalStoryEvents
                };
            }

            this.saveLevel(level.level_number, phaseType, parsedOptions);
        });

        const spawnIntervalInput = card.querySelector('.survive-spawn-interval');
        if (spawnIntervalInput) {
            spawnIntervalInput.addEventListener('input', (e) => {
                if (e.target.value !== "" && Number(e.target.value) < 1) {
                    e.target.value = "";
                }
            });
        }

        const maxEnemiesInput = card.querySelector('.survive-max-enemies');
        if (maxEnemiesInput) {
            maxEnemiesInput.addEventListener('input', (e) => {
                if (e.target.value !== "" && Number(e.target.value) < 1) {
                    e.target.value = "";
                }
            });
        }

        const durationInput = card.querySelector('.survive-duration');
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                if (e.target.value !== "" && Number(e.target.value) < 1) {
                    e.target.value = "";
                }
            });
        }

        const surviveHpInput = card.querySelector('.survive-hp');
        if (surviveHpInput) {
            surviveHpInput.addEventListener('input', (e) => {
                if (e.target.value !== "" && Number(e.target.value) < 1) {
                    e.target.value = "";
                }
            });
        }

        const worldHpInput = card.querySelector('.world-hp');
        if (worldHpInput) {
            worldHpInput.addEventListener('input', (e) => {
                if (e.target.value !== "" && Number(e.target.value) < 1) {
                    e.target.value = "";
                }
            });
        }

        const previewContainer = card.querySelector(`.preview-container-${level.level_number}`);
        this.init3DPreview(previewContainer, level.phase_type, options, card);
    }

    createStoryEventBlock(storyContainer, typeSelect, evt = { actionType: 'dialogue', triggerType: 'time', triggerValue: 10, dialogue: [], dialogueModel: '/asset/game_assets/models/player.glb', healAmount: 50, spawnEnemy: 'basic' }) {
        const currentPhaseType = typeSelect.value;
        const div = el("div", { className: "story-event-block" });

        if (evt.actionType === 'heal') div.classList.add("block-heal");
        else if (evt.actionType === 'spawn') div.classList.add("block-spawn");
        else if (evt.actionType === 'spawnBoss') div.classList.add("block-spawn-boss");
        else if (evt.actionType === 'spawnerConfig') div.classList.add("block-spawner-config");
        else if (evt.actionType === 'bridge') div.classList.add("block-bridge");
        else if (evt.actionType === 'jumpword') div.classList.add("block-bridge");
        else if (evt.actionType === 'flamewall') div.classList.add("block-flamewall");
        else div.classList.add("block-dialogue");

        const actionOptions = [];
        if (currentPhaseType === 'survive') {
            actionOptions.push({ value: "dialogue", label: LanguageManager.t("admin.actionDialogue") });
            actionOptions.push({ value: "heal", label: LanguageManager.t("admin.actionHeal") });
            actionOptions.push({ value: "spawn", label: LanguageManager.t("admin.actionSpawn") });
            actionOptions.push({ value: "spawnBoss", label: LanguageManager.t("admin.actionSpawnBoss") });
            actionOptions.push({ value: "spawnerConfig", label: LanguageManager.t("admin.actionConfigSpawner") });
        } else {
            actionOptions.push({ value: "dialogue", label: LanguageManager.t("admin.actionDialogue") });
            actionOptions.push({ value: "heal", label: LanguageManager.t("admin.actionHeal") });
            actionOptions.push({ value: "bridge", label: LanguageManager.t("admin.actionBridge") });
            actionOptions.push({ value: "jumpword", label: LanguageManager.t("admin.actionJump") });
            actionOptions.push({ value: "flamewall", label: LanguageManager.t("admin.actionFlame") });
        }

        const hideTriggerClass = ['bridge', 'jumpword', 'flamewall'].includes(evt.actionType) ? 'none' : '';

        const removeBtn = el("button", { className: "remove-evt-btn" }, "X");
        removeBtn.addEventListener('click', () => div.remove());

        const selectAction = createCustomSelect(actionOptions, evt.actionType || "dialogue", null, "evt-action-type admin-compact-select");
        selectAction.addEventListener('change', (e) => {
            const newType = e.target.value;
            div.classList.remove('block-dialogue', 'block-heal', 'block-spawn', 'block-spawn-boss', 'block-spawner-config', 'block-bridge', 'block-flamewall');
            if (newType === 'heal') div.classList.add("block-heal");
            else if (newType === 'spawn') div.classList.add("block-spawn");
            else if (newType === 'spawnBoss') div.classList.add("block-spawn-boss");
            else if (newType === 'spawnerConfig') div.classList.add("block-spawner-config");
            else if (newType === 'bridge' || newType === 'jumpword') div.classList.add("block-bridge");
            else if (newType === 'flamewall') div.classList.add("block-flamewall");
            else div.classList.add("block-dialogue");
        });

        div.appendChild(removeBtn);
        div.appendChild(
            el("div", { className: "block-row mb-15" },
                el("strong", {}, LanguageManager.t("admin.action")),
                selectAction
            )
        );

        div.appendChild(
            el("div", { className: `evt-trigger-container block-row ${hideTriggerClass}` },
                el("label", {}, LanguageManager.t("admin.when")),
                createCustomSelect([
                    { value: "time", label: LanguageManager.t("admin.afterTime") },
                    { value: "distance", label: LanguageManager.t("admin.atDistance") }
                ], evt.triggerType || "time", null, "evt-trigger-type admin-compact-select"),
                el("input", { type: "number", className: "evt-trigger-value block-input width-80", value: evt.triggerValue !== undefined ? evt.triggerValue : 10 })
            )
        );

        div.appendChild(
            el("div", { className: "evt-fields-dialogue block-row flex-col-stretch" },
                el("div", { className: "flex-row-gap10 flex-center" },
                    el("label", {}, LanguageManager.t("admin.model3D")),
                    el("input", { type: "text", className: "evt-model block-input flex-1", value: evt.dialogueModel || '/asset/game_assets/models/player.glb' })
                ),
                el("div", { className: "flex-row-gap10 flex-start mt-10" },
                    el("label", {}, LanguageManager.t("admin.dialogues")),
                    el("textarea", { className: "evt-dialogue block-textarea", rows: "3", placeholder: LanguageManager.t("admin.dialoguePlaceholder"), value: (evt.dialogue || []).join('\n') })
                )
            )
        );

        div.appendChild(
            el("div", { className: "evt-fields-heal block-row" },
                el("label", {}, LanguageManager.t("admin.hp")),
                el("input", { type: "number", className: "evt-heal-amount block-input width-100", value: evt.healAmount || 50 })
            )
        );

        div.appendChild(
            el("div", { className: "evt-fields-spawn block-row" },
                el("label", {}, LanguageManager.t("admin.enemyType")),
                createCustomSelect([
                    { value: "basic", label: LanguageManager.t("admin.basic") },
                    { value: "speedy", label: LanguageManager.t("admin.speedy") },
                    { value: "tank", label: LanguageManager.t("admin.tank") }
                ], evt.spawnEnemy || "basic", null, "evt-spawn-type admin-compact-select width-150")
            )
        );

        div.appendChild(
            el("div", { className: "evt-fields-spawnerConfig block-row" },
                el("label", {}, LanguageManager.t("admin.spawnIntervalConfig")),
                el("input", { type: "number", step: "0.1", className: "evt-spawn-interval block-input width-80 mr-15", value: evt.spawnInterval !== undefined ? evt.spawnInterval : 3 }),
                el("label", {}, LanguageManager.t("admin.maxEnemies")),
                el("input", { type: "number", className: "evt-spawn-max block-input", value: evt.maxEnemies !== undefined ? evt.maxEnemies : 20 })
            )
        );

        storyContainer.appendChild(div);
    }

    init3DPreview(container, phaseType, options, card) {
        const { scene, camera, renderer } = this._setupPreviewScene(container);

        let currentDecor = null;
        let keyboardGroup = null;
        let playerMesh = null;
        let targetPlayerPos = new THREE.Vector3(15, 1.35, 3);

        const loader = new GLTFLoader();
        loader.load("/asset/game_assets/models/player.glb", (gltf) => {
            playerMesh = gltf.scene;
            playerMesh.scale.set(1.7, 1.7, 1.7);
            playerMesh.position.copy(targetPlayerPos);
            playerMesh.rotation.y = Math.PI / 2;
            scene.add(playerMesh);
        });

        const animate = () => {
            requestAnimationFrame(animate);
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                renderer.render(scene, camera);
            }
        };
        animate();

        const renderDecor = () => {
            if (currentDecor) {
                scene.remove(currentDecor);
            }
            if (keyboardGroup) {
                scene.remove(keyboardGroup);
                keyboardGroup = null;
            }

            if (phaseType === "survive") {
                camera.position.set(15, 18, 7);
                camera.lookAt(15, 0, 3);

                const decorType = card.querySelector('.survive-decor').value || options.decorType || "default";
                const decorObj = SurviveDecorBuilder.buildDecor(decorType, scene);
                currentDecor = decorObj.decorGroup;
                currentDecor.position.set(0, 0, 0);

                keyboardGroup = new THREE.Group();
                Keyboard.init(keyboardGroup, KEYBOARD_LAYOUT, decorType);
                keyboardGroup.position.set(0, 0, 0);
                scene.add(keyboardGroup);

                if (playerMesh) playerMesh.position.set(15, 1.35, 5);
                else targetPlayerPos.set(15, 1.35, 5);

            } else if (phaseType === "void") {
                camera.position.set(20, 20, 10);
                camera.lookAt(0, 0, 0);
                
                const voidCreature = new VoidCreature(scene, { x: 0, y: -6, z: -30 });
                voidCreature.init();
                currentDecor = voidCreature.mesh;
                
                if (playerMesh) playerMesh.position.set(0, 1.35, 10);
                else targetPlayerPos.set(0, 1.35, 10);
            } else {
                camera.position.set(30, 85, 5);
                camera.lookAt(12, 0, -25);

                const introType = card.querySelector('.world-intro').value || "staircase";
                const outroType = card.querySelector('.world-outro').value || "DoorEvent";
                const layout = createWordlLayout(introType);

                if (outroType === "HoleEvent") {
                    const doorRow = layout.filter((t) => t.y === -34);
                    if (doorRow.length > 0) {
                        doorRow.sort((a, b) => a.x - b.x);
                        const centerTile = doorRow[Math.floor(doorRow.length / 2)];
                        if (centerTile) {
                            centerTile.renderMesh = false;
                        }
                    }
                }

                WorldMap.init(scene, layout).then((wMap) => {
                    currentDecor = wMap.group;
                    const spawnTile = wMap.mapLayout.find(t => t.isSpawn) || wMap.mapLayout[1] || wMap.mapLayout[0];
                    const spawnPos = spawnTile.mesh.position;

                    if (playerMesh) {
                        playerMesh.position.set(spawnPos.x, spawnPos.y + 1.35, spawnPos.z);
                    } else {
                        targetPlayerPos.set(spawnPos.x, spawnPos.y + 1.35, spawnPos.z);
                    }

                    const doorRow = wMap.mapLayout.filter((t) => t.rawPosition.y === -34);
                    if (doorRow.length > 0) {
                        doorRow.sort((a, b) => a.rawPosition.x - b.rawPosition.x);
                        const exitTile = doorRow[Math.floor(doorRow.length / 2)];
                        if (exitTile && exitTile.mesh) {
                            if (outroType === "DoorEvent") {
                                const doorGroup = new THREE.Group();
                                const pillarMat = new THREE.MeshStandardMaterial({
                                    map: wMap.stoneTexture,
                                    color: 0x888888,
                                    roughness: 0.9,
                                    metalness: 0.1,
                                });
                                applyTriplanarMapping(pillarMat);
                                const pillarGeo = new THREE.BoxGeometry(1.5, 12, 1.5);
                                const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
                                leftPillar.position.set(-3, 6, 0);
                                const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
                                rightPillar.position.set(3, 6, 0);
                                const archGeo = new THREE.BoxGeometry(7.5, 2, 1.5);
                                const arch = new THREE.Mesh(archGeo, pillarMat);
                                arch.position.set(0, 13, 0);
                                const textureLoader = new THREE.TextureLoader();
                                const doorTexture = textureLoader.load('/asset/game_assets/textures/door.jpg');
                                
                                const doorMat = new THREE.MeshStandardMaterial({
                                    map: doorTexture,
                                    color: 0xffffff,
                                    roughness: 0.8,
                                    metalness: 0.3,
                                });
                                const doorGeo = new THREE.BoxGeometry(2.25, 12, 0.5);
                                
                                const leftDoorTexture = doorTexture.clone();
                                leftDoorTexture.wrapS = THREE.RepeatWrapping;
                                leftDoorTexture.repeat.x = -1;
                                leftDoorTexture.needsUpdate = true;
                                
                                const doorMaterialsLeft = [
                                    doorMat, doorMat, doorMat, doorMat,
                                    leftDoorMat,
                                    doorMat
                                ];
                                
                                const doorMaterialsRight = [
                                    doorMat, doorMat, doorMat, doorMat,
                                    doorMat,
                                    leftDoorMat
                                ];

                                const leftDoorMesh = new THREE.Mesh(doorGeo, doorMaterialsLeft);
                                leftDoorMesh.position.set(-1.125, 6, 0);
                                const rightDoorMesh = new THREE.Mesh(doorGeo, doorMaterialsRight);
                                rightDoorMesh.position.set(1.125, 6, 0);
                                doorGroup.add(leftPillar, rightPillar, arch, leftDoorMesh, rightDoorMesh);
                                doorGroup.position.set(0, 2, 0);
                                doorGroup.rotation.y = -Math.PI / 6;
                                exitTile.mesh.add(doorGroup);
                            } else if (outroType === "HoleEvent") {
                                const holeGeo = new THREE.CylinderGeometry(1.3, 1.3, 15, 32);
                                const holeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
                                const holeMesh = new THREE.Mesh(holeGeo, holeMat);
                                holeMesh.position.set(exitTile.mesh.position.x, (exitTile.baseY || 0) - 7.5, exitTile.mesh.position.z);
                                currentDecor.add(holeMesh);
                            }
                        }
                    }
                });
            }
        };

        card.querySelector('.phase-type-select').addEventListener('change', (e) => {
            phaseType = e.target.value;
            renderDecor();
        });
        const decorSelect = card.querySelector('.survive-decor');
        if (decorSelect) {
            decorSelect.addEventListener('change', () => {
                if (phaseType === 'survive') renderDecor();
            });
        }
        const introSelect = card.querySelector('.world-intro');
        if (introSelect) {
            introSelect.addEventListener('change', () => {
                if (phaseType === 'world') renderDecor();
            });
        }
        const outroSelect = card.querySelector('.world-outro');
        if (outroSelect) {
            outroSelect.addEventListener('change', () => {
                if (phaseType === 'world') renderDecor();
            });
        }

        let hasRendered = false;
        const resizeObserver = new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                if (!hasRendered) {
                    hasRendered = true;
                    renderDecor();
                }
            }
        });
        resizeObserver.observe(container);
    }


    buildSurviveForm(options, isSurvive) {
        return el("div", { className: `survive-form story-event-block block-survive ${isSurvive ? '' : 'none'}` },
            el("div", { className: "block-title" }, LanguageManager.t("admin.surviveParams")),
            el("div", { className: "block-row" },
                el("div", { className: "flex-1 min-w-150" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.decor")),
                    createCustomSelect([
                        { value: "default", label: LanguageManager.t("admin.default") },
                        { value: "mine", label: LanguageManager.t("admin.mine") },
                        { value: "styx", label: LanguageManager.t("admin.styx") }
                    ], options.decorType || "default", null, "survive-decor admin-compact-select")
                ),
                el("div", { className: "flex-1 min-w-100" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.duration")),
                    el("input", { type: "number", className: "survive-duration block-input", value: options.duration || '', placeholder: LanguageManager.t("admin.infinite") })
                ),
                el("div", { className: "flex-1 min-w-100" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.playerHp")),
                    el("input", { type: "number", className: "survive-hp block-input", value: options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : '', placeholder: LanguageManager.t("admin.immortal") })
                )
            ),
            el("div", { className: "block-row mt-15" },
                el("div", { className: "flex-1 min-w-150" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.spawnInterval")),
                    el("input", { type: "number", step: "0.1", className: "survive-spawn-interval block-input", value: options.spawnInterval !== undefined && options.spawnInterval !== null ? options.spawnInterval : '', placeholder: LanguageManager.t("admin.disabled") })
                ),
                el("div", { className: "flex-1 min-w-150" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.maxEnemies")),
                    el("input", { type: "number", className: "survive-max-enemies block-input", value: options.maxEnemies !== undefined && options.maxEnemies !== null ? options.maxEnemies : '', placeholder: LanguageManager.t("admin.disabled") })
                )
            )
        );
    }

    buildWorldForm(options, isWorld) {
        return el("div", { className: `world-form story-event-block block-world ${isWorld ? '' : 'none'}` },
            el("div", { className: "block-title" }, LanguageManager.t("admin.worldParams")),
            el("div", { className: "block-row" },
                el("div", { className: "flex-1 min-w-200" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.introType")),
                    createCustomSelect([
                        { value: "staircase", label: LanguageManager.t("admin.staircase") },
                        { value: "skyfall", label: LanguageManager.t("admin.skyfall") }
                    ], options.introType || "staircase", null, "world-intro admin-compact-select")
                ),
                el("div", { className: "flex-1 min-w-200" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.outroType")),
                    createCustomSelect([
                        { value: "DoorEvent", label: LanguageManager.t("admin.doorEvent") },
                        { value: "HoleEvent", label: LanguageManager.t("admin.holeEvent") }
                    ], options.outroType || "DoorEvent", null, "world-outro admin-compact-select")
                ),
                el("div", { className: "flex-1 min-w-100" },
                    el("label", { className: "admin-label" }, LanguageManager.t("admin.playerHp")),
                    el("input", { type: "number", className: "world-hp block-input", value: options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : '', placeholder: LanguageManager.t("admin.immortal") })
                )
            )
        );
    }

    buildVoidForm(isVoid) {
        return el("div", { className: `void-form story-event-block block-void ${isVoid ? '' : 'none'}` },
            el("div", { className: "block-title" }, LanguageManager.t("admin.voidParams")),
            el("div", { className: "block-row" },
                el("p", { className: "admin-void-desc" }, LanguageManager.t("admin.voidDesc"))
            )
        );
    }

    buildStoryEvents(levelNumber) {
        return el("div", { className: "admin-story-events" },
            el("div", { className: "events-section-title" }, LanguageManager.t("admin.storyEvents")),
            el("div", { className: `story-events-container-${levelNumber} events-list` }),
            el("button", { className: "add-story-event-btn btn-secondary", dataset: { level: levelNumber } }, LanguageManager.t("admin.addEvent"))
        );
    }

    _setupPreviewScene(container) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0c10);

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        camera.position.set(15, 18, 7);
        camera.lookAt(15, 0, 3);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffddaa, 1.5);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);

        return { scene, camera, renderer };
    }

    async saveLevel(levelNumber, phaseType, options) {
        const token = localStorage.getItem("authToken");
        if (!token) {
            FlashMessageManager.show("Vous devez être connecté.", "error");
            return;
        }

        try {
            const response = await fetch(`/api/levels/${levelNumber}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ phase_type: phaseType, options })
            });

            const data = await response.json();

            if (data.success) {
                FlashMessageManager.show("Niveau sauvegardé avec succès !", "success");
                await this.loadLevels();
            } else {
                FlashMessageManager.show("Erreur : " + data.message, "error");
            }
        } catch (e) {
            console.error(e);
            FlashMessageManager.show("Erreur de connexion au serveur.", "error");
        }
    }

    async deleteLevel(levelNumber) {
        const token = localStorage.getItem("authToken");
        if (!token) {
            FlashMessageManager.show("Vous devez être connecté.", "error");
            return;
        }

        try {
            const response = await fetch(`/api/levels/${levelNumber}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                FlashMessageManager.show("Niveau supprimé avec succès !", "success");
                if (this.activeLevelNumber === levelNumber) {
                    this.activeLevelNumber = null;
                }
                await this.loadLevels();
            } else {
                FlashMessageManager.show("Erreur : " + data.message, "error");
            }
        } catch (e) {
            console.error(e);
            FlashMessageManager.show("Erreur de connexion au serveur.", "error");
        }
    }

    exportLevels() {
        if (!this.levels || this.levels.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.levels, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "levels_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importLevels() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = async readerEvent => {
                try {
                    const content = readerEvent.target.result;
                    const importedLevels = JSON.parse(content);
                    if (!Array.isArray(importedLevels)) {
                        FlashMessageManager.show("Format JSON invalide. Un tableau est attendu.", "error");
                        return;
                    }
                    
                    const confirmed = await FlashMessageManager.confirm(`${LanguageManager.t("admin.confirmImport")} ${importedLevels.length} ?`);
                    if (!confirmed) return;
                    
                    let successCount = 0;
                    const token = localStorage.getItem("authToken");
                    if (!token) return;

                    for (const lvl of importedLevels) {
                        if (lvl.level_number && lvl.phase_type && lvl.options) {
                            try {
                                await fetch(`/api/levels/${lvl.level_number}`, {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ phase_type: lvl.phase_type, options: lvl.options })
                                });
                                successCount++;
                            } catch (err) {
                                console.error(err);
                            }
                        }
                    }
                    
                    FlashMessageManager.show(`${LanguageManager.t("admin.importSuccess")} (${successCount}/${importedLevels.length})`, "success");
                    await this.loadLevels();
                } catch (err) {
                    console.error(err);
                    FlashMessageManager.show("Erreur lors de la lecture du fichier JSON.", "error");
                }
            }
        }
        input.click();
    }

    async render() {
        return this.container;
    }
}
