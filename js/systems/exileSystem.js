// Exile Management System
// Handles all exile-related operations including creation, stats, and management

class ExileSystem {
    constructor() {
        console.log("Exile system initialized");
    }

    // Get morale status text
    getMoraleStatus(morale) {
        if (morale >= 90) return "Confident";
        if (morale >= 70) return "Content";
        if (morale >= 50) return "Discouraged";
        if (morale >= 25) return "Demoralized";
        if (morale >= 10) return "Wavering";
        return "Broken";
    }

    // Create morale tooltip text
    createMoraleTooltip(morale) {
        let tooltip = `Morale: ${morale}/100\n`;
        tooltip += `―――――――――――――――\n`;

        if (morale >= 90) {
            tooltip += "Confident:\n";
            tooltip += "+10% Damage\n";
            tooltip += "+5% Defense";
        } else if (morale >= 70) {
            tooltip += "Content:\n";
            tooltip += "No bonuses or penalties";
        } else if (morale >= 50) {
            tooltip += "Discouraged:\n";
            tooltip += "-5% Damage";
        } else if (morale >= 25) {
            tooltip += "Demoralized:\n";
            tooltip += "-10% Damage\n";
            tooltip += "-5% Defense";
        } else {
            tooltip += "Broken:\n";
            tooltip += "-20% Damage\n";
            tooltip += "-10% Defense";
        }

        return tooltip;
    }

    createNewExile(className) {
        const classData = classDefinitions[className];
        gameState.exile = {
            id: gameState.nextExileId++,
            name: nameGenerator.generateName(),
            class: className,
            level: 1,
            experience: 0,
            experienceNeeded: 100,
            morale: 65,
            baseStats: { ...classData.baseStats },
            stats: {
                life: classData.baseStats.life,
                damage: classData.baseStats.damage,
                defense: classData.baseStats.defense,
                fireResist: 0,
                coldResist: 0,
                lightningResist: 0,
                chaosResist: 0,
                goldFindBonus: 0,
                escapeChance: 0,
                moraleResistance: 0,
                moraleGain: 0
            },
            passives: {
                allocated: [],
                pendingPoints: 1,
                rerollsUsed: 0
            }
        };
        //temp still calling game object methods
        this.recalculateStats();
        game.updateDisplay();
    }


    initializeExile() {
        // Randomize class on truly new games
        const isNewGame = gameState.exile.level === 1 &&
            gameState.exile.experience === 0 &&
            gameState.exile.passives.allocated.length <= 1;

        if (isNewGame) {
            // Create new exile with random class
            const classes = Object.keys(classDefinitions);
            const randomClass = classes[Math.floor(Math.random() * classes.length)];
            this.createNewExile(randomClass);

            // Randomize class if this is a new game
            this.randomizeExileClass();
        }

        if (!gameState.exile.id) {
            gameState.exile.id = gameState.nextExileId++;
        }
        // Set base stats from class
        const classData = classDefinitions[gameState.exile.class];
        if (classData) {
            gameState.exile.baseStats = { ...classData.baseStats };
        }

        // Ensure exile has a starting notable if none allocated
        if (!gameState.exile.passives || gameState.exile.passives.allocated.length === 0) {
            this.giveStartingNotable();
        }

        // Recalculate all stats
        this.recalculateStats();
    }

    randomizeExileClass() {
        const classes = Object.keys(classDefinitions);
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        gameState.exile.class = randomClass;

        this.log(`${gameState.exile.name} is a ${classDefinitions[randomClass].name}!`, "info");
    }

    // Give a random notable as starting passive
    giveStartingNotable() {
        const notables = passiveHelpers.getPassivesByTier('notable');
        const randomNotable = notables[Math.floor(Math.random() * notables.length)];
        gameState.exile.passives.allocated.push(randomNotable.id);

        this.log(`${gameState.exile.name} starts with ${randomNotable.name}!`, "legendary");
    }


    // Current exile is logged, "deleted" and new exile is created
    handleExileDeath() {
        console.log("handleExileDeath called!");
        const fallenExile = gameState.exile;
        const deathDay = timeState.currentDay;

        // Create a complete snapshot of the fallen exile
        const fallenRecord = {
            ...fallenExile,  // Copy all exile properties
            deathDay: deathDay,
            deathMission: game.lastDeathMission || "Unknown Mission",  // TEMPORARY - need to track this differently
            totalDaysAlive: deathDay - (fallenExile.birthDay || 1),
            equipped: { ...gameState.inventory.equipped }  // Snapshot of what they died wearing
        };

        // Add to fallen exiles array
        gameState.fallenExiles.push(fallenRecord);

        // Clear any mission assignments for the dead exile
        gameState.assignments = gameState.assignments.filter(
            assignment => assignment.exileName !== fallenExile.name
        );

        // Update Command Center Display
        game.updateCommandCenterDisplay();  // TEMPORARY - will move to uiSystem

        // Delete equipped gear (hardcore death penalty)
        Object.keys(gameState.inventory.equipped).forEach(slot => {
            gameState.inventory.equipped[slot] = null;
        });

        // Generate new exile using existing system
        const classes = Object.keys(classDefinitions);
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        this.createNewExile(randomClass);  // Now calls exileSystem method

        // Give starting notable (same as original exile)
        this.giveStartingNotable();  // Now calls exileSystem method

        // Recalculate stats for new exile
        this.recalculateStats();  // TEMPORARY
        game.updateDisplay();     // TEMPORARY

        // Log the transition
        game.log(`⚰️ ${fallenRecord.name} has fallen. May they rest in peace.`, "failure");
        game.log(`🌟 ${gameState.exile.name} the ${classDefinitions[gameState.exile.class].name} has joined the guild!`, "legendary");

        // Save immediately
        game.saveGame();  // TEMPORARY
    }

    
    // Get current assignment for an exile
    getExileAssignment(exileName) {
        return gameState.assignments.find(a => a.exileName === exileName) || null;
    }

    // Assign a mission to an exile
    assignMissionToExile(exileName, areaId, missionId) {
        // Check if mission is available
        if (!isMissionAvailable(areaId, missionId)) {
            game.log("Cannot assign to unavailable mission!", "failure");  // TEMPORARY
            return false;
        }

        // Check if exile is already assigned to something
        const existingAssignment = this.getExileAssignment(exileName);
        if (existingAssignment) {
            // Unassign from current mission first
            this.unassignExile(exileName);
        }

        // Add new assignment
        gameState.assignments.push({
            exileName: exileName,
            areaId: areaId,
            missionId: missionId
        });

        const missionData = getMissionData(areaId, missionId);
        game.log(`📋 ${exileName} assigned to ${missionData.name}`, "info");  // TEMPORARY

        // Update displays
        game.updateCommandCenterDisplay();  // TEMPORARY
        game.updateWorldMapDisplay();       // TEMPORARY
        game.saveGame();                    // TEMPORARY

        return true;
    }

    // Unassign an exile from their mission
    unassignExile(exileName) {
        const assignmentIndex = gameState.assignments.findIndex(a => a.exileName === exileName);

        if (assignmentIndex === -1) {
            game.log(`${exileName} is not assigned to any mission`, "info");  // TEMPORARY
            return false;
        }

        // Remove assignment
        gameState.assignments.splice(assignmentIndex, 1);
        game.log(`📋 ${exileName} unassigned from mission`, "info");  // TEMPORARY

        // Update displays
        game.updateCommandCenterDisplay();  // TEMPORARY
        game.updateWorldMapDisplay();       // TEMPORARY
        game.saveGame();                    // TEMPORARY

        return true;
    }

// Calculate total passive bonuses
calculatePassiveEffects() {
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
    gameState.exile.passives.allocated.forEach(passiveId => {
        const passive = passiveDefinitions[passiveId];
        if (passive) {
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

// Calculate morale change from combat results
calculateMoraleChange(combatResult, exile) {
    // Get morale resistance (can be negative)
    const moraleResist = (exile.stats.moraleResistance || 0) / 100;
    const moraleGain = exile.stats.moraleGain || 0; // NEW: flat morale gain

    let result;
    if (combatResult.outcome === 'victory') {
        const lifePercent = (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life;
        if (lifePercent <= 0.05) {
            result = { change: -4, message: "Nah... that was too bloody close it aint fun no more." };
        } else if (lifePercent <= 0.15) {
            result = { change: +6, message: "My heart races, I feel... ALIVE!" };
        } else if (lifePercent <= 0.3) {
            result = { change: +4, message: "Hah! A good challenge!" };
        } else if (lifePercent >= 0.95 && combatResult.winChancePerRound >= 0.30) {
            result = { change: -4, message: "This is beneath me..." };
        } else if (lifePercent >= 0.90) {
            result = { change: -2, message: "This is too easy, I need a real challenge!" };
        } else {
            result = { change: +1, message: "A fair and reasonable fight." };
        }
    } else if (combatResult.outcome === 'retreat') {
        if (combatResult.rounds >= 8) {
            result = { change: +3, message: "Phew that was a close one, but I did it!" };
        } else if (combatResult.rounds >= 5) {
            result = { change: -2, message: "Ah, I'm not on my game today..." };
        } else {
            result = { change: -4, message: "This is just embarrassing..." };
        }
    } else {
        // Death - no morale change since exile is dead
        return { change: 0, message: "" };
    }

    // Apply morale resistance scaling (works both positive and negative)
    let adjustedChange = result.change;
    if (adjustedChange !== 0 && moraleResist !== 0) {
        adjustedChange = Math.round(adjustedChange * (1 + moraleResist));
        if (adjustedChange === 0 && result.change !== 0) {
            adjustedChange = result.change > 0 ? 1 : -1;
        }
    }

    // Apply flat morale gain/penalty
    adjustedChange += moraleGain;

    return { change: adjustedChange, message: result.message };
}


// GEAR + PASSIVES + LEVELS MATH AND SCALING
recalculateStats() {
    // Start with base stats (class + levels)
    const baseLife = gameState.exile.baseStats.life;
    const baseDamage = gameState.exile.baseStats.damage;
    const baseDefense = gameState.exile.baseStats.defense;

    // Calculate gear bonuses including implicits AND weapon damage multipliers
    let gearLife = 0, gearDamage = 0, gearDefense = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
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
    gameState.exile.stats.life = Math.floor(finalLife);
    gameState.exile.stats.damage = Math.floor(finalDamage);
    gameState.exile.stats.defense = Math.floor(finalDefense);

    // Start with base attack speed from weapon (or 1.0 if no weapon)
    let baseAttackSpeed = 1.0;
    const equippedWeapon = gameState.inventory.equipped.weapon;
    if (equippedWeapon && equippedWeapon.attackSpeed) {
        baseAttackSpeed = equippedWeapon.attackSpeed;
    }

    // Collect attack speed bonuses from gear
    let gearAttackSpeedBonus = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
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

    gameState.exile.stats.attackSpeed = finalAttackSpeed;

    // Apply formula: (Base AS) × (1 + % Increases/100)
    const totalAttackSpeedIncrease = gearAttackSpeedBonus + passiveAttackSpeedIncrease;
    gameState.exile.stats.attackSpeed = baseAttackSpeed * (1 + totalAttackSpeedIncrease / 100);

    // Apply special stats
    gameState.exile.stats.goldFindBonus = passiveEffects.goldFindBonus;
    gameState.exile.stats.escapeChance = passiveEffects.escapeChance;
    gameState.exile.stats.moraleResistance = passiveEffects.moraleResistance;
    gameState.exile.stats.moraleGain = passiveEffects.moraleGain;

    // Calculate resistances from gear + passives
    let gearFireResist = 0, gearColdResist = 0, gearLightningResist = 0, gearChaosResist = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
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
    gameState.exile.stats.fireResist = Math.min(totalFireResist, maxFireResist);
    gameState.exile.stats.coldResist = Math.min(totalColdResist, maxColdResist);
    gameState.exile.stats.lightningResist = Math.min(totalLightningResist, maxLightningResist);
    gameState.exile.stats.chaosResist = Math.min(totalChaosResist, maxChaosResist);

    // Calculate light radius effects AND movement speed on scouting and exploration from gear + passives
    // Get light radius from equipped gear
    let gearLightRadius = 0;
    let gearMoveSpeed = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
        if (item) {
            gearLightRadius += item.stats.lightRadius || 0;
            gearMoveSpeed += item.stats.moveSpeed || 0;
        }
    });

    // Get bonuses from passives
    const passiveLightRadius = passiveEffects.lightRadius || 0;
    const passiveMoveSpeed = passiveEffects.moveSpeed || 0;

    // Calculate totals
    const totalLightRadius = gearLightRadius + passiveLightRadius;
    const totalMoveSpeed = gearMoveSpeed + passiveMoveSpeed;

    // Apply to scouting bonus (base 1.0 + bonuses)
    gameState.exile.stats.scoutingBonus = 1.0 + (totalLightRadius / 100) + (totalMoveSpeed / 200);
    // End of light radius effects on scouting and exploration from gear + passives

    // Ensure minimum values
    gameState.exile.stats.life = Math.max(1, gameState.exile.stats.life);
    gameState.exile.stats.damage = Math.max(1, gameState.exile.stats.damage);
    gameState.exile.stats.defense = Math.max(1, gameState.exile.stats.defense);
}


    // More methods will be added here...
}

// Create singleton instance
const exileSystem = new ExileSystem();

// Export for module use
export { exileSystem };