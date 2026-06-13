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
    }
};

export const getEnemyTypesList = () => Object.values(ENEMY_TYPES);
