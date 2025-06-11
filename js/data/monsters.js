// Monster class definition 
// Monster side combat handling also
export class Monster {
    constructor(baseData) {
        this.id = baseData.id;
        this.name = baseData.name;
        this.life = baseData.life;
        this.damage = baseData.damage;
        this.defense = baseData.defense;
        this.resistances = baseData.resistances || {};
        this.attackSpeed = baseData.attackSpeed || 1.0;
        this.damageTypes = baseData.damageTypes || { physical: 1.0 };
        this.drops = baseData.drops || {};
        this.tags = baseData.tags || [];
        this.ilvl = baseData.ilvl || 1;
        this.drops = {
            dropChance: baseData.drops?.dropChance || 0.1,
            allowedBases: baseData.drops?.allowedBases || null,
            forbiddenBases: baseData.drops?.forbiddenBases || null,
            // Add currency drops
            gold: baseData.drops?.gold || { min: 0, max: 0 },
            chaosOrbs: baseData.drops?.chaosOrbs || 0,  // Flat chance (0-1)
            exaltedOrbs: baseData.drops?.exaltedOrbs || 0  // Flat chance (0-1)
        };

        // New properties for enhanced system
        this.xpValue = baseData.xpValue || Math.floor(this.life / 5);
        this.lootBonus = baseData.lootBonus || 1.0;
        
        // Swarm support
        this.isSwarm = baseData.isSwarm || false;
        this.swarmBreakpoints = baseData.swarmBreakpoints || null;
        // Example: { 0.75: { damageMultiplier: 0.8 }, 0.5: { damageMultiplier: 0.6 } }
        
        // Future ability support
        this.abilities = baseData.abilities || [];
        // Will be array of ability definitions when implemented
        
        // Track current state for combat
        this.currentLife = this.life;
    }

    // Calculate attacks this round based on attack speed (deprecated - using percentage system now)
    getAttacksThisRound() {
        // This method is no longer used with the new percentage-based attack system
        // Attack count is now calculated directly in the combat system
        console.warn("getAttacksThisRound() is deprecated - use percentage-based attack system");
        return Math.floor(this.attackSpeed);
    }

    // Calculate damage dealt (with swarm modifiers if applicable)
    calculateDamage() {
        let baseDamage = this.damage;
        
        // Apply swarm damage reduction based on health
        if (this.isSwarm && this.swarmBreakpoints) {
            const healthPercent = this.currentLife / this.life;
            
            // Find the applicable breakpoint
            for (const [threshold, modifiers] of Object.entries(this.swarmBreakpoints)) {
                if (healthPercent <= parseFloat(threshold)) {
                    baseDamage *= modifiers.damageMultiplier || 1;
                }
            }
        }
        
        return Math.floor(baseDamage);
    }

    // Take damage and return actual damage taken
    takeDamage(incomingDamage, damageTypes = { physical: 1.0 }) {
        // TODO: Implement resistance calculations when needed
        const actualDamage = incomingDamage;
        this.currentLife = Math.max(0, this.currentLife - actualDamage);
        return actualDamage;
    }

    // Check if monster is dead
    isDead() {
        return this.currentLife <= 0;
    }

    // Reset for new encounter
    reset() {
        this.currentLife = this.life;
    }

    // Clone this monster (for spawning instances)
    clone() {
        const cloned = new Monster({
            ...this,
            swarmBreakpoints: this.swarmBreakpoints ? {...this.swarmBreakpoints} : null,
            abilities: [...this.abilities],
            drops: {...this.drops}
        });
        cloned.reset();
        return cloned;
    }

    // Create elite variant
    createEliteVariant(tier = 'magic') {
        const multipliers = {
            magic: { life: 1.2, damage: 1.2, xp: 1.5, loot: 1.5 },
            rare: { life: 1.5, damage: 1.5, xp: 2.0, loot: 2.0 }
        };
        
        const mult = multipliers[tier] || multipliers.magic;
        
        const elite = this.clone();
        elite.name = `${tier === 'rare' ? 'Rare' : 'Magic'} ${elite.name}`;
        elite.life = Math.floor(elite.life * mult.life);
        elite.currentLife = elite.life;
        elite.damage = Math.floor(elite.damage * mult.damage);
        elite.xpValue = Math.floor(elite.xpValue * mult.xp);
        elite.lootBonus = elite.lootBonus * mult.loot;
        elite.tier = tier;
        
        return elite;
    }
}

// Monster database
class MonsterDatabase {
    constructor() {
        this.monsters = new Map();
        this.initializeMonsters();
    }

    initializeMonsters() {
        // Beach monsters
        this.register(new Monster({
            id: 'corpsecrab',
            name: 'Corpsecrab',
            life: 20,
            damage: 3,
            defense: 2,
            attackSpeed: 0.8,
            damageTypes: { physical: 1.0 },
            ilvl: 1,
            xpValue: 4,
            tags: ['beast', 'undead', 'beach'],
            drops: {
                dropChance: 3.0,
                // Add currency drops
                gold: { min: 5, max: 22 },
                chaosOrbs: 0.05,  
                exaltedOrbs: 0.01    
            }
        }));

        this.register(new Monster({
            id: 'cannibal_scout',
            name: 'Cannibal Scout',
            life: 25,
            damage: 5,
            defense: 5,
            attackSpeed: 1.2,
            damageTypes: { physical: 0.8, fire: 0.2 },
            ilvl: 3,
            xpValue: 8,
            tags: ['human', 'cannibal', 'beach'],
            drops: {
                dropChance: 0.15,
                gold: { min: 9, max: 44 },
                chaosOrbs: 0.02,   // 2% chance
                exaltedOrbs: 0.001  // 0.1% chance
            }
        }));

        // Example swarm monster
        this.register(new Monster({
            id: 'crab_swarm',
            name: 'Crab Swarm',
            life: 40,
            damage: 6,
            defense: 3,
            attackSpeed: 1.5, // Attacks frequently
            damageTypes: { physical: 1.0 },
            ilvl: 2,
            xpValue: 10,
            tags: ['beast', 'swarm', 'beach'],
            isSwarm: true,
            swarmBreakpoints: {
                0.75: { damageMultiplier: 0.8 },
                0.5: { damageMultiplier: 0.6 },
                0.25: { damageMultiplier: 0.4 }
            },
            drops: {
                dropChance: 0.2
            }
        }));

        // Add more monsters as needed
    }

    register(monster) {
        this.monsters.set(monster.id, monster);
    }

    get(monsterId) {
        return this.monsters.get(monsterId);
    }

    // Spawn a monster instance with optional elite status
    spawn(monsterId, options = {}) {
        const baseMonster = this.get(monsterId);
        if (!baseMonster) {
            console.error(`Monster ${monsterId} not found!`);
            return null;
        }
        
        let instance = baseMonster.clone();
        
        // Apply elite status if specified
        if (options.elite) {
            instance = instance.createEliteVariant(options.elite);
        }
        
        // Apply any additional modifiers
        if (options.levelBonus) {
            // Future: Could adjust stats based on area level
        }
        
        return instance;
    }

    // Get all monsters matching specific tags
    getByTags(requiredTags = [], excludedTags = []) {
        return Array.from(this.monsters.values()).filter(monster => {
            // Must have all required tags
            const hasRequired = requiredTags.every(tag => monster.tags.includes(tag));
            // Must not have any excluded tags
            const hasExcluded = excludedTags.some(tag => monster.tags.includes(tag));
            
            return hasRequired && !hasExcluded;
        });
    }

    // Get monsters within ilvl range
    getByIlvl(minIlvl, maxIlvl) {
        return Array.from(this.monsters.values()).filter(monster =>
            monster.ilvl >= minIlvl && monster.ilvl <= maxIlvl
        );
    }

    // Get valid monsters for an area (by tags and ilvl)
    getValidMonstersForArea(areaTags, minIlvl, maxIlvl, excludedTags = []) {
        const byTags = this.getByTags(areaTags, excludedTags);
        return byTags.filter(m => m.ilvl >= minIlvl && m.ilvl <= maxIlvl);
    }
}

// Create and export the database
export const monsterDB = new MonsterDatabase();