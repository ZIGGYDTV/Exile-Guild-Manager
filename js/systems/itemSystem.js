// js/systems/itemSystem.js
import { itemBases } from '../data/items.js';

// Base Equipment class
class Equipment {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot;
        this.stats = new Map();
        this.implicitStats = new Map();
        this.requirements = { level: 1 };
        this.statWeights = new Map();
        this.rarity = null;
    }

    // Add implicit stat (always present on the item)
    addImplicitStat(stat, value) {
        this.implicitStats.set(stat, value);
        return this;
    }

    // Add stat weight for generation
    addStatWeight(stat, weight) {
        this.statWeights.set(stat, weight);
        return this;
    }

    // Set level requirement
    setRequirements(level) {
        this.requirements.level = level;
        return this;
    }

    // Add rolled stat
    addStat(stat, value) {
        this.stats.set(stat, value);
        return this;
    }

    // Set rarity
    setRarity(rarity) {
        this.rarity = rarity;
        return this;
    }

    // Get total value of a stat (implicit + rolled)
    getTotalStat(stat) {
        const implicit = this.implicitStats.get(stat) || 0;
        const rolled = this.stats.get(stat) || 0;
        return implicit + rolled;
    }

    // Get effective stats including all modifiers
    getEffectiveStats() {
        const effectiveStats = new Map();

        // Add implicit stats
        for (const [stat, value] of this.implicitStats) {
            effectiveStats.set(stat, value);
        }

        // Add rolled stats
        for (const [stat, value] of this.stats) {
            const current = effectiveStats.get(stat) || 0;
            effectiveStats.set(stat, current + value);
        }

        return effectiveStats;
    }

    // Get display name
    getDisplayName() {
        return this.rarity ?
            `${this.rarity.name} ${this.name}` : this.name;
    }

    // Get color for display
    getDisplayColor() {
        return this.rarity ? this.rarity.color : '#888';
    }

    // Convert stats Map to plain object for compatibility with existing code
    toObject() {
        const obj = {
            name: this.name,
            slot: this.slot,
            stats: {}
        };

        // Convert stats Map to object
        for (const [stat, value] of this.stats) {
            obj.stats[stat] = value;
        }

        // Add rarity if present
        if (this.rarity) {
            obj.rarity = this.rarity.name;
        }

        return obj;
    }

    calculateDPS() {
        // Get base damage from stats
        const damage = this.stats.get('damage') || 0;

        // Default attack speed is 1.0 if not specified
        const attackSpeed = this.stats.get('attackSpeed') || 1.0;

        // Calculate DPS
        return damage * attackSpeed;
    }

    // Get all combat relevant stats including DPS
    getCombatStats() {
        return {
            dps: this.calculateDPS(),
            damage: this.stats.get('damage') || 0,
            attackSpeed: this.stats.get('attackSpeed') || 1.0,
            defense: this.stats.get('defense') || 0,
            life: this.stats.get('life') || 0
        };
    }
}

class Weapon extends Equipment {
    constructor(name, weaponType) {
        super(name, 'weapon');
        this.weaponType = weaponType;
        this.attackSpeed = 1.0;
        this.damageMultiplier = 1.0;
    }

    setAttackSpeed(speed) {
        this.attackSpeed = speed;
        return this;
    }

    setDamageMultiplier(multiplier) {
        this.damageMultiplier = multiplier;
        return this;
    }

    calculateDPS() {
        // Get base damage from stats
        const damage = (this.stats.get('damage') || 0) * this.damageMultiplier;

        // Use weapon's attack speed
        return damage * this.attackSpeed;
    }

    // Override toObject to include weapon-specific properties
    toObject() {
        const obj = super.toObject();
        obj.attackSpeed = this.attackSpeed;
        obj.damageMultiplier = this.damageMultiplier;
        return obj;
    }
}

class Armor extends Equipment {
    constructor(name, armorType) {
        super(name, armorType);
        this.defenseMultiplier = 1.0;
    }

    setDefenseMultiplier(multiplier) {
        this.defenseMultiplier = multiplier;
        return this;
    }

    getEffectiveStats() {
        const stats = super.getEffectiveStats();

        // Apply defense multiplier only to this item's defense
        const localDefense = stats.get('defense') || 0;
        if (localDefense > 0) {
            stats.set('defense', Math.floor(localDefense * this.defenseMultiplier));
        }

        return stats;
    }
}

class Jewelry extends Equipment {
    constructor(name, jewelryType) {
        super(name, jewelryType);
        this.statBonusMultiplier = 1.0;
    }

    setStatBonusMultiplier(multiplier) {
        this.statBonusMultiplier = multiplier;
        return this;
    }
}

class Ring extends Jewelry {
    constructor(name) {
        super(name, 'ring');
    }
}

class Amulet extends Jewelry {
    constructor(name) {
        super(name, 'amulet');
    }
}

class Belt extends Jewelry {
    constructor(name) {
        super(name, 'belt');
    }
}

// Item Database Management
class ItemDatabase {
    constructor() {
        this.equipment = new Map();
        this.initializeEquipment();
    }

    initializeEquipment() {
        // Convert itemBases to Equipment objects
        for (const [itemId, baseData] of Object.entries(itemBases)) {
            let equipment;

            // Create appropriate class based on slot
            if (baseData.slot === 'weapon1h' || baseData.slot === 'weapon2h') {
                equipment = new Weapon(baseData.name, baseData.weaponType)
                    .setAttackSpeed(baseData.attackSpeed)
                    .setDamageMultiplier(baseData.damageMultiplier);
            } else if (baseData.category === 'armor' || baseData.slot === 'shield') {
                equipment = new Armor(baseData.name, baseData.armorType || baseData.slot);
                if (baseData.defenseMultiplier !== undefined) {
                    equipment.setDefenseMultiplier(baseData.defenseMultiplier);
                }
            } else if (baseData.slot === 'ring') {
                equipment = new Ring(baseData.name);
                if (baseData.statBonusMultiplier !== undefined) {
                    equipment.setStatBonusMultiplier(baseData.statBonusMultiplier);
                }
            } else if (baseData.slot === 'amulet') {
                equipment = new Amulet(baseData.name);
                if (baseData.statBonusMultiplier !== undefined) {
                    equipment.setStatBonusMultiplier(baseData.statBonusMultiplier);
                }
            } else if (baseData.slot === 'belt') {
                equipment = new Belt(baseData.name);
                if (baseData.statBonusMultiplier !== undefined) {
                    equipment.setStatBonusMultiplier(baseData.statBonusMultiplier);
                }
            }
            // Add other slot types as needed

            // Set common properties if equipment was created
            if (equipment) {
                // Add implicit stats
                if (baseData.implicitStats) {
                    for (const [stat, value] of Object.entries(baseData.implicitStats)) {
                        equipment.addImplicitStat(stat, value);
                    }
                }

                // Add stat weights
                if (baseData.statWeights) {
                    for (const [stat, weight] of Object.entries(baseData.statWeights)) {
                        equipment.addStatWeight(stat, weight);
                    }
                }

                // Set requirements
                if (baseData.requirements) {
                    equipment.setRequirements(baseData.requirements.level || 1);
                }

                // Copy all additional properties from base data
                equipment.itemId = itemId;
                equipment.baseId = itemId;  // Store the base ID for reference
                equipment.ilvl = baseData.ilvl;
                equipment.tags = baseData.tags || [];
                equipment.icon = baseData.icon;
                equipment.shape = baseData.shape;
                equipment.description = baseData.description;  // Add description!
                equipment.slot = baseData.slot;  // Override with proper slot
                equipment.category = baseData.category;
                equipment.subCategory = baseData.subCategory;

                this.registerEquipment(equipment);
            }
        }
    }

    registerEquipment(equipment) {
        this.equipment.set(equipment.name, equipment);
    }

    getEquipment(name) {
        return this.equipment.get(name);
    }

    getRandomEquipmentByLevel(maxLevel = 100) {
        const validEquipment = Array.from(this.equipment.values())
            .filter(eq => eq.requirements.level <= maxLevel);

        if (validEquipment.length === 0) return null;

        return validEquipment[Math.floor(Math.random() * validEquipment.length)];
    }

    getEquipmentBySlot(slot) {
        return Array.from(this.equipment.values())
            .filter(eq => eq.slot === slot);
    }

    getAllEquipment() {
        return Array.from(this.equipment.values());
    }

    // Add these methods to the ItemDatabase class:

    // Generate a new item instance with random properties
    generateItem(options = {}) {
        const {
            targetIlvl = 1,
            missionThemes = [],
            difficultyBonus = 0,
            slotWeights = {
                weapon: 0.4,
                armor: 0.45,
                jewelry: 0.15
            }
        } = options;

        // Get a random base item
        const baseItem = this.getRandomEquipmentByLevel(targetIlvl);
        if (!baseItem) return null;

        // Create a copy of the base item with unique properties
        const newItem = this.createItemInstance(baseItem);

        // Roll rarity (you'll need to import rarityDB)
        const rarity = window.rarityDB.rollRarity(difficultyBonus);

        // Generate random stats based on rarity
        this.rollRandomStats(newItem, rarity, targetIlvl);

        // Set the item's rarity using the proper method
        newItem.setRarity(rarity);

        return newItem;
    }

    // Create a new instance of an item from a base template
    createItemInstance(baseItem) {
        // Create the correct type of equipment instance based on the base item
        let newItem;
        
        if (baseItem instanceof Weapon) {
            newItem = new Weapon(baseItem.name, baseItem.weaponType)
                .setAttackSpeed(baseItem.attackSpeed)
                .setDamageMultiplier(baseItem.damageMultiplier);
        } else if (baseItem instanceof Armor) {
            newItem = new Armor(baseItem.name, baseItem.armorType || baseItem.slot);
            if (baseItem.defenseMultiplier !== undefined) {
                newItem.setDefenseMultiplier(baseItem.defenseMultiplier);
            }
        } else if (baseItem instanceof Ring) {
            newItem = new Ring(baseItem.name);
            if (baseItem.statBonusMultiplier !== undefined) {
                newItem.setStatBonusMultiplier(baseItem.statBonusMultiplier);
            }
        } else if (baseItem instanceof Amulet) {
            newItem = new Amulet(baseItem.name);
            if (baseItem.statBonusMultiplier !== undefined) {
                newItem.setStatBonusMultiplier(baseItem.statBonusMultiplier);
            }
        } else if (baseItem instanceof Belt) {
            newItem = new Belt(baseItem.name);
            if (baseItem.statBonusMultiplier !== undefined) {
                newItem.setStatBonusMultiplier(baseItem.statBonusMultiplier);
            }
        } else {
            // Fallback to generic equipment
            newItem = new Equipment(baseItem.name, baseItem.slot);
        }
        
        // Set unique ID and copy all properties
        newItem.id = Date.now() + Math.random();
        newItem.ilvl = baseItem.ilvl;
        newItem.icon = baseItem.icon;
        newItem.description = baseItem.description;
        newItem.shape = baseItem.shape;
        newItem.slot = baseItem.slot;
        newItem.category = baseItem.category;
        newItem.subCategory = baseItem.subCategory;
        
        // Copy implicit stats
        for (const [stat, value] of baseItem.implicitStats) {
            newItem.addImplicitStat(stat, value);
        }
        
        // Copy stat weights
        for (const [stat, weight] of baseItem.statWeights) {
            newItem.addStatWeight(stat, weight);
        }
        
        return newItem;
    }

    // Roll random stats for an item based on rarity
    rollRandomStats(item, rarity, ilvl) {
        // Get the base item template to access stat weights
        const baseItem = this.getEquipment(item.name);
        if (!baseItem || !baseItem.statWeights.size) return;

        // Determine number of stats based on rarity
        const statCount = rarity.getStatCount();
        if (statCount === 0) return; // Common items get no random stats

        // Get available stats from the base item's stat weights
        const availableStats = Array.from(baseItem.statWeights.keys());
        const usedStats = new Set();

        // Roll stats
        for (let i = 0; i < statCount && usedStats.size < availableStats.length; i++) {
            // Choose a stat we haven't used yet
            const remainingStats = availableStats.filter(s => !usedStats.has(s));
            if (remainingStats.length === 0) break;

            // Weight-based selection
            const stat = this.selectWeightedStat(remainingStats, baseItem.statWeights);

            // Get stat definition from statDB
            const statDef = window.statDB.getStat(stat);
            if (!statDef) continue;

            // Roll value based on ilvl
            const range = statDef.getValueRange(ilvl);
            const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

            item.stats[stat] = value;
            usedStats.add(stat);
        }
    }

    // Select a stat based on weights
    selectWeightedStat(stats, weights) {
        const totalWeight = stats.reduce((sum, stat) => sum + (weights.get(stat) || 1), 0);
        let random = Math.random() * totalWeight;

        for (const stat of stats) {
            random -= (weights.get(stat) || 1);
            if (random <= 0) return stat;
        }

        return stats[0]; // Fallback
    }
}



// Singleton instance
const itemDB = new ItemDatabase();

// Export everything
export { Equipment, Weapon, Armor, Jewelry, Ring, Amulet, Belt, ItemDatabase, itemDB };