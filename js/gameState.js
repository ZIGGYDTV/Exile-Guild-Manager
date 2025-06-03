// Resistance system constants
const RESISTANCE_CAPS = {
    default: 75,        // Normal resistance cap
    hardMax: 90         // Absolute maximum (even with +max res gear)
};

// Time system - separate for future expansion (seasons, weather, events)
const timeState = {
    currentDay: 1
    // Future: season, weather, special events, etc.
};

// Updated gameState with class, passive, and world systems
const gameState = {
    exile: {
        name: "Grimjaw",
        class: null, // Will be randomized on creation
        level: 1,
        experience: 0,
        experienceNeeded: 100,
        morale: 75,

        // Passive system
        passives: {
            allocated: [], // Starting with no passives (given a random one via game.js)
            pendingPoints: 0, // Points available to spend
            rerollsUsed: 0 // Resets each level-up choice
        },

        stats: {
            // Current calculated stats (base + gear + passives)
            life: 105, // Will be recalculated based on class
            damage: 11,
            defense: 5,

            // Resistance values
            fireResist: 0,
            coldResist: 0,
            lightningResist: 0,
            chaosResist: 0,

            // Utility stats
            goldFindBonus: 0, // Increases gold dropped by monsters
            escapeChance: 0, // not imtlemented yet
            moraleResistance: 0, // morale "stability" vs "volatility"
            moraleGain: 0, // Increases morale gain from missions
            scoutingBonus: 1.0  // 1.0 = normal, 1.5 = 50% better discovery, etc.

        },

        // Base stats from class (set during exile creation)
        baseStats: {
            life: 105, // Will match class baseStats
            damage: 11,
            defense: 5
        }
    },

    resources: {
        gold: 0,
        chaosOrbs: 0,
        exaltedOrbs: 0
    },

    inventory: {
        equipped: {
            weapon: null,
            helmet: null,
            chest: null,
            gloves: null,
            boots: null,
            shield: null,
            ring1: null,
            ring2: null,
            amulet: null,
            belt: null
        },
        backpack: []
    },

    // Exile Death new exile init
    fallenExiles: [],  // Array to store dead exiles with all their data
    nextExileId: 1,    // Counter for unique exile IDs

    // NEW: World state tracking for areas, missions, and discoveries
    worldState: {
        areas: {
            beach: {
                discovered: true,
                explorationProgress: 0,
                totalScoutingProgress: 0,        // NEW: Single progress tracker
                unlockedScoutingInfo: {},        // NEW: Tracks which info is unlocked

                missions: {
                    shorelineExploration: {
                        discovered: true,
                        completions: 0,
                        firstCompleted: false,
                        lastCompleted: null,
                        availableAgainOnDay: null
                    }
                }
            },
            // Future areas will be added here as they're discovered
        },

        // Connections between areas and their unlock status
        connections: {
            beach_to_swamp: {
                discovered: false,  // Has the player learned this connection exists?
                unlocked: false,    // Can the player actually travel there?
                unlockType: "boss", // What type of requirement: "exploration", "boss", "discovery"
                unlockRequirement: "tidePoolBoss" // Specific requirement (boss kill, 75% exploration, etc.)
            }
            // Future connections will be discovered through gameplay
        }
    },

    assignments: [
    // Will contain: { exileName: "Grimjaw", areaId: "beach", missionId: "shorelineExploration" }
    // Empty array means no assignments
],

// PLACEHOLDER exiles for UI testing (will be replaced with real multi-exile system later)
placeholderExiles: [
    {
        name: "TestExile1",
        level: 3,
        experience: 150,
        experienceNeeded: 400,
        morale: 85,
        stats: { life: 150, damage: 25, defense: 12 }
    },
    {
        name: "TestExile2", 
        level: 1,
        experience: 45,
        experienceNeeded: 100,
        morale: 60,
        stats: { life: 105, damage: 11, defense: 5 }
    }
],

    settings: {
        autoSave: true
    }
};