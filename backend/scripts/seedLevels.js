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
                    dialogueModel: "/asset/game_assets/player.glb",
                    events: ["TempoEvent", "DoorEvent"]
                }
            },
            {
                level_number: 3,
                phase_type: "world",
                options: {
                    introType: "skyfall",
                    dialogue: ["Attention !", "Ce pont est gardé par des flammes."],
                    dialogueModel: "/asset/game_assets/player.glb",
                    events: ["FlameWallEvent", "DoorEvent"]
                }
            },
            {
                level_number: 4,
                phase_type: "survive",
                options: {
                    decorType: "mine",
                    duration: 120,
                    spawnInterval: 2,
                    maxEnemies: 30
                }
            }
        ];

        for (const level of levels) {
            await db.query(
                `INSERT INTO levels_config (level_number, phase_type, options) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (level_number) DO NOTHING`,
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
