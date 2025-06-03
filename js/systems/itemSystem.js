import { statDB } from './statSystem.js';
import { rarityDB } from './raritySystem.js';

// Core equipment system classes
class StatDefinition {
    constructor(name) {
        this.name = name;
        this.ilvlBreakpoints = [];
        this.restrictedToSlots = null;
        this.requiredThemes = null;
        this.restrictedToBases = null;
    }

    addBreakpoint(ilvl, min, max) {
        this.ilvlBreakpoints.push({ ilvl, min, max });
        // Sort breakpoints by ilvl for efficient lookup
        this.ilvlBreakpoints.sort((a, b) => a.ilvl - b.ilvl);
        return this;
    }

    restrictToSlots(...slots) {
        this.restrictedToSlots = slots;
        return this;
    }

    requireThemes(...themes) {
        this.requiredThemes = themes;
        return this;
    }

    restrictToBases(...bases) {
        this.restrictedToBases = bases;
        return this;
    }

    getValueRange(ilvl) {
        // Find highest breakpoint <= ilvl
        for (let i = this.ilvlBreakpoints.length - 1; i >= 0; i--) {
            if (ilvl >= this.ilvlBreakpoints[i].ilvl) {
                return {
                    min: this.ilvlBreakpoints[i].min,
                    max: this.ilvlBreakpoints[i].max
                };
            }
        }
        return this.ilvlBreakpoints[0] || { min: 0, max: 0 };
    }
}

// Equipment base classes
class Equipment {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot;
        this.implicitStats = new Map();
        this.statWeights = new Map();
        this.baseStats = new Map();
        this.requirements = {
            level: 1,
            themes: []
        };
        this.rarity = null;
        this.stats = new Map(); // Store the item's current stats
    }

    addImplicitStat(statType, value) {
        this.implicitStats.set(statType.toLowerCase(), value);
        return this;
    }

    addStatWeight(statType, weight) {
        this.statWeights.set(statType.toLowerCase(), weight);
        return this;
    }

    setRequirements(level = 1, themes = []) {
        this.requirements.level = level;
        this.requirements.themes = themes;
        return this;
    }

    // Get the value range for a stat at a given item level
    getStatRange(statType, ilvl) {
        const stat = statDB.getStat(statType);
        if (!stat) return null;
        return stat.getValueRange(ilvl);
    }

    // Roll stats for this item based on its rarity
    rollStats(ilvl, difficultyBonus = 0, missionThemes = []) {
        // If no rarity is set, roll for one
        if (!this.rarity) {
            this.rarity = rarityDB.rollRarity(difficultyBonus);
        }

        const statCount = this.rarity.getStatCount();
        this.stats = new Map();

        // Get ALL possible stats for this slot type from statDB
        const allPossibleStats = statDB.getStatsForSlot(this.slot);

        // Build available stats list with weights
        const availableStats = [];

        for (const statDef of allPossibleStats) {
            const statName = statDef.name;

            // Skip if this is an implicit stat
            if (this.implicitStats.has(statName)) {
                continue;
            }

            // Check if stat requires specific themes
            if (statDef.requiredThemes && statDef.requiredThemes.length > 0) {
                if (!statDef.requiredThemes.some(theme => missionThemes.includes(theme))) {
                    continue;
                }
            }

            // Get weight from statWeights or default to 1
            const weight = this.statWeights.get(statName) || 1;
            availableStats.push([statName, weight]);
        }

        // Roll for stats based on weights
        const rolledStats = new Set(); // Track which stats we've already rolled

        for (let i = 0; i < statCount; i++) {
            // Filter out already rolled stats
            const remainingStats = availableStats.filter(([stat, _]) => !rolledStats.has(stat));

            if (remainingStats.length === 0) break;

            // Calculate total weight
            const totalWeight = remainingStats.reduce((sum, [_, weight]) => sum + weight, 0);
            let roll = Math.random() * totalWeight;

            // Select a stat based on weights
            for (const [stat, weight] of remainingStats) {
                roll -= weight;
                if (roll <= 0) {
                    const range = this.getStatRange(stat, ilvl);
                    if (range) {
                        const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                        this.stats.set(stat, value);
                        rolledStats.add(stat);
                    }
                    break;
                }
            }
        }

        return this.stats;
    }

    // Get all stats including modified values
    getEffectiveStats() {
        return new Map(this.stats);
    }

    // Get display name including rarity
    getDisplayName() {
        return this.rarity ? `${this.rarity.name} ${this.name}` : this.name;
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

class Ring extends Equipment {
    constructor(name) {
        super(name, 'ring');
    }
}

class Amulet extends Equipment {
    constructor(name) {
        super(name, 'amulet');
    }
}

class Belt extends Equipment {
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
        // Weapons
        this.registerEquipment(
            new Weapon('Short Sword', 'sword')
                .setAttackSpeed(1.5)
                .setDamageMultiplier(1.0)
                .addImplicitStat('damage', 15)
                .addStatWeight('damage', 3)
                .addStatWeight('life', 1)
        );

        this.registerEquipment(
            new Weapon('Battle Axe', 'axe')
                .setAttackSpeed(0.9)
                .setDamageMultiplier(1.2)
                .addImplicitStat('damage', 25)
                .addStatWeight('damage', 4)
        );

        this.registerEquipment(
            new Weapon('War Hammer', 'mace')
                .setAttackSpeed(1.0)
                .setDamageMultiplier(1.1)
                .addImplicitStat('damage', 20)
                .addImplicitStat('defense', 5)
                .addStatWeight('damage', 3)
                .addStatWeight('defense', 1)
        );

        this.registerEquipment(
            new Weapon('Quarterstaff', 'staff')
                .setAttackSpeed(1.2)
                .setDamageMultiplier(0.9)
                .addImplicitStat('damage', 12)
                .addImplicitStat('defense', 8)
                .addStatWeight('damage', 2)
                .addStatWeight('defense', 2)
        );

        // Armor - Helmets
        this.registerEquipment(
            new Armor('Leather Cap', 'helmet')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('lightRadius', 15)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
                .addStatWeight('lightRadius', 1)
        );

        this.registerEquipment(
            new Armor('Chain Coif', 'helmet')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 10)
                .addStatWeight('defense', 3)
                .addStatWeight('life', 1)
                .addStatWeight('lightRadius', 1)
        );

        this.registerEquipment(
            new Armor('Plate Helm', 'helmet')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 15)
                .addStatWeight('defense', 4)
                .addStatWeight('life', 1)
                .addStatWeight('lightRadius', 1)
        );

        // Armor - Body
        this.registerEquipment(
            new Armor('Leather Tunic', 'chest')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('moveSpeed', 5)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
                .addStatWeight('moveSpeed', 1)
        );

        this.registerEquipment(
            new Armor('Chain Mail', 'chest')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 20)
                .addStatWeight('defense', 3)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Armor('Plate Armor', 'chest')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 30)
                .addStatWeight('defense', 4)
                .addStatWeight('life', 2)
        );

        // Armor - Gloves
        this.registerEquipment(
            new Armor('Leather Gloves', 'gloves')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('damage', 5)
                .addStatWeight('life', 1)
                .addStatWeight('defense', 1)
                .addStatWeight('damage', 1)
        );

        this.registerEquipment(
            new Armor('Chain Gauntlets', 'gloves')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 8)
                .addStatWeight('defense', 2)
                .addStatWeight('damage', 1)
        );

        this.registerEquipment(
            new Armor('Plate Gauntlets', 'gloves')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 12)
                .addStatWeight('defense', 3)
                .addStatWeight('damage', 1)
        );

        // Armor - Boots
        this.registerEquipment(
            new Armor('Leather Boots', 'boots')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('moveSpeed', 10)
                .addStatWeight('moveSpeed', 2)
                .addStatWeight('defense', 1)
                .addStatWeight('life', 1)
        );

        this.registerEquipment(
            new Armor('Chain Boots', 'boots')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('moveSpeed', 5)
                .addImplicitStat('defense', 5)
                .addStatWeight('defense', 2)
                .addStatWeight('moveSpeed', 1)
                .addStatWeight('life', 1)
        );

        this.registerEquipment(
            new Armor('Plate Greaves', 'boots')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 10)
                .addStatWeight('defense', 3)
                .addStatWeight('moveSpeed', 1)
                .addStatWeight('life', 1)
        );

        // Armor - Shields
        this.registerEquipment(
            new Armor('Wooden Shield', 'shield')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('defense', 15)
                .addStatWeight('defense', 2)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Armor('Kite Shield', 'shield')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 20)
                .addStatWeight('defense', 3)
                .addStatWeight('life', 1)
        );

        this.registerEquipment(
            new Armor('Tower Shield', 'shield')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 30)
                .addStatWeight('defense', 4)
        );

        // Rings
        this.registerEquipment(
            new Ring('Iron Ring')
                .addImplicitStat('defense', 5)
                .addStatWeight('life', 1)
                .addStatWeight('defense', 1)
                .addStatWeight('damage', 1)
        );

        this.registerEquipment(
            new Ring('Ruby Ring')
                .addImplicitStat('fireResist', 10)
                .addStatWeight('life', 2)
                .addStatWeight('fireResist', 2)
        );

        this.registerEquipment(
            new Ring('Sapphire Ring')
                .addImplicitStat('coldResist', 10)
                .addStatWeight('life', 2)
                .addStatWeight('coldResist', 2)
        );

        // Amulets
        this.registerEquipment(
            new Amulet('Amber Amulet')
                .addImplicitStat('life', 20)
                .addStatWeight('life', 3)
                .addStatWeight('defense', 1)
        );

        this.registerEquipment(
            new Amulet('Jade Amulet')
                .addImplicitStat('defense', 15)
                .addStatWeight('defense', 2)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Amulet('Onyx Amulet')
                .addImplicitStat('damage', 10)
                .addStatWeight('damage', 2)
                .addStatWeight('life', 2)
        );

        // Belts
        this.registerEquipment(
            new Belt('Leather Belt')
                .addImplicitStat('life', 30)
                .addStatWeight('life', 3)
                .addStatWeight('defense', 1)
        );

        this.registerEquipment(
            new Belt('Chain Belt')
                .addImplicitStat('defense', 10)
                .addImplicitStat('life', 15)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
        );

        this.registerEquipment(
            new Belt('Studded Belt')
                .addImplicitStat('defense', 8)
                .addImplicitStat('damage', 5)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
                .addStatWeight('damage', 1)
        );
    }

    registerEquipment(equipment) {
        this.equipment.set(equipment.name, equipment);
        return this;
    }

    getEquipment(name) {
        return this.equipment.get(name);
    }

    getAllEquipmentOfType(type) {
        return Array.from(this.equipment.values())
            .filter(eq => eq.slot === type);
    }

    generateItem(options = {}) {
        const {
            targetIlvl = 1,
            missionThemes = [],
            difficultyBonus = 0,
            slotWeights = {
                weapon: 0.4,
                armor: 0.35,
                jewelry: 0.25
            }
        } = options;

        // Step 1: Determine slot based on weights
        const slotRoll = Math.random();
        let selectedSlot;
        let cumulative = 0;

        for (const [slot, weight] of Object.entries(slotWeights)) {
            cumulative += weight;
            if (slotRoll <= cumulative) {
                selectedSlot = slot;
                break;
            }
        }

        // Step 2: Get all equipment of that slot type
        // Step 2: Get all equipment of that slot type
        let possibleBases;

        // Define armor slots for easy checking
        const armorSlots = ['helmet', 'chest', 'gloves', 'boots', 'shield'];
        const jewelrySlots = ['ring', 'amulet', 'belt'];

        if (selectedSlot === 'weapon') {
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Weapon);
        } else if (selectedSlot === 'jewelry') {
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Ring || eq instanceof Amulet || eq instanceof Belt);
        } else if (selectedSlot === 'armor') {
            // When "armor" category is selected, get ALL armor pieces
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Armor);
        } else if (armorSlots.includes(selectedSlot)) {
            // Specific armor slot requested (helmet, chest, etc.)
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot);
        } else if (jewelrySlots.includes(selectedSlot)) {
            // Specific jewelry slot requested
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot);
        } else {
            // Fallback for any other specific slot
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot);
        }

        // If no bases found for slot, fallback to any equipment
        if (!possibleBases.length) {
            possibleBases = Array.from(this.equipment.values());
        }

        // Step 3: Select random base
        const baseItem = possibleBases[Math.floor(Math.random() * possibleBases.length)];

        // Step 4: Create new instance of the base
        const newItem = Object.create(baseItem);
        Object.assign(newItem, baseItem);

        // Step 5: Roll stats based on item level and difficulty
        newItem.rollStats(targetIlvl, difficultyBonus, missionThemes);

        return newItem;
    }
}

// Create and export the database instance
const db = new ItemDatabase();

// Export the database instance and all equipment classes
export const itemDB = db;
export { Equipment, Weapon, Armor, Ring, Amulet, Belt }; 