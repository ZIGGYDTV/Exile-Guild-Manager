// Monster class definition
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
    }

    // Calculate damage dealt to a target
    calculateDamage() {
        // Will implement damage calculation with types
        return this.damage;
    }

    // Take damage and return actual damage taken
    takeDamage(incomingDamage, damageTypes) {
        // Will implement resistance calculations
        return incomingDamage;
    }

    // Clone this monster (for spawning instances)
    clone() {
        return new Monster({
            ...this
        });
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
            life: 15,
            damage: 3,
            defense: 2,
            attackSpeed: 0.8,
            damageTypes: { physical: 1.0 },
            ilvl: 1,
            tags: ['beast', 'undead']
        }));

        this.register(new Monster({
            id: 'cannibal_scout',
            name: 'Cannibal Scout',
            life: 25,
            damage: 8,
            defense: 5,
            attackSpeed: 1.2,
            damageTypes: { physical: 0.8, fire: 0.2 },
            ilvl: 3,
            tags: ['human', 'cannibal']
        }));

        // Add more monsters as needed
    }

    register(monster) {
        this.monsters.set(monster.id, monster);
    }

    get(monsterId) {
        return this.monsters.get(monsterId);
    }

    spawn(monsterId, modifiers = {}) {
        const baseMonster = this.get(monsterId);
        if (!baseMonster) return null;
        
        const instance = baseMonster.clone();
        
        // Apply any modifiers (for elite/champion versions)
        if (modifiers.lifeMultiplier) {
            instance.life *= modifiers.lifeMultiplier;
        }
        if (modifiers.damageMultiplier) {
            instance.damage *= modifiers.damageMultiplier;
        }
        
        return instance;
    }

    // Get all monsters matching specific tags
    getByTags(tags) {
        return Array.from(this.monsters.values()).filter(monster => 
            tags.some(tag => monster.tags.includes(tag))
        );
    }

    // Get monsters within ilvl range
    getByIlvl(minIlvl, maxIlvl) {
        return Array.from(this.monsters.values()).filter(monster =>
            monster.ilvl >= minIlvl && monster.ilvl <= maxIlvl
        );
    }
}

// Create and export the database
export const monsterDB = new MonsterDatabase();