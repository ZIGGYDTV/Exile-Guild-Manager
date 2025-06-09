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
            new Weapon('Broken Short Sword', 'sword') // Item base name, weapon type
                .setAttackSpeed(1.2)
                .setDamageMultiplier(0.9)
                .addImplicitStat('damage', 8)
                .addStatWeight('damage', 3)
                .addStatWeight('life', 0.2)
                .addStatWeight('defense', 1.5)
                .addStatWeight('attackSpeed', 2)
        );

        this.registerEquipment(
            new Weapon('Jagged Cannibal Machete', 'sword')
                .setRequirements(5)
                .setAttackSpeed(1.0)
                .setDamageMultiplier(1.1)
                .addImplicitStat('damage', 12)
                .addStatWeight('damage', 4)
        );

        this.registerEquipment(
            new Weapon('Stone Hatchet', 'axe')
                .setAttackSpeed(0.9)
                .setDamageMultiplier(1.2)
                .addImplicitStat('damage', 12)
                .addStatWeight('damage', 4)
                .addStatWeight('life', 1.2)
        );

        this.registerEquipment(
            new Weapon('Iron Bar', 'mace')
                .setAttackSpeed(0.75)
                .setDamageMultiplier(1.1)
                .addImplicitStat('damage', 10)
                .addImplicitStat('defense', 4)
                .addStatWeight('damage', 3)
                .addStatWeight('defense', 2)
        );

        this.registerEquipment(
            new Weapon('Femur Club', 'mace')
                .setRequirements(5)
                .setAttackSpeed(0.7)
                .setDamageMultiplier(1.2)
                .addImplicitStat('damage', 14)
                .addImplicitStat('defense', 3)
                .addStatWeight('damage', 4)
        );

        this.registerEquipment(
            new Weapon('Quarterstaff', 'staff')
                .setAttackSpeed(1)
                .setDamageMultiplier(1.0)
                .addImplicitStat('damage', 8)
                .addImplicitStat('defense', 8)
                .addStatWeight('damage', 2)
                .addStatWeight('defense', 2)
        );

        // Armor - Helmets
        this.registerEquipment(
            new Armor('Patchleather Cap', 'helmet')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('defense', 3)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
                .addStatWeight('lightRadius', 3)
        );

        this.registerEquipment(
            new Armor('Rag and Chain Cowl', 'helmet')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 5)
                .addStatWeight('defense', 3)
                .addStatWeight('life', 1)
                .addStatWeight('lightRadius', 3)
        );

        this.registerEquipment(
            new Armor('Strapped Bucket', 'helmet')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 9)
                .addStatWeight('defense', 4)
                .addStatWeight('life', 1)
                .addStatWeight('lightRadius', 0.05)
        );

        // Armor - Body
        this.registerEquipment(
            new Armor('Rag Tunic', 'chest')
                .setDefenseMultiplier(0.6)
                .addImplicitStat('defense', 3)
                .addStatWeight('life', 2)
                .addStatWeight('defense', 2)
        );

        this.registerEquipment(
            new Armor('Hide and Chain Poncho', 'chest')
                .setDefenseMultiplier(1.0)
                .addImplicitStat('defense', 9)
                .addStatWeight('defense', 3)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Armor('Scrapmetal Vest', 'chest')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 12)
                .addImplicitStat('moveSpeed', -5)
                .addStatWeight('defense', 4)
                .addStatWeight('life', 2)
                .addStatWeight('moveSpeed', 0)
        );

        // Armor - Gloves
        this.registerEquipment(
            new Armor('Rag Handwraps', 'gloves')
                .setDefenseMultiplier(0.6)
                .addImplicitStat('defense', 1)
                .addStatWeight('attackSpeed', 3)
                .addStatWeight('damage', 2)
        );

        this.registerEquipment(
            new Armor('Single Leather Glove', 'gloves')
                .setDefenseMultiplier(0.7)
                .addImplicitStat('defense', 2)
                .addStatWeight('attackSpeed', 2.5)
                .addStatWeight('damage', 2.5)
        );

        this.registerEquipment(
            new Armor('Rawhide Mittens', 'gloves')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 5)
                .addStatWeight('defense', 3)
                .addStatWeight('damage', 1)
                .addStatWeight('attackSpeed', 0.1)
        );

        // Armor - Boots
        this.registerEquipment(
            new Armor('Driftwood Sandals', 'boots')
                .setDefenseMultiplier(0.3)
                .addImplicitStat('moveSpeed', 8)
                .addStatWeight('moveSpeed', 2)
                .addStatWeight('lightningResist', 1.5)
        );

        this.registerEquipment(
            new Armor('PatchLeather Footwraps', 'boots')
                .setDefenseMultiplier(0.6)
                .addImplicitStat('defense', 2)
                .addImplicitStat('moveSpeed', 4)
                .addStatWeight('defense', 2)
                .addStatWeight('moveSpeed', 1.5)
                .addStatWeight('coldResist', 1.5)
        );

        this.registerEquipment(
            new Armor('Gobletcapped Boots', 'boots')
                .setDefenseMultiplier(1.2)
                .addImplicitStat('defense', 4)
                .addStatWeight('defense', 3)
                .addStatWeight('moveSpeed', 0.5)
                .addStatWeight('fireResist', 1.5)
        );

        // Armor - Shields
        this.registerEquipment(
            new Armor('Plank and Rope Armguard', 'shield')
                .setDefenseMultiplier(0.6)
                .addImplicitStat('defense', 9)
                .addStatWeight('defense', 2)
                .addStatWeight('life', 2)
                .addStatWeight('coldResist', 1.5)
                .addStatWeight('lightningResist', 1.5)
        );

        this.registerEquipment(
            new Armor('Barrel Lid', 'shield')
                .setDefenseMultiplier(0.8)
                .addImplicitStat('defense', 15)
                .addStatWeight('defense', 3)
        );

        this.registerEquipment(
            new Armor('Basket Rapier Handguard', 'shield')
                .setDefenseMultiplier(0.4)
                .addImplicitStat('defense', 4)
                .addImplicitStat('damage', 2)
                .addStatWeight('damage', 2)
        );

        // Rings
        this.registerEquipment(
            new Ring('Wooden Ring')
                .addImplicitStat('defense', 1)
        );

        this.registerEquipment(
            new Ring('Quartz Ring')
                .addImplicitStat('fireResist', 5)
                .addStatWeight('fireResist', 2)
        );

        this.registerEquipment(
            new Ring('Stone Ring')
                .addImplicitStat('lightningResist', 5)
                .addStatWeight('lightningResist', 2)
        );

        // Amulets
        this.registerEquipment(
            new Amulet('Bonecharm Amulet')
                .addImplicitStat('life', 9)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Amulet('Pukashell Necklace')
                .addImplicitStat('coldResist', 9)
                .addStatWeight('coldResist', 2)
        );

        this.registerEquipment(
            new Amulet('Scrap Iron Torc')
                .addImplicitStat('defense', 4)
                .addStatWeight('defense', 2)
        );

        // Belts
        this.registerEquipment(
            new Belt('Cord Belt')
                .addImplicitStat('life', 4)
                .addStatWeight('life', 2)
        );

        this.registerEquipment(
            new Belt('Old Scarf Wrap')
                .addImplicitStat('coldResist', 6)
                .addStatWeight('coldResist', 2)
        );

        this.registerEquipment(
            new Belt('Nail-studded Leather Belt')
                .addImplicitStat('defense', 8)
                .addImplicitStat('damage', 3)
                .addStatWeight('defense', 2)
                .addStatWeight('damage', 0.5)
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
        let possibleBases;

        // Define armor slots for easy checking
        const armorSlots = ['helmet', 'chest', 'gloves', 'boots', 'shield'];
        const jewelrySlots = ['ring', 'amulet', 'belt'];

        if (selectedSlot === 'weapon') {
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Weapon)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        } else if (selectedSlot === 'jewelry') {
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Ring || eq instanceof Amulet || eq instanceof Belt)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        } else if (selectedSlot === 'armor') {
            // When "armor" category is selected, get ALL armor pieces
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq instanceof Armor)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        } else if (armorSlots.includes(selectedSlot)) {
            // Specific armor slot requested (helmet, chest, etc.)
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        } else if (jewelrySlots.includes(selectedSlot)) {
            // Specific jewelry slot requested
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        } else {
            // Fallback for any other specific slot
            possibleBases = Array.from(this.equipment.values())
                .filter(eq => eq.slot === selectedSlot)
                .filter(eq => eq.requirements.level <= targetIlvl)
                .filter(eq => !eq.requirements.themes.length || 
                        eq.requirements.themes.some(theme => missionThemes.includes(theme)));
        }

        // Graduated fallback system
        if (!possibleBases.length) {
            // First fallback: Remove theme requirement but keep level + slot filtering
            if (selectedSlot === 'weapon') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Weapon)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            } else if (selectedSlot === 'jewelry') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Ring || eq instanceof Amulet || eq instanceof Belt)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            } else if (selectedSlot === 'armor') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Armor)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            } else if (armorSlots.includes(selectedSlot)) {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            } else if (jewelrySlots.includes(selectedSlot)) {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            } else {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot)
                    .filter(eq => eq.requirements.level <= targetIlvl);
            }
        }

        if (!possibleBases.length) {
            // Second fallback: Remove level requirement but keep slot filtering
            if (selectedSlot === 'weapon') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Weapon);
            } else if (selectedSlot === 'jewelry') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Ring || eq instanceof Amulet || eq instanceof Belt);
            } else if (selectedSlot === 'armor') {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq instanceof Armor);
            } else if (armorSlots.includes(selectedSlot)) {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot);
            } else if (jewelrySlots.includes(selectedSlot)) {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot);
            } else {
                possibleBases = Array.from(this.equipment.values())
                    .filter(eq => eq.slot === selectedSlot);
            }
        }

        // Final fallback: If still no bases found, use any equipment
        if (!possibleBases.length) {
            possibleBases = Array.from(this.equipment.values());
        }

        // Step 3: Select random base
        const baseItem = possibleBases[Math.floor(Math.random() * possibleBases.length)];

        // Step 4: Create new instance of the base
        const newItem = Object.create(baseItem);
        Object.assign(newItem, baseItem);

        // Step 4.5: Assign a unique ID
        newItem.id = Date.now() + Math.random();

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