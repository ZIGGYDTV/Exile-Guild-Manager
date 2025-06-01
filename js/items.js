// Master stat definitions - add new stats here and they'll work everywhere
const statDefinitions = {
    life: {
        name: 'Life',
        ilvlBreakpoints: [
            { ilvl: 1, min: 10, max: 20 },
            { ilvl: 5, min: 12, max: 25 },
            { ilvl: 10, min: 15, max: 30 },
            { ilvl: 15, min: 18, max: 36 },
            { ilvl: 20, min: 22, max: 44 },
            { ilvl: 25, min: 27, max: 54 },
            { ilvl: 30, min: 33, max: 66 },
            { ilvl: 35, min: 40, max: 80 },
            { ilvl: 40, min: 48, max: 96 },
            { ilvl: 45, min: 58, max: 116 },
            { ilvl: 50, min: 70, max: 140 }
        ]
    },
    damage: {
        name: 'Damage',
        ilvlBreakpoints: [
            { ilvl: 1, min: 3, max: 7 },
            { ilvl: 3, min: 6, max: 12 },
            { ilvl: 5, min: 11, max: 19 },
            { ilvl: 7, min: 15, max: 24 },
            { ilvl: 9, min: 17, max: 31 },
            { ilvl: 11, min: 20, max: 36 },
            { ilvl: 13, min: 23, max: 42 },
            { ilvl: 15, min: 26, max: 48 }
        ]
    },
    
    defense: {
        name: 'Defense',
        ilvlBreakpoints: [
            { ilvl: 1, min: 3, max: 12 },
            { ilvl: 5, min: 4, max: 15 },
            { ilvl: 10, min: 5, max: 20 },
            { ilvl: 15, min: 6, max: 24 },
            { ilvl: 20, min: 8, max: 32 },
            { ilvl: 25, min: 10, max: 40 },
            { ilvl: 30, min: 13, max: 52 },
            { ilvl: 35, min: 16, max: 64 },
            { ilvl: 40, min: 20, max: 80 },
            { ilvl: 45, min: 25, max: 100 },
            { ilvl: 50, min: 31, max: 124 }
        ]
    },
    lightRadius: {
        name: 'Light Radius',
        ilvlBreakpoints: [
            { ilvl: 1, min: 10, max: 50 },
            { ilvl: 5, min: 12, max: 60 },
            { ilvl: 10, min: 15, max: 65 },
            { ilvl: 15, min: 18, max: 70 },
            { ilvl: 20, min: 22, max: 75 },
            { ilvl: 25, min: 27, max: 80 },
            { ilvl: 30, min: 33, max: 85 },
            { ilvl: 35, min: 40, max: 90 },
            { ilvl: 40, min: 48, max: 95 },
            { ilvl: 45, min: 58, max: 98 },
            { ilvl: 50, min: 70, max: 100 }
        ],
        minDifficulty: '',
        minIlvl: 25,
        restrictedToSlots: ['helmet']  // NEW PROPERTY
    },
    moveSpeed: {
        name: 'Movement Speed',
        ilvlBreakpoints: [
            { ilvl: 1, min: 10, max: 30 },
            { ilvl: 5, min: 12, max: 35 },
            { ilvl: 10, min: 15, max: 40 },
            { ilvl: 15, min: 18, max: 50 },
            { ilvl: 20, min: 22, max: 60 },
            { ilvl: 25, min: 27, max: 70 },
            { ilvl: 30, min: 33, max: 80 },
            { ilvl: 35, min: 40, max: 85 },
            { ilvl: 40, min: 48, max: 90 },
            { ilvl: 45, min: 58, max: 95 },
            { ilvl: 50, min: 70, max: 100 }
        ],
        minDifficulty: '',
        minIlvl: 10,
        restrictedToSlots: ['boots']  // NEW PROPERTY
    },
    fireResist: {
        name: 'Fire Resistance',
        ilvlBreakpoints: [
            { ilvl: 1, min: 9, max: 15 },
            { ilvl: 5, min: 11, max: 18 },
            { ilvl: 10, min: 14, max: 24 },
            { ilvl: 15, min: 17, max: 29 },
            { ilvl: 20, min: 21, max: 36 },
            { ilvl: 25, min: 26, max: 45 },
            { ilvl: 30, min: 32, max: 56 },
            { ilvl: 35, min: 39, max: 65 },
            { ilvl: 40, min: 48, max: 70 },
            { ilvl: 45, min: 58, max: 73 },
            { ilvl: 50, min: 65, max: 75 }
        ],
        minDifficulty: '',
        requiredThemes: [],
        minIlvl: 15
    },
    coldResist: {
        name: 'Cold Resistance',
        ilvlBreakpoints: [
            { ilvl: 1, min: 9, max: 15 },
            { ilvl: 5, min: 11, max: 18 },
            { ilvl: 10, min: 14, max: 24 },
            { ilvl: 15, min: 17, max: 29 },
            { ilvl: 20, min: 21, max: 36 },
            { ilvl: 25, min: 26, max: 45 },
            { ilvl: 30, min: 32, max: 56 },
            { ilvl: 35, min: 39, max: 65 },
            { ilvl: 40, min: 48, max: 70 },
            { ilvl: 45, min: 58, max: 73 },
            { ilvl: 50, min: 65, max: 75 }
        ],
        minDifficulty: '',
        requiredThemes: [],
        minIlvl: 15
    },
    lightningResist: {
        name: 'Lightning Resistance',
        ilvlBreakpoints: [
            { ilvl: 1, min: 9, max: 15 },
            { ilvl: 5, min: 11, max: 18 },
            { ilvl: 10, min: 14, max: 24 },
            { ilvl: 15, min: 17, max: 29 },
            { ilvl: 20, min: 21, max: 36 },
            { ilvl: 25, min: 26, max: 45 },
            { ilvl: 30, min: 32, max: 56 },
            { ilvl: 35, min: 39, max: 65 },
            { ilvl: 40, min: 48, max: 70 },
            { ilvl: 45, min: 58, max: 73 },
            { ilvl: 50, min: 65, max: 75 }
        ],
        minDifficulty: '',
        requiredThemes: [],
        minIlvl: 15
    },
    chaosResist: {
        name: 'Chaos Resistance',
        ilvlBreakpoints: [
            { ilvl: 1, min: 9, max: 15 },
            { ilvl: 5, min: 11, max: 18 },
            { ilvl: 10, min: 14, max: 24 },
            { ilvl: 15, min: 17, max: 29 },
            { ilvl: 20, min: 21, max: 36 },
            { ilvl: 25, min: 26, max: 45 },
            { ilvl: 30, min: 32, max: 56 },
            { ilvl: 35, min: 39, max: 65 },
            { ilvl: 40, min: 48, max: 70 },
            { ilvl: 45, min: 58, max: 73 },
            { ilvl: 50, min: 65, max: 75 }
        ],
        minDifficulty: '',
        requiredThemes: [],
        minIlvl: 15
    }
};


// Helper to get all available stat types
const getAllStatTypes = () => Object.keys(statDefinitions);


// Gear definitions and loot tables
const gearTypes = {
    weapon: {
        slot: 'weapon',
        baseTypes: ['Sword', 'Axe', 'Mace', 'Staff', 'Dagger', 'Bow'],
        statWeights: {
            damage: 3,
            life: 1,
            defense: 0.5
            // Future: Add new stats with their weights here
        }
    },
    armor: {
        slot: 'armor',
        baseTypes: ['Plate', 'Mail', 'Leather', 'Robe'],
        statWeights: {
            defense: 3,
            life: 2,
            damage: 1
        }
    },
    jewelry: {
        slot: 'jewelry',
        baseTypes: ['Ring', 'Amulet', 'Belt'],
        statWeights: {
            life: 2,
            damage: 1,
            defense: 1
        }
    }
};

const rarityTiers = {
    common: {
        color: '#888',
        statMultiplier: 1, // Should be non functional, need to remove
        statCount: 1,  // Need a max stat count, this only affecting how many they drop with
        // Need max stat count
        // need dropped stat ranges?
        dropWeight: 70
    },
    magic: {
        color: '#4169E1',
        statMultiplier: 1.5,
        statCount: 2,
        dropWeight: 25
    },
    rare: {
        color: '#FFD700',
        statMultiplier: 2,
        statCount: 4,
        dropWeight: 5
    }
};

const rarityBonusByDifficulty = {  // should cut this
    easy: { rareBonus: 0 },      // % chance to get a rare item
    medium: { rareBonus: 5 },
    hard: { rareBonus: 10 },
    nightmare: { rareBonus: 15 }
};