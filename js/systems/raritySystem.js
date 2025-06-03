// Rarity system for items
export class Rarity {
    constructor(name, config) {
        this.name = name;
        this.color = config.color;
        this.minStats = config.minStats || 0;
        this.maxStats = config.maxStats;
        this.dropWeight = config.dropWeight || 1;
    }

    getStatCount() {
        return Math.floor(Math.random() * (this.maxStats - this.minStats + 1)) + this.minStats;
    }
}

class RarityDatabase {
    constructor() {
        this.rarities = new Map();
        this.initializeRarities();
    }

    initializeRarities() {
        this.registerRarity(
            new Rarity('Common', {
                color: '#888',
                minStats: 0,
                maxStats: 0,  // Changed from 1 to 0
                dropWeight: 60
            })
        );
    
        this.registerRarity(
            new Rarity('Magic', {
                color: '#4169E1',
                minStats: 1,
                maxStats: 2,  // Already correct
                dropWeight: 30
            })
        );
    
        this.registerRarity(
            new Rarity('Rare', {
                color: '#FFD700',
                minStats: 3,  // Changed from 2 to 3
                maxStats: 4,  // Already correct
                dropWeight: 10
            })
        );

        // Could add more rarities like Unique, Legendary, etc.
    }

    registerRarity(rarity) {
        this.rarities.set(rarity.name.toLowerCase(), rarity);
        return this;
    }

    getRarity(name) {
        return this.rarities.get(name.toLowerCase());
    }

    getAllRarities() {
        return Array.from(this.rarities.values());
    }

    rollRarity(difficultyBonus = 0) {
        const rarities = this.getAllRarities();
        let totalWeight = rarities.reduce((sum, rarity) => sum + rarity.dropWeight, 0);
        
        // Apply difficulty bonus to rare item chances
        let roll = Math.random() * (totalWeight + difficultyBonus);
        
        for (const rarity of rarities) {
            if (roll <= rarity.dropWeight) {
                return rarity;
            }
            roll -= rarity.dropWeight;
        }
        
        // Fallback to common if something goes wrong
        return this.getRarity('common');
    }
}

// Export a singleton instance
export const rarityDB = new RarityDatabase(); 