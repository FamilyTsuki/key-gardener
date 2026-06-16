export const ENEMY_TYPES = {
    basic: {
        id: "basic",
        color: 0x00ff00,
        speed: 0.05,
        baseHp: 50,
        label: "Basic"
    },
    speedy: {
        id: "speedy",
        color: 0x0000ff,
        speed: 0.15,
        baseHp: 10,
        label: "Speedy"
    },
    tank: {
        id: "tank",
        color: 0xff0000,
        speed: 0.02,
        baseHp: 100,
        label: "Tank"
    },
    sniper: {
        id: "sniper",
        color: 0x9b59b6,
        speed: 0,
        baseHp: 40,
        label: "Sniper"
    },
    blocker_worm: {
        id: "blocker_worm",
        color: 0xe67e22,
        speed: 0,
        baseHp: 30,
        label: "Blocker Worm"
    },
    hazard_worm: {
        id: "hazard_worm",
        color: 0xe74c3c,
        speed: 0,
        baseHp: 30,
        label: "Hazard Worm"
    },
    rigged: {
        id: "rigged",
        color: 0x8e44ad,
        speed: 0.08,
        baseHp: 75,
        label: "Rigged"
    }
};

export const getEnemyTypesList = () => Object.values(ENEMY_TYPES);
