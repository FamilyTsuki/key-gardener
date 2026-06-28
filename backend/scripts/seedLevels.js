const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const db = require("../src/config/database");

const seedLevels = async () => {
    try {
        console.log("Seeding levels...");

        const levels = [
            {
                level_number: 1,
                phase_type: "world",
                options: {
                    introType: "skyfall",
                    dialogue: ["story.introLevel1", "story.introLevel2"],
                    dialogueModel: "/asset/game_assets/models/player.glb",
                    isSilhouetted: "true",
                    events: ["DoorEvent"]
                }
            },
            {
                level_number: 2,
                phase_type: "survive",
                options: {
                    decorType: "grotte",
                    hasOuterTiles: "false",
                    playerHp: null,
                    duration: 180,
                    spawnInterval: 6,
                    maxEnemies: 5,
                    enemyWeights: { basic: 100 },
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 2,
                            actionType: "dialogue",
                            dialogue: ["story.hubWelcome1", "story.hubWelcome2"],
                            dialogueModel: "/asset/game_assets/models/sempai.glb",
                            isSilhouetted: "true"
                        }
                    ]
                }
            },
            {
                level_number: 3,
                phase_type: "world",
                options: {
                    introType: "staircase",
                    dialogue: ["story.skillTreePrompt1", "story.skillTreePrompt2"],
                    dialogueModel: "/asset/game_assets/models/sempai.glb",
                    isSilhouetted: "true",
                    events: ["JumpWordEvent", "DoorEvent"]
                }
            },
            {
                level_number: 4,
                phase_type: "survive",
                options: {
                    decorType: "styx",
                    hasOuterTiles: "false",
                    duration: 300,
                    spawnInterval: 5,
                    maxEnemies: 8,
                    enemyWeights: { basic: 100 }
                }
            },
            {
                level_number: 5,
                phase_type: "world",
                options: {
                    introType: "skyfall",
                    dialogue: ["story.flameWallWarn1", "story.flameWallWarn2"],
                    dialogueModel: "/asset/game_assets/models/sempai.glb",
                    events: ["FlameWallEvent", "JumpWordEvent", "DoorEvent"]
                }
            },
            {
                level_number: 6,
                phase_type: "survive",
                options: {
                    decorType: "mine",
                    hasOuterTiles: "false",
                    duration: 420,
                    spawnInterval: 4,
                    maxEnemies: 12,
                    enemyWeights: { basic: 80, speedy: 20 },
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 30,
                            actionType: "spawnBoss",
                            bossType: "giant_bug",
                            dialogue: ["story.bugBossWarn1", "story.bugBossWarn2"],
                            dialogueModel: "/asset/game_assets/models/sempai.glb"
                        }
                    ]
                }
            },
            {
                level_number: 7,
                phase_type: "world",
                options: {
                    introType: "random",
                    events: ["HoleEvent", "DoorEvent"]
                }
            },
            {
                level_number: 8,
                phase_type: "survive",
                options: {
                    decorType: "dungeon",
                    duration: 600,
                    spawnInterval: 3.5,
                    maxEnemies: 18,
                    enemyWeights: { basic: 70, speedy: 30 }
                }
            },
            {
                level_number: 9,
                phase_type: "world",
                options: {
                    introType: "skyfall",
                    dialogue: ["story.skyfallWarn1", "story.skyfallWarn2"],
                    dialogueModel: "/asset/game_assets/models/sempai.glb",
                    events: ["HoleEvent", "JumpWordEvent", "DoorEvent"]
                }
            },
            {
                level_number: 10,
                phase_type: "survive",
                options: {
                    decorType: "grotte",
                    duration: null,
                    spawnInterval: null,
                    maxEnemies: 0,
                    earthBoss: true
                }
            },
            {
                level_number: 11,
                phase_type: "world",
                options: {
                    introType: "random",
                    dialogue: ["story.postEarthBoss"],
                    dialogueModel: "/asset/game_assets/models/sempai.glb",
                    events: ["TempoEvent", "HoleEvent", "DoorEvent"]
                }
            },
            {
                level_number: 12,
                phase_type: "survive",
                options: {
                    decorType: "styx",
                    duration: 720,
                    spawnInterval: 3,
                    maxEnemies: 25,
                    enemyWeights: { basic: 50, speedy: 30, tank: 10, sniper: 10 },
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 5,
                            actionType: "dialogue",
                            dialogue: ["story.midGameEncourage"],
                            dialogueModel: "/asset/game_assets/models/sempai.glb"
                        }
                    ]
                }
            },
            {
                level_number: 13,
                phase_type: "world",
                options: {
                    introType: "random",
                    events: ["FlameWallEvent", "JumpWordEvent", "DoorEvent"]
                }
            },
            {
                level_number: 14,
                phase_type: "survive",
                options: {
                    decorType: "dungeon",
                    duration: 900,
                    spawnInterval: 2.5,
                    maxEnemies: 40,
                    enemyWeights: { basic: 30, speedy: 40, tank: 20, sniper: 10 },
                    storyEvents: [
                        {
                            triggerType: "time",
                            triggerValue: 5,
                            actionType: "dialogue",
                            dialogue: ["story.finalBossWarn1", "story.finalBossWarn2"],
                            dialogueModel: "/asset/game_assets/models/sempai.glb"
                        },
                        {
                            triggerType: "time",
                            triggerValue: 90,
                            actionType: "spawnBoss",
                            bossType: "giant_bug"
                        }
                    ]
                }
            },
            {
                level_number: 15,
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
