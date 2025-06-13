// Class definitions - easily expandable!
const classDefinitions = {
    rogue: {
        name: "Rogue",
        baseStats: {
            life: 90,    // Lower life
            damage: 12,  // Higher damage  
            defense: 4,   // Lower defense
            vitality: 90 
        },
        passiveWeights: {  // To add any tag simply add to passives and then add here with a weight
            "damage": 2.0,
            "offense": 1.5, 
            "utility": 1.5,
            "gold": 2.0,
            "life": 0.8,
            "defense": 0.5,
            "high_risk": 2.5 // passives that have a life or defense penalty
        },
        uniquePassives: ["shadow_strike", "coin_flip"] // Future: class-only passives
    },
    
    survivalist: {
        name: "Survivalist", 
        baseStats: {
            life: 110,   // Higher life
            damage: 9,   // Lower damage
            defense: 7,
            vitality: 110,
            lifeRegen: 1 
        },
        passiveWeights: {
            "defense": 1.5,
            "life": 1.2,
            "tank": 1.2,
            "damage": 0.8,
            "utility": 1.5,
            "resistance": 2.5
        },
        uniquePassives: ["wilderness_expert", "last_stand"]
    },
    
    brawler: {
        name: "Brawler",
        baseStats: {
            life: 100,   // Balanced high
            damage: 11,  // High damage
            defense: 5,
            vitality: 100
        },
        passiveWeights: {
            "damage": 2.5,
            "life": 2.5, 
            "aggressive": 2.0,
            "defense": 0.8,
            "utility": 0.8
        },
        uniquePassives: ["iron_will", "bloodlust"],
        specialRules: {
            moraleImmune: ["retreat"] // Doesn't lose morale from retreating
        }
    }
};

// Export for ES6 modules
export { classDefinitions };

