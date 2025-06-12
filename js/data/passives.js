
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
    INCREASED_ATTACK_SPEED: 'increasedAttackSpeed',
    
    // More multipliers (rare, powerful) - multiplicative
    MORE_DAMAGE: 'moreDamage',
    MORE_LIFE: 'moreLife',
    MORE_DEFENSE: 'moreDefense',
    MORE_ATTACK_SPEED: 'moreAttackSpeed',

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
    training: {
        name: "Training",
        tier: "normal",
        description: "5% increased Attack Speed, 5% increased Damage, 5% increased Defense",
        effects: [
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 5 },
            { type: passiveTypes.INCREASED_DAMAGE, value: 5 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 5 }
        ],
        tags: ["offense", "defense", "attack_speed"]
    },
    
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
        description: "+6% increased Attack Speed, +20% Gold Find",
        effects: [
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 6 },
            { type: passiveTypes.GOLD_FIND, value: 20 }
        ],
        tags: ["attack_speed", "utility", "gold"]
    },

    quick_draw: {
        name: "Quick Draw",
        tier: "normal",
        description: "+8% increased Attack Speed",
        effects: [
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 8 }
        ],
        tags: ["offense", "attack_speed"]
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

    dexterity: {
        name: "Dexterity",
        tier: "normal",
        description: "+10% increased Attack Speed, +5% increased Movement Speed",
        effects: [
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 10 },
            { type: passiveTypes.INCREASED_MOVE_SPEED, value: 5 }
        ],
        tags: ["attack_speed", "movement_speed"]
    },

    strength: {
        name: "Strength",
        tier: "normal",
        description: "+10% increased Damage, +5% increased Defense",
        effects: [
            { type: passiveTypes.INCREASED_DAMAGE, value: 10 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 5 }
        ],
        tags: ["damage", "defense"]
    },

    intelligence: {
        name: "Intelligence",
        tier: "normal",
        description: "+8% increased Lightning, Cold, and Fire Resistances",
        effects: [
            { type: passiveTypes.LIGHTNING_RESISTANCE, value: 8 },
            { type: passiveTypes.COLD_RESISTANCE, value: 8 },
            { type: passiveTypes.FIRE_RESISTANCE, value: 8 }
        ],
        tags: ["resistance"]
    },

    vital: {
        name: "Vital",
        tier: "normal",
        description: "+10% increased Life, +5% increased Defense",
        effects: [
            { type: passiveTypes.INCREASED_LIFE, value: 10 },   
            { type: passiveTypes.INCREASED_DEFENSE, value: 5 }
        ],
        tags: ["life", "defense"]
    },

    
// NOTABLE TIER PASSIVES  
    berserker: {
        name: "Berserker",
        tier: "notable",
        description: "+30% increased Damage, +10% increased Attack Speed",
        effects: [
            { type: passiveTypes.INCREASED_DAMAGE, value: 30 },
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 10 }
        ],
        tags: ["damage", "attack_speed"]
    },

    blur: {
        name: "Blur",
        tier: "notable",
        description: "+18% increased Attack Speed, +10% increased Defense",
        effects: [
            { type: passiveTypes.INCREASED_ATTACK_SPEED, value: 18 },
            { type: passiveTypes.INCREASED_DEFENSE, value: 10 }
        ],
        tags: ["attack_speed", "defense"]
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

    blind_rage: {
        name: "Blind Rage",
        tier: "keystone",
        description: "+20% more Attack Speed, 20% decreased Damage, 10% decreased Defense",
        effects: [
            { type: passiveTypes.MORE_ATTACK_SPEED, value: 20 },
            { type: passiveTypes.INCREASED_DAMAGE, value: -20 },
            { type: passiveTypes.INCREASED_DEFENSE, value: -10 }
        ],
        tags: ["attack_speed", "high_risk"]
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

// Export for ES6 modules
export { passiveTypes, passiveDefinitions, passiveHelpers };
