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

    // Resistance bonuses
    FIRE_RESISTANCE: 'fireResistance',
    COLD_RESISTANCE: 'coldResistance',
    LIGHTNING_RESISTANCE: 'lightningResistance',
    CHAOS_RESISTANCE: 'chaosResistance',
    MAX_FIRE_RESISTANCE: 'maxFireResistance',
    MAX_COLD_RESISTANCE: 'maxColdResistance',
    MAX_LIGHTNING_RESISTANCE: 'maxLightningResistance',
    MAX_CHAOS_RESISTANCE: 'maxChaosResistance',
    
    // Special mechanics (future expansion ready)
    GOLD_FIND: 'goldFindBonus',
    MORALE_RESISTANCE: 'moraleResistance', // "Stability" Dampens morale gains and losses (or negaitive makes them more extreme)
    MORALE_MODIFIER: 'moraleModifier', // Flat morale boost/penalty 

    // Unimplemented but planned
    MORALE_GAIN: 'moraleGain', // could be % scaling for when more morale mechanics are added
    ESCAPE_CHANCE: 'escapeChance',
    LIGHT_RADIUS: 'lightRadius', // First strike effect on combat (could later affect scouting)

};

// Passive definitions - easily expandable during streams!
const passiveDefinitions = {
    // NORMAL TIER PASSIVES
    toughness: {
        name: "Toughness",
        tier: "normal",
        description: "+12% increased Life",
        effects: [{ type: passiveTypes.INCREASED_LIFE, value: 12 }],
        tags: ["life"]
    },

    endurance: { // "Rare" version of toughness, will need to implement rarity system later
        name: "Endurance",
        tier: "normal",
        description: "+24% increased Life",
        effects: [{ type: passiveTypes.INCREASED_LIFE, value: 24 }],
        tags: ["life", "tank"]
    },

    torchbearer: {
        name: "Torchbearer",
        tier: "normal",
        description: "+20% increased Light Radius",
        effects: [{ type: passiveTypes.LIGHT_RADIUS, value: 20 }],
        tags: ["utility", "light"]
    }, 

    roguish: {
        name: "Roguish",
        tier: "normal",
        description: "+10% increased Damage, +10% Gold Find",
        effects: [
            { type: passiveTypes.INCREASED_DAMAGE, value: 10 },
            { type: passiveTypes.GOLD_FIND, value: 10 }
        ],
        tags: ["damage", "utility", "gold"]
    },

    beef: {
        name: "Beef",
        tier: "normal",
        description: "+30 Life",
        effects: [{ type: passiveTypes.FLAT_LIFE, value: 30 }],
        tags: ["life", "tank"]
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
        description: "+100% Gold Find",
        effects: [{ type: passiveTypes.GOLD_FIND, value: 100 }],
        tags: ["utility", "gold"]
    },

    antidote: {
        name: "Antidote",
        tier: "normal",
        description: "+15% increased Chaos Resistance",
        effects: [{ type: passiveTypes.CHAOS_RESISTANCE, value: 15 }],
        tags: ["chaos_resistance", "resistance"]
    },

    fire_resistance: {
        name: "Fire Resistance",
        tier: "normal",
        description: "+10% increased Fire Resistance",
        effects: [{ type: passiveTypes.FIRE_RESISTANCE, value: 10 }],
        tags: ["fire_resistance", "resistance"]
    },

    cold_resistance: {
        name: "Cold Resistance",
        tier: "normal",
        description: "+10% increased Cold Resistance",
        effects: [{ type: passiveTypes.COLD_RESISTANCE, value: 10 }],
        tags: ["cold_resistance", "resistance"]
    },

    lightning_resistance: {
        name: "Lightning Resistance",
        tier: "normal",
        description: "+10% increased Lightning Resistance",
        effects: [{ type: passiveTypes.LIGHTNING_RESISTANCE, value: 10 }],
        tags: ["lightning_resistance", "resistance"]
    },

    optimist: {
        name: "Optimist",
        tier: "normal",
        description: "+1 Morale Gain per Mission",
        effects: [{ type: passiveTypes.MORALE_GAIN, value: 1 }],
        tags: ["morale"]
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
        description: "+45% increased Life",
        effects: [
            { type: passiveTypes.INCREASED_LIFE, value: 45 },        ],
        tags: ["life", "defense", "tank"]
    },

    elemental_guard: {
    name: "Elemental Guard",
    tier: "notable",
    description: "+12% to all Elemental Resistances",
    effects: [
        { type: passiveTypes.FIRE_RESISTANCE, value: 12 },
        { type: passiveTypes.COLD_RESISTANCE, value: 12 },
        { type: passiveTypes.LIGHTNING_RESISTANCE, value: 12 }
    ],
    tags: ["defense", "resistance"]
},

    purity: {
        name: "Purity",
        tier: "notable",
        description: "24% increased Chaos Resistance, 10% increased Life",
        effects: [
            { type: passiveTypes.INCREASED_LIFE, value: 10 },
            { type: passiveTypes.CHAOS_RESISTANCE, value: 24 },        
        ],
        tags: ["life", "chaos_resistance", "resistance"]
},

    fireproofing: {
        name: "Fireproofing",
        tier: "notable",
        description: "+10% Maximum Fire Resistance, +10% Defense",
        effects: [
            { type: passiveTypes.MAX_FIRE_RESISTANCE, value: 10 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 10 }
        ],
        tags: ["fire_resistance", "defense", "resistance"]
    },

    isolation: {
        name: "Isolation",
        tier: "notable",
        description: "+10% Maximum Lightning Resistance, +10% Defense",
        effects: [
            { type: passiveTypes.MAX_LIGHTNING_RESISTANCE, value: 10 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 10 }
        ],
        tags: ["lightning_resistance", "defense", "resistance"]
    },

    insulation: {
        name: "Insulation",
        tier: "notable",
        description: "+10% Maximum Cold Resistance, +10% Defense",
        effects: [
            { type: passiveTypes.MAX_COLD_RESISTANCE, value: 10 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 10 }
        ],
        tags: ["cold_resistance", "defense", "resistance"]
    },

    resolute: {
        name: "Resolute",
        tier: "notable",
        description: "30% Morale Stability, +30% Defense",
        effects: [
            { type: passiveTypes.MORALE_RESISTANCE, value: -30 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 30 }
        ],
        tags: ["morale", "defense"]
    },

    sanguine: {
        name: "Sanguine",
        tier: "notable",
        description: "+2 Morale Gain per Mission",
        effects: [{ type: passiveTypes.MORALE_GAIN, value: 2 }],
        tags: ["morale"]
    },
    
    // KEYSTONE TIER PASSIVES
    glass_cannon: {
        name: "Glass Cannon",
        tier: "keystone", 
        description: "+50% MORE Damage, -30% Life",
        effects: [
            { type: passiveTypes.MORE_DAMAGE, value: 50 },
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
    },

    fireproof: {
    name: "Fireproof",
    tier: "keystone",
    description: "+40% Fire Resistance, +10% Maximum Fire Resistance, -25% Maximum Cold and Lightning Resistances",
    effects: [
        { type: passiveTypes.FIRE_RESISTANCE, value: 40 },
        { type: passiveTypes.MAX_FIRE_RESISTANCE, value: 10 },
        { type: passiveTypes.MAX_COLD_RESISTANCE, value: -25 },
        { type: passiveTypes.MAX_LIGHTNING_RESISTANCE, value: -25 }
    ],
    tags: ["resistance", "fire_resistance"]
},

    coldforged: {
        name: "Coldforged",
        tier: "keystone",
        description: "+40% Cold Resistance, +10% Maximum Cold Resistance, -25% Maximum Fire and Lightning Resistances",
        effects: [
            { type: passiveTypes.COLD_RESISTANCE, value: 40 },
            { type: passiveTypes.MAX_COLD_RESISTANCE, value: 10 },
            { type: passiveTypes.MAX_FIRE_RESISTANCE, value: -25 },
            { type: passiveTypes.MAX_LIGHTNING_RESISTANCE, value: -25 }
        ],
        tags: ["resistance", "cold_resistance"]
    },

    shockproof: {
        name: "shockproof",
        tier: "keystone",
        description: "+40% Lightning Resistance, +10% Maximum Lightning Resistance, -25% Maximum Fire and Cold Resistances",
        effects: [
            { type: passiveTypes.LIGHTNING_RESISTANCE, value: 40 },
            { type: passiveTypes.MAX_LIGHTNING_RESISTANCE, value: 10 },
            { type: passiveTypes.MAX_FIRE_RESISTANCE, value: -25 },
            { type: passiveTypes.MAX_COLD_RESISTANCE, value: -25 }
        ],
        tags: ["resistance", "lightning_resistance"]
    },

    iron_wall: {
    name: "Iron Wall",
    tier: "keystone",
    description: "+100% Defense, -15% Maximum Fire, Cold, and Lightning Resistances",
    effects: [
        { type: passiveTypes.INCREASED_DEFENSE, value: 100 },
        { type: passiveTypes.MAX_FIRE_RESISTANCE, value: -15 },
        { type: passiveTypes.MAX_COLD_RESISTANCE, value: -15 },
        { type: passiveTypes.MAX_LIGHTNING_RESISTANCE, value: -15 }
    ],
    tags: ["defense"]
},

    volatile: {
        name: "Volatile",
        tier: "keystone",
        description: "+50% MORE Damage, -50% Morale Stability",
        effects: [
            { type: passiveTypes.MORE_DAMAGE, value: 50 },
            { type: passiveTypes.MORALE_RESISTANCE, value: -50 }
        ],
        tags: ["damage", "high_risk"]
    },

    beacon_of_light: {
        name: "Beacon of Light",
        tier: "keystone",
        description: "+100% Light Radius, +20% Morale Gain, -50% Defense",
        effects: [
            { type: passiveTypes.LIGHT_RADIUS, value: 100 },
            { type: passiveTypes.MORALE_GAIN, value: 20 },
            { type: passiveTypes.INCREASED_DEFENSE, value: -50 }
        ],
        tags: ["utility", "light", "morale", "high_risk"]
    },
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
            damage: 8,   // Lower damage
            defense: 7   // Higher defense  
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