// Mission type templates - define base behavior for different mission categories
const missionTypeDefinitions = {
    exploration: {
        name: "Exploration",
        description: "Venture into unknown territory to map the area",
        
        // Base rewards that missions of this type start with
        baseRewards: {
            gold: { min: 10, max: 30 },
            experience: { min: 20, max: 40 }
        },
        
        // How dangerous this mission type typically is (1.0 = normal)
        baseDanger: 1.0,
        
        // How much scouting information this mission type provides
        scoutingGain: {
            base: 15,        // Always get this much
            onSuccess: 5,    // Bonus for completing successfully  
            onFailure: -5    // Penalty for failing/retreating
        },
        
        // Base chance to discover new missions or areas
        discoveryChance: 0.15,
        
        // Special behaviors this mission type has
        specialMechanics: ["areaMapping", "connectionDiscovery"]
    },
    
    scavenging: {
        name: "Scavenging",
        description: "Search through ruins and wreckage for useful materials",
        
        baseRewards: {
            gold: { min: 5, max: 20 },
            experience: { min: 15, max: 25 }
        },
        
        baseDanger: 0.8, // Slightly safer than exploration
        
        scoutingGain: {
            base: 10,
            onSuccess: 3,
            onFailure: -2
        },
        
        discoveryChance: 0.08, // Lower chance to find new areas
        
        specialMechanics: ["enhancedLoot", "materialFocus"]
    },
    
    boss: {
        name: "Boss Fight",
        description: "Face a dangerous enemy in direct combat",
        
        baseRewards: {
            gold: { min: 50, max: 100 },
            experience: { min: 80, max: 150 }
        },
        
        baseDanger: 1.5, // Much more dangerous
        
        scoutingGain: {
            base: 20,
            onSuccess: 10,
            onFailure: 0 // No penalty for failing bosses
        },
        
        discoveryChance: 0.25, // High chance to unlock new areas
        
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