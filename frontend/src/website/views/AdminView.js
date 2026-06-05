import * as THREE from "three";
import { SurviveDecorBuilder } from "../../game/utilities/SurviveDecorBuilder.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Keyboard from "../../game/managers/Keyboard.js";
import { KEYBOARD_LAYOUT } from "../../game/utilities/KEYBOARD.js";
import WorldMap from "../../game/managers/WorldMap.js";
import { createWordlLayout } from "../../game/utilities/WORLD_LAYOUT.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

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
        this.container.innerHTML = `
            <div class="admin-dashboard">
                <aside class="admin-sidebar">
                    <h2 class="sidebar-title">Niveaux</h2>
                    <div id="levels-list" class="levels-list">
                        <div class="admin-loading">Chargement...</div>
                    </div>
                </aside>
                <main class="admin-main">
                    <div id="admin-error" class="admin-error-msg"></div>
                    <div id="level-detail-container">
                        <div class="admin-welcome-screen">
                            <h3>Sélectionnez un niveau</h3>
                            <p>Choisissez un niveau dans la liste latérale pour éditer ses configurations.</p>
                        </div>
                    </div>
                </main>
            </div>
        `;

        await this.loadLevels();
    }

    async loadLevels() {
        try {
            const response = await fetch("/api/levels");
            const data = await response.json();

            if (!data.success) {
                document.getElementById("admin-error").textContent = data.message || "Erreur de chargement";
                return;
            }

            this.levels = data.configs;
            this.renderLevels();
        } catch (e) {
            console.error(e);
            document.getElementById("admin-error").textContent = "Impossible de contacter le serveur.";
        }
    }

    renderLevels() {
        const listContainer = document.getElementById("levels-list");
        if (!listContainer) return;
        listContainer.innerHTML = "";

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

            const displayName = level.isNew ? `+ Ajouter un niveau` : `Niveau ${level.level_number}`;
            const phaseLabel = level.isNew ? "Créer un nouveau niveau" : this.getPhaseLabel(level.phase_type);

            btn.innerHTML = `
                <span class="level-btn-number">${displayName}</span>
                <span class="level-btn-type">${phaseLabel}</span>
            `;

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
                detailContainer.innerHTML = `
                    <div class="admin-welcome-screen">
                        <h3>Sélectionnez un niveau</h3>
                        <p>Choisissez un niveau dans la liste latérale pour éditer ses configurations.</p>
                    </div>
                `;
            }
        }
    }

    getPhaseLabel(phaseType) {
        switch (phaseType) {
            case "survive": return "Survie (Combat)";
            case "world": return "Exploration (World)";
            case "void": return "Vide Infini";
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

        const surviveFormHtml = this.buildSurviveFormHtml(options, isSurvive);
        const worldFormHtml = this.buildWorldFormHtml(options, isWorld);
        const voidFormHtml = this.buildVoidFormHtml(isVoid);
        const storyEventsHtml = this.buildStoryEventsHtml(level.level_number);

        container.innerHTML = `
            <div class="admin-view-header">
                <div class="admin-title-group">
                    <h1 class="admin-title">Niveau ${level.level_number} ${level.isNew ? "<span class='admin-new-level'>(Nouveau)</span>" : ""}</h1>
                    <p class="admin-subtitle">Éditez les configurations pour ce niveau.</p>
                </div>
                <div class="admin-header-actions">
                    ${!level.isNew ? `<button class="btn-delete-level" data-level="${level.level_number}">Supprimer le niveau</button>` : ""}
                </div>
            </div>

            <div class="preview-container-${level.level_number} preview-container">
                <div class="preview-badge">Aperçu 3D</div>
            </div>

            <div class="admin-editor-card">
                <div class="admin-phase-row">
                    <label class="admin-label m-0">Type de Phase :</label>
                    <select class="phase-type-select admin-select max-w-250">
                        <option value="survive" ${isSurvive ? "selected" : ""}>Survie (Combat)</option>
                        <option value="world" ${isWorld ? "selected" : ""}>Exploration (World)</option>
                        <option value="void" ${isVoid ? "selected" : ""}>Vide Infini</option>
                    </select>
                </div>

                ${surviveFormHtml}
                ${worldFormHtml}
                ${voidFormHtml}
                ${storyEventsHtml}

                <div class="mt-15">
                    <button class="save-btn btn-primary">Sauvegarder le niveau ${level.level_number}</button>
                </div>
            </div>
        `;

        this.attachCardEventListeners(container, level, options);
    }

    attachCardEventListeners(card, level, options) {
        const deleteBtn = card.querySelector('.btn-delete-level');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await FlashMessageManager.confirm(`Êtes-vous sûr de vouloir supprimer le niveau ${level.level_number} ?`);
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
        const div = document.createElement("div");
        div.className = "story-event-block";

        if (evt.actionType === 'heal') div.classList.add("block-heal");
        else if (evt.actionType === 'spawn') div.classList.add("block-spawn");
        else if (evt.actionType === 'spawnBoss') div.classList.add("block-spawn-boss");
        else if (evt.actionType === 'spawnerConfig') div.classList.add("block-spawner-config");
        else if (evt.actionType === 'bridge') div.classList.add("block-bridge");
        else if (evt.actionType === 'jumpword') div.classList.add("block-bridge");
        else if (evt.actionType === 'flamewall') div.classList.add("block-flamewall");
        else div.classList.add("block-dialogue");

        let optionsHtml = '';
        if (currentPhaseType === 'survive') {
            optionsHtml = `
                <option value="dialogue" ${evt.actionType === 'dialogue' || !evt.actionType ? 'selected' : ''}>💬 Lancer un Dialogue</option>
                <option value="heal" ${evt.actionType === 'heal' ? 'selected' : ''}>💚 Soigner le Joueur</option>
                <option value="spawn" ${evt.actionType === 'spawn' ? 'selected' : ''}>👹 Faire apparaître un Ennemi</option>
                <option value="spawnBoss" ${evt.actionType === 'spawnBoss' ? 'selected' : ''}>🐙 Faire apparaître le Boss</option>
                <option value="spawnerConfig" ${evt.actionType === 'spawnerConfig' ? 'selected' : ''}>⚙️ Configurer le Générateur d'Ennemis</option>
            `;
        } else {
            optionsHtml = `
                <option value="dialogue" ${evt.actionType === 'dialogue' || !evt.actionType ? 'selected' : ''}>💬 Lancer un Dialogue</option>
                <option value="heal" ${evt.actionType === 'heal' ? 'selected' : ''}>💚 Soigner le Joueur</option>
                <option value="bridge" ${evt.actionType === 'bridge' ? 'selected' : ''}>⏳ Placer un Pont de Mots (Bridge)</option>
                <option value="jumpword" ${evt.actionType === 'jumpword' ? 'selected' : ''}>🦘 Placer un Saut de Puissance (Jump)</option>
                <option value="flamewall" ${evt.actionType === 'flamewall' ? 'selected' : ''}>🔥 Placer un Mur de Flammes</option>
            `;
        }

        const hideTriggerClass = ['bridge', 'jumpword', 'flamewall'].includes(evt.actionType) ? 'none' : '';

        div.innerHTML = `
            <button class="remove-evt-btn">X</button>
            
            <div class="block-row mb-15">
                <strong>Action :</strong>
                <select class="evt-action-type block-select">
                    ${optionsHtml}
                </select>
            </div>

            <div class="evt-trigger-container block-row ${hideTriggerClass}">
                <label>Quand ?</label>
                <select class="evt-trigger-type block-select">
                    <option value="time" ${evt.triggerType === 'time' ? 'selected' : ''}>Après Temps (sec)</option>
                    <option value="distance" ${evt.triggerType === 'distance' ? 'selected' : ''}>À Distance (cases)</option>
                </select>
                <input type="number" class="evt-trigger-value block-input width-80" value="${evt.triggerValue !== undefined ? evt.triggerValue : 10}">
            </div>
            
            <div class="evt-fields-dialogue block-row flex-col-stretch">
                <div class="flex-row-gap10 flex-center">
                    <label>Modèle 3D (.glb):</label>
                    <input type="text" class="evt-model block-input flex-1" value="${evt.dialogueModel || '/asset/game_assets/models/player.glb'}">
                </div>
                <div class="flex-row-gap10 flex-start mt-10">
                    <label>Dialogues:</label>
                    <textarea class="evt-dialogue block-textarea" rows="3" placeholder="1 bulle par ligne...">${(evt.dialogue || []).join('\n')}</textarea>
                </div>
            </div>

            <div class="evt-fields-heal block-row">
                <label>Points de vie (PV) :</label>
                <input type="number" class="evt-heal-amount block-input width-100" value="${evt.healAmount || 50}">
            </div>

            <div class="evt-fields-spawn block-row">
                <label>Type d'ennemi :</label>
                <select class="evt-spawn-type block-select width-150">
                    <option value="basic" ${evt.spawnEnemy === 'basic' ? 'selected' : ''}>Basique</option>
                    <option value="speedy" ${evt.spawnEnemy === 'speedy' ? 'selected' : ''}>Rapide</option>
                    <option value="tank" ${evt.spawnEnemy === 'tank' ? 'selected' : ''}>Résistant (Tank)</option>
                </select>
            </div>

            <div class="evt-fields-spawnerConfig block-row">
                <label>Intervalle Spawn (sec) :</label>
                <input type="number" step="0.1" class="evt-spawn-interval block-input width-80 mr-15" value="${evt.spawnInterval !== undefined ? evt.spawnInterval : 3}">
                
                <label>Max Ennemis :</label>
                <input type="number" class="evt-spawn-max block-input" value="${evt.maxEnemies !== undefined ? evt.maxEnemies : 20}">
            </div>
        `;

        div.querySelector('.remove-evt-btn').addEventListener('click', () => div.remove());

        const selectAction = div.querySelector('.evt-action-type');
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

        storyContainer.appendChild(div);
    }

    init3DPreview(container, phaseType, options, card) {
        const { scene, camera, renderer } = this._setupPreviewScene(container);

        let currentDecor = null;
        let keyboardGroup = null;
        let playerMesh = null;

        const loader = new GLTFLoader();
        loader.load("/asset/game_assets/models/player.glb", (gltf) => {
            playerMesh = gltf.scene;
            playerMesh.scale.set(1.3, 1.3, 1.3);
            playerMesh.position.set(15, 1.35, 3);
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

            } else if (phaseType === "void") {
                camera.position.set(20, 20, 10);
                camera.lookAt(0, 0, 0);
                const geo = new THREE.BoxGeometry(2, 2, 2);
                const mat = new THREE.MeshBasicMaterial({ color: 0x8a2be2 });
                const mesh = new THREE.Mesh(geo, mat);
                currentDecor = mesh;
                scene.add(currentDecor);
                if (playerMesh) playerMesh.position.set(0, 1.35, 0);
            } else {
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
                                const pillarGeo = new THREE.BoxGeometry(1.5, 12, 1.5);
                                const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
                                leftPillar.position.set(-3, 6, 0);
                                const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
                                rightPillar.position.set(3, 6, 0);
                                const archGeo = new THREE.BoxGeometry(7.5, 2, 1.5);
                                const arch = new THREE.Mesh(archGeo, pillarMat);
                                arch.position.set(0, 13, 0);
                                const doorMat = new THREE.MeshStandardMaterial({
                                    color: 0x5c4033,
                                    roughness: 0.9,
                                    metalness: 0.1,
                                });
                                const doorGeo = new THREE.BoxGeometry(2.25, 12, 0.5);
                                const leftDoorMesh = new THREE.Mesh(doorGeo, doorMat);
                                leftDoorMesh.position.set(-1.125, 6, 0);
                                const rightDoorMesh = new THREE.Mesh(doorGeo, doorMat);
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

                    camera.position.set(30, 85, 5);
                    camera.lookAt(12, 0, -25);
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

        const resizeObserver = new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                if (!currentDecor) {
                    renderDecor();
                }
            }
        });
        resizeObserver.observe(container);
    }

    buildSurviveFormHtml(options, isSurvive) {
        return `
            <div class="survive-form story-event-block block-survive ${isSurvive ? '' : 'none'}">
                <div class="block-title">⚙️ Paramètres de Survie</div>
                <div class="block-row">
                    <div class="flex-1 min-w-150">
                        <label class="admin-label">Décor :</label>
                        <select class="survive-decor block-select">
                            <option value="default" ${options.decorType === 'default' ? 'selected' : ''}>Défaut</option>
                            <option value="mine" ${options.decorType === 'mine' ? 'selected' : ''}>Mine</option>
                            <option value="styx" ${options.decorType === 'styx' ? 'selected' : ''}>Styx</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-100">
                        <label class="admin-label">Durée (sec) :</label>
                        <input type="number" class="survive-duration block-input" value="${options.duration || ''}" placeholder="Infini" />
                    </div>
                    <div class="flex-1 min-w-100">
                        <label class="admin-label">PV Joueur :</label>
                        <input type="number" class="survive-hp block-input" value="${options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : ''}" placeholder="Immortel" />
                    </div>
                </div>
                <div class="block-row mt-15">
                    <div class="flex-1 min-w-150">
                        <label class="admin-label">Intervalle de Spawn (sec) :</label>
                        <input type="number" step="0.1" class="survive-spawn-interval block-input" value="${options.spawnInterval !== undefined && options.spawnInterval !== null ? options.spawnInterval : ''}" placeholder="Désactivé" />
                    </div>
                    <div class="flex-1 min-w-150">
                        <label class="admin-label">Max Ennemis :</label>
                        <input type="number" class="survive-max-enemies block-input" value="${options.maxEnemies !== undefined && options.maxEnemies !== null ? options.maxEnemies : ''}" placeholder="Désactivé" />
                    </div>
                </div>
            </div>
        `;
    }

    buildWorldFormHtml(options, isWorld) {
        return `
            <div class="world-form story-event-block block-world ${isWorld ? '' : 'none'}">
                <div class="block-title">⚙️ Paramètres d'Exploration</div>
                <div class="block-row">
                    <div class="flex-1 min-w-200">
                        <label class="admin-label">Type d'Intro :</label>
                        <select class="world-intro block-select">
                            <option value="staircase" ${options.introType === 'staircase' ? 'selected' : ''}>Escaliers (Staircase)</option>
                            <option value="skyfall" ${options.introType === 'skyfall' ? 'selected' : ''}>Chute du Ciel (Skyfall)</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-200">
                        <label class="admin-label">Type de Fin :</label>
                        <select class="world-outro block-select">
                            <option value="DoorEvent" ${options.outroType === 'DoorEvent' ? 'selected' : ''}>🚪 Porte (DoorEvent)</option>
                            <option value="HoleEvent" ${options.outroType === 'HoleEvent' ? 'selected' : ''}>🕳️ Trou (HoleEvent)</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-100">
                        <label class="admin-label">PV Joueur :</label>
                        <input type="number" class="world-hp block-input" value="${options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : ''}" placeholder="Immortel" />
                    </div>
                </div>
            </div>
        `;
    }

    buildVoidFormHtml(isVoid) {
        return `
            <div class="void-form story-event-block block-void ${isVoid ? '' : 'none'}">
                <div class="block-title">🌌 Paramètres du Vide Infini</div>
                <div class="block-row">
                    <p style="color: #ccc;">Cette phase spéciale génère un monde infini et un boss caché automatiquement. Aucun paramètre supplémentaire n'est requis.</p>
                </div>
            </div>
        `;
    }

    buildStoryEventsHtml(levelNumber) {
        return `
            <div class="admin-story-events">
                <div class="events-section-title">🧩 Événements Narratifs (Bulles)</div>
                <div class="story-events-container-${levelNumber} events-list">
                </div>
                <button class="add-story-event-btn btn-secondary" data-level="${levelNumber}">+ Ajouter un événement narratif</button>
            </div>
        `;
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

    async render() {
        return this.container;
    }
}
