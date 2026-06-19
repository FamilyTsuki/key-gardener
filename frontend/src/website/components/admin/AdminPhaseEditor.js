import { el } from '../../../core/utils/DOMBuilder.js';
import { createCustomSelect } from "../../components/CustomSelect.js";
import { LanguageManager } from '../../../core/utils/LanguageManager.js';

export class AdminPhaseEditor {
    constructor(phaseDefinition, options) {
        this.definition = phaseDefinition;
        this.options = options || {};
        this.inputs = {};
    }

    render() {
        const row = el("div", { className: "block-row" });
        this.definition.fields.forEach(field => {
            row.appendChild(this.renderField(field));
        });

        return el("div", { className: `phase-form block-${this.definition.type}` },
            el("div", { className: "block-title" }, LanguageManager.t(this.definition.labelKey)),
            this.renderDescription(),
            row
        );
    }

    renderDescription() {
        if (!this.definition.descriptionKey) return null;
        return el("p", { className: "admin-desc" }, LanguageManager.t(this.definition.descriptionKey));
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
        if (this.options[field.id] !== undefined) {
            return this.options[field.id];
        }
        return field.defaultValue;
    }

    createInputForField(field, group, value) {
        if (field.type === "select") {
            this.createSelectField(field, group, value);
        } else if (field.type === "number") {
            this.createNumberField(field, group, value);
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
        const input = el("input", { type: "number", className: "block-input", value: value !== null ? value : '' });
        
        if (field.placeholderKey) {
            input.placeholder = LanguageManager.t(field.placeholderKey);
        } else if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        this.inputs[field.id] = () => input.value ? Number(input.value) : null;
        group.appendChild(input);
    }

    getValues() {
        const values = {};
        for (const [key, getter] of Object.entries(this.inputs)) {
            values[key] = getter();
        }
        return values;
    }
}
