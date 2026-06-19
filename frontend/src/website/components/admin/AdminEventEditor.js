import { el } from '../../../core/utils/DOMBuilder.js';
import { createCustomSelect } from "../../components/CustomSelect.js";
import { LanguageManager } from '../../../core/utils/LanguageManager.js';
import { ENEMY_TYPES } from '../../../game/constants/EnemyTypes.js';

export class AdminEventEditor {
    constructor(eventDefinition, eventData, callbacks) {
        this.definition = eventDefinition;
        this.data = eventData;
        this.onRemove = callbacks.onRemove;
        this.onChangeType = callbacks.onChangeType;
        this.inputs = {};
        this.container = el("div", { className: `story-event-block block-${this.definition.type}` });
    }

    render(availableEvents) {
        this.container.innerHTML = "";
        this.renderRemoveButton();
        this.container.appendChild(this.renderHeader(availableEvents));
        
        if (!this.definition.hideTrigger) {
            this.container.appendChild(this.renderTrigger());
        }

        this.container.appendChild(this.renderFields());
        return this.container;
    }

    renderRemoveButton() {
        const removeBtn = el("button", { className: "remove-evt-btn" }, "X");
        removeBtn.addEventListener('click', this.onRemove);
        this.container.appendChild(removeBtn);
    }

    renderHeader(availableEvents) {
        const options = availableEvents.map(e => ({ 
            value: e.type, 
            label: LanguageManager.t(e.labelKey) 
        }));
        
        const select = createCustomSelect(options, this.definition.type, null, "evt-action-type admin-compact-select");
        select.addEventListener('change', (e) => this.onChangeType(e.target.value));
        this.inputs.actionType = () => select.value;

        return el("div", { className: "block-row action-row" },
            el("strong", {}, LanguageManager.t("admin.action")),
            select
        );
    }

    renderTrigger() {
        const triggerOptions = [
            { value: "time", label: LanguageManager.t("admin.afterTime") },
            { value: "distance", label: LanguageManager.t("admin.atDistance") }
        ];
        
        const select = createCustomSelect(triggerOptions, this.data.triggerType || "time", null, "evt-trigger-type admin-compact-select");
        const input = el("input", { 
            type: "number", 
            className: "evt-trigger-value block-input compact-input", 
            value: this.data.triggerValue !== undefined ? this.data.triggerValue : 10 
        });
        
        this.inputs.triggerType = () => select.value;
        this.inputs.triggerValue = () => Number(input.value) || 0;

        return el("div", { className: "evt-trigger-container block-row" },
            el("label", {}, LanguageManager.t("admin.when")),
            select,
            input
        );
    }

    renderFields() {
        const row = el("div", { className: "block-row" });
        this.definition.fields.forEach(field => {
            row.appendChild(this.renderField(field));
        });
        return row;
    }

    renderField(field) {
        const group = el("div", { className: "form-group compact-group" });
        const labelText = field.labelKey ? LanguageManager.t(field.labelKey) : field.label;
        group.appendChild(el("label", { className: "admin-label" }, labelText));

        const value = this.getFieldValue(field);
        this.createInputForField(field, group, value);

        return group;
    }

    getFieldValue(field) {
        if (this.data[field.id] !== undefined) {
            return this.data[field.id];
        }
        return field.defaultValue;
    }

    createInputForField(field, group, value) {
        if (field.type === "select") {
            this.createSelectField(field, group, value);
        } else if (field.type === "number") {
            this.createNumberField(field, group, value);
        } else if (field.type === "text" || field.type === "textarea") {
            this.createTextField(field, group, value);
        } else if (field.type === "weights") {
            this.createWeightsField(field, group);
        }
    }

    createSelectField(field, group, value) {
        const options = field.options.map(opt => ({
            value: opt.value,
            label: opt.labelKey ? LanguageManager.t(opt.labelKey) : opt.label
        }));
        
        const select = createCustomSelect(options, value, null, `${field.id}-select admin-compact-select`);
        this.inputs[field.id] = () => select.value;
        group.appendChild(select);
    }

    createNumberField(field, group, value) {
        const input = el("input", { 
            type: "number", 
            className: "block-input", 
            value: value !== null ? value : '', 
            step: field.step || "1" 
        });
        this.inputs[field.id] = () => input.value ? Number(input.value) : null;
        group.appendChild(input);
    }

    createTextField(field, group, value) {
        const isTextarea = field.type === "textarea";
        const input = el(isTextarea ? "textarea" : "input", { 
            type: isTextarea ? undefined : "text",
            className: `block-${field.type}`,
            value: value
        });
        
        if (isTextarea) {
            input.value = Array.isArray(value) ? value.join("\n") : value;
        }

        this.inputs[field.id] = () => {
            if (isTextarea) {
                return input.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            }
            return input.value;
        };
        group.appendChild(input);
    }

    createWeightsField(field, group) {
        const weightsContainer = el("div", { className: "spawner-weights-container" });
        const weightInputs = {};

        for (const [typeKey, config] of Object.entries(ENEMY_TYPES)) {
            const currentWeight = this.getWeightValue(typeKey);
            const wInput = el("input", { type: "number", min: "0", className: "block-input compact-input", value: currentWeight });
            
            weightInputs[typeKey] = () => Number(wInput.value) || 0;
            
            weightsContainer.appendChild(el("div", { className: "weight-field-group" },
                el("label", { className: "admin-label" }, `${config.label} (%) : `),
                wInput
            ));
        }

        this.inputs[field.id] = () => this.collectWeights(weightInputs);
        group.appendChild(weightsContainer);
    }

    getWeightValue(typeKey) {
        if (this.data.enemyWeights && this.data.enemyWeights[typeKey] !== undefined) {
            return this.data.enemyWeights[typeKey];
        }
        return 0;
    }

    collectWeights(weightInputs) {
        const weights = {};
        for (const [key, getVal] of Object.entries(weightInputs)) {
            weights[key] = getVal();
        }
        return weights;
    }

    getValues() {
        const values = { isTriggered: false };
        for (const [key, getter] of Object.entries(this.inputs)) {
            values[key] = getter();
        }
        return values;
    }
}
