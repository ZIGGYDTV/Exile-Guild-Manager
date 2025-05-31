// Core game object (The games verbs, "doing things" aka macros/widgets)
const game = {
    init() {
    // Load saved game first
    this.loadGame();
    
    // Initialize exile with class system and passives
    this.initializeExile();
    
    this.updateDisplay();
    this.updateInventoryDisplay();
    this.log("Welcome to Exile Manager! Send your exile on missions to grow stronger.", "info");
},
    
   runMission(difficulty) {
    const mission = missions[difficulty];
    const exile = gameState.exile; // Future: could be any exile
    
    // Run combat simulation
    const combatResult = this.simulateCombat(exile, mission);
    
    let goldEarned = 0;
    let expEarned = 0;
    let moraleHtml = "";


    if (combatResult.outcome === 'victory') {
        // Success! Award rewards
        goldEarned = this.randomBetween(mission.rewards.gold.min, mission.rewards.gold.max);

        // Apply gold find bonus
        const goldFindMultiplier = 1 + (exile.stats.goldFindBonus || 0) / 100;
        goldEarned = Math.floor(goldEarned * goldFindMultiplier);

        gameState.resources.gold += goldEarned;
        expEarned = typeof mission.rewards.experience === 'object' 
            ? this.randomBetween(mission.rewards.experience.min, mission.rewards.experience.max)
            : mission.rewards.experience;
        gameState.exile.experience += expEarned;

        
        // Calculate final life after combat
        const finalLife = exile.stats.life - combatResult.totalDamageTaken;
        
        let message = `✓ ${mission.name} cleared! +${goldEarned} gold, +${expEarned} exp`;
        
        
        // Check for orb drops
        let orbMessage = "";
        if (Math.random() < mission.rewards.chaosOrbChance) {
            gameState.resources.chaosOrbs++;
            orbMessage += ", +1 Chaos Orb!";
        }
        if (Math.random() < mission.rewards.exaltedOrbChance) {
            gameState.resources.exaltedOrbs++;
            orbMessage += ", +1 Exalted Orb!";
        }

        if (orbMessage) {
            this.log(`🎁 Bonus rewards${orbMessage}`, "legendary");
        }
        
        // Check for gear drops
        const difficultyData = getDifficultyConfig(difficulty);
        if (Math.random() < difficultyData.gearDropChance) {
            const newGear = this.generateGear(difficulty);
            gameState.inventory.backpack.push(newGear);
            this.log(`⭐ Found ${newGear.name}!`, newGear.rarity === 'rare' ? 'legendary' : 'success');
            this.updateInventoryDisplay();
        }

        this.checkLevelUp();

        // Calculate and apply morale change
if (combatResult.outcome !== 'death') {
    const moraleResult = this.calculateMoraleChange(combatResult, exile);
    if (moraleResult.change !== 0) {
        gameState.exile.morale = Math.max(0, Math.min(100, gameState.exile.morale + moraleResult.change));
        const moraleIcon = moraleResult.change > 0 ? "🔥" : "😴";
        const moraleText = moraleResult.change > 0 ? `(+${moraleResult.change} morale)` : `(${moraleResult.change} morale)`;
        moraleHtml = `<br><span style="font-size:0.65em; color:#aaa;">${moraleIcon} ${exile.name}: "${moraleResult.message}" ${moraleText}</span>`;
    }
}
        
    } else if (combatResult.outcome === 'death') {
        // Death! Generate detailed death message
        const deathMessage = this.generateDeathMessage(combatResult);
        this.gameOver();
        
    } else {
    // Retreat - either early escape or round limit
    const retreatReason = combatResult.rounds >= 5 ? "after a prolonged fight" : "badly wounded";
}

let mainMessage = "";
let breakdownHtml = "";

// Build the main message for each outcome
if (combatResult.outcome === 'victory') {
    mainMessage = `✓ ${mission.name} cleared! +${goldEarned} gold, +${expEarned} exp`;
} else if (combatResult.outcome === 'death') {
    mainMessage = this.generateDeathMessage(combatResult);
} else if (combatResult.outcome === 'retreat') {
    const retreatReason = combatResult.rounds >= 5 ? "after a prolonged fight" : "badly wounded";
    mainMessage = `✗ ${exile.name} retreated from ${mission.name} ${retreatReason} (${combatResult.rounds} rounds, ${Math.floor(combatResult.heaviestHit * 10) / 10} heaviest hit).`;
}

// Build the breakdown if available
const breakdownSource =
    combatResult.heaviestHitBreakdown ||
    (combatResult.damageLog.length > 0 ? combatResult.damageLog[combatResult.damageLog.length - 1].breakdown : null);

if (breakdownSource) {
    const lines = breakdownSource.map(b => {
        const typeClass = `element-${b.type.toLowerCase()}`;
        return `<span class="${typeClass}">${b.type.charAt(0).toUpperCase() + b.type.slice(1)}: ${Math.round(b.raw * 10) / 10} → ${Math.round(b.final * 10) / 10}</span>`;
    }).join(' / ');

    const totalUnmitigated = breakdownSource.reduce((sum, b) => sum + b.raw, 0);
    const totalMitigated = breakdownSource.reduce((sum, b) => sum + b.final, 0);

    const logId = `combat-breakdown-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    breakdownHtml = `
        <span class="combat-breakdown-toggle" style="cursor:pointer;" onclick="game.toggleBreakdown('${logId}')">
            <span class="triangle">&#x25BC;</span>
            ⚔️ Heaviest hit breakdown: ${Math.round(totalMitigated * 10) / 10}
        </span>
        <div id="${logId}" class="combat-breakdown-details" style="display:none; margin-left:1.5em; color:#bbb; font-size:0.95em;">
            &gt; ${lines} / Total: ${Math.round(totalUnmitigated * 10) / 10} → ${Math.round(totalMitigated * 10) / 10}
        </div>
    `;
}

// Combine and log as a single entry
if (mainMessage) {
    this.log(
        `${mainMessage}${breakdownHtml ? "<br>" + breakdownHtml : ""}${moraleHtml || ""}`,
        combatResult.outcome === 'victory' ? "success" : "failure",
        true // isHtml
    );
}

    this.updateDisplay();
    this.saveGame();
},
    
    checkLevelUp() {
    while (gameState.exile.experience >= gameState.exile.experienceNeeded) {
        gameState.exile.level++;
        gameState.exile.experience -= gameState.exile.experienceNeeded;
        gameState.exile.experienceNeeded = gameState.exile.level * 100;
        
        // Only give life on level up (no more damage/defense)
        gameState.exile.baseStats.life += 20;
        
        // Give passive point
        gameState.exile.passives.pendingPoints++;
        
        this.log(`🎉 LEVEL UP! ${gameState.exile.name} is now level ${gameState.exile.level}! (+1 Passive Point)`, "legendary");
        
        // Immediately offer passive selection
        this.startPassiveSelection();

                // ...inside checkLevelUp, after level up is processed...
    const summaryEl = document.getElementById('exile-summary-card');
    if (summaryEl) {
        summaryEl.classList.remove('levelup-animate'); // Reset if already animating
        void summaryEl.offsetWidth; // Force reflow to restart animation
        summaryEl.classList.add('levelup-animate');
    }
    }
},

 
 simulateCombat(exile, mission) {
    const combatData = {
        exile: exile,
        mission: mission,
        rounds: 0,
        damageLog: [],
        heaviestHit: 0,
        totalDamageTaken: 0,
        outcome: null, // 'victory', 'death', 'retreat'
        deathType: null // 'oneshot', 'outclassed_barely', etc.
    };
    
    // Calculate win chance per round
    const powerAdvantage = this.calculatePowerRating(exile) / mission.difficulty;
    const winChancePerRound = Math.min(0.4, powerAdvantage * 0.15);
    
    let currentLife = exile.stats.life;
    const maxRounds = 5; // Prevent infinite loops and give them a fail out if they aren't winning in reasonable "timeframe".
    
    while (currentLife > 0 && combatData.rounds < maxRounds) {
        combatData.rounds++;
   
        // Mission attacks
        const damageRoll = this.randomBetween(mission.damage.min, mission.damage.max);
        const damageResult = this.calculateDamageReduction(damageRoll, exile, mission);
        const damageTaken = damageResult.damage;
        
        currentLife -= damageTaken;
        combatData.totalDamageTaken += damageTaken;
        if (damageTaken > combatData.heaviestHit) {
            combatData.heaviestHit = damageTaken;
            combatData.heaviestHitBreakdown = damageResult.breakdown; // Store the breakdown of heaviest hit
}        
        // Log this hit for detailed analysis
        combatData.damageLog.push({
            round: combatData.rounds,
            rawDamage: damageRoll,
            actualDamage: damageTaken,
            breakdown: damageResult.breakdown,  // NEW: Store the breakdown
            lifeRemaining: Math.max(0, currentLife)
        });

        // Check for death
        if (currentLife <= 0) {
            combatData.outcome = 'death';
            combatData.deathType = this.classifyDeath(combatData, winChancePerRound);
            break;
        }

        // Check for early retreat (20% life threshold)
        if (currentLife > 0 && currentLife < exile.stats.life * 0.2 && Math.random() < 0.5) {
            combatData.outcome = 'retreat';
            break;
        }
        
        // Check for victory
        if (Math.random() < winChancePerRound) {
            combatData.outcome = 'victory';
            break;
        }
    }
    
    // Handle timeout
    if (combatData.rounds >= maxRounds && combatData.outcome === null) {
        combatData.outcome = 'retreat';
    }
    
    return combatData;
},

// DAMAGE CALCS FOR MISSION DAMAGE - RETURNS CALCULATIONS FOR LOG
calculateDamageReduction(rawDamage, exile, mission) {
    // Get damage type breakdown from mission
    const damageTypes = mission.damage.types || { physical: 1.0 };
    
    let totalDamageAfterReduction = 0;
    const breakdown = []; // NEW: Track each damage type
    
    // Process each damage type separately
    Object.entries(damageTypes).forEach(([damageType, percentage]) => {
        const typeDamage = rawDamage * percentage;
        let reducedDamage = typeDamage;
        let reductionMethod = '';
        
        if (damageType === 'physical') {
            // Physical damage uses defense (hybrid formula)
            reducedDamage = Math.max(1, typeDamage * (1 - exile.stats.defense/200) - exile.stats.defense/4);
            const reductionPercent = Math.round((1 - reducedDamage/typeDamage) * 100);
            reductionMethod = `${reductionPercent}% reduced`;
        } else {
            // Elemental damage uses resistances (simple percentage)
            const resistance = exile.stats[damageType + 'Resist'] || 0;
            reducedDamage = typeDamage * (1 - resistance/100);
            reductionMethod = `${resistance}% resisted`;
        }
        
        // Store breakdown info
        breakdown.push({
            type: damageType,
            raw: typeDamage,
            final: reducedDamage,
            method: reductionMethod
        });
        
        totalDamageAfterReduction += reducedDamage;
    });
    
    // Return both damage and breakdown
    return {
        damage: Math.max(1, totalDamageAfterReduction),
        breakdown: breakdown
    };
},
// End Damage Calcs for Mission + Log

calculatePowerRating(exile = null) {
    // Use provided exile or default to current game exile
    const targetExile = exile || gameState.exile;
    const stats = targetExile.stats;
    return Math.floor(stats.life + (stats.damage * 10) + (stats.defense * 5));
},

classifyDeath(combatData, winChancePerRound) {
    const { rounds, heaviestHit, exile } = combatData;
    
    // Check for one-shot
    if (rounds === 1 && heaviestHit >= exile.stats.life) {
        return 'oneshot';
    }
    
    // Classify by how outclassed they were
    if (winChancePerRound >= 0.15) {
        return 'outclassed_barely';
    } else if (winChancePerRound >= 0.05) {
        return 'outclassed_significantly';  
    } else if (winChancePerRound > 0) {
        return 'outclassed_completely';
    } else {
        return 'suicide';
    }
},

generateDeathMessage(combatData) {
    const { exile, mission, rounds, heaviestHit, deathType } = combatData;
    const name = exile.name;
    const missionName = mission.name;
    
    switch (deathType) {
        case 'oneshot':
            return `☠ ${name} was obliterated in ${missionName}! (${heaviestHit} damage in one hit)`;
        case 'outclassed_barely':
            return `☠ ${name} fell after a hard-fought battle in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
        case 'outclassed_significantly':
            return `☠ ${name} was overwhelmed in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
        case 'outclassed_completely':
            return `☠ ${name} was brutally destroyed in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
        case 'suicide':
            return `☠ ${name} had no chance in ${missionName} and was swiftly executed (${rounds} round${rounds > 1 ? 's' : ''})`;
        default:
            return `☠ ${name} has died in ${missionName}!`;
    }
},

calculateMoraleChange(combatResult, exile) {
    // Get morale resistance (can be negative)
    const moraleResist = (exile.stats.moraleResistance || 0) / 100;
    const moraleGain = exile.stats.moraleGain || 0; // NEW: flat morale gain

    let result;
    if (combatResult.outcome === 'victory') {
        const lifePercent = (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life;
        if (lifePercent <= 0.15) {
            result = { change: +8, message: "I just barely survived, my heart races, I feel... ALIVE!" };
        } else if (lifePercent <= 0.3) {
            result = { change: +4, message: "Hah! A good challenge!" };
        } else if (lifePercent >= 0.95) {
            result = { change: -4, message: "This is beneath me..." };
        } else if (lifePercent >= 0.90) {
            result = { change: -2, message: "This is too easy, I need a real challenge!" };
        } else {
            result = { change: +1, message: "A fair and reasonable fight." };
        }
    } else if (combatResult.outcome === 'retreat') {
        if (combatResult.rounds >= 3) {
            result = { change: +3, message: "Phew that was a close one, but I did it!" };
        } else {
            result = { change: -2, message: "This is embarrassing..." };
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
},

applyMoraleEffects(exile) {
    // Reset stats to base + level bonuses
    this.recalculateStats();
    
    // Apply morale bonuses/penalties
    const morale = exile.morale;
    let damageBonus = 0;
    let defenseBonus = 0;
    
    if (morale >= 85) {
        // Confident: +10% damage, +5% defense
        damageBonus = Math.floor(exile.stats.damage * 0.1);
        defenseBonus = Math.floor(exile.stats.defense * 0.05);
    } else if (morale <= 49) {
        // Demoralized: -10% damage, -5% defense
        damageBonus = -Math.floor(exile.stats.damage * 0.1);
        defenseBonus = -Math.floor(exile.stats.defense * 0.05);
    } else if (morale <= 69) {
        // Discouraged: -5% damage
        damageBonus = -Math.floor(exile.stats.damage * 0.05);
    }
    
    exile.stats.damage += damageBonus;
    exile.stats.defense += defenseBonus;
    
    // Ensure minimum values
    exile.stats.damage = Math.max(1, exile.stats.damage);
    exile.stats.defense = Math.max(1, exile.stats.defense);
},

getMoraleStatus(morale) {
    if (morale >= 85) return "Confident";
    if (morale >= 70) return "Content"; 
    if (morale >= 50) return "Discouraged";
    if (morale >= 25) return "Demoralized";
    return "Broken";
},

calculatePowerRating(exile = null) {
    // Use provided exile or default to current game exile
    const targetExile = exile || gameState.exile;
    const stats = targetExile.stats;
    return Math.floor(stats.life + (stats.damage * 10) + (stats.defense * 5));
},


// GEAR GEAR GEAR GEAR =====================>>>>>>>>>>> 
generateGear(missionDifficulty) {
    // Get difficulty config from centralized location
    const difficultyData = getDifficultyConfig(missionDifficulty);
    
    // Determine item type (WILL NEED UPDATE FOR ITEM EXPANSIONS)
    const typeRoll = Math.random();
    let gearType;
    if (typeRoll < 0.4) gearType = gearTypes.weapon;
    else if (typeRoll < 0.7) gearType = gearTypes.armor;
    else gearType = gearTypes.jewelry;
    
    // Determine rarity based on weights
    const rarityRoll = Math.random() * 100;
    let rarity = 'common';
    let cumulative = 0;
    for (const [tier, data] of Object.entries(rarityTiers)) {
        cumulative += data.dropWeight;
        if (rarityRoll <= cumulative) {
            rarity = tier;
            break;
        }
    }
    
    // Generate base item
    const baseType = gearType.baseTypes[Math.floor(Math.random() * gearType.baseTypes.length)];
    const rarityData = rarityTiers[rarity];
    
    // Generate stats using centralized multiplier
    const stats = {};
    const statTypes = getAllStatTypes();
    const selectedStats = this.shuffleArray(statTypes).slice(0, rarityData.statCount);

    const mission = missions[missionDifficulty];

        selectedStats.forEach(stat => {
        const weight = gearType.statWeights[stat] || 1;
        const statDef = statDefinitions[stat];
        const statRange = this.getStatRangeForIlvl(statDef, mission.ilvl);
        const baseValue = this.randomBetween(statRange.min, statRange.max);
        stats[stat] = Math.floor(baseValue * weight);
        
        console.log('missionDifficulty:', missionDifficulty);
        console.log('missions object:', missions);
        console.log('mission found:', missions[missionDifficulty]);
    });
    
    return {
        id: Date.now() + Math.random(),
        name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${baseType}`,
        slot: gearType.slot,
        rarity: rarity,
        ilvl: mission.ilvl,
        stats: stats,
        equipped: false
    };
},

equipItem(itemId) {
    const item = gameState.inventory.backpack.find(i => i.id === itemId);
    if (!item) return;
    
    // Unequip current item in that slot if any
    const currentEquipped = gameState.inventory.equipped[item.slot];
    if (currentEquipped) {
        currentEquipped.equipped = false;
        gameState.inventory.backpack.push(currentEquipped);
    }
    
    // Equip new item
    gameState.inventory.equipped[item.slot] = item;
    item.equipped = true;
    
    // Remove from backpack
    gameState.inventory.backpack = gameState.inventory.backpack.filter(i => i.id !== itemId);
    
    this.recalculateStats();
    this.updateDisplay();
    this.updateInventoryDisplay();
    this.updateCharacterScreenIfOpen();
    this.saveGame();
},

unequipItem(slot) {
    const item = gameState.inventory.equipped[slot];
    if (!item) return;
    
    item.equipped = false;
    gameState.inventory.backpack.push(item);
    gameState.inventory.equipped[slot] = null;
    
    this.recalculateStats();
    this.updateDisplay();
    this.updateInventoryDisplay();
    this.updateCharacterScreenIfOpen();
    this.saveGame();
},

// GEAR + PASSIVES + LEVELS MATH AND SCALING
recalculateStats() {
    // Start with base stats (class + levels)
    const baseLife = gameState.exile.baseStats.life;
    const baseDamage = gameState.exile.baseStats.damage;
    const baseDefense = gameState.exile.baseStats.defense;
    
    // Get gear bonuses
    let gearLife = 0, gearDamage = 0, gearDefense = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
        if (item) {
            gearLife += item.stats.life || 0;
            gearDamage += item.stats.damage || 0;
            gearDefense += item.stats.defense || 0;
        }
    });
    
    // Calculate flat totals (base + gear)
    const flatLife = baseLife + gearLife;
    const flatDamage = baseDamage + gearDamage;
    const flatDefense = baseDefense + gearDefense;
    
    // Get passive effects
    const passiveEffects = this.calculatePassiveEffects();
    
    // Apply increased bonuses (additive)
    const increasedLife = flatLife * (1 + passiveEffects.increasedLife / 100);
    const increasedDamage = flatDamage * (1 + passiveEffects.increasedDamage / 100);
    const increasedDefense = flatDefense * (1 + passiveEffects.increasedDefense / 100);
    
    // Apply more bonuses (multiplicative)
    const finalLife = increasedLife * (1 + passiveEffects.moreLife / 100);
    const finalDamage = increasedDamage * (1 + passiveEffects.moreDamage / 100);
    const finalDefense = increasedDefense * (1 + passiveEffects.moreDefense / 100);
    
    // Apply flat bonuses from passives
    gameState.exile.stats.life = Math.floor(finalLife + passiveEffects.flatLife);
    gameState.exile.stats.damage = Math.floor(finalDamage + passiveEffects.flatDamage);
    gameState.exile.stats.defense = Math.floor(finalDefense + passiveEffects.flatDefense);
    
    // Apply special stats
    gameState.exile.stats.goldFindBonus = passiveEffects.goldFindBonus;
    gameState.exile.stats.escapeChance = passiveEffects.escapeChance;
    gameState.exile.stats.moraleResistance = passiveEffects.moraleResistance;
    gameState.exile.stats.moraleGain = passiveEffects.moraleGain;
    
    // Calculate resistances from gear + passives
    let gearFireResist = 0, gearColdResist = 0, gearLightningResist = 0, gearChaosResist = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
        if (item) {
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

    // Ensure minimum values
    gameState.exile.stats.life = Math.max(1, gameState.exile.stats.life);
    gameState.exile.stats.damage = Math.max(1, gameState.exile.stats.damage);
    gameState.exile.stats.defense = Math.max(1, gameState.exile.stats.defense);
},

shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
},

// CRAFTING
    // USE CHAOS ORB
useChaosOrb(itemId) {
    const item = gameState.inventory.backpack.find(i => i.id === itemId);
    if (!item || gameState.resources.chaosOrbs < 1) return false;
    
    // Get current stats and available stats
    const currentStatKeys = Object.keys(item.stats);
    const availableStats = this.getAvailableStats(item);
    
    // Need at least one current stat and one available stat
    if (currentStatKeys.length === 0 || availableStats.length === 0) {
        this.log("Cannot use Chaos Orb on this item!", "failure");
        return false;
    }
    
    // Pick random current stat to remove
    const statToRemove = currentStatKeys[Math.floor(Math.random() * currentStatKeys.length)];
    const oldValue = item.stats[statToRemove];
    
    // Pick random new stat to add
    const newStat = availableStats[Math.floor(Math.random() * availableStats.length)];
    
    // Remove old stat
    delete item.stats[statToRemove];
    
    // Add new stat using our centralized system
    const gearType = gearTypes[Object.keys(gearTypes).find(key => gearTypes[key].slot === item.slot)];
    const weight = gearType.statWeights[newStat] || 1;
    const statDef = statDefinitions[newStat];
    const statRange = this.getStatRangeForIlvl(statDef, item.ilvl);
    const baseValue = this.randomBetween(statRange.min, statRange.max);
    item.stats[newStat] = Math.floor(baseValue * weight);
    
    // Consume orb
    gameState.resources.chaosOrbs--;
    
    this.log(`🌀 Chaos Orb used! ${statToRemove} (${oldValue}) → ${newStat} (${item.stats[newStat]})`, "legendary");
    
    // Update displays if item is equipped
    if (item.equipped) {
        this.recalculateStats();
        this.updateDisplay();
    }
    this.updateInventoryDisplay();
    this.saveGame();
    this.updateCharacterScreenIfOpen();

    return true;
},
    // END USE CHAOS ORB

    // USE ALCHEMY
useExaltedOrb(itemId) {
    const item = gameState.inventory.backpack.find(i => i.id === itemId);
    if (!item || gameState.resources.exaltedOrbs < 1) return false;
    
    // Check if item can have more stats
    const currentStatCount = Object.keys(item.stats).length;
    const maxStats = rarityTiers[item.rarity].maxStats;
    
    if (currentStatCount >= maxStats) {
        this.log("This item already has maximum stats!", "failure");
        return false;
    }
    
    // Get available stats
    const availableStats = this.getAvailableStats(item);
    if (availableStats.length === 0) {
        this.log("No available stats to add!", "failure");
        return false;
    }
    
    // Pick random new stat
    const newStat = availableStats[Math.floor(Math.random() * availableStats.length)];
    
    // Add the stat
    const gearType = gearTypes[Object.keys(gearTypes).find(key => gearTypes[key].slot === item.slot)];
    const weight = gearType.statWeights[newStat] || 1;
    const statDef = statDefinitions[newStat];
    const statRange = this.getStatRangeForIlvl(statDef, item.ilvl);
    const baseValue = this.randomBetween(statRange.min, statRange.max);
    item.stats[newStat] = Math.floor(baseValue * weight);
    
    // Consume orb
    gameState.resources.exaltedOrbs--;
    
    this.log(`⭐ Exalted Orb used! Added ${newStat} (${item.stats[newStat]}) to ${item.name}`, "legendary");
    
    // Update displays if item is equipped
    if (item.equipped) {
        this.recalculateStats();
        this.updateDisplay();
    }
    this.updateInventoryDisplay();
    this.saveGame();
    this.updateCharacterScreenIfOpen();

    return true;
},
    // End of use Alchemy

updateInventoryDisplay() {
    // Update equipped items (only if elements exist - old main screen)
    ['weapon', 'armor', 'jewelry'].forEach(slot => {
        const slotElement = document.getElementById(`${slot}-slot`);
        if (slotElement) {
            const slotContent = slotElement.querySelector('.slot-content');
            if (slotContent) {
                const equipped = gameState.inventory.equipped[slot];
                
                if (equipped) {
                    slotContent.innerHTML = `
                        <div class="item-equipped">
                            <div class="item-name ${equipped.rarity}">${equipped.name}</div>
                            <div class="item-stats">
                                ${Object.entries(item.stats).map(([stat, value]) => 
                                     `<div class="item-stat">+${value} ${this.getStatDisplayName(stat)}</div>`
                                  ).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    slotContent.innerHTML = '<div class="empty-slot">Empty</div>';
                }
            }
        }
    });
    
    // Update inventory (only if elements exist - old main screen)
    const inventoryElement = document.getElementById('inventory');
    const inventoryCount = document.getElementById('inventory-count');
    
    if (inventoryCount) {
        inventoryCount.textContent = `(${gameState.inventory.backpack.length}/20)`;
    }
    
    if (inventoryElement) {
        if (gameState.inventory.backpack.length === 0) {
            inventoryElement.innerHTML = '<div style="color: #666; text-align: center;">No items in inventory</div>';
        } else {
            inventoryElement.innerHTML = gameState.inventory.backpack.map(item => `
        <div class="inventory-item ${item.rarity}">
            <div class="item-name ${item.rarity}">${item.name}</div>
            <div class="item-type">${item.slot}</div>
            <div class="item-ilvl" style="font-size: 0.7em; color: #666; font-style: italic;">ilvl ${item.ilvl}</div>
            <div class="item-stats">
                ${Object.entries(item.stats).map(([stat, value]) => 
                 `<div class="item-stat">+${value} ${this.getStatDisplayName(stat)}</div>`
                ).join('')}
            </div>
            <div class="item-actions">
                <button class="action-btn equip" onclick="game.equipItem(${item.id})">Equip</button>
                <button class="action-btn chaos" onclick="game.useChaosOrb(${item.id})" 
                    ${gameState.resources.chaosOrbs < 1 ? 'disabled' : ''}>
                    Chaos (${gameState.resources.chaosOrbs})
                </button>
                <button class="action-btn exalted" onclick="game.useExaltedOrb(${item.id})" 
                    ${gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}>
                    Exalted (${gameState.resources.exaltedOrbs})
                </button>
            </div>
        </div>
    `).join('');
        }
    }
},

getAvailableStats(item) {
    const allStats = getAllStatTypes(); // Referneces Master List
    const currentStats = Object.keys(item.stats);
    return allStats.filter(stat => !currentStats.includes(stat));
},
// END OF GEAR ====================>>>>
    
    gameOver() {
        // Disable mission buttons
        document.querySelectorAll('.mission-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        });
        
        setTimeout(() => {
            if (confirm("Your exile has died. Start with a new exile?")) {
                this.resetGame();
            }
        }, 1000);
    },
    
    resetGame() {
        localStorage.removeItem('exileManagerSave');
        location.reload();
    },
    

  updateDisplay() {
    // Only update elements that still exist
        // Try to update old elements if they exist (for backwards compatibility)
    const elements = {
        'exile-name': gameState.exile.name,
        'exile-class': gameState.exile.class,
        'exile-level': gameState.exile.level,
        'exile-exp': gameState.exile.experience,
        'exile-exp-needed': gameState.exile.experienceNeeded,
        'stat-life': gameState.exile.stats.life,
        'stat-damage': gameState.exile.stats.damage,
        'stat-defense': gameState.exile.stats.defense,
        'power-rating': this.calculatePowerRating(),
        'morale-value': gameState.exile.morale,
        'morale-status': this.getMoraleStatus(gameState.exile.morale)
    };
    
    // Safely update elements that exist
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Update resources
    document.getElementById('gold').textContent = gameState.resources.gold;
    document.getElementById('chaos-orbs').textContent = gameState.resources.chaosOrbs;
    document.getElementById('exalted-orbs').textContent = gameState.resources.exaltedOrbs;
    this.updateResourceDisplay();
    
    // Apply morale effects before displaying
    this.applyMoraleEffects(gameState.exile);
    
    // Set morale color if element exists
    const moraleElement = document.getElementById('morale-status');
    if (moraleElement) {
        const moraleValue = gameState.exile.morale;
        if (moraleValue >= 85) moraleElement.style.color = '#4CAF50';
        else if (moraleValue >= 70) moraleElement.style.color = '#888';
        else if (moraleValue >= 50) moraleElement.style.color = '#ff9800';
        else moraleElement.style.color = '#f44336';
    }
    
    // Update exile summary for new UI
    this.updateExileSummary();
},

// Exile Summary Button to Exile Screen ========    
openCharacterScreen() {
    // Show the character screen modal
    const modal = document.getElementById('character-screen-modal');
    modal.style.display = 'flex';
    this.updateCharacterScreen();
    
    // Add escape key listener
    document.addEventListener('keydown', this.handleModalKeydown.bind(this));
},

closeCharacterScreen() {
    const modal = document.getElementById('character-screen-modal');
    modal.style.display = 'none';
    
    // Remove escape key listener
    document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
},

handleModalKeydown(event) {
    if (event.key === 'Escape') {
        this.closeCharacterScreen();
    }
},

handleModalClick(event) {
    // Only close if clicking the overlay (not the content)
    if (event.target.classList.contains('modal-overlay')) {
        this.closeCharacterScreen();
    }
},


updateCharacterScreen() {
    // Update character info
    document.getElementById('char-name').textContent = gameState.exile.name;
    document.getElementById('char-class').textContent = classDefinitions[gameState.exile.class].name;
    document.getElementById('char-level').textContent = gameState.exile.level;
    document.getElementById('char-exp').textContent = gameState.exile.experience;
    document.getElementById('char-exp-needed').textContent = gameState.exile.experienceNeeded;
    document.getElementById('char-morale').textContent = gameState.exile.morale;
    document.getElementById('char-morale-status').textContent = this.getMoraleStatus(gameState.exile.morale);
  
    // Combined resistances display
    const resists = [
        { key: 'fireResist', color: '#ff7043', label: 'Fire' },
        { key: 'coldResist', color: '#42a5f5', label: 'Cold' },
        { key: 'lightningResist', color: '#ffd600', label: 'Lightning' },
        { key: 'chaosResist', color: '#ab47bc', label: 'Chaos' }
    ];
    const resistsHtml = resists.map(r =>
        `<span style="color:${r.color};font-weight:bold;cursor:help;" title="${r.label} Resist">${gameState.exile.stats[r.key] || 0}%</span>`
    ).join(' / ');
    document.getElementById('final-resists-line').innerHTML = resistsHtml;
    
    document.getElementById('final-gold-find').textContent = gameState.exile.stats.goldFindBonus + "%";
    document.getElementById('final-morale-gain').textContent = gameState.exile.stats.moraleGain;
    document.getElementById('final-morale-resist').textContent = gameState.exile.stats.moraleResistance + "%";

    // Calculate all the breakdown components
    const gearBonuses = this.calculateGearBonuses();
    const passiveBonuses = this.calculatePassiveBonusesForDisplay();
    const moraleBonuses = this.calculateMoraleBonuses();
    
    // Create formatted tooltips with aligned numbers
    const lifeTooltip = this.createStatTooltip(
        gameState.exile.baseStats.life,
        gearBonuses.life,
        passiveBonuses.life,
        moraleBonuses.life,
        gameState.exile.stats.life
    );
    
    const damageTooltip = this.createStatTooltip(
        gameState.exile.baseStats.damage,
        gearBonuses.damage,
        passiveBonuses.damage,
        moraleBonuses.damage,
        gameState.exile.stats.damage
    );
    
    const defenseTooltip = this.createStatTooltip(
        gameState.exile.baseStats.defense,
        gearBonuses.defense,
        passiveBonuses.defense,
        moraleBonuses.defense,
        gameState.exile.stats.defense
    );
    
    // Set the values and tooltips
    document.getElementById('final-life').textContent = gameState.exile.stats.life;
    document.getElementById('final-damage').textContent = gameState.exile.stats.damage;
    document.getElementById('final-defense').textContent = gameState.exile.stats.defense;
    document.getElementById('power-rating-calc').textContent = this.calculatePowerRating();
    
    // Find and update tooltips
    const tooltipElements = document.querySelectorAll('.stat-value-with-tooltip');
    if (tooltipElements[0]) tooltipElements[0].title = lifeTooltip;
    if (tooltipElements[1]) tooltipElements[1].title = damageTooltip;
    if (tooltipElements[2]) tooltipElements[2].title = defenseTooltip;
    
    // Update allocated passives
    this.updateAllocatedPassives();
    
    // Update passive allocation button
    this.updatePassiveButton();
    
    // Update equipment and inventory
    this.updateCharacterEquipment();
    this.updateCharacterInventory();
},

createStatTooltip(base, gear, passives, morale, final) {
    // Create formatted tooltip with aligned columns
    return `Base (${base}) + Gear (${gear}) + Passives (${passives}) + Morale (${morale})
―――――――――――――――――――――――――――
Final: ${final}`;
},

calculatePassiveBonusesForDisplay() {
    // Calculate the total passive contribution to final stats
    const baseStats = gameState.exile.baseStats;
    const gearBonuses = this.calculateGearBonuses();
    const passiveEffects = this.calculatePassiveEffects();
    
    // Calculate what passives contribute to final totals
    const flatBase = {
        life: baseStats.life + gearBonuses.life,
        damage: baseStats.damage + gearBonuses.damage,
        defense: baseStats.defense + gearBonuses.defense
    };
    
    // Apply passive scaling
    const passiveContribution = {
        life: Math.floor(flatBase.life * (passiveEffects.increasedLife / 100) + 
              flatBase.life * (passiveEffects.moreLife / 100) + 
              passiveEffects.flatLife),
        damage: Math.floor(flatBase.damage * (passiveEffects.increasedDamage / 100) + 
                flatBase.damage * (passiveEffects.moreDamage / 100) + 
                passiveEffects.flatDamage),
        defense: Math.floor(flatBase.defense * (passiveEffects.increasedDefense / 100) + 
                 flatBase.defense * (passiveEffects.moreDefense / 100) + 
                 passiveEffects.flatDefense)
    };
    
    return passiveContribution;
},

updateAllocatedPassives() {
    const container = document.getElementById('allocated-passives-list');
    
    if (gameState.exile.passives.allocated.length === 0) {
        container.innerHTML = '<div style="color: #666; text-align: center;">No passives allocated</div>';
        return;
    }
    
    container.innerHTML = gameState.exile.passives.allocated.map(passiveId => {
        const passive = passiveDefinitions[passiveId];
        if (!passive) return '';
        
        return `
            <div class="passive-item">
                <div class="passive-name ${passive.tier}">${passive.name}</div>
                <div class="passive-description">${passive.description}</div>
            </div>
        `;
    }).join('');
},

updatePassiveButton() {
    const button = document.getElementById('allocate-passive-btn');
    if (gameState.exile.passives.pendingPoints > 0) {
        button.style.display = 'block';
        button.textContent = `Allocate Passive Skill (${gameState.exile.passives.pendingPoints})`;
    } else {
        button.style.display = 'none';
    }
},

updateCharacterEquipment() {
    // TODO: Update character screen equipment (placeholder for now)
    console.log("Updating character equipment display");
},

updateCharacterInventory() {
    // TODO: Update character screen inventory (placeholder for now)
    console.log("Updating character inventory display");
},

openPassiveSelection() {
    // Make sure we have pending points and choices ready
    if (gameState.exile.passives.pendingPoints <= 0) {
        this.log("No passive points to spend!", "failure");
        return;
    }
    
    // Generate choices if we don't have them
    if (!this.currentPassiveChoices) {
        this.startPassiveSelection();
    }
    
    // Show the passive selection modal
    document.getElementById('passive-selection-modal').style.display = 'flex';
    this.updatePassiveSelectionDisplay();
    
    // Add escape key listener
    document.addEventListener('keydown', this.handlePassiveModalKeydown.bind(this));
},

closePassiveSelection() {
    document.getElementById('passive-selection-modal').style.display = 'none';
    
    // Remove escape key listener
    document.removeEventListener('keydown', this.handlePassiveModalKeydown.bind(this));
},

handlePassiveModalKeydown(event) {
    if (event.key === 'Escape') {
        this.closePassiveSelection();
    }
},

handlePassiveModalClick(event) {
    // Only close if clicking the overlay (not the content)
    if (event.target.classList.contains('modal-overlay')) {
        this.closePassiveSelection();
    }
},

// PASSIVE SCREEN
updatePassiveSelectionDisplay() {
    if (!this.currentPassiveChoices) return;
    
    const { tier, choice1, choice2, rerollCost } = this.currentPassiveChoices;
    
    // Update modal title
    document.getElementById('passive-modal-title').textContent = `Choose Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} Passive`;
    
    // Update choice 1
    const choice1Element = document.getElementById('passive-choice-1');
    choice1Element.querySelector('.passive-choice-name').textContent = choice1.name;
    choice1Element.querySelector('.passive-choice-tier').textContent = choice1.tier;
    choice1Element.querySelector('.passive-choice-tier').className = `passive-choice-tier ${choice1.tier}`;
    choice1Element.querySelector('.passive-choice-description').textContent = choice1.description;
    
    // Update choice 2
    const choice2Element = document.getElementById('passive-choice-2');
    choice2Element.querySelector('.passive-choice-name').textContent = choice2.name;
    choice2Element.querySelector('.passive-choice-tier').textContent = choice2.tier;
    choice2Element.querySelector('.passive-choice-tier').className = `passive-choice-tier ${choice2.tier}`;
    choice2Element.querySelector('.passive-choice-description').textContent = choice2.description;
    
    // Update reroll button
    const rerollBtn = document.getElementById('reroll-passive-btn');
    rerollBtn.textContent = `Reroll (${rerollCost} gold)`;
    rerollBtn.disabled = gameState.resources.gold < rerollCost;
},

selectPassive(choiceNumber) {
    if (!this.currentPassiveChoices) return;
    
    const selectedPassive = choiceNumber === 1 ? this.currentPassiveChoices.choice1 : this.currentPassiveChoices.choice2;
    
    // Allocate the passive
    const success = this.allocatePassive(selectedPassive.id);
    
    if (success) {
        // Clear current choices
        this.currentPassiveChoices = null;
        
        // Close the modal
        this.closePassiveSelection();
        
        // Update character screen if open
        this.updateCharacterScreenIfOpen();
        
        this.log(`Selected ${selectedPassive.name}!`, "legendary");
    }
},

rerollPassiveChoices() {
    if (!this.currentPassiveChoices) return;
    
    const { tier, rerollCost } = this.currentPassiveChoices;
    
    // Check if player can afford reroll
    if (gameState.resources.gold < rerollCost) {
        this.log("Not enough gold to reroll!", "failure");
        return;
    }
    
    // Spend gold
    gameState.resources.gold -= rerollCost;
    gameState.exile.passives.rerollsUsed++;
    
    // Generate new choices
    const choice1 = this.selectPassiveForLevelUp(tier);
    const choice2 = this.selectPassiveForLevelUp(tier);
    
    if (!choice1 || !choice2) {
        this.log("No more passives available for reroll!", "failure");
        return;
    }
    
    // Update choices
    this.currentPassiveChoices = {
        tier: tier,
        choice1: choice1,
        choice2: choice2,
        rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
    };
    
    // Update display
    this.updatePassiveSelectionDisplay();
    this.updateDisplay(); // Update gold
    
    this.log(`Rerolled passive choices! (-${rerollCost} gold)`, "info");
},
    // End of Passive Screen
// End of Exile Screen from Exile Button


updateExileSummary() {
    // Update the compact exile summary on main screen
    document.getElementById('exile-name-summary').textContent = gameState.exile.name;
    document.getElementById('exile-class-summary').textContent = classDefinitions[gameState.exile.class].name;
    document.getElementById('exile-level-summary').textContent = gameState.exile.level;
    
    document.getElementById('exile-life-summary').textContent = gameState.exile.stats.life;
    document.getElementById('exile-damage-summary').textContent = gameState.exile.stats.damage;
    document.getElementById('exile-defense-summary').textContent = gameState.exile.stats.defense;
    document.getElementById('exile-morale-summary').textContent = gameState.exile.morale;
    
    // Update EXP bar
    const exp = gameState.exile.experience;
    const expNeeded = gameState.exile.experienceNeeded;
    const percent = Math.min(100, Math.round((exp / expNeeded) * 100));
    document.getElementById('exp-bar-fill').style.width = percent + "%";
    document.getElementById('exp-bar-label').textContent = `${exp} / ${expNeeded} EXP`;

    // Set morale color
    const moraleElement = document.getElementById('exile-morale-summary');
    const moraleValue = gameState.exile.morale;
    if (moraleValue >= 85) moraleElement.style.color = '#4CAF50';
    else if (moraleValue >= 70) moraleElement.style.color = '#888';
    else if (moraleValue >= 50) moraleElement.style.color = '#ff9800';
    else moraleElement.style.color = '#f44336';
    
    // Show passive points indicator
    const indicator = document.getElementById('passive-points-indicator');
    if (gameState.exile.passives.pendingPoints > 0) {
        indicator.style.display = 'block';
        indicator.textContent = `(+) ${gameState.exile.passives.pendingPoints} Passive Point${gameState.exile.passives.pendingPoints > 1 ? 's' : ''} Available`;
    } else {
        indicator.style.display = 'none';
    }
},

calculateGearBonuses() {
    let life = 0, damage = 0, defense = 0;
    Object.values(gameState.inventory.equipped).forEach(item => {
        if (item) {
            life += item.stats.life || 0;
            damage += item.stats.damage || 0;
            defense += item.stats.defense || 0;
        }
    });
    return { life, damage, defense };
},

calculateMoraleBonuses() {
    // Calculate what morale is contributing to current stats
    const morale = gameState.exile.morale;
    let damageBonus = 0;
    let defenseBonus = 0;
    
    // We need to get the pre-morale stats to calculate the bonus
    const baseStats = gameState.exile.baseStats;
    const gearBonuses = this.calculateGearBonuses();
    const passiveBonuses = this.calculatePassiveBonusesForDisplay();
    
    const premoraleStats = {
        damage: baseStats.damage + gearBonuses.damage + passiveBonuses.damage,
        defense: baseStats.defense + gearBonuses.defense + passiveBonuses.defense
    };
    
    if (morale >= 85) {
        // Confident: +10% damage, +5% defense
        damageBonus = Math.floor(premoraleStats.damage * 0.1);
        defenseBonus = Math.floor(premoraleStats.defense * 0.05);
    } else if (morale <= 49) {
        // Demoralized: -10% damage, -5% defense
        damageBonus = -Math.floor(premoraleStats.damage * 0.1);
        defenseBonus = -Math.floor(premoraleStats.defense * 0.05);
    } else if (morale <= 69) {
        // Discouraged: -5% damage
        damageBonus = -Math.floor(premoraleStats.damage * 0.05);
    }
    
    return { life: 0, damage: damageBonus, defense: defenseBonus };
},

updateCharacterEquipment() {
    // Update character screen equipment display
    ['weapon', 'armor', 'jewelry'].forEach(slot => {
        const slotElement = document.getElementById(`char-${slot}-slot`).querySelector('.slot-content');
        const equipped = gameState.inventory.equipped[slot];
        
        if (equipped) {
            slotElement.innerHTML = `
                <div class="item-equipped">
                    <div class="item-name ${equipped.rarity}">${equipped.name}</div>
                    <div class="item-stats">
                        ${Object.entries(equipped.stats).map(([stat, value]) => 
                           `<div class="item-stat">+${value} ${this.getStatDisplayName(stat)}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            slotElement.innerHTML = '<div class="empty-slot">Empty</div>';
        }
    });
},

updateCharacterInventory() {
    // Update character screen inventory display
    const inventoryElement = document.getElementById('char-inventory');
    const inventoryCount = document.getElementById('char-inventory-count');
    
    inventoryCount.textContent = `(${gameState.inventory.backpack.length}/20)`;
    
    if (gameState.inventory.backpack.length === 0) {
        inventoryElement.innerHTML = '<div style="color: #666; text-align: center;">No items in inventory</div>';
    } else {
        inventoryElement.innerHTML = gameState.inventory.backpack.map(item => `
            <div class="inventory-item ${item.rarity}">
                <div class="item-name ${item.rarity}">${item.name}</div>
                <div class="item-type">${item.slot}</div>
                <div class="item-ilvl" style="font-size: 0.7em; color: #666; font-style: italic;">ilvl ${item.ilvl}</div>
                <div class="item-stats">
                    ${Object.entries(item.stats).map(([stat, value]) => 
                        `<div class="item-stat">+${value} ${this.getStatDisplayName(stat)}</div>`
                    ).join('')}
                </div>
                <div class="item-actions">
                    <button class="action-btn equip" onclick="game.equipItem(${item.id})">Equip</button>
                    <button class="action-btn chaos" onclick="game.useChaosOrb(${item.id})" 
                        ${gameState.resources.chaosOrbs < 1 ? 'disabled' : ''}>
                        Chaos (${gameState.resources.chaosOrbs})
                    </button>
                    <button class="action-btn exalted" onclick="game.useExaltedOrb(${item.id})" 
                        ${gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}>
                        Exalted (${gameState.resources.exaltedOrbs})
                    </button>
                </div>
            </div>
        `).join('');
    }
},

// Helpers for Exile Screen
isCharacterScreenOpen() {
    const modal = document.getElementById('character-screen-modal');
    return modal && modal.style.display === 'flex';
},

updateCharacterScreenIfOpen() {
    if (this.isCharacterScreenOpen()) {
        this.updateCharacterScreen();
    }
},

    // End of Character Stat Calcs for Exile Screen
// End of Exile Summary Button to Exile Screen ========    

// Additional Helper Functions
log(message, type = "info", isHtml = false) {
    const logContainer = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    if (isHtml) {
        entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    } else {
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    }
    logContainer.insertBefore(entry, logContainer.firstChild);

    // Always scroll to top to show newest entry
    logContainer.scrollTop = 0;

    // Keep only last 100 entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
    }
},

// Helper to Update Resources Display Effects
updateResourceDisplay() {
    const chaosElem = document.getElementById('chaos-orbs');
    const exaltedElem = document.getElementById('exalted-orbs');

    // Store previous values using data attributes
    const prevChaos = parseInt(chaosElem.getAttribute('data-prev') || "0", 10);
    const prevExalted = parseInt(exaltedElem.getAttribute('data-prev') || "0", 10);

    // Get new values from game state
    const chaosVal = gameState.resources.chaosOrbs;
    const exaltedVal = gameState.resources.exaltedOrbs;

    // Update display
    chaosElem.textContent = chaosVal;
    exaltedElem.textContent = exaltedVal;

    // Store new values for next tick
    chaosElem.setAttribute('data-prev', chaosVal);
    exaltedElem.setAttribute('data-prev', exaltedVal);

    // Trigger pulse if value increased
    if (chaosVal > prevChaos) {
        chaosElem.classList.remove('resource-glow-pulse');
        void chaosElem.offsetWidth; // Force reflow to restart animation
        chaosElem.classList.add('resource-glow-pulse');
    }
    if (exaltedVal > prevExalted) {
        exaltedElem.classList.remove('resource-glow-pulse');
        void exaltedElem.offsetWidth;
        exaltedElem.classList.add('resource-glow-pulse');
    }
},


    saveGame() {
        if (gameState.settings.autoSave) {
            localStorage.setItem('exileManagerSave', JSON.stringify(gameState));
        }
    },
    
    loadGame() {
        const savedGame = localStorage.getItem('exileManagerSave');
        if (savedGame) {
            const loadedState = JSON.parse(savedGame);
            Object.assign(gameState, loadedState);
            this.log("Game loaded!", "info");
            this.updateDisplay();
        }
    },
    
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // What determines stat scaling for ilvl of gear
    calculateIlvlMultiplier(ilvl) {
    return 1 + (ilvl - 1) * 0.05; // 5% per ilvl above 1
},

// Helper function to get proper stat display name
getStatDisplayName(statKey) {
    return statDefinitions[statKey]?.name || statKey;
},

// Helper function to get stat range for specific ilvl
getStatRangeForIlvl(statDef, ilvl) {
    const breakpoints = statDef.ilvlBreakpoints;
    if (!breakpoints) {
        // Fallback for old baseRange format
        return statDef.baseRange;
    }
    
    // Find highest breakpoint <= ilvl
    for (let i = breakpoints.length - 1; i >= 0; i--) {
        if (ilvl >= breakpoints[i].ilvl) {
            return { min: breakpoints[i].min, max: breakpoints[i].max };
        }
    }
    
    // Fallback to first breakpoint
    return { min: breakpoints[0].min, max: breakpoints[0].max };
},

// Breakdown toggle function
toggleBreakdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display === 'block';
    el.style.display = isOpen ? 'none' : 'block';
    // Toggle triangle direction if present
    const parent = el.previousElementSibling || el.parentElement.querySelector('.combat-breakdown-toggle');
    if (parent) {
        const triangle = parent.querySelector('.triangle');
        if (triangle) triangle.innerHTML = isOpen ? '&#x25BC;' : '&#x25B2;';
    }
},

// End of Additional Helper Functions


// PASSIVE SYSTEM METHODS
initializeExile() {
   // Randomize class on truly new games (Not reliant on initial class name)
const isNewGame = gameState.exile.level === 1 && 
                  gameState.exile.experience === 0 && 
                  gameState.exile.passives.allocated.length <= 1;

if (isNewGame) {
    this.randomizeExileClass();
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
},

randomizeExileClass() {
    const classes = Object.keys(classDefinitions);
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    gameState.exile.class = randomClass;
    
    this.log(`${gameState.exile.name} is a ${classDefinitions[randomClass].name}!`, "info");
},

    // Give a random notable as starting passive
giveStartingNotable() {
    const notables = passiveHelpers.getPassivesByTier('notable');
    const randomNotable = notables[Math.floor(Math.random() * notables.length)];
    gameState.exile.passives.allocated.push(randomNotable.id);
    
    this.log(`${gameState.exile.name} starts with ${randomNotable.name}!`, "legendary");
},

calculatePassiveEffects() {
    // Calculate total passive bonuses
    const effects = {
        // Increased (additive)
        increasedLife: 0,
        increasedDamage: 0,
        increasedDefense: 0,
        
        // More (multiplicative)
        moreLife: 0,
        moreDamage: 0,
        moreDefense: 0,
        
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
                switch(effect.type) {
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
},

selectPassiveForLevelUp(tier) {
    // Get weighted passive pool for this class and tier
    const pool = passiveHelpers.getWeightedPassivePool(gameState.exile.class, tier);
    
    // Filter out already allocated passives
    const available = pool.filter(passive => 
        !gameState.exile.passives.allocated.includes(passive.id)
    );
    
    if (available.length === 0) {
        // Fallback to any tier if this tier is exhausted
        const fallbackPool = Object.keys(passiveDefinitions)
            .filter(id => !gameState.exile.passives.allocated.includes(id))
            .map(id => ({ id, ...passiveDefinitions[id], weight: 1 }));
        
        if (fallbackPool.length === 0) return null;
        return this.weightedRandomSelect(fallbackPool);
    }
    
    return this.weightedRandomSelect(available);
},

weightedRandomSelect(weightedArray) {
    const totalWeight = weightedArray.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weightedArray) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    
    return weightedArray[weightedArray.length - 1]; // Fallback
},

getPassiveTierForLevel(level) {
    if (level % 10 === 0) return 'keystone';  // 10, 20, 30...
    if (level % 5 === 0) return 'notable';    // 5, 15, 25...
    return 'normal';                          // All other levels
},

startPassiveSelection() {
    if (gameState.exile.passives.pendingPoints <= 0) return;

    const currentLevel = gameState.exile.level;
    const tier = this.getPassiveTierForLevel(currentLevel);

    // Get available passives for this tier
    const pool = passiveHelpers.getWeightedPassivePool(gameState.exile.class, tier)
        .filter(passive => !gameState.exile.passives.allocated.includes(passive.id));

    if (pool.length === 0) {
        this.log("No more passives available!", "failure");
        return;
    }

    const choice1 = this.weightedRandomSelect(pool);
    let choice2 = null;

    if (pool.length > 1) {
        // Remove choice1 from pool for choice2
        const poolWithoutChoice1 = pool.filter(p => p.id !== choice1.id);
        choice2 = this.weightedRandomSelect(poolWithoutChoice1);
    }

    this.currentPassiveChoices = {
        tier: tier,
        choice1: choice1,
        choice2: choice2,
        rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
    };

    this.log(
        pool.length === 1
            ? `Only one passive left to choose!`
            : `Choose your ${tier} passive! (Reroll cost: ${this.currentPassiveChoices.rerollCost} gold)`,
        "legendary"
    );
},

getRerollCost(tier, rerollsUsed) {
    const baseCosts = {
        'normal': 50,
        'notable': 100, 
        'keystone': 200
    };
    
    return baseCosts[tier] * Math.pow(2, rerollsUsed);
},

allocatePassive(passiveId) {
    const passive = passiveDefinitions[passiveId];
    if (!passive) return false;
    
    // Add to allocated passives
    gameState.exile.passives.allocated.push(passiveId);
    gameState.exile.passives.pendingPoints--;
    gameState.exile.passives.rerollsUsed = 0; // Reset for next level
    
    this.log(`🎯 Allocated ${passive.name}: ${passive.description}`, "legendary");
    
    // Recalculate stats with new passive
    this.recalculateStats();
    this.updateDisplay();
    this.saveGame();
    
    return true;
},

};
// END OF GAME OBJECT =====================

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    game.init();
});