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

            // Bonus stats for future expansion
            goldFindBonus: 0,
            escapeChance: 0,
            moraleResistance: 0,
            moraleGain: 0
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
            armor: null,
            jewelry: null
        },
        backpack: []
    },

    // NEW: World state tracking for areas, missions, and discoveries
    worldState: {
        areas: {
            beach: {
                discovered: true, // Starting area
                explorationProgress: 0, // 0-100, increases with mission completions
                
                // Scouting information discovery progress
                scoutingProgress: {
                    general: { unlocked: true, progress: 0 },   // Always unlocked initially
                    loot: { unlocked: false, progress: 0 },     // Unlocks at 25% total scouting
                    dangers: { unlocked: false, progress: 0 },  // Unlocks at 50% total scouting
                    secrets: { unlocked: false, progress: 0 }   // Unlocks at 75% total scouting
                },
                
                // Individual mission progress tracking
                missions: {
                    shorelineExploration: {
                        discovered: true,
                        completions: 0,
                        firstCompleted: false,
                        lastCompleted: null,
                        availableAgainOnDay: null
                    },
                    wreckageScavenging: {
                        discovered: false, // Must be found through exploration
                        completions: 0,
                        firstCompleted: false,
                        lastCompleted: null,
                        availableAgainOnDay: null
                    },
                    tidePoolBoss: {
                        discovered: false, // Must be found through scavenging
                        completions: 0,
                        firstCompleted: false,
                        lastCompleted: null,
                        availableAgainOnDay: null
                    }
                }
            }
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
    
    settings: {
        autoSave: true
    }
};