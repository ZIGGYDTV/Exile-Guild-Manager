// Encounter System - Manages individual encounters within missions

export class Encounter {
    constructor(monster, encounterNumber, totalEncounters) {
        this.monster = monster;
        this.encounterNumber = encounterNumber;
        this.totalEncounters = totalEncounters;
        this.turnsElapsed = 0;
        this.status = 'active'; // 'active', 'victory', 'retreat', 'death'
        this.lootEarned = null;
        this.currentPhase = monster.currentPhase || 0;
    }

    // Check if this is the final encounter
    isFinalEncounter() {
        return this.encounterNumber === this.totalEncounters;
    }

    // Get encounter description
    getDescription() {
        const progress = `${this.encounterNumber}/${this.totalEncounters}`;

        if (this.monster.isBoss) {
            return `Boss Fight - ${this.monster.name} [${progress}]`;
        }

        return `Encounter ${progress}: ${this.monster.name}`;
    }

    // Check for culling strike
    canCullMonster() {
        if (this.monster.isBoss) return false;

        const healthPercent = this.monster.currentLife / this.monster.life;
        return healthPercent <= 0.2 && healthPercent > 0;
    }
}

export class MissionState {
    constructor(missionData, exileId) {
        this.missionData = missionData;
        this.exileId = exileId;
        this.encounters = [];
        this.currentEncounterIndex = 0;
        this.status = 'active'; // 'active', 'completed', 'failed', 'retreated'
        this.lootPool = []; // Accumulates during mission
        this.totalGold = 0;
        this.totalExperience = 0;
        this.totalChaosOrbs = 0;
        this.totalExaltedOrbs = 0;
        this.combatLog = [];
    }

    // Get current encounter
    getCurrentEncounter() {
        return this.encounters[this.currentEncounterIndex];
    }

    // Add loot to pool (not given to player yet)
    addLoot(item) {
        this.lootPool.push(item);
    }

    // Add currency to pool
    addCurrency(gold = 0, chaos = 0, exalted = 0) {
        this.totalGold += gold;
        this.totalChaosOrbs += chaos;
        this.totalExaltedOrbs += exalted;
    }

    // Move to next encounter
    nextEncounter() {
        this.currentEncounterIndex++;
        if (this.currentEncounterIndex >= this.encounters.length) {
            this.status = 'completed';
            return null;
        }
        return this.getCurrentEncounter();
    }

    // Apply all rewards when mission ends successfully
    applyRewards() {
        // This is called when exile returns home safely
        const exile = gameState.exiles.find(e => e.id === this.exileId);
        if (!exile) return;

        // Add currency
        gameState.resources.gold += this.totalGold;
        gameState.resources.chaosOrbs += this.totalChaosOrbs;
        gameState.resources.exaltedOrbs += this.totalExaltedOrbs;

        // Add items to inventory
        this.lootPool.forEach(item => {
            gameState.inventory.items.push(item);
        });

        // Add experience
        exile.experience += this.totalExperience;

        return {
            gold: this.totalGold,
            chaosOrbs: this.totalChaosOrbs,
            exaltedOrbs: this.totalExaltedOrbs,
            items: this.lootPool.length,
            experience: this.totalExperience
        };
    }
}

// Updated Combat System for turn-based encounters
export class TurnBasedCombatSystem {

    // Simulate one turn (5 rounds) of combat
    simulateTurn(exile, encounter) {
        const combatResult = {
            rounds: [],
            turnsElapsed: encounter.turnsElapsed,
            exileStartLife: exile.currentLife || exile.stats.life,
            monsterStartLife: encounter.monster.currentLife,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            outcome: null, // 'continue', 'victory', 'death', 'culled'
            phaseTransition: null
        };

        let exileLife = exile.currentLife || exile.stats.life;
        const exileAttackSpeed = exile.stats.attackSpeed || 1.0;

        const monster = encounter.monster;

        // Simulate 5 rounds
        for (let round = 1; round <= 5; round++) {
            const roundData = {
                round: round,
                timestamp: Date.now(),
                exileActions: [],
                monsterActions: [],
                exileHealth: 0, // Set at end of round
                monsterHealth: 0, // Set at end of round
                events: []
            };

            // === EXILE ATTACKS ===
            const exileBaseAttacks = Math.floor(exileAttackSpeed);
            const exileExtraChance = (exileAttackSpeed - exileBaseAttacks);

            // Always get base attacks
            let exileAttackCount = exileBaseAttacks;

            // Roll for extra attack
            if (exileExtraChance > 0 && Math.random() < exileExtraChance) {
                exileAttackCount++;
            }

            // If attack speed < 1, roll to see if we attack at all
            if (exileAttackSpeed < 1 && exileAttackCount === 0) {
                if (Math.random() >= exileAttackSpeed) {
                    // No attack this round
                    roundData.exileActions.push({
                        type: 'no_attack',
                        reason: 'slow',
                        attackSpeed: exileAttackSpeed
                    });
                } else {
                    exileAttackCount = 1;
                }
            }

            // Process exile attacks
            for (let i = 0; i < exileAttackCount && !monster.isDead(); i++) {                // Calculate raw damage
                const rawDamage = exile.stats.damage;

                // Calculate damage breakdown vs monster defenses
                const damageBreakdown = this.calculateExileDamageVsMonster(
                    rawDamage,
                    exile,
                    monster
                );

                const healthBefore = monster.currentLife;

                // Apply damage and check for phase transition
                const damageResult = monster.takeDamage(damageBreakdown.totalDamage);

                // Record detailed attack
                roundData.exileActions.push({
                    type: 'attack',
                    target: monster.name,
                    rawDamage: rawDamage,
                    finalDamage: damageBreakdown.totalDamage,
                    breakdown: damageBreakdown.breakdown,
                    targetHealthBefore: healthBefore,
                    targetHealthAfter: monster.currentLife,
                    critical: false // TODO: Implement crits later
                });

                combatResult.totalDamageDealt += damageBreakdown.totalDamage;

                // Check for phase transition (bosses only)
                if (damageResult.phaseTransition) {
                    combatResult.phaseTransition = damageResult.phaseTransition;
                    roundData.events.push({
                        type: 'phase_transition',
                        message: `${monster.name} enters ${damageResult.phaseTransition.to} phase!`,
                        timestamp: Date.now()
                    });
                }

                if (monster.isDead()) {
                    roundData.events.push({
                        type: 'monster_death',
                        message: `${monster.name} defeated!`,
                        timestamp: Date.now()
                    });
                    combatResult.outcome = 'victory';
                    break;
                }
            }

            // === MONSTER ATTACKS === (if still alive)
            if (!monster.isDead()) {
                const monsterAttackSpeed = monster.attackSpeed || 1.0;
                const monsterBaseAttacks = Math.floor(monsterAttackSpeed);
                const monsterExtraChance = (monsterAttackSpeed - monsterBaseAttacks);

                let monsterAttackCount = monsterBaseAttacks;

                // Roll for extra attack
                if (monsterExtraChance > 0 && Math.random() < monsterExtraChance) {
                    monsterAttackCount++;
                }

                // If attack speed < 1, roll to see if we attack at all
                if (monsterAttackSpeed < 1 && monsterAttackCount === 0) {
                    if (Math.random() >= monsterAttackSpeed) {
                        // Monster doesn't attack this round
                        roundData.monsterActions.push({
                            type: 'no_attack',
                            attacker: monster.name,
                            reason: 'slow',
                            attackSpeed: monsterAttackSpeed
                        });
                    } else {
                        monsterAttackCount = 1;
                    }
                }

                // Process monster attacks
                for (let i = 0; i < monsterAttackCount; i++) {
                    const rawDamage = monster.calculateDamage();

                    // Calculate damage with exile's defenses
                    const damageResult = this.calculateMonsterDamageVsExile(
                        rawDamage,
                        monster,
                        exile
                    );

                    const healthBefore = exileLife;
                    exileLife -= damageResult.totalDamage;

                    roundData.monsterActions.push({
                        type: 'attack',
                        attacker: monster.name,
                        rawDamage: rawDamage,
                        finalDamage: damageResult.totalDamage,
                        breakdown: damageResult.breakdown,
                        exileHealthBefore: healthBefore,
                        exileHealthAfter: Math.max(0, exileLife)
                    });

                    combatResult.totalDamageTaken += damageResult.totalDamage;

                    if (exileLife <= 0) {
                        roundData.events.push({
                            type: 'exile_death',
                            message: `${exile.name} has fallen!`,
                            timestamp: Date.now()
                        });
                        combatResult.outcome = 'death';
                        break;
                    }
                }
            }

            // Record health at end of round
            roundData.exileHealth = Math.max(0, exileLife);
            roundData.monsterHealth = Math.max(0, monster.currentLife);

            combatResult.rounds.push(roundData);

            // End early if someone died
            if (combatResult.outcome) break;
        }

        // Update encounter state
        encounter.turnsElapsed++;

        // Update exile state for next turn
        exile.currentLife = Math.max(0, exileLife);

        // If no one died, check for culling strike
        if (!combatResult.outcome) {
            if (encounter.canCullMonster()) {
                combatResult.outcome = 'culled';
                monster.currentLife = 0;
                // Add culling event to last round
                const lastRound = combatResult.rounds[combatResult.rounds.length - 1];
                lastRound.events.push({
                    type: 'culling_strike',
                    message: `${monster.name} executed! (Culling Strike)`,
                    timestamp: Date.now()
                });
            } else {
                combatResult.outcome = 'continue';
            }
        }

        combatResult.exileEndLife = exileLife;
        combatResult.monsterEndLife = monster.currentLife;
        combatResult.monsterHealthPercent = monster.currentLife / monster.life;

        return combatResult;
    }

    // Calculate exile damage vs monster (supports all damage types)
    calculateExileDamageVsMonster(rawDamage, exile, monster) {
        const breakdown = [];

        // Get damage types from exile - defaults to physical if not specified
        // In future: weapons/skills will add fire/cold/lightning/chaos
        const damageTypes = exile.damageTypes || { physical: 1.0 };

        Object.entries(damageTypes).forEach(([damageType, percentage]) => {
            const typeDamage = rawDamage * percentage;
            let mitigatedDamage = typeDamage;
            let mitigationText = '';

            if (damageType === 'physical') {
                // Physical damage reduction formula
                const defenseReduction = monster.defense / 200;
                const flatReduction = monster.defense / 4;
                mitigatedDamage = Math.max(1, typeDamage * (1 - defenseReduction) - flatReduction);
                const percentReduced = Math.round((1 - mitigatedDamage / typeDamage) * 100);
                mitigationText = `${percentReduced}% reduced by armor`;
            } else {
                // Elemental resistance
                const resistance = monster.resistances?.[damageType] || 0;
                mitigatedDamage = typeDamage * (1 - resistance / 100);

                if (resistance > 0) {
                    mitigationText = `${resistance}% resisted`;
                } else if (resistance < 0) {
                    mitigationText = `${Math.abs(resistance)}% vulnerable!`;
                } else {
                    mitigationText = 'no resistance';
                }
            }

            breakdown.push({
                type: damageType,
                raw: Math.round(typeDamage * 10) / 10,
                mitigated: Math.round(mitigatedDamage * 10) / 10,
                mitigation: mitigationText,
                color: this.getDamageTypeColor(damageType)
            });
        });

        return {
            totalDamage: Math.floor(breakdown.reduce((sum, b) => sum + b.mitigated, 0)),
            breakdown: breakdown
        };
    }

    // Calculate monster damage vs exile
    calculateMonsterDamageVsExile(rawDamage, monster, exile) {
        const breakdown = [];
        const damageTypes = monster.damageTypes || { physical: 1.0 };

        Object.entries(damageTypes).forEach(([damageType, percentage]) => {
            const typeDamage = rawDamage * percentage;
            let mitigatedDamage = typeDamage;
            let mitigationText = '';

            if (damageType === 'physical') {
                // Physical damage reduction
                const defenseReduction = exile.stats.defense / 200;
                const flatReduction = exile.stats.defense / 4;
                mitigatedDamage = Math.max(1, typeDamage * (1 - defenseReduction) - flatReduction);
                const percentReduced = Math.round((1 - mitigatedDamage / typeDamage) * 100);
                mitigationText = `${percentReduced}% reduced`;
            } else {
                // Elemental resistance
                const resistance = exile.stats[`${damageType}Resist`] || 0;
                mitigatedDamage = typeDamage * (1 - resistance / 100);
                mitigationText = `${resistance}% resisted`;
            }

            breakdown.push({
                type: damageType,
                raw: Math.round(typeDamage * 10) / 10,
                mitigated: Math.round(mitigatedDamage * 10) / 10,
                mitigation: mitigationText,
                color: this.getDamageTypeColor(damageType)
            });
        });

        return {
            totalDamage: Math.max(1, Math.floor(breakdown.reduce((sum, b) => sum + b.mitigated, 0))),
            breakdown: breakdown
        };
    }

    // Helper method for damage type colors
    getDamageTypeColor(damageType) {
        const colors = {
            physical: '#c0c0c0',
            fire: '#ff6b35',
            cold: '#4da6ff',
            lightning: '#ffeb3b',
            chaos: '#9c27b0'
        };
        return colors[damageType] || '#ffffff';
    }
}

// Create and export the instance
export const turnBasedCombat = new TurnBasedCombatSystem();