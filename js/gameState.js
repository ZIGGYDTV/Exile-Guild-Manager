// Updated gameState with class and passive system
const gameState = {
    exile: {
        name: "Grimjaw",
        class: "brawler", // Will be randomized on creation
        level: 1,
        experience: 0,
        experienceNeeded: 100,
        morale: 75,
        
        // Passive system
        passives: {
            allocated: ["berserker"], // Starting with one notable
            pendingPoints: 0, // Points available to spend
            rerollsUsed: 0 // Resets each level-up choice
        },
        
        stats: {
            // Current calculated stats (base + gear + passives)
            life: 105, // Will be recalculated based on class
            damage: 11,
            defense: 5,
            
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
    
    settings: {
        autoSave: true
    }
};