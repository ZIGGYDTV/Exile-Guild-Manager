// Boss definitions - Special monsters with multiple phases and unique mechanics
import { Monster } from './monsters.js';

// Boss-specific Monster subclass
export class Boss extends Monster {
    constructor(baseData) {
        super(baseData);
        this.isBoss = true;
        this.phases = baseData.phases || [{ threshold: 1.0, name: "Default" }];
        this.currentPhase = 0;
    }

    // Get current phase based on health
    getCurrentPhase() {
        const healthPercent = this.currentLife / this.life;
        
        for (let i = this.phases.length - 1; i >= 0; i--) {
            if (healthPercent <= this.phases[i].threshold) {
                return i;
            }
        }
        
        return 0;
    }

    // Update phase and return transition info if changed
    updatePhase() {
        const newPhase = this.getCurrentPhase();
        if (newPhase !== this.currentPhase) {
            const oldPhase = this.currentPhase;
            this.currentPhase = newPhase;
            return { 
                from: this.phases[oldPhase].name, 
                to: this.phases[newPhase].name,
                newPhaseData: this.phases[newPhase]
            };
        }
        return false;
    }

    // Override damage calculation to include phase modifiers
    calculateDamage() {
        let baseDamage = super.calculateDamage();
        const phase = this.phases[this.currentPhase];
        
        if (phase.damageMultiplier) {
            baseDamage *= phase.damageMultiplier;
        }
        
        return Math.floor(baseDamage);
    }

    // Override attack speed for phase-specific speeds (deprecated - using percentage system now)
    getAttacksThisRound() {
        // This method is no longer used with the new percentage-based attack system
        console.warn("Boss getAttacksThisRound() is deprecated - use percentage-based attack system");
        const phase = this.phases[this.currentPhase];
        const phaseAttackSpeed = phase.attackSpeed || this.attackSpeed;
        return Math.floor(phaseAttackSpeed);
    }

    // Override take damage to check for phase transitions
    takeDamage(incomingDamage, damageTypes) {
        const actualDamage = super.takeDamage(incomingDamage, damageTypes);
        const phaseTransition = this.updatePhase();
        
        return {
            damage: actualDamage,
            phaseTransition: phaseTransition
        };
    }

    // Get current abilities based on phase
    getCurrentAbilities() {
        const phase = this.phases[this.currentPhase];
        return phase.abilities || ['basicAttack'];
    }
}

// Boss Database
class BossDatabase {
    constructor() {
        this.bosses = new Map();
        this.initializeBosses();
    }

    initializeBosses() {
        // Beach Boss - Tide Warden
        this.register(new Boss({
            id: 'tidewarden',
            name: 'Tide Warden',
            life: 200,
            damage: 15,
            defense: 10,
            attackSpeed: 1.0,
            damageTypes: { physical: 0.5, cold: 0.5 },
            ilvl: 5,
            xpValue: 50,
            lootBonus: 2.0,
            tags: ['boss', 'elemental', 'beach'],
            phases: [
                {
                    threshold: 1.0,
                    name: "Stalking",
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    abilities: ['basicAttack']
                },
                {
                    threshold: 0.75,
                    name: "Aggressive",
                    damageMultiplier: 1.2,
                    attackSpeed: 1.2,
                    abilities: ['basicAttack', 'freezingWave']
                },
                {
                    threshold: 0.25,
                    name: "Desperate",
                    damageMultiplier: 1.5,
                    attackSpeed: 1.5,
                    abilities: ['basicAttack', 'freezingWave', 'tidalCrash']
                }
            ],
            drops: {
                bases: ['tidewardens_shell', 'frozen_orb'],
                dropChance: 0.8
            }
        }));

        // Cannibal Boss - Meat, the Butcher
        this.register(new Boss({
            id: 'meat_the_butcher',
            name: 'Meat, the Butcher',
            life: 150,
            damage: 20,
            defense: 8,
            attackSpeed: 0.8, // Slow but heavy hits
            damageTypes: { physical: 0.8, fire: 0.2 },
            ilvl: 7,
            xpValue: 80,
            lootBonus: 2.5,
            tags: ['boss', 'human', 'cannibal', 'beach'],
            phases: [
                {
                    threshold: 1.0,
                    name: "Methodical",
                    damageMultiplier: 1.0,
                    attackSpeed: 0.8,
                    abilities: ['heavyStrike']
                },
                {
                    threshold: 0.5,
                    name: "Frenzied",
                    damageMultiplier: 1.3,
                    attackSpeed: 1.2,
                    abilities: ['heavyStrike', 'burningCleave']
                }
            ],
            drops: {
                bases: ['meats_cleaver', 'cannibal_trophy'],
                dropChance: 1.0 // Guaranteed drop
            }
        }));

        // Rot Boss - Puswyrm
        this.register(new Boss({
            id: 'puswyrm',
            name: 'Puswyrm',
            life: 300,
            damage: 25,
            defense: 5,
            attackSpeed: 0.6, // Very slow
            damageTypes: { physical: 0.4, chaos: 0.6 },
            ilvl: 10,
            xpValue: 120,
            lootBonus: 3.0,
            tags: ['boss', 'abomination', 'rot'],
            phases: [
                {
                    threshold: 1.0,
                    name: "Lurking",
                    damageMultiplier: 0.8,
                    attackSpeed: 0.6,
                    abilities: ['toxic_bite']
                },
                {
                    threshold: 0.6,
                    name: "Thrashing",
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    abilities: ['toxic_bite', 'putrid_spray']
                },
                {
                    threshold: 0.3,
                    name: "Desperate Hunger",
                    damageMultiplier: 1.5,
                    attackSpeed: 1.2,
                    abilities: ['toxic_bite', 'putrid_spray', 'devour']
                }
            ],
            drops: {
                bases: ['puswyrm_fang', 'corrupted_essence'],
                dropChance: 0.9
            }
        }));
    }

    register(boss) {
        this.bosses.set(boss.id, boss);
    }

    get(bossId) {
        return this.bosses.get(bossId);
    }

    spawn(bossId) {
        const baseBoss = this.get(bossId);
        if (!baseBoss) {
            console.error(`Boss ${bossId} not found!`);
            return null;
        }
        
        return baseBoss.clone();
    }
}

// Create and export the database
export const bossDB = new BossDatabase();