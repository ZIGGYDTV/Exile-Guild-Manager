// Master stat definitions - add new stats here and they'll work everywhere
const statDefinitions = {
    life: {
        name: 'Life',
        baseRange: { min: 10, max: 20 }
    },
    damage: {
        name: 'Damage', 
        baseRange: { min: 5, max: 15 }
    },
    defense: {
        name: 'Defense',
        baseRange: { min: 3, max: 12 }
    }
    // Future stats go here:
    // critChance: { name: 'Crit Chance', baseRange: { min: 2, max: 8 } },
    // speed: { name: 'Speed', baseRange: { min: 5, max: 15 } },
    // resistance: { name: 'Resistance', baseRange: { min: 4, max: 10 } }
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
        statMultiplier: 1, 
        statCount: 1,
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
        statCount: 3,
        dropWeight: 5 
    }
};