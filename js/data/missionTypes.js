// Mission type templates - define base behavior for different mission categories
const missionTypeDefinitions = {
    exploration: {
        name: "Exploration",
        description: "Venture into unknown territory to map the area",

        // Base rewards that missions of this type start with
        baseRewards: {
            gold: { min: 5, max: 15 },
            experience: { min: 20, max: 40 }
        },

        // where currency drops are defined
        randomCurrency: {
            chaosOrbChance: 0.09,    // 9% chance
            exaltedOrbChance: 0.02   // 2% chance
        },

        // How dangerous this mission type typically is (1.0 = normal)
        baseDanger: 1.0,

        // How much scouting information this mission type provides
        scoutingGain: {
            base: 10,        // Always get this much
            onSuccess: 3,    // Bonus for complseting successfully  
            onFailure: -5    // Penalty for failing/retreating
        },

        // Special behaviors this mission type has
        specialMechanics: ["areaMapping", "connectionDiscovery"]
    },

    scavenging: {
        name: "Scavenging",
        description: "Search through ruins and wreckage for useful materials",

        baseRewards: {
            gold: { min: 10, max: 25 },
            experience: { min: 15, max: 25 }
        },

        randomCurrency: {
            chaosOrbChance: 0.15,    // 15% chance - better than exploration
            exaltedOrbChance: 0.03   // 3% chance
        },

        baseDanger: 0.9, // Slightly safer than exploration

        scoutingGain: {
            base: 3,
            onSuccess: 3,
            onFailure: -2
        },

        specialMechanics: ["enhancedLoot", "materialFocus"]
    },

    // Add this new mission type to missionTypeDefinitions
    hunting: {
        name: "Hunting",
        description: "Dangerous but rewarding sport.",

        baseRewards: {
            gold: { min: 15, max: 35 },
            experience: { min: 30, max: 50 }
        },

        baseDanger: 1.2,  // Slightly more dangerous than exploration

        scoutingGain: {
            base: 5,
            onSuccess: 2,
            onFailure: -3
        },

        randomCurrency: {
            chaosOrbChance: 0.08,
            exaltedOrbChance: 0.02
        },

        specialMechanics: ["huntingFocus", "specializedGear"]
    },

    raid: {
        name: "Raid",
        description: "Take the fight to the enemy.",

        baseRewards: {
            gold: { min: 50, max: 80 },
            experience: { min: 50, max: 90 },
            baseDanger: 1.2,  
        },

        scoutingGain: {
            base: 5,
            onSuccess: 2,
            onFailure: -3
        },

        randomCurrency: {
            chaosOrbChance: 0.1,
            exaltedOrbChance: 0.05
        },

        specialMechanics: ["raid", "enhancedLoot"]
    },


    boss: {
        name: "Boss Fight",
        description: "Face a dangerous enemy in direct combat",

        baseRewards: {
            gold: { min: 50, max: 100 },
            experience: { min: 80, max: 150 }
        },

        randomCurrency: {
            chaosOrbChance: 0.25,    // 25% chance
            exaltedOrbChance: 0.11   // 11% chance
        },

        baseDanger: 1.5, // Much more dangerous

        scoutingGain: {
            base: 10,
            onSuccess: 10,
            onFailure: -10
        },

        specialMechanics: ["unlockGuaranteed", "uniqueRewards"]
    }
};

// Helper function to get mission type data
function getMissionTypeData(typeName) {
    return missionTypeDefinitions[typeName] || null;
}

// Helper function to list all available mission types
function getAllMissionTypes() {
    return Object.keys(missionTypeDefinitions);
}