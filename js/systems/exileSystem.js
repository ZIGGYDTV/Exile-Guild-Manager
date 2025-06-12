// Exile Management System
// Handles all exile-related operations including creation, stats, and management

class ExileSystem {
    constructor() {
        console.log("Exile system initialized");
    }

    // // Get morale status text
    // getMoraleStatus(morale) {
    //     if (morale >= 90) return "Confident";
    //     if (morale >= 70) return "Content";
    //     if (morale >= 50) return "Discouraged";
    //     if (morale >= 25) return "Demoralized";
    //     if (morale >= 10) return "Wavering";
    //     return "Broken";
    // }

    // // Create morale tooltip text
    // createMoraleTooltip(morale) {
    //     let tooltip = `Morale: ${morale}/100\n`;
    //     tooltip += `―――――――――――――――\n`;

    //     if (morale >= 90) {
    //         tooltip += "Confident:\n";
    //         tooltip += "+10% Damage\n";
    //         tooltip += "+5% Defense";
    //     } else if (morale >= 70) {
    //         tooltip += "Content:\n";
    //         tooltip += "No bonuses or penalties";
    //     } else if (morale >= 50) {
    //         tooltip += "Discouraged:\n";
    //         tooltip += "-5% Damage";
    //     } else if (morale >= 25) {
    //         tooltip += "Demoralized:\n";
    //         tooltip += "-10% Damage\n";
    //         tooltip += "-5% Defense";
    //     } else {
    //         tooltip += "Broken:\n";
    //         tooltip += "-20% Damage\n";
    //         tooltip += "-10% Defense";
    //     }

    //     return tooltip;
    // }

    // createNewExile(className) {
    //     const classData = classDefinitions[className];
    //     gameState.exile = {
    //         id: gameState.nextExileId++,
    //         name: nameGenerator.generateName(),
    //         class: className,
    //         level: 1,
    //         experience: 0,
    //         experienceNeeded: 100,
    //         morale: 65,
    //         baseStats: { ...classData.baseStats },
    //         stats: {
    //             life: classData.baseStats.life,
    //             damage: classData.baseStats.damage,
    //             defense: classData.baseStats.defense,
    //             fireResist: 0,
    //             coldResist: 0,
    //             lightningResist: 0,
    //             chaosResist: 0,
    //             goldFindBonus: 0,
    //             escapeChance: 0,
    //             moraleResistance: 0,
    //             moraleGain: 0
    //         },
    //         passives: {
    //             allocated: [],
    //             pendingPoints: 1,
    //             rerollsUsed: 0
    //         }
    //     };
    //     //temp still calling game object methods
    //     this.recalculateStats();
    //     uiSystem.updateDisplay();
    // }


    // randomizeExileClass() {
    //     const classes = Object.keys(classDefinitions);
    //     const randomClass = classes[Math.floor(Math.random() * classes.length)];
    //     gameState.exile.class = randomClass;

    //     uiSystem.log(`${gameState.exile.name} is a ${classDefinitions[randomClass].name}!`, "info");
    // }

    // Give a random notable as starting passive
    // giveStartingNotable() {
    //     const notables = passiveHelpers.getPassivesByTier('notable');
    //     const randomNotable = notables[Math.floor(Math.random() * notables.length)];
    //     gameState.exile.passives.allocated.push(randomNotable.id);

    //     uiSystem.log(`${gameState.exile.name} starts with ${randomNotable.name}!`, "legendary");
    // }


    handleExileDeath(exileId = null) {
        // Default to selected exile if not specified
        if (!exileId) {
            exileId = gameState.selectedExileId;
        }
        
        // Find the dying exile
        const fallenExile = gameState.exiles.find(e => e.id === exileId);
        if (!fallenExile) {
            console.error(`Exile ${exileId} not found!`);
            return;
        }
        
        // Mark as dead
        fallenExile.status = 'dead';
        fallenExile.currentHp = 0;
        
        // Equipment is LOST - clear it without returning to inventory
        Object.keys(fallenExile.equipment).forEach(slot => {
            if (fallenExile.equipment[slot]) {
                console.log(`Lost item: ${fallenExile.equipment[slot].name}`);
                fallenExile.equipment[slot] = null;
            }
        });
        
        // Log the death
        uiSystem.log(`${fallenExile.name} has fallen in combat! All equipped items were lost.`, "death");
        
        // Update displays
        if (typeof exileRowManager !== 'undefined') {
            exileRowManager.updateRow(exileRowManager.getRowForExile(exileId), fallenExile);
        }
        
        // Save the game state
        game.saveGame();
    }


    // Get current assignment for an exile
    getExileAssignment(exileName) {
        // Initialize assignments if needed
        if (!turnState.assignments) {
            turnState.assignments = [];
        }
        
        // Find exile by name to get ID
        const exile = gameState.exiles.find(e => e.name === exileName);
        if (!exile) return null;
        
        return turnState.assignments.find(a => a.exileId === exile.id) || null;
    }

    // Assign a mission to an exile
    // assignMissionToExile(exileName, areaId, missionId) {
    //     // Check if mission is available
    //     if (!isMissionAvailable(areaId, missionId)) {
    //         uiSystem.log("Cannot assign to unavailable mission!", "failure");  // TEMPORARY
    //         return false;
    //     }

    //     // Check if exile is already assigned to something
    //     const existingAssignment = this.getExileAssignment(exileName);
    //     if (existingAssignment) {
    //         // Unassign from current mission first
    //         this.unassignExile(exileName);
    //     }

    //     // Find exile by name to get ID
    //     const exile = gameState.exiles.find(e => e.name === exileName);
    //     if (!exile) {
    //         uiSystem.log("Exile not found!", "failure");
    //         return false;
    //     }

    //     // Initialize assignments if needed
    //     if (!turnState.assignments) {
    //         turnState.assignments = [];
    //     }

    //     // Add new assignment using exileId
    //     turnState.assignments.push({
    //         exileId: exile.id,
    //         areaId: areaId,
    //         missionId: missionId
    //     });

    //     const missionData = getMissionData(areaId, missionId);
    //     uiSystem.log(`📋 ${exileName} assigned to ${missionData.name}`, "info");  // TEMPORARY

    //     // Update displays
    //     worldMapSystem.updateWorldMapDisplay();
    //     game.saveGame();                    // TEMPORARY

    //     return true;
    // }

    // // Unassign an exile from their mission
    // unassignExile(exileName) {
    //     // Initialize assignments if needed
    //     if (!turnState.assignments) {
    //         turnState.assignments = [];
    //     }

    //     // Find exile by name to get ID
    //     const exile = gameState.exiles.find(e => e.name === exileName);
    //     if (!exile) {
    //         uiSystem.log("Exile not found!", "failure");
    //         return false;
    //     }

    //     const assignmentIndex = turnState.assignments.findIndex(a => a.exileId === exile.id);

    //     if (assignmentIndex === -1) {
    //         uiSystem.log(`${exileName} is not assigned to any mission`, "info");  // TEMPORARY
    //         return false;
    //     }

    //     // Remove assignment
    //     turnState.assignments.splice(assignmentIndex, 1);
    //     uiSystem.log(`📋 ${exileName} unassigned from mission`, "info");  // TEMPORARY

    //     // Update displays
    //     worldMapSystem.updateWorldMapDisplay();
    //     game.saveGame();                    // TEMPORARY

    //     return true;
    // }

    // Calculate total passive bonuses
    calculatePassiveEffects(exile = null) {
        // If no exile provided, use the current selected exile
        if (!exile) {
            exile = getCurrentExile();
            if (!exile) return {};
        }

        // Calculate total passive bonuses
        const effects = {
            // Increased (additive)
            increasedLife: 0,
            increasedDamage: 0,
            increasedDefense: 0,
            increasedAttackSpeed: 0,

            // More (multiplicative)
            moreLife: 0,
            moreDamage: 0,
            moreDefense: 0,
            moreAttackSpeed: 0,

            // Flat bonuses
            flatLife: 0,
            flatDamage: 0,
            flatDefense: 0,

            // Resistances
            fireResist: 0,
            coldResist: 0,
            lightningResist: 0,
            chaosResist: 0,
            maxFireResist: 0,
            maxColdResist: 0,
            maxLightningResist: 0,
            maxChaosResist: 0,

            // Special stats
            goldFindBonus: 0,
            escapeChance: 0,
            moraleResistance: 0,
            moraleGain: 0
        };

        // Apply all allocated passives
        exile.passives.allocated.forEach(passiveId => {
            const passive = passiveDefinitions[passiveId];
            if (passive && passive.effects) {
                passive.effects.forEach(effect => {
                    switch (effect.type) {
                        case passiveTypes.INCREASED_ATTACK_SPEED:
                            effects.increasedAttackSpeed += effect.value;
                            break;
                        case passiveTypes.MORE_ATTACK_SPEED:
                            effects.moreAttackSpeed += effect.value;
                            break;
                        case passiveTypes.INCREASED_LIFE:
                            effects.increasedLife += effect.value;
                            break;
                        case passiveTypes.INCREASED_DAMAGE:
                            effects.increasedDamage += effect.value;
                            break;
                        case passiveTypes.INCREASED_DEFENSE:
                            effects.increasedDefense += effect.value;
                            break;
                        case passiveTypes.MORE_LIFE:
                            effects.moreLife += effect.value;
                            break;
                        case passiveTypes.MORE_DAMAGE:
                            effects.moreDamage += effect.value;
                            break;
                        case passiveTypes.MORE_DEFENSE:
                            effects.moreDefense += effect.value;
                            break;
                        case passiveTypes.FLAT_LIFE:
                            effects.flatLife += effect.value;
                            break;
                        case passiveTypes.FLAT_DAMAGE:
                            effects.flatDamage += effect.value;
                            break;
                        case passiveTypes.FLAT_DEFENSE:
                            effects.flatDefense += effect.value;
                            break;
                        case passiveTypes.FIRE_RESISTANCE:
                            effects.fireResist += effect.value;
                            break;
                        case passiveTypes.COLD_RESISTANCE:
                            effects.coldResist += effect.value;
                            break;
                        case passiveTypes.LIGHTNING_RESISTANCE:
                            effects.lightningResist += effect.value;
                            break;
                        case passiveTypes.CHAOS_RESISTANCE:
                            effects.chaosResist += effect.value;
                            break;
                        case passiveTypes.MAX_FIRE_RESISTANCE:
                            effects.maxFireResist += effect.value;
                            break;
                        case passiveTypes.MAX_COLD_RESISTANCE:
                            effects.maxColdResist += effect.value;
                            break;
                        case passiveTypes.MAX_LIGHTNING_RESISTANCE:
                            effects.maxLightningResist += effect.value;
                            break;
                        case passiveTypes.MAX_CHAOS_RESISTANCE:
                            effects.maxChaosResist += effect.value;
                            break;
                        case passiveTypes.GOLD_FIND:
                            effects.goldFindBonus += effect.value;
                            break;
                        case passiveTypes.ESCAPE_CHANCE:
                            effects.escapeChance += effect.value;
                            break;
                        case passiveTypes.MORALE_RESISTANCE:
                            effects.moraleResistance += effect.value;
                            break;
                        case passiveTypes.MORALE_GAIN:
                            effects.moraleGain += effect.value;
                            break;
                    }
                });
            }
        });

        return effects;
    }

    // // Calculate morale change from combat results
    // calculateMoraleChange(combatResult, exile) {
    //     // Get morale resistance (can be negative)
    //     const moraleResist = (exile.stats.moraleResistance || 0) / 100;
    //     const moraleGain = exile.stats.moraleGain || 0; // NEW: flat morale gain

    //     let result;
    //     if (combatResult.outcome === 'victory') {
    //         const lifePercent = (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life;
    //         if (lifePercent <= 0.05) {
    //             result = { change: -4, message: "Nah... that was too bloody close it aint fun no more." };
    //         } else if (lifePercent <= 0.15) {
    //             result = { change: +6, message: "My heart races, I feel... ALIVE!" };
    //         } else if (lifePercent <= 0.3) {
    //             result = { change: +4, message: "Hah! A good challenge!" };
    //         } else if (lifePercent >= 0.95 && combatResult.winChancePerRound >= 0.30) {
    //             result = { change: -4, message: "This is beneath me..." };
    //         } else if (lifePercent >= 0.90) {
    //             result = { change: -2, message: "This is too easy, I need a real challenge!" };
    //         } else {
    //             result = { change: +1, message: "A fair and reasonable fight." };
    //         }
    //     } else if (combatResult.outcome === 'retreat') {
    //         if (combatResult.rounds >= 8) {
    //             result = { change: +3, message: "Phew that was a close one, but I did it!" };
    //         } else if (combatResult.rounds >= 5) {
    //             result = { change: -2, message: "Ah, I'm not on my game today..." };
    //         } else {
    //             result = { change: -4, message: "This is just embarrassing..." };
    //         }
    //     } else {
    //         // Death - no morale change since exile is dead
    //         return { change: 0, message: "" };
    //     }

    //     // Apply morale resistance scaling (works both positive and negative)
    //     let adjustedChange = result.change;
    //     if (adjustedChange !== 0 && moraleResist !== 0) {
    //         adjustedChange = Math.round(adjustedChange * (1 + moraleResist));
    //         if (adjustedChange === 0 && result.change !== 0) {
    //             adjustedChange = result.change > 0 ? 1 : -1;
    //         }
    //     }

    //     // Apply flat morale gain/penalty
    //     adjustedChange += moraleGain;

    //     return { change: adjustedChange, message: result.message };
    // }


    // GEAR + PASSIVES + LEVELS MATH AND SCALING
    recalculateStats(exile = null) {

        // If no exile provided, use the current selected exile (for backwards compatibility)
        if (!exile) {
            exile = getCurrentExile();
            if (!exile) return;
        }

        // Start with base stats (class + levels)
        const baseLife = exile.baseStats.life;
        const baseDamage = exile.baseStats.damage;
        const baseDefense = exile.baseStats.defense;

        // Calculate gear bonuses including implicits AND weapon damage multipliers
        let gearLife = 0, gearDamage = 0, gearDefense = 0;
        Object.values(exile.equipment || {}).forEach(item => {
            if (item) {
                // Add implicit stats
                if (item.implicitStats) {
                    gearLife += item.implicitStats.life || 0;
                    gearDefense += item.implicitStats.defense || 0;

                    // Handle weapon damage with multiplier
                    if (item.slot === 'weapon' && item.damageMultiplier) {
                        const weaponImplicitDamage = (item.implicitStats.damage || 0) * item.damageMultiplier;
                        gearDamage += weaponImplicitDamage;
                    } else {
                        gearDamage += item.implicitStats.damage || 0;
                    }
                }

                // Add regular stats
                gearLife += item.stats.life || 0;
                gearDefense += item.stats.defense || 0;

                // Handle weapon damage with multiplier
                if (item.slot === 'weapon' && item.damageMultiplier) {
                    const weaponRolledDamage = (item.stats.damage || 0) * item.damageMultiplier;
                    gearDamage += weaponRolledDamage;
                } else {
                    gearDamage += item.stats.damage || 0;
                }
            }
        });

        // Get passive effects
        const passiveEffects = this.calculatePassiveEffects();  // Now uses exileSystem method

        // === Add flat passives BEFORE scaling ===
        const flatLife = baseLife + gearLife + (passiveEffects.flatLife || 0);
        const flatDamage = baseDamage + gearDamage + (passiveEffects.flatDamage || 0);
        const flatDefense = baseDefense + gearDefense + (passiveEffects.flatDefense || 0);

        // Apply increased bonuses (additive)
        const increasedLife = flatLife * (1 + (passiveEffects.increasedLife || 0) / 100);
        const increasedDamage = flatDamage * (1 + (passiveEffects.increasedDamage || 0) / 100);
        const increasedDefense = flatDefense * (1 + (passiveEffects.increasedDefense || 0) / 100);

        // Apply more bonuses (multiplicative)
        const finalLife = increasedLife * (1 + (passiveEffects.moreLife || 0) / 100);
        const finalDamage = increasedDamage * (1 + (passiveEffects.moreDamage || 0) / 100);
        const finalDefense = increasedDefense * (1 + (passiveEffects.moreDefense || 0) / 100);

        // === Assign final values directly (no flat bonuses after scaling) ===
        exile.stats.life = Math.floor(finalLife);
        exile.stats.damage = Math.floor(finalDamage);
        exile.stats.defense = Math.floor(finalDefense);

        // Start with base attack speed from weapon (or 1.0 if no weapon)
        let baseAttackSpeed = 1.0;
        const equippedWeapon = exile.equipment.weapon;
        if (equippedWeapon && equippedWeapon.attackSpeed) {
            baseAttackSpeed = equippedWeapon.attackSpeed;
        }

        // Collect attack speed bonuses from gear
        let gearAttackSpeedBonus = 0;
        Object.values(exile.equipment).forEach(item => {
            if (item && item.stats) {
                gearAttackSpeedBonus += item.stats.attackSpeed || 0;
            }
        });

        // Get passive attack speed increases (additive)
        const passiveAttackSpeedIncrease = passiveEffects.increasedAttackSpeed || 0;

        // Apply increased modifiers (additive)
        const increasedAttackSpeed = baseAttackSpeed * (1 + (gearAttackSpeedBonus + passiveAttackSpeedIncrease) / 100);

        // Apply more modifiers (multiplicative)
        const finalAttackSpeed = increasedAttackSpeed * (1 + (passiveEffects.moreAttackSpeed || 0) / 100);

        exile.stats.attackSpeed = finalAttackSpeed;

        // Apply formula: (Base AS) × (1 + % Increases/100)
        const totalAttackSpeedIncrease = gearAttackSpeedBonus + passiveAttackSpeedIncrease;
        exile.stats.attackSpeed = baseAttackSpeed * (1 + totalAttackSpeedIncrease / 100);

        // Apply special stats
        exile.stats.goldFindBonus = passiveEffects.goldFindBonus;
        exile.stats.escapeChance = passiveEffects.escapeChance;
        exile.stats.moraleResistance = passiveEffects.moraleResistance;
        exile.stats.moraleGain = passiveEffects.moraleGain;

        // Calculate resistances from gear + passives
        let gearFireResist = 0, gearColdResist = 0, gearLightningResist = 0, gearChaosResist = 0;
        Object.values(exile.equipment).forEach(item => {
            if (item) {
                // Check IMPLICIT stats for resistances
                if (item.implicitStats) {
                    gearFireResist += item.implicitStats.fireResist || 0;
                    gearColdResist += item.implicitStats.coldResist || 0;
                    gearLightningResist += item.implicitStats.lightningResist || 0;
                    gearChaosResist += item.implicitStats.chaosResist || 0;
                }

                // Check REGULAR stats for resistances
                gearFireResist += item.stats.fireResist || 0;
                gearColdResist += item.stats.coldResist || 0;
                gearLightningResist += item.stats.lightningResist || 0;
                gearChaosResist += item.stats.chaosResist || 0;
            }
        });

        // Add passives
        const totalFireResist = gearFireResist + (passiveEffects.fireResist || 0);
        const totalColdResist = gearColdResist + (passiveEffects.coldResist || 0);
        const totalLightningResist = gearLightningResist + (passiveEffects.lightningResist || 0);
        const totalChaosResist = gearChaosResist + (passiveEffects.chaosResist || 0);

        // Calculate max resist caps (default + passives)
        const maxFireResist = (RESISTANCE_CAPS.default + (passiveEffects.maxFireResist || 0));
        const maxColdResist = (RESISTANCE_CAPS.default + (passiveEffects.maxColdResist || 0));
        const maxLightningResist = (RESISTANCE_CAPS.default + (passiveEffects.maxLightningResist || 0));
        const maxChaosResist = (RESISTANCE_CAPS.default + (passiveEffects.maxChaosResist || 0));

        // Apply resistance caps
        exile.stats.fireResist = Math.min(totalFireResist, maxFireResist);
        exile.stats.coldResist = Math.min(totalColdResist, maxColdResist);
        exile.stats.lightningResist = Math.min(totalLightningResist, maxLightningResist);
        exile.stats.chaosResist = Math.min(totalChaosResist, maxChaosResist);

        // Calculate light radius effects AND movement speed on scouting and exploration from gear + passives
        // Get light radius and movement speed from equipped gear (both implicits and regular stats)
        let gearLightRadius = 0;
        let gearMoveSpeed = 0;
        Object.values(exile.equipment).forEach(item => {
            if (item) {
                // Add from regular stats (check both camelCase and lowercase)
                gearLightRadius += item.stats.lightRadius || item.stats.lightradius || 0;
                gearMoveSpeed += item.stats.moveSpeed || item.stats.movespeed || 0;
                
                // Add from implicit stats (check both camelCase and lowercase)
                if (item.implicitStats) {
                    gearLightRadius += item.implicitStats.lightRadius || item.implicitStats.lightradius || 0;
                    gearMoveSpeed += item.implicitStats.moveSpeed || item.implicitStats.movespeed || 0;
                }
            }
        });

        // Get bonuses from passives
        const passiveLightRadius = passiveEffects.lightRadius || 0;
        const passiveMoveSpeed = passiveEffects.moveSpeed || 0;

        // Calculate totals
        const totalLightRadius = gearLightRadius + passiveLightRadius;
        const totalMoveSpeed = gearMoveSpeed + passiveMoveSpeed;

        // Store light radius and movement speed in stats
        exile.stats.lightRadius = totalLightRadius;
        exile.stats.moveSpeed = totalMoveSpeed;
        
        // Apply to scouting bonus (base 1.0 + bonuses)
        exile.stats.scoutingBonus = 1.0 + (totalLightRadius / 100) + (totalMoveSpeed / 200);
        // End of light radius effects on scouting and exploration from gear + passives

        // Ensure minimum values
        exile.stats.life = Math.max(1, exile.stats.life);
        exile.stats.damage = Math.max(1, exile.stats.damage);
        exile.stats.defense = Math.max(1, exile.stats.defense);
    }


    // More methods will be added here...
}

// Create singleton instance
const exileSystem = new ExileSystem();

// Export for module use
export { exileSystem };