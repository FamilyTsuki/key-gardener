const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const db = require("../src/config/database");

const seedLevels = async () => {
    try {
        console.log("Seeding levels...");

        const levels = [
            {
                level_number: 1,
                phase_type: "survive",
                options: {
                    decorType: "styx",
                    duration: 60,
                    spawnInterval: 3,
                    maxEnemies: 20
                }
            },
            {
                level_number: 2,
                phase_type: "world",
                options: {
                    introType: "random",
                    dialogue: ["Bienvenue dans le Hub.", "Trouve la porte pour avancer."],
                    dialogueModel: "/asset/game_assets/models/player.glb",
                    events: ["TempoEvent", "DoorEvent"]
                }
            },
            {
                level_number: 3,
                phase_type: "world",
                options: {
                    introType: "skyfall",
                    dialogue: ["Attention !", "Ce pont est gardé par des flammes."],
                    dialogueModel: "/asset/game_assets/models/player.glb",
                    events: ["FlameWallEvent", "JumpWordEvent", "HoleEvent"]
                }
            },
            {
                level_number: 4,
                phase_type: "survive",
                options: {
                    decorType: "mine",
                    duration: 120,
                    spawnInterval: 2,
                    maxEnemies: 30,
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 10,
                            actionType: "spawnBoss",
                            dialogue: ["Un signal suspect a été détecté...", "Le Virus suprême s'éveille !"],
                            dialogueModel: "/asset/game_assets/models/bug.glb"
                        }
                    ]
                }
            },
            {
                level_number: 5,
                phase_type: "survive",
                options: {
                    decorType: "styx",
                    duration: null,
                    spawnInterval: null,
                    maxEnemies: 0,
                    boss: true
                }
            },
            {
                level_number: 6,
                phase_type: "survive",
                options: {
                    decorType: "grotte",
                    duration: null,
                    spawnInterval: null,
                    maxEnemies: 0,
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 0.1,
                            actionType: "spawnBoss",
                            bossType: "earth_boss",
                            dialogue: ["Le noyau terrestre tremble...", "Le protecteur tellurique s'éveille !"],
                            dialogueModel: "/asset/game_assets/models/earth-boss.glb"
                        }
                    ]
                }
            },
            {
                level_number: 7,
                phase_type: "void",
                options: {}
            }
        ];

        for (const level of levels) {
            await db.query(
                `INSERT INTO levels_config (level_number, phase_type, options) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (level_number) 
                 DO UPDATE SET phase_type = EXCLUDED.phase_type, options = EXCLUDED.options`,
                [level.level_number, level.phase_type, level.options]
            );
            console.log(`Level ${level.level_number} inserted/exists.`);
        }

        console.log("✅ Seeding complete.");
    } catch (error) {
        console.error("❌ Error seeding levels:", error);
    } finally {
        process.exit();
    }
};

seedLevels();
