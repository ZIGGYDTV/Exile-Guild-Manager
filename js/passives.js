// Passive effect types - easily expandable
const passiveTypes = {
    // Flat bonuses (rare, mostly from gear/levels)
    FLAT_LIFE: 'flatLife',
    FLAT_DAMAGE: 'flatDamage', 
    FLAT_DEFENSE: 'flatDefense',
    
    // Percentage increases (most passives) - additive with each other
    INCREASED_LIFE: 'increasedLife',
    INCREASED_DAMAGE: 'increasedDamage',
    INCREASED_DEFENSE: 'increasedDefense',
    
    // More multipliers (rare, powerful) - multiplicative
    MORE_DAMAGE: 'moreDamage',
    MORE_LIFE: 'moreLife',
    MORE_DEFENSE: 'moreDefense',
    
    // Special mechanics (future expansion ready)
    GOLD_FIND: 'goldFindBonus',
    ESCAPE_CHANCE: 'escapeChance',
    MORALE_RESISTANCE: 'moraleResistance',
    MORALE_GAIN: 'moraleGain'
};

// Passive definitions - easily expandable during streams!
const passiveDefinitions = {
    // NORMAL TIER PASSIVES
    toughness: {
        name: "Toughness",
        tier: "normal",
        description: "+12% increased Life",
        effects: [{ type: passiveTypes.INCREASED_LIFE, value: 12 }],
        tags: ["life", "defense"]
    },
    
    brutality: {
        name: "Brutality", 
        tier: "normal",
        description: "+15% increased Damage",
        effects: [{ type: passiveTypes.INCREASED_DAMAGE, value: 15 }],
        tags: ["damage", "offense"]
    },
    
    resilience: {
        name: "Resilience",
        tier: "normal", 
        description: "+18% increased Defense",
        effects: [{ type: passiveTypes.INCREASED_DEFENSE, value: 18 }],
        tags: ["defense"]
    },
    
    fortune: { 
        name: "Fortune",
        tier: "normal",
        description: "+25% Gold Find (not yet implemented)",
        effects: [{ type: passiveTypes.GOLD_FIND, value: 1000 }],
        tags: ["utility", "gold"]
    },
    
    // NOTABLE TIER PASSIVES  
    berserker: {
        name: "Berserker",
        tier: "notable",
        description: "+30% increased Damage, +15% increased Life",
        effects: [
            { type: passiveTypes.INCREASED_DAMAGE, value: 30 },
            { type: passiveTypes.INCREASED_LIFE, value: 15 }
        ],
        tags: ["damage", "life", "aggressive"]
    },
    
    juggernaut: {
        name: "Juggernaut", 
        tier: "notable",
        description: "+45% increased Life, +25% increased Defense",
        effects: [
            { type: passiveTypes.INCREASED_LIFE, value: 45 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 25 }
        ],
        tags: ["life", "defense", "tank"]
    },
    
    // KEYSTONE TIER PASSIVES
    glass_cannon: {
        name: "Glass Cannon",
        tier: "keystone", 
        description: "+60% MORE Damage, -30% Life",
        effects: [
            { type: passiveTypes.MORE_DAMAGE, value: 60 },
            { type: passiveTypes.INCREASED_LIFE, value: -30 }
        ],
        tags: ["damage", "high_risk"]
    },
slow_and_steady: {
        name: "Slow and Steady",
        tier: "keystone", 
        description: "+50% MORE Life, 50% decreased Damage",
        effects: [
            { type: passiveTypes.MORE_LIFE, value: 50 },
            { type: passiveTypes.INCREASED_DAMAGE, value: -50 }
        ],
        tags: ["life", "tank"]
    }

};

// Class definitions - easily expandable!
const classDefinitions = {
    rogue: {
        name: "Rogue",
        baseStats: {
            life: 90,    // Lower life
            damage: 12,  // Higher damage  
            defense: 4   // Lower defense
        },
        passiveWeights: {
            // Higher chance for damage and utility passives
            "damage": 2.0,
            "offense": 1.5, 
            "utility": 2.0,
            "gold": 3.0,
            "life": 0.8,
            "defense": 0.5
        },
        uniquePassives: ["shadow_strike", "coin_flip"] // Future: class-only passives
    },
    
    survivalist: {
        name: "Survivalist", 
        baseStats: {
            life: 110,   // Higher life
            damage: 8,   // Lower damage
            defense: 7   // Higher defense  
        },
        passiveWeights: {
            "defense": 2.0,
            "life": 1.5,
            "tank": 1.5,
            "damage": 0.8,
            "utility": 1.5
        },
        uniquePassives: ["wilderness_expert", "last_stand"]
    },
    
    brawler: {
        name: "Brawler",
        baseStats: {
            life: 105,   // Balanced high
            damage: 11,  // High damage
            defense: 5   // Medium defense
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

// Helper functions for passive system
const passiveHelpers = {
    getPassivesByTier(tier) {
        return Object.entries(passiveDefinitions)
            .filter(([key, passive]) => passive.tier === tier)
            .map(([key, passive]) => ({ id: key, ...passive }));
    },
    
    getPassivesByTag(tag) {
        return Object.entries(passiveDefinitions)
            .filter(([key, passive]) => passive.tags.includes(tag))
            .map(([key, passive]) => ({ id: key, ...passive }));
    },
    
    getWeightedPassivePool(exileClass, tier) {
        const classData = classDefinitions[exileClass];
        const tierPassives = this.getPassivesByTier(tier);
        
        // Apply class weights to each passive based on tags
        return tierPassives.map(passive => {
            let weight = 1.0; // Base weight
            
            passive.tags.forEach(tag => {
                if (classData.passiveWeights[tag]) {
                    weight *= classData.passiveWeights[tag];
                }
            });
            
            return { ...passive, weight };
        });
    }
};