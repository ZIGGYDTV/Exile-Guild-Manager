// js/systems/itemSystem.js
import { itemBases } from '../data/items.js';

// Base Equipment class
class Equipment {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot;
        this.stats = {};
        this.implicitStats = {};
        this.requirements = { level: 1 };
        this.statWeights = {};
        this.rarity = null;
    }

    // Add implicit stat (always present on the item)
    addImplicitStat(stat, value) {
        this.implicitStats[stat] = value;
        return this;
    }

    // Add stat weight for generation
    addStatWeight(stat, weight) {
        this.statWeights[stat] = weight;
        return this;
    }

    // Set level requirement
    setRequirements(level) {
        this.requirements.level = level;
        return this;
    }

    // Add rolled stat
    addStat(stat, value) {
        this.stats[stat] = value;
        return this;
    }

    // Set rarity
    setRarity(rarity) {
        this.rarity = rarity;
        return this;
    }

    // Get total value of a stat (implicit + rolled)
    getTotalStat(stat) {
        const implicit = this.implicitStats[stat] || 0;
        const rolled = this.stats[stat] || 0;
        return implicit + rolled;
    }

    // Get effective stats including all modifiers
    getEffectiveStats() {
        const effectiveStats = { ...this.implicitStats };
        for (const stat in this.stats) {
            effectiveStats[stat] = (effectiveStats[stat] || 0) + this.stats[stat];
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

    // Convert stats to plain object for compatibility with existing code
    toObject() {
        const obj = {
            name: this.name,
            slot: this.slot,
            stats: { ...this.stats }
        };
        if (this.rarity) {
            obj.rarity = this.rarity.name;
        }
        return obj;
    }

    calculateDPS() {
        const damage = this.stats['damage'] || 0;
        const attackSpeed = this.stats['attackSpeed'] || 1.0;
        return damage * attackSpeed;
    }

    getCombatStats() {
        return {
            dps: this.calculateDPS(),
            damage: this.stats['damage'] || 0,
            attackSpeed: this.stats['attackSpeed'] || 1.0,
            defense: this.stats['defense'] || 0,
            life: this.stats['life'] || 0
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
        const damage = (this.stats['damage'] || 0) * this.damageMultiplier;
        return damage * this.attackSpeed;
    }

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
        const localDefense = stats['defense'] || 0;
        if (localDefense > 0) {
            stats['defense'] = Math.floor(localDefense * this.defenseMultiplier);
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
        for (const [itemId, baseData] of Object.entries(itemBases)) {
            let equipment;
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
            if (equipment) {
                if (baseData.implicitStats) {
                    for (const [stat, value] of Object.entries(baseData.implicitStats)) {
                        equipment.addImplicitStat(stat, value);
                    }
                }
                if (baseData.statWeights) {
                    for (const [stat, weight] of Object.entries(baseData.statWeights)) {
                        equipment.addStatWeight(stat, weight);
                    }
                }
                if (baseData.requirements) {
                    equipment.setRequirements(baseData.requirements.level || 1);
                }
                equipment.itemId = itemId;
                equipment.baseId = itemId;
                equipment.ilvl = baseData.ilvl;
                equipment.tags = baseData.tags || [];
                equipment.icon = baseData.icon;
                equipment.shape = baseData.shape;
                equipment.description = baseData.description;
                equipment.slot = baseData.slot;
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
        const baseItem = this.getRandomEquipmentByLevel(targetIlvl);
        if (!baseItem) return null;
        const newItem = this.createItemInstance(baseItem);
        const rarity = window.rarityDB.rollRarity(difficultyBonus);
        this.rollRandomStats(newItem, rarity, targetIlvl);
        newItem.setRarity(rarity);
        return newItem;
    }

    createItemInstance(baseItem) {
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
            newItem = new Equipment(baseItem.name, baseItem.slot);
        }
        newItem.id = Date.now() + Math.random();
        newItem.ilvl = baseItem.ilvl;
        newItem.icon = baseItem.icon;
        newItem.description = baseItem.description;
        newItem.shape = baseItem.shape;
        newItem.slot = baseItem.slot;
        newItem.category = baseItem.category;
        newItem.subCategory = baseItem.subCategory;
        for (const stat in baseItem.implicitStats) {
            newItem.addImplicitStat(stat, baseItem.implicitStats[stat]);
        }
        for (const stat in baseItem.statWeights) {
            newItem.addStatWeight(stat, baseItem.statWeights[stat]);
        }
        return newItem;
    }

    rollRandomStats(item, rarity, ilvl) {
        const baseItem = this.getEquipment(item.name);
        if (!baseItem || !baseItem.statWeights || Object.keys(baseItem.statWeights).length === 0) return;
        const statCount = rarity.getStatCount();
        if (statCount === 0) return;
        const availableStats = Object.keys(baseItem.statWeights);
        const usedStats = new Set();
        for (let i = 0; i < statCount && usedStats.size < availableStats.length; i++) {
            const remainingStats = availableStats.filter(s => !usedStats.has(s));
            if (remainingStats.length === 0) break;
            const stat = this.selectWeightedStat(remainingStats, baseItem.statWeights);
            const statDef = window.statDB.getStat(stat);
            if (!statDef) continue;
            const range = statDef.getValueRange(ilvl);
            const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            item.stats[stat] = value;
            usedStats.add(stat);
        }
    }

    selectWeightedStat(stats, weights) {
        const totalWeight = stats.reduce((sum, stat) => sum + (weights[stat] || 1), 0);
        let random = Math.random() * totalWeight;
        for (const stat of stats) {
            random -= (weights[stat] || 1);
            if (random <= 0) return stat;
        }
        return stats[0];
    }
}

// Singleton instance
const itemDB = new ItemDatabase();

// Export everything
export { Equipment, Weapon, Armor, Jewelry, Ring, Amulet, Belt, ItemDatabase, itemDB };