import { LanguageManager } from "../../core/utils/LanguageManager.js";

const DECOR_OPTIONS = [
    { value: "default", labelKey: "admin.default" },
    { value: "mine", labelKey: "admin.mine" },
    { value: "styx", labelKey: "admin.styx" },
    { value: "dungeon", labelKey: "admin.dungeon" }
];

export const PHASE_REGISTRY = [
    {
        type: "survive",
        labelKey: "admin.survivePhase",
        fields: [
            { id: "decorType", type: "select", labelKey: "admin.decor", options: DECOR_OPTIONS, defaultValue: "default" },
            { id: "duration", type: "number", labelKey: "admin.duration", placeholderKey: "admin.infinite", defaultValue: null },
            { id: "playerHp", type: "number", labelKey: "admin.playerHp", placeholderKey: "admin.immortal", defaultValue: null },
            { id: "paddingTopBottom", type: "number", labelKey: "admin.paddingTopBottom", defaultValue: 5 },
            { id: "paddingSides", type: "number", labelKey: "admin.paddingSides", defaultValue: 3 }
        ]
    },
    {
        type: "world",
        labelKey: "admin.worldPhase",
        fields: [
            { id: "introType", type: "select", labelKey: "admin.introType", options: [
                { value: "staircase", labelKey: "admin.staircase" },
                { value: "skyfall", labelKey: "admin.skyfall" }
            ], defaultValue: "staircase" },
            { id: "outroType", type: "select", labelKey: "admin.outroType", options: [
                { value: "DoorEvent", labelKey: "admin.doorEvent" },
                { value: "HoleEvent", labelKey: "admin.holeEvent" }
            ], defaultValue: "DoorEvent" },
            { id: "playerHp", type: "number", labelKey: "admin.playerHp", placeholderKey: "admin.immortal", defaultValue: null },
            { id: "worldDistance", type: "number", labelKey: "admin.worldDistance", placeholder: "30", defaultValue: 30 }
        ]
    },
    {
        type: "void",
        labelKey: "admin.voidPhase",
        descriptionKey: "admin.voidDesc",
        fields: []
    },
    {
        type: "fall",
        labelKey: "admin.fallPhase",
        descriptionKey: "admin.fallDesc",
        fields: [
            { id: "targetDepth", type: "number", labelKey: "admin.targetDepth", defaultValue: 2000 },
            { id: "decorType", type: "select", labelKey: "admin.decor", options: DECOR_OPTIONS, defaultValue: "default" }
        ]
    }
];

export const getPhaseDefinition = (phaseType) => {
    return PHASE_REGISTRY.find(p => p.type === phaseType);
};
