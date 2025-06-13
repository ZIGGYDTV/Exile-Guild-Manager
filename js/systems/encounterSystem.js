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
        this.totalFood = 0;
        this.combatLog = [];
        this.retreatType = null; // 'safe' or 'risky'
    }

    // Get current encounter
    getCurrentEncounter() {
        return this.encounters[this.currentEncounterIndex];
    }

    // Check if currently in combat
    isInCombat() {
        const currentEncounter = this.getCurrentEncounter();
        if (!currentEncounter) return false;

        // We're in combat if there's an active encounter with a living monster
        return currentEncounter.status === 'active' &&
            currentEncounter.monster &&
            !currentEncounter.monster.isDead();
    }

    // Initiate retreat (determines type automatically)
    initiateRetreat() {
        if (this.isInCombat()) {
            this.retreatType = 'risky';
            this.status = 'retreated';
            this.combatLog.push(`⚠️ Risky retreat! Fled from ${this.getCurrentEncounter().monster.name}`);
        } else {
            this.retreatType = 'safe';
            this.status = 'retreated';
            this.combatLog.push(`✓ Safe retreat between encounters.`);
        }

        return this.retreatType;
    }

    // Add loot to pool (not given to player yet)
    addLoot(item) {
        this.lootPool.push(item);
    }

    // Add currency to pool
    addCurrency(gold = 0, chaos = 0, exalted = 0, food = 0) {
        this.totalGold += gold;
        this.totalChaosOrbs += chaos;
        this.totalExaltedOrbs += exalted;
        this.totalFood = (this.totalFood || 0) + food;
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

    // Resolve victory over a monster
    resolveEncounterVictory(encounter) {
        const monster = encounter.monster;

        // Mark encounter as complete
        encounter.status = 'victory';

        // Accumulate experience (NOT applied to exile yet)
        this.totalExperience += monster.xpValue || 0;

        // Roll for item drop (improved dropChance logic)
        if (monster.drops) {
            const dropChance = monster.drops.dropChance || 0.1;
            const guaranteed = Math.floor(dropChance);
            const extraChance = dropChance - guaranteed;
            let numDrops = guaranteed;
            if (Math.random() < extraChance) {
                numDrops += 1;
            }
            for (let i = 0; i < numDrops; i++) {
                const loot = window.itemDB.generateItem({
                    targetIlvl: monster.ilvl,
                    missionThemes: monster.tags || [],
                    difficultyBonus: monster.tier === 'rare' ? 10 : (monster.tier === 'magic' ? 5 : 0)
                });
                if (loot) {
                    // Convert to plain object and add to pool
                    const lootItem = {
                        id: loot.id || Date.now() + Math.random(),
                        name: loot.getDisplayName(),
                        slot: loot.slot,
                        type: loot.category || loot.slot,
                        rarity: loot.rarity?.name?.toLowerCase() || 'common',
                        ilvl: loot.ilvl,
                        icon: loot.icon,
                        description: loot.description,
                        attackSpeed: loot.attackSpeed,
                        damageMultiplier: loot.damageMultiplier,
                        stats: Object.fromEntries(loot.stats),
                        implicitStats: Object.fromEntries(loot.implicitStats)
                    };
                    this.addLoot(lootItem);
                    this.combatLog.push(`💎 ${monster.name} dropped ${lootItem.name}!`);
                }
            }
        }

        // Roll for gold drops
        if (monster.drops?.gold && monster.drops.gold.max > 0) {
            const goldDrop = Math.floor(Math.random() *
                (monster.drops.gold.max - monster.drops.gold.min + 1)) +
                monster.drops.gold.min;

            this.addCurrency(goldDrop, 0, 0);
            this.combatLog.push(`💰 Found ${goldDrop} gold!`);
        }

        // Roll for chaos orbs
        if (monster.drops?.chaosOrbs && Math.random() < monster.drops.chaosOrbs) {
            this.addCurrency(0, 1, 0);
            this.combatLog.push(`🌀 Found a Chaos Orb!`);
        }

        // Roll for exalted orbs
        if (monster.drops?.exaltedOrbs && Math.random() < monster.drops.exaltedOrbs) {
            this.addCurrency(0, 0, 1);
            this.combatLog.push(`⭐ Found an Exalted Orb!`);
        }

        // Roll for food drops
        if (monster.drops?.food && Math.random() < monster.drops.food) {
            this.addCurrency(0, 0, 0, 1); // Add 1 food
            this.combatLog.push(`🍖 Found food!`);
        }
    }

    // UPDATED METHOD: Apply penalty only for risky retreats
    applyRetreatPenalty() {
        // Only apply penalty for risky retreats
        if (this.retreatType !== 'risky') {
            this.combatLog.push(`✓ Safe retreat - no penalty applied.`);
            return;
        }

        // Risky retreat penalties - 50% across the board, NO experience penalty
        const goldLost = this.totalGold - Math.floor(this.totalGold * 0.5);
        this.totalGold = Math.floor(this.totalGold * 0.5);

        // NO experience penalty on risky retreat
        // this.totalExperience remains unchanged

        // 50% chance to lose each orb type (instead of losing all)
        let chaosOrbsLost = 0;
        let exaltedOrbsLost = 0;
        let foodLost = 0;

        if (this.totalChaosOrbs > 0 && Math.random() < 0.5) {
            chaosOrbsLost = this.totalChaosOrbs;
            this.totalChaosOrbs = 0;
        }

        if (this.totalExaltedOrbs > 0 && Math.random() < 0.5) {
            exaltedOrbsLost = this.totalExaltedOrbs;
            this.totalExaltedOrbs = 0;
        }

        if (this.totalFood > 0 && Math.random() < 0.5) {
            foodLost = this.totalFood;
            this.totalFood = 0;
        }
        if (foodLost > 0) this.combatLog.push(`   - Lost ${foodLost} food`);

        // Lose 50% of items (randomly) - keep existing logic
        let itemsLost = 0;
        if (this.lootPool.length > 0) {
            const itemsToKeep = Math.ceil(this.lootPool.length * 0.5);
            itemsLost = this.lootPool.length - itemsToKeep;
            const shuffled = [...this.lootPool].sort(() => Math.random() - 0.5);
            this.lootPool = shuffled.slice(0, itemsToKeep);
        }

        // Log penalties
        this.combatLog.push(`⚠️ Risky retreat penalties:`);
        if (goldLost > 0) this.combatLog.push(`   - Lost ${goldLost} gold`);
        if (chaosOrbsLost > 0) this.combatLog.push(`   - Lost ${chaosOrbsLost} chaos orbs`);
        if (exaltedOrbsLost > 0) this.combatLog.push(`   - Lost ${exaltedOrbsLost} exalted orbs`);
        if (itemsLost > 0) this.combatLog.push(`   - Lost ${itemsLost} items`);
        if (goldLost === 0 && chaosOrbsLost === 0 && exaltedOrbsLost === 0 && itemsLost === 0) {
            this.combatLog.push(`   - Lucky! No penalties this time.`);
        }
        this.combatLog.push(`   - Experience preserved`);
    }

    // Apply all rewards when mission ends
    applyRewards() {
        // Apply retreat penalty if needed
        if (this.status === 'retreated') {
            this.applyRetreatPenalty();
        }

        // Find the exile
        const exile = gameState.exiles.find(e => e.id === this.exileId);
        if (!exile) {
            console.error('Could not find exile to apply rewards!');
            return null;
        }

        // Add currency to game state
        gameState.resources.gold += this.totalGold;
        gameState.resources.chaosOrbs += this.totalChaosOrbs;
        gameState.resources.exaltedOrbs += this.totalExaltedOrbs;
        gameState.resources.food += this.totalFood;

        // Add items to inventory
        this.lootPool.forEach(item => {
            gameState.inventory.items.push(item);

            // Update inventory grid if it exists
            if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.addNewItemToInventory) {
                inventoryGridManager.addNewItemToInventory(item);
            }
        });

        // Add experience to exile
        exile.experience += this.totalExperience;

        // Check for level up
        if (typeof exileSystem !== 'undefined' && exileSystem.checkLevelUp) {
            exileSystem.checkLevelUp(exile);
        }

        // Update UI display to reflect currency changes
        if (typeof uiSystem !== 'undefined' && uiSystem.updateDisplay) {
            uiSystem.updateDisplay();
        }

        // Return summary of what was gained
        return {
            gold: this.totalGold,
            chaosOrbs: this.totalChaosOrbs,
            exaltedOrbs: this.totalExaltedOrbs,
            items: this.lootPool.length,
            experience: this.totalExperience,
            wasRetreat: this.status === 'retreated',
            retreatType: this.retreatType,  // Include retreat type
            itemList: [...this.lootPool]
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


            // EXILE HEALING AFTER ATTACKS BUT BEFORE MONSTER ATTACKS
            // Calculate total hits and damage from this round's actions
            const totalHits = roundData.exileActions.filter(action =>
                action.type === 'attack' && action.finalDamage > 0
            ).length;

            const roundDamageDealt = roundData.exileActions
                .filter(action => action.type === 'attack')
                .reduce((sum, action) => sum + action.finalDamage, 0);

            // Apply healing effects at end of exile's attacks
            if (exileLife > 0 && exileLife < exile.stats.life) {
                // Life Regen - heals every round
                if (exile.stats.lifeRegen > 0) {
                    const regenAmount = exileSystem.healExile(exile, exile.stats.lifeRegen, "regen");
                    if (regenAmount > 0) {
                        exileLife += regenAmount;
                        roundData.events.push({
                            type: 'heal',
                            source: 'regen',
                            amount: regenAmount,
                            exileHealthAfter: exileLife
                        });
                    }
                }

                // Life Gain on Hit - heal for each hit that landed
                if (exile.stats.lifeGainOnHit > 0 && totalHits > 0) {
                    const gainAmount = exileSystem.healExile(exile, exile.stats.lifeGainOnHit * totalHits, "gain on hit");
                    if (gainAmount > 0) {
                        exileLife += gainAmount;
                        roundData.events.push({
                            type: 'heal',
                            source: 'gain on hit',
                            amount: gainAmount,
                            hits: totalHits,
                            exileHealthAfter: exileLife
                        });
                    }
                }

                // Life Leech - heal based on damage dealt this round
                if (exile.stats.lifeLeech > 0 && roundDamageDealt > 0) {
                    const leechAmount = Math.floor(roundDamageDealt * exile.stats.lifeLeech / 100);
                    const healedAmount = exileSystem.healExile(exile, leechAmount, "leech");
                    if (healedAmount > 0) {
                        exileLife += healedAmount;
                        roundData.events.push({
                            type: 'heal',
                            source: 'leech',
                            amount: healedAmount,
                            damageDealt: roundDamageDealt,
                            exileHealthAfter: exileLife
                        });
                    }
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

    processRetreat(missionState) {
        // Check if we're in active combat
        const currentEncounter = missionState.getCurrentEncounter();

        if (!currentEncounter) {
            // No encounter, safe retreat
            missionState.initiateRetreat();
            return {
                success: true,
                type: 'safe',
                message: 'Retreated safely between encounters.'
            };
        }

        // Check if monster is alive (risky retreat)
        if (currentEncounter.status === 'active' &&
            currentEncounter.monster &&
            !currentEncounter.monster.isDead()) {

            // Risky retreat - maybe add a chance to fail?
            const retreatChance = 0.9; // 90% chance to successfully retreat

            if (Math.random() < retreatChance) {
                missionState.initiateRetreat();
                return {
                    success: true,
                    type: 'risky',
                    message: `Fled from ${currentEncounter.monster.name}! Some loot will be lost.`,
                    monsterName: currentEncounter.monster.name,
                    monsterHealth: `${currentEncounter.monster.currentLife}/${currentEncounter.monster.life}`
                };
            } else {
                // Failed to retreat - monster gets free attacks
                const failureResult = this.processFailedRetreat(missionState.exileId, currentEncounter);
                return {
                    success: false,
                    type: 'failed',
                    message: `Failed to escape from ${currentEncounter.monster.name}!`,
                    damage: failureResult.damage
                };
            }
        } else {
            // Monster is dead or encounter not active, safe retreat
            missionState.initiateRetreat();
            return {
                success: true,
                type: 'safe',
                message: 'Retreated safely after defeating the enemy.'
            };
        }
    }

    // ! Handle failed retreat attempt - this may want to be changed
    processFailedRetreat(exileId, encounter) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) return { damage: 0 };

        const monster = encounter.monster;

        // Monster gets 1 free attack
        const freeAttacks = 1;
        let totalDamage = 0;

        for (let i = 0; i < freeAttacks; i++) {
            const rawDamage = monster.calculateDamage();
            const damageResult = this.calculateMonsterDamageVsExile(rawDamage, monster, exile);

            totalDamage += damageResult.totalDamage;
            exile.currentLife = Math.max(0, (exile.currentLife || exile.stats.life) - damageResult.totalDamage);
        }

        return { damage: totalDamage };
    }
}

// Create and export the instance
export const turnBasedCombat = new TurnBasedCombatSystem();