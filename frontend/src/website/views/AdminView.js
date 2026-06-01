import * as THREE from "three";
import { SurviveDecorBuilder } from "../../game/utilities/SurviveDecorBuilder.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Keyboard from "../../game/managers/Keyboard.js";
import { KEYBOARD_LAYOUT } from "../../game/utilities/KEYBOARD.js";
import WorldMap from "../../game/managers/WorldMap.js";
import { createWordlLayout } from "../../game/utilities/WORLD_LAYOUT.js";

export class AdminView {
    constructor() {
        this.container = document.createElement("div");
        this.container.classList.add("view-container");
        this.levels = [];
    }

    getCss() {
        return ["/asset/css/admin.css"];
    }

    async init() {
        this.container.innerHTML = `
            <div class="admin-view-container">
                <h1 class="admin-title">Tableau de bord Administrateur</h1>
                <p class="admin-subtitle">Gérez les configurations des niveaux du jeu.</p>
                <div id="admin-error" style="color: #ff4d4d; margin-bottom: 20px; font-weight: 500;"></div>
                <div id="levels-container">
                    <div style="text-align: center; color: #a3b3cc; padding: 40px;">Chargement des niveaux...</div>
                </div>
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
        const container = document.getElementById("levels-container");
        container.innerHTML = "";

        if (this.levels.length === 0) {
            container.innerHTML = "<p>Aucun niveau configuré.</p>";
        }

        const maxLevel = this.levels.reduce((max, l) => Math.max(max, l.level_number), 0);
        const newLevel = { level_number: maxLevel + 1, phase_type: "survive", options: { decorType: "styx", duration: 60, spawnInterval: 3, maxEnemies: 20 }, isNew: true };
        const allLevels = [...this.levels, newLevel];

        allLevels.forEach((level) => {
            const card = document.createElement("div");
            card.className = "admin-card";
            
            const bodyId = `level-body-${level.level_number}`;
            const isCollapsed = !level.isNew;

            const options = level.options || {};
            const isSurvive = level.phase_type === "survive";
            
            const surviveFormHtml = this.buildSurviveFormHtml(options, isSurvive);
            const worldFormHtml = this.buildWorldFormHtml(options, isSurvive);
            const storyEventsHtml = this.buildStoryEventsHtml(level.level_number);

            card.innerHTML = this.buildCardHtml(level, isCollapsed, surviveFormHtml, worldFormHtml, storyEventsHtml);
            container.appendChild(card);
            
            this.attachCardEventListeners(card, level, options, bodyId);
        });
    }

    attachCardEventListeners(card, level, options, bodyId) {
        const toggleHeader = card.querySelector('.collapse-toggle');
        if (toggleHeader) {
            toggleHeader.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-level')) return;
                
                const bodyEl = document.getElementById(bodyId);
                const iconEl = document.getElementById(`icon-${level.level_number}`);
                if (bodyEl.style.display === 'none') {
                    bodyEl.style.display = 'block';
                    if (iconEl) iconEl.textContent = '▼';
                } else {
                    bodyEl.style.display = 'none';
                    if (iconEl) iconEl.textContent = '▶';
                }
            });
        }
        
        const deleteBtn = card.querySelector('.btn-delete-level');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (confirm(`Êtes-vous sûr de vouloir supprimer le niveau ${level.level_number} ?`)) {
                    this.deleteLevel(level.level_number);
                }
            });
        }

        const storyContainer = card.querySelector(`.story-events-container-${level.level_number}`);
        const typeSelect = card.querySelector('.phase-type-select');

        const initialStoryEvents = [];
        
        if (level.phase_type === 'world') {
            const eventsArray = options.events || [];
            eventsArray.forEach(eType => {
                if (eType === 'DoorEvent') initialStoryEvents.push({ actionType: 'door' });
                if (eType === 'BridgeWordEvent') initialStoryEvents.push({ actionType: 'bridge' });
                if (eType === 'FlameWallEvent') initialStoryEvents.push({ actionType: 'flamewall' });
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
        
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'survive') {
                surviveDiv.style.display = 'block';
                worldDiv.style.display = 'none';
            } else {
                surviveDiv.style.display = 'none';
                worldDiv.style.display = 'block';
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
            } else {
                const eventsList = [];
                const filteredStoryEvents = [];
                
                gatheredStoryEvents.forEach(evt => {
                    if (evt.actionType === 'door') eventsList.push('DoorEvent');
                    else if (evt.actionType === 'bridge') eventsList.push('BridgeWordEvent');
                    else if (evt.actionType === 'flamewall') eventsList.push('FlameWallEvent');
                    else filteredStoryEvents.push(evt);
                });

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

    createStoryEventBlock(storyContainer, typeSelect, evt = { actionType: 'dialogue', triggerType: 'time', triggerValue: 10, dialogue: [], dialogueModel: '/asset/game_assets/models/player.glb', healAmount: 50, spawnEnemy: 'skeleton' }) {
        const currentPhaseType = typeSelect.value;
        const div = document.createElement("div");
        div.className = "story-event-block";
        
        if (evt.actionType === 'heal') div.classList.add("block-heal");
        else if (evt.actionType === 'spawn' || evt.actionType === 'spawnBoss') div.classList.add("block-spawn");
        else if (evt.actionType === 'spawnerConfig') div.classList.add("block-spawn");
        else if (evt.actionType === 'door') div.classList.add("block-door");
        else if (evt.actionType === 'bridge') div.classList.add("block-bridge");
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
                <option value="door" ${evt.actionType === 'door' ? 'selected' : ''}>🚪 Placer une Porte de Fin</option>
                <option value="bridge" ${evt.actionType === 'bridge' ? 'selected' : ''}>⏳ Placer un Pont de Mots (Bridge)</option>
                <option value="flamewall" ${evt.actionType === 'flamewall' ? 'selected' : ''}>🔥 Placer un Mur de Flammes</option>
            `;
        }

        const hideTrigger = ['door', 'bridge', 'flamewall'].includes(evt.actionType) ? 'display: none;' : 'display: flex; gap: 10px; margin-bottom: 10px;';

        div.innerHTML = `
            <button class="remove-evt-btn">X</button>
            
            <div class="block-row" style="margin-bottom: 15px;">
                <strong>Action :</strong>
                <select class="evt-action-type block-select">
                    ${optionsHtml}
                </select>
            </div>

            <div class="evt-trigger-container block-row" style="${hideTrigger}">
                <label>Quand ?</label>
                <select class="evt-trigger-type block-select">
                    <option value="time" ${evt.triggerType === 'time' ? 'selected' : ''}>Après Temps (sec)</option>
                    <option value="distance" ${evt.triggerType === 'distance' ? 'selected' : ''}>À Distance (cases)</option>
                </select>
                <input type="number" class="evt-trigger-value block-input" value="${evt.triggerValue !== undefined ? evt.triggerValue : 10}" style="width: 80px;">
            </div>
            
            <div class="evt-fields-dialogue block-row" style="display: ${(!evt.actionType || evt.actionType === 'dialogue') ? 'flex' : 'none'}; flex-direction: column; align-items: stretch;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label>Modèle 3D (.glb):</label>
                    <input type="text" class="evt-model block-input" value="${evt.dialogueModel || '/asset/game_assets/models/player.glb'}" style="flex: 1;">
                </div>
                <div style="display: flex; gap: 10px; align-items: flex-start; margin-top: 10px;">
                    <label>Dialogues:</label>
                    <textarea class="evt-dialogue block-textarea" rows="3" placeholder="1 bulle par ligne...">${(evt.dialogue || []).join('\n')}</textarea>
                </div>
            </div>

            <div class="evt-fields-heal block-row" style="display: ${evt.actionType === 'heal' ? 'flex' : 'none'};">
                <label>Points de vie (PV) :</label>
                <input type="number" class="evt-heal-amount block-input" value="${evt.healAmount || 50}" style="width: 100px;">
            </div>

            <div class="evt-fields-spawn block-row" style="display: ${evt.actionType === 'spawn' ? 'flex' : 'none'};">
                <label>Type d'ennemi :</label>
                <input type="text" class="evt-spawn-type block-input" value="${evt.spawnEnemy || 'boss'}" style="width: 150px;">
            </div>

            <div class="evt-fields-spawnerConfig block-row" style="display: ${evt.actionType === 'spawnerConfig' ? 'flex' : 'none'};">
                <label>Intervalle Spawn (sec) :</label>
                <input type="number" step="0.1" class="evt-spawn-interval block-input" value="${evt.spawnInterval !== undefined ? evt.spawnInterval : 3}" style="width: 80px; margin-right: 15px;">
                
                <label>Max Ennemis :</label>
                <input type="number" class="evt-spawn-max block-input" value="${evt.maxEnemies !== undefined ? evt.maxEnemies : 20}">
            </div>
        `;
        
        div.querySelector('.remove-evt-btn').addEventListener('click', () => div.remove());
        
        const selectAction = div.querySelector('.evt-action-type');
        selectAction.addEventListener('change', (e) => {
            const newType = e.target.value;
            
            div.classList.remove('block-dialogue', 'block-heal', 'block-spawn', 'block-door', 'block-bridge', 'block-flamewall');
            if (newType === 'heal') div.classList.add("block-heal");
            else if (newType === 'spawn' || newType === 'spawnBoss' || newType === 'spawnerConfig') div.classList.add("block-spawn");
            else if (newType === 'door') div.classList.add("block-door");
            else if (newType === 'bridge') div.classList.add("block-bridge");
            else if (newType === 'flamewall') div.classList.add("block-flamewall");
            else div.classList.add("block-dialogue");

            div.querySelector('.evt-fields-dialogue').style.display = newType === 'dialogue' ? 'flex' : 'none';

            const triggerContainer = div.querySelector('.evt-trigger-container');
            if (triggerContainer) {
                triggerContainer.style.display = ['door', 'bridge', 'flamewall'].includes(newType) ? 'none' : 'flex';
            }

            div.querySelector('.evt-fields-heal').style.display = newType === 'heal' ? 'flex' : 'none';
            div.querySelector('.evt-fields-spawn').style.display = newType === 'spawn' ? 'flex' : 'none';
            div.querySelector('.evt-fields-spawnerConfig').style.display = newType === 'spawnerConfig' ? 'flex' : 'none';
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

            } else {
                const introType = card.querySelector('.world-intro').value || "staircase";
                const stContainer = card.querySelector('div[class*="story-events-container-"]');
                const bubbles = stContainer ? Array.from(stContainer.querySelectorAll('.evt-action-type')).map(sel => sel.value) : [];
                const hasDoor = bubbles.includes('door');
                const hasBridge = bubbles.includes('bridge');
                
                WorldMap.init(scene, createWordlLayout(hasBridge, introType), hasDoor).then((wMap) => {
                    currentDecor = wMap.group;
                    const spawnTile = wMap.mapLayout.find(t => t.isSpawn) || wMap.mapLayout[1] || wMap.mapLayout[0];
                    const spawnPos = spawnTile.mesh.position;
                    
                    if (playerMesh) {
                        playerMesh.position.set(spawnPos.x, spawnPos.y + 1.35, spawnPos.z);
                    }
                    
                    camera.position.set(spawnPos.x, spawnPos.y + 25, spawnPos.z + 10);
                    camera.lookAt(spawnPos.x, spawnPos.y, spawnPos.z);

    
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

        const resizeObserver = new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                if (!currentDecor) {
                    renderDecor();
                } else {
    
                }
            }
        });
        resizeObserver.observe(container);
    }

    buildCardHtml(level, isCollapsed, surviveFormHtml, worldFormHtml, storyEventsHtml) {
        const bodyId = `level-body-${level.level_number}`;
        return `
            <div class="card-header collapse-toggle" style="cursor: pointer;">
                <h3 class="card-title">Niveau ${level.level_number} ${level.isNew ? "<span style='color: #4ade80;'>(Nouveau)</span>" : ""}</h3>
                <div style="display: flex; gap: 20px; align-items: center;">
                    ${!level.isNew ? `<button class="btn-delete-level" data-level="${level.level_number}" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer;">Supprimer</button>` : ''}
                    <span id="icon-${level.level_number}" style="color: #8b949e; font-size: 14px;">${isCollapsed ? '▶' : '▼'}</span>
                </div>
            </div>
            
            <div id="${bodyId}" style="display: ${isCollapsed ? 'none' : 'block'};">
                <div class="preview-container-${level.level_number} preview-container">
                    <div class="preview-badge">Aperçu 3D</div>
                </div>

                <div style="display: flex; gap: 15px; margin-bottom: 25px; align-items: center;">
                    <label class="admin-label" style="margin: 0;">Type de Phase:</label>
                    <select class="phase-type-select admin-select" style="max-width: 250px;">
                        <option value="survive" ${level.phase_type === "survive" ? "selected" : ""}>Survie (Combat)</option>
                        <option value="world" ${level.phase_type === "world" ? "selected" : ""}>World (Exploration)</option>
                    </select>
                </div>
                
                ${surviveFormHtml}
                ${worldFormHtml}
                ${storyEventsHtml}

                <button class="save-btn btn-primary">Sauvegarder le niveau ${level.level_number}</button>
            </div>
        `;
    }

    buildSurviveFormHtml(options, isSurvive) {
        return `
            <div class="survive-form story-event-block block-survive" style="display: ${isSurvive ? 'block' : 'none'};">
                <div class="block-title">⚙️ Paramètres de Survie</div>
                <div class="block-row">
                    <div style="flex: 1; min-width: 150px;">
                        <label class="admin-label">Décor :</label>
                        <select class="survive-decor block-select">
                            <option value="default" ${options.decorType === 'default' ? 'selected' : ''}>Défaut</option>
                            <option value="mine" ${options.decorType === 'mine' ? 'selected' : ''}>Mine</option>
                            <option value="styx" ${options.decorType === 'styx' ? 'selected' : ''}>Styx</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <label class="admin-label">Durée (sec) :</label>
                        <input type="number" class="survive-duration block-input" value="${options.duration || ''}" placeholder="Infini" />
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <label class="admin-label">PV Joueur :</label>
                        <input type="number" class="survive-hp block-input" value="${options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : ''}" placeholder="Immortel" />
                    </div>
                </div>
                <div class="block-row" style="margin-top: 15px;">
                    <div style="flex: 1; min-width: 150px;">
                        <label class="admin-label">Intervalle de Spawn (sec) :</label>
                        <input type="number" step="0.1" class="survive-spawn-interval block-input" value="${options.spawnInterval !== undefined && options.spawnInterval !== null ? options.spawnInterval : ''}" placeholder="Désactivé" />
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label class="admin-label">Max Ennemis :</label>
                        <input type="number" class="survive-max-enemies block-input" value="${options.maxEnemies !== undefined && options.maxEnemies !== null ? options.maxEnemies : ''}" placeholder="Désactivé" />
                    </div>
                </div>
            </div>
        `;
    }

    buildWorldFormHtml(options, isSurvive) {
        return `
            <div class="world-form story-event-block block-world" style="display: ${!isSurvive ? 'block' : 'none'};">
                <div class="block-title">⚙️ Paramètres d'Exploration</div>
                <div class="block-row">
                    <div style="flex: 1; min-width: 200px;">
                        <label class="admin-label">Type d'Intro :</label>
                        <select class="world-intro block-select">
                            <option value="staircase" ${options.introType === 'staircase' ? 'selected' : ''}>Escaliers (Staircase)</option>
                            <option value="skyfall" ${options.introType === 'skyfall' ? 'selected' : ''}>Chute du Ciel (Skyfall)</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <label class="admin-label">PV Joueur :</label>
                        <input type="number" class="world-hp block-input" value="${options.playerHp !== undefined && options.playerHp !== null ? options.playerHp : ''}" placeholder="Immortel" />
                    </div>
                </div>
            </div>
        `;
    }

    buildStoryEventsHtml(levelNumber) {
        return `
            <div style="margin-top: 30px;">
                <div class="events-section-title">🧩 Événements Narratifs (Bulles)</div>
                <div class="story-events-container-${levelNumber}" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 15px;">
                </div>
                <button class="add-story-event-btn btn-secondary" data-level="${levelNumber}">+ Ajouter un événement narratif</button>
            </div>
        `;
    }

    _setupPreviewScene(container) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0c10);
        
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
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
            alert("Vous devez être connecté.");
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
                alert("Niveau sauvegardé avec succès !");
                await this.loadLevels();
            } else {
                alert("Erreur : " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur de connexion au serveur.");
        }
    }

    async deleteLevel(levelNumber) {
        const token = localStorage.getItem("authToken");
        if (!token) {
            alert("Vous devez être connecté.");
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
                alert("Niveau supprimé avec succès !");
                await this.loadLevels();
            } else {
                alert("Erreur : " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur de connexion au serveur.");
        }
    }

    async render() {
        return this.container;
    }
}
