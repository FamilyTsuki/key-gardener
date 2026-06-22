import { el, clear } from '../../../core/utils/DOMBuilder.js';
import { LanguageManager } from '../../../core/utils/LanguageManager.js';
import { FlashMessageManager } from '../../../core/utils/FlashMessageManager.js';
import { PHASE_REGISTRY, getPhaseDefinition, injectDynamicPhases } from "../../../game/constants/PhaseRegistry.js";
import { getEventsForPhase, getEventDefinition } from "../../../game/constants/EventRegistry.js";
import { AdminPhaseEditor } from "./AdminPhaseEditor.js";
import { AdminEventEditor } from "./AdminEventEditor.js";
import { AdminPreview3D } from "./AdminPreview3D.js";
import { createCustomSelect } from "../CustomSelect.js";

export class AdminLevelManager {
    constructor(sidebarContainer, mainContainer) {
        this.sidebarContainer = sidebarContainer;
        this.mainContainer = mainContainer;
        this.levels = [];
        this.activeLevelNumber = null;
        this.currentLevel = null;
        
        this.currentPhaseEditor = null;
        this.currentEventEditors = [];
        this.preview3D = null;
    }

    async init() {
        await this.loadDynamicEntities();
        await this.loadLevels();
    }

    async loadDynamicEntities() {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch("/api/admin/entities", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.phases) {
                injectDynamicPhases(data.phases);
            }
        } catch (e) {
            console.warn("Could not load dynamic entities:", e);
        }
    }

    async loadLevels() {
        try {
            const response = await fetch("/api/levels");
            const data = await response.json();

            if (!data.success) {
                this.showError(data.message || LanguageManager.t("admin.errorLoad"));
                return;
            }

            this.levels = data.configs;
            this.renderSidebar();
            this.renderMainContent();
        } catch (e) {
            console.error(e);
            this.showError(LanguageManager.t("admin.errorServer"));
        }
    }

    showError(message) {
        clear(this.mainContainer);
        this.mainContainer.appendChild(el("div", { className: "admin-error-msg" }, message));
    }

    renderSidebar() {
        this.sidebarContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
        clear(this.sidebarContainer);

        const listContainer = el("div", { id: "levels-list", className: "levels-list" });

        this.sidebarContainer.appendChild(
            el("div", { className: "sidebar-inner" },
                el("h2", { className: "sidebar-title" }, LanguageManager.t("admin.title")),
                el("div", { className: "sidebar-actions" },
                    el("button", { className: "btn-secondary btn-sm", onclick: () => this.exportLevels() }, LanguageManager.t("admin.exportLevels")),
                    el("button", { className: "btn-secondary btn-sm", onclick: () => this.importLevels() }, LanguageManager.t("admin.importLevels"))
                ),
                listContainer
            )
        );

        this.populateLevelsList(listContainer);
    }

    populateLevelsList(listContainer) {
        const maxLevel = this.levels.reduce((max, l) => Math.max(max, l.level_number), 0);
        const newLevel = this.createNewLevelObject(maxLevel + 1);
        const allLevels = [...this.levels, newLevel];

        if (this.activeLevelNumber === null && allLevels.length > 0) {
            this.activeLevelNumber = allLevels[0].level_number;
        }

        allLevels.forEach((level) => {
            const displayName = level.isNew ? LanguageManager.t("admin.addLevel") : `${LanguageManager.t("admin.level")} ${level.level_number}`;
            const phaseLabel = level.isNew ? LanguageManager.t("admin.createNewLevel") : LanguageManager.t(getPhaseDefinition(level.phase_type)?.labelKey || level.phase_type);

            const btn = el("button", {
                className: `level-item-btn${level.level_number === this.activeLevelNumber ? " active" : ""}`,
                onclick: () => this.selectLevel(level.level_number)
            },
                el("span", { className: "level-btn-number" }, displayName),
                el("span", { className: "level-btn-type" }, phaseLabel)
            );

            listContainer.appendChild(btn);
        });
    }

    createNewLevelObject(levelNumber) {
        return {
            level_number: levelNumber,
            phase_type: "survive",
            options: { decorType: "styx", duration: 60, spawnInterval: 3, maxEnemies: 20 },
            isNew: true
        };
    }

    selectLevel(levelNumber) {
        this.activeLevelNumber = levelNumber;
        this.renderSidebar();
        this.renderMainContent();
    }

    renderMainContent() {
        this.mainContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
        clear(this.mainContainer);

        const allLevels = [...this.levels, this.createNewLevelObject(this.levels.reduce((max, l) => Math.max(max, l.level_number), 0) + 1)];
        this.currentLevel = allLevels.find(l => l.level_number === this.activeLevelNumber);

        if (!this.currentLevel) {
            this.mainContainer.appendChild(
                el("div", { className: "admin-welcome-screen" },
                    el("h3", {}, LanguageManager.t("admin.selectLevelTitle")),
                    el("p", {}, LanguageManager.t("admin.selectLevelDesc"))
                )
            );
            return;
        }

        this.renderLevelEditor();
    }

    renderLevelEditor() {
        this.currentEventEditors = [];

        this.mainContainer.appendChild(this.renderLevelHeader());
        
        const previewContainer = el("div", { className: "preview-container" },
            el("div", { className: "preview-badge" }, LanguageManager.t("admin.preview3D"))
        );
        this.mainContainer.appendChild(previewContainer);
        
        const card = el("div", { className: "admin-editor-card" });
        card.appendChild(this.renderPhaseSelector());
        
        this.phaseContainer = el("div", { className: "admin-phase-container" });
        card.appendChild(this.phaseContainer);
        
        this.eventsContainer = el("div", { className: "admin-story-events" });
        card.appendChild(this.eventsContainer);
        
        card.appendChild(this.renderActionButtons());
        this.mainContainer.appendChild(card);

        this.renderPhaseEditor();
        this.renderEventEditors();
        
        if (this.preview3D) {
            this.preview3D.destroy();
        }
        this.preview3D = new AdminPreview3D(previewContainer);
        this.updatePreview();
    }

    renderLevelHeader() {
        const levelTitleText = `${LanguageManager.t("admin.level")} ${this.currentLevel.level_number} `;
        const newLevelSpan = this.currentLevel.isNew ? el("span", { className: "admin-new-level" }, LanguageManager.t("admin.new")) : null;
        
        const deleteBtn = !this.currentLevel.isNew ? el("button", { 
            className: "btn-delete-level", 
            onclick: () => this.handleDeleteLevel()
        }, LanguageManager.t("admin.deleteLevel")) : null;

        return el("div", { className: "admin-view-header" },
            el("div", { className: "admin-title-group" },
                el("h1", { className: "admin-title" }, levelTitleText, newLevelSpan),
                el("p", { className: "admin-subtitle" }, LanguageManager.t("admin.editConfig"))
            ),
            el("div", { className: "admin-header-actions" }, deleteBtn)
        );
    }

    renderPhaseSelector() {
        const phaseOptions = PHASE_REGISTRY.map(p => ({
            value: p.type,
            label: LanguageManager.t(p.labelKey)
        }));
        
        const select = createCustomSelect(phaseOptions, this.currentLevel.phase_type || "survive", null, "phase-type-select admin-compact-select");
        select.addEventListener('change', (e) => this.handlePhaseChange(e.target.value));

        return el("div", { className: "admin-phase-row" },
            el("label", { className: "admin-label" }, LanguageManager.t("admin.phaseType")),
            select
        );
    }

    handlePhaseChange(newPhaseType) {
        this.currentLevel.phase_type = newPhaseType;
        this.currentLevel.options = {}; 
        this.currentLevel.options.storyEvents = []; 
        this.renderPhaseEditor();
        this.renderEventEditors();
        this.updatePreview();
    }

    renderPhaseEditor() {
        this.phaseContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
        clear(this.phaseContainer);
        const phaseDef = getPhaseDefinition(this.currentLevel.phase_type || "survive");
        this.currentPhaseEditor = new AdminPhaseEditor(phaseDef, this.currentLevel.options);
        
        const editorElement = this.currentPhaseEditor.render();
        editorElement.addEventListener('input', () => this.updatePreview());
        editorElement.addEventListener('change', () => this.updatePreview());

        this.phaseContainer.appendChild(editorElement);
    }

    renderEventEditors() {
        this.eventsContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
        clear(this.eventsContainer);
        this.eventsContainer.appendChild(el("div", { className: "events-section-title" }, LanguageManager.t("admin.storyEvents")));
        
        const list = el("div", { className: "events-list" });
        const initialEvents = this.getInitialEvents();
        
        this.currentEventEditors = [];
        initialEvents.forEach(evt => this.addEventEditor(evt, list));

        this.eventsContainer.appendChild(list);
    }

    getInitialEvents() {
        const options = this.currentLevel.options || {};
        const events = [];
        
        if (this.currentLevel.phase_type === 'world' && options.events) {
            options.events.forEach(eConfig => {
                const eType = typeof eConfig === 'string' ? eConfig : eConfig.type;
                const dist = typeof eConfig === 'string' ? 15 : (eConfig.tileDistance || 15);
                const diffMulti = typeof eConfig === 'string' ? 1 : (eConfig.difficultyMultiplier || 1);

                if (eType === 'DoorEvent' || eType === 'HoleEvent') {
                    options.outroType = eType;
                } else if (eType === 'BridgeWordEvent') {
                    events.push({ actionType: 'bridge', tileDistance: dist, difficultyMultiplier: diffMulti });
                } else if (eType === 'JumpWordEvent') {
                    events.push({ actionType: 'jumpword', tileDistance: dist, difficultyMultiplier: diffMulti });
                } else if (eType === 'FlameWallEvent') {
                    events.push({ actionType: 'flamewall', tileDistance: dist, difficultyMultiplier: diffMulti });
                }
            });
        }
        
        if (options.storyEvents) {
            events.push(...options.storyEvents);
        }
        return events;
    }

    addEventEditor(evt, container) {
        const availableEvents = getEventsForPhase(this.currentLevel.phase_type || "survive");
        if (availableEvents.length === 0) return;

        const eventDef = getEventDefinition(evt.actionType) || availableEvents[0];
        if (!eventDef) return;

        const editor = new AdminEventEditor(eventDef, evt, {
            onRemove: () => {
                this.currentEventEditors = this.currentEventEditors.filter(e => e !== editor);
                editor.container.remove();
                this.updatePreview();
            },
            onChangeType: (newType) => {
                const newDef = getEventDefinition(newType);
                if (!newDef) return;
                
                const newData = {
                    actionType: newType,
                    triggerType: editor.inputs.triggerType ? editor.inputs.triggerType() : "time",
                    triggerValue: editor.inputs.triggerValue ? editor.inputs.triggerValue() : 10
                };
                
                const newEditor = this.createConfiguredEventEditor(newDef, newData, editor, availableEvents, container);
                
                const idx = this.currentEventEditors.indexOf(editor);
                if (idx !== -1) {
                    this.currentEventEditors[idx] = newEditor;
                }
                
                this.updatePreview();
            }
        });

        this.currentEventEditors.push(editor);
        const editorElement = editor.render(availableEvents);
        
        editorElement.addEventListener('input', () => this.updatePreview());
        editorElement.addEventListener('change', () => this.updatePreview());
        
        container.appendChild(editorElement);
    }

    createConfiguredEventEditor(newDef, newData, oldEditor, availableEvents, container) {
         const newEditor = new AdminEventEditor(newDef, newData, {
             onRemove: oldEditor.onRemove,
             onChangeType: oldEditor.onChangeType
         });
         
         const newElement = newEditor.render(availableEvents);
         newElement.addEventListener('input', () => this.updatePreview());
         newElement.addEventListener('change', () => this.updatePreview());
         
         container.replaceChild(newElement, oldEditor.container);
         return newEditor;
    }

    renderActionButtons() {
        const addBtn = el("button", { className: "add-story-event-btn btn-secondary" }, LanguageManager.t("admin.addEvent"));
        addBtn.addEventListener('click', () => {
            const list = this.eventsContainer.querySelector('.events-list');
            this.addEventEditor({ actionType: "dialogue" }, list);
            this.updatePreview();
        });

        const saveBtn = el("button", { className: "save-btn btn-primary" }, `${LanguageManager.t("admin.saveLevel")} ${this.currentLevel.level_number}`);
        saveBtn.addEventListener('click', () => this.handleSaveLevel());

        return el("div", { className: "editor-actions-row" }, addBtn, saveBtn);
    }

    updatePreview() {
        if (!this.preview3D) return;
        const phaseOptions = this.currentPhaseEditor ? this.currentPhaseEditor.getValues() : {};
        const storyEvents = this.currentEventEditors.map(editor => editor.getValues());
        this.preview3D.renderPreview(this.currentLevel.phase_type, phaseOptions, storyEvents);
    }

    async handleSaveLevel() {
        const phaseOptions = this.currentPhaseEditor.getValues();
        const rawEvents = this.currentEventEditors.map(editor => editor.getValues());
        
        if (this.currentLevel.phase_type === 'world') {
            phaseOptions.events = [];
            phaseOptions.storyEvents = [];
            
            if (phaseOptions.outroType) {
                phaseOptions.events.push(phaseOptions.outroType);
            }
            
            rawEvents.forEach(evt => {
                if (evt.actionType === 'bridge') phaseOptions.events.push({ type: 'BridgeWordEvent', tileDistance: evt.tileDistance, difficultyMultiplier: evt.difficultyMultiplier });
                else if (evt.actionType === 'jumpword') phaseOptions.events.push({ type: 'JumpWordEvent', tileDistance: evt.tileDistance, difficultyMultiplier: evt.difficultyMultiplier });
                else if (evt.actionType === 'flamewall') phaseOptions.events.push({ type: 'FlameWallEvent', tileDistance: evt.tileDistance, difficultyMultiplier: evt.difficultyMultiplier });
                else phaseOptions.storyEvents.push(evt);
            });
        } else {
            phaseOptions.storyEvents = rawEvents;
        }
        
        const token = localStorage.getItem("authToken");
        if (!token) {
            FlashMessageManager.show(LanguageManager.t("auth.loginRequired"), "error");
            return;
        }

        try {
            const response = await fetch(`/api/levels/${this.currentLevel.level_number}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ phase_type: this.currentLevel.phase_type, options: phaseOptions })
            });

            const data = await response.json();

            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("admin.saveSuccess"), "success");
                await this.loadLevels();
            } else {
                FlashMessageManager.show(LanguageManager.t("admin.errorPrefix") + data.message, "error");
            }
        } catch (e) {
            console.error(e);
            FlashMessageManager.show(LanguageManager.t("admin.errorServer"), "error");
        }
    }

    async handleDeleteLevel() {
        const confirmed = await FlashMessageManager.confirm(`${LanguageManager.t("admin.confirmDelete")} ${this.currentLevel.level_number} ?`);
        if (!confirmed) return;

        const token = localStorage.getItem("authToken");
        if (!token) {
            FlashMessageManager.show(LanguageManager.t("auth.loginRequired"), "error");
            return;
        }

        try {
            const response = await fetch(`/api/levels/${this.currentLevel.level_number}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("admin.deleteSuccess"), "success");
                this.activeLevelNumber = null;
                await this.loadLevels();
            } else {
                FlashMessageManager.show(LanguageManager.t("admin.errorPrefix") + data.message, "error");
            }
        } catch (e) {
            console.error(e);
            FlashMessageManager.show(LanguageManager.t("admin.errorServer"), "error");
        }
    }

    exportLevels() {
        if (!this.levels || this.levels.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.levels, null, 2));
        const downloadAnchorNode = el('a', { href: dataStr, download: "levels_export.json" });
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importLevels() {
        const input = el('input', { type: 'file', accept: 'application/json' });
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = async readerEvent => {
                this.processImportedFile(readerEvent.target.result);
            }
        }
        input.click();
    }

    async processImportedFile(content) {
        try {
            const importedLevels = JSON.parse(content);
            if (!Array.isArray(importedLevels)) {
                FlashMessageManager.show(LanguageManager.t("admin.invalidJsonFormat"), "error");
                return;
            }
            
            const confirmed = await FlashMessageManager.confirm(LanguageManager.t("admin.confirmImportMsg").replace("{count}", importedLevels.length));
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
            
            FlashMessageManager.show(LanguageManager.t("admin.importSuccessMsg").replace("{success}", successCount).replace("{total}", importedLevels.length), "success");
            await this.loadLevels();
        } catch (err) {
            console.error(err);
            FlashMessageManager.show(LanguageManager.t("admin.errorReadJson"), "error");
        }
    }

    destroy() {
        if (this.preview3D) {
            this.preview3D.destroy();
            this.preview3D = null;
        }
        this.sidebarContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
        this.mainContainer.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
    }
}
