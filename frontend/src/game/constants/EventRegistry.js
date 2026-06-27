import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { ENEMY_TYPES } from "./EnemyTypes.js";

/**
 * Builds the enemy options.
 */
const buildEnemyOptions = () => {
    return [
        { value: "basic", labelKey: "admin.basic" },
        { value: "speedy", labelKey: "admin.speedy" },
        { value: "tank", labelKey: "admin.tank" },
        { value: "sniper", labelKey: "admin.sniper" },
        { value: "blocker_worm", labelKey: "admin.blocker_worm" },
        { value: "hazard_worm", labelKey: "admin.hazard_worm" },
        { value: "random", labelKey: "admin.random" }
    ];
};

const SPAWNER_END_CONDITIONS = [
    { value: "none", label: "Infini / Aucun" },
    { value: "time", label: "Par temps" },
    { value: "spawn_count", label: "Par apparitions" },
    { value: "kills", label: "Par éliminations" }
];

const BOSS_TYPES = [
    { value: "octopus", label: "Octopus (Tentacle)" },
    { value: "giant_bug", label: "Giant Bug" },
    { value: "earth_boss", label: "Earth Boss (Laser)" }
];

export const EVENT_REGISTRY = [
    {
        type: "dialogue",
        labelKey: "admin.actionDialogue",
        availableIn: ["survive", "world", "fall", "void", "training"],
        fields: [
            { id: "dialogueModel", type: "text", labelKey: "admin.model3D", defaultValue: "/asset/game_assets/models/player.glb" },
            { id: "dialogue", type: "textarea", labelKey: "admin.dialogues", placeholderKey: "admin.dialoguePlaceholder", defaultValue: "" }
        ]
    },
    {
        type: "heal",
        labelKey: "admin.actionHeal",
        availableIn: ["survive", "world", "fall", "void", "training"],
        fields: [
            { id: "healAmount", type: "number", labelKey: "admin.hp", defaultValue: 50 }
        ]
    },
    {
        type: "spawn",
        labelKey: "admin.actionSpawn",
        availableIn: ["survive"],
        fields: [
            { id: "enemyType", type: "select", labelKey: "admin.enemyType", options: buildEnemyOptions(), defaultValue: "basic" },
            { id: "spawnCount", type: "number", labelKey: "admin.spawnCount", defaultValue: 1 },
            { id: "minSpawnDistance", type: "number", labelKey: "admin.minSpawnDistance", defaultValue: 5 },
            { id: "maxSpawnDistance", type: "number", labelKey: "admin.maxSpawnDistance", defaultValue: 999 }
        ]
    },
    {
        type: "spawnBoss",
        labelKey: "admin.actionSpawnBoss",
        availableIn: ["survive"],
        fields: [
            { id: "bossType", type: "select", label: "Boss Type", options: BOSS_TYPES, defaultValue: "octopus" }
        ]
    },
    {
        type: "spawnerConfig",
        labelKey: "admin.actionConfigSpawner",
        availableIn: ["survive"],
        fields: [
            { id: "spawnInterval", type: "number", step: "0.1", labelKey: "admin.spawnIntervalConfig", defaultValue: 3 },
            { id: "maxEnemies", type: "number", labelKey: "admin.maxEnemies", defaultValue: 20 },
            { id: "minSpawnDistance", type: "number", label: "Dist. Min :", defaultValue: 5 },
            { id: "maxSpawnDistance", type: "number", label: "Dist. Max :", defaultValue: 999 },
            { id: "spawnerEndCondition", type: "select", label: "Arrêt spawner :", options: SPAWNER_END_CONDITIONS, defaultValue: "none" },
            { id: "spawnerDuration", type: "number", label: "Temps max (sec) :", defaultValue: null },
            { id: "spawnerSpawnLimit", type: "number", label: "Limite apparitions :", defaultValue: null },
            { id: "spawnerKillTarget", type: "number", label: "Ennemis à tuer :", defaultValue: null },
            { id: "enemyWeights", type: "weights", label: "Poids d'apparition :" }
        ]
    },
    {
        type: "expandMap",
        labelKey: "admin.actionExpandMap",
        availableIn: ["survive"],
        fields: [
            { id: "padSides", type: "number", labelKey: "admin.expandSides", defaultValue: 3 },
            { id: "padTB", type: "number", labelKey: "admin.expandTB", defaultValue: 5 }
        ]
    },
    {
        type: "sempaiRescue",
        labelKey: "admin.actionSempaiRescue",
        availableIn: ["survive"],
        fields: []
    },
    {
        type: "bridge",
        labelKey: "admin.actionBridge",
        availableIn: ["world"],
        fields: [
            { id: "tileDistance", type: "number", labelKey: "admin.tileDistance", defaultValue: 0 },
            { id: "difficultyMultiplier", type: "number", step: "0.1", labelKey: "admin.difficultyMultiplier", defaultValue: 1 }
        ],
        hideTrigger: true
    },
    {
        type: "jumpword",
        labelKey: "admin.actionJump",
        availableIn: ["world"],
        fields: [
            { id: "tileDistance", type: "number", labelKey: "admin.tileDistance", defaultValue: 0 },
            { id: "difficultyMultiplier", type: "number", step: "0.1", labelKey: "admin.difficultyMultiplier", defaultValue: 1 }
        ],
        hideTrigger: true
    },
    {
        type: "flamewall",
        labelKey: "admin.actionFlame",
        availableIn: ["world"],
        fields: [
            { id: "tileDistance", type: "number", labelKey: "admin.tileDistance", defaultValue: 0 },
            { id: "difficultyMultiplier", type: "number", step: "0.1", labelKey: "admin.difficultyMultiplier", defaultValue: 1 }
        ],
        hideTrigger: true
    }
];

/**
 * Retrieves the eventdefinition.
 * @param {any} eventType - The eventType.
 */
export const getEventDefinition = (eventType) => {
    return EVENT_REGISTRY.find(e => e.type === eventType);
};

/**
 * Retrieves the eventsforphase.
 * @param {any} phaseType - The phaseType.
 */
export const getEventsForPhase = (phaseType) => {
    return EVENT_REGISTRY.filter(e => e.availableIn.includes(phaseType));
};
