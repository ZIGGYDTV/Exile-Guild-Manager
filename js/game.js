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
    
    if (combatResult.outcome === 'victory') {
        // Success! Award rewards
        const goldEarned = this.randomBetween(mission.rewards.gold.min, mission.rewards.gold.max);
        gameState.resources.gold += goldEarned;
        const expEarned = typeof mission.rewards.experience === 'object' 
            ? this.randomBetween(mission.rewards.experience.min, mission.rewards.experience.max)
            : mission.rewards.experience;
        gameState.exile.experience += expEarned;
        
        // Calculate final life after combat
        const finalLife = exile.stats.life - combatResult.totalDamageTaken;
        
        let message = `✓ ${mission.name} cleared! +${goldEarned} gold, +${expEarned} exp`;
        this.log(message, "success");
        
        // Combat report
        const combatReport = `⚔️ Combat Report: Took ${Math.floor(combatResult.heaviestHit * 10) / 10} damage (heaviest hit), finished with ${Math.floor(finalLife * 10) / 10}/${exile.stats.life} life`;
        this.log(combatReport, "info");
        
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
        const gearDropChance = difficulty === 'hard' ? 0.5 : difficulty === 'medium' ? 0.3 : 0.15;
        if (Math.random() < gearDropChance) {
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
        this.log(`${moraleIcon} ${exile.name}: "${moraleResult.message}" ${moraleText}`, moraleResult.change > 0 ? "success" : "failure");
    }
}
        
    } else if (combatResult.outcome === 'death') {
        // Death! Generate detailed death message
        const deathMessage = this.generateDeathMessage(combatResult);
        this.log(deathMessage, "failure");
        this.gameOver();
        
    } else {
    // Retreat - either early escape or round limit
    const retreatReason = combatResult.rounds >= 5 ? "after a prolonged fight" : "badly wounded";
    this.log(`✗ ${exile.name} retreated from ${mission.name} ${retreatReason} (${combatResult.rounds} rounds, ${Math.floor(combatResult.heaviestHit * 10) / 10} heaviest hit).`, "failure");
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
        const damageTaken = this.calculateDamageReduction(damageRoll, exile.stats.defense);
        
        currentLife -= damageTaken;
        combatData.totalDamageTaken += damageTaken;
        combatData.heaviestHit = Math.max(combatData.heaviestHit, damageTaken);
        
    // Log this hit for detailed analysis
            combatData.damageLog.push({
        round: combatData.rounds,
        rawDamage: damageRoll,
        actualDamage: damageTaken,
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

calculateDamageReduction(rawDamage, defense, damageType = 'physical') {
    // Hybrid defense formula: percentage + flat reduction
    return Math.max(1, rawDamage * (1 - defense/200) - defense/4);
},

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
    if (combatResult.outcome === 'victory') {
        const lifePercent = (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life;
        
        if (lifePercent <= 0.1) {
            return { change: +8, message: "I just barely survived, my heart races, I feel... ALIVE!" };
        } else if (lifePercent <= 0.3) {
            return { change: +4, message: "Hah! A good challenge!" };
        } else if (lifePercent >= 0.95) {
            return { change: -4, message: "This is beneath me..." };
        } else if (lifePercent >= 0.85) {
            return { change: -2, message: "This is too easy, I need a real challenge!" };
        } else {
            return { change: +1, message: "A fair and reasonable fight." };
        }
    } else if (combatResult.outcome === 'retreat') {
        if (combatResult.rounds >= 4) {
            return { change: +3, message: "Phew that was a close one, but I did it!" };
        } else {
            return { change: -1, message: "This is embarrassing..." };
        }
    } else {
        // Death - no morale change since exile is dead
        return { change: 0, message: "" };
    }
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

calculateDamageReduction(rawDamage, defense, damageType = 'physical') {
    // Future: could check exile.resistances[damageType]
    // For now, only physical damage with hybrid defense formula
    return Math.max(1, rawDamage * (1 - defense/200) - defense/4);
},

calculatePowerRating(exile = null) {
    // Use provided exile or default to current game exile
    const targetExile = exile || gameState.exile;
    const stats = targetExile.stats;
    return Math.floor(stats.life + (stats.damage * 10) + (stats.defense * 5));
},


// GEAR GEAR GEAR GEAR =====================>>>>>>>>>>> 
generateGear(missionDifficulty) {
    // Determine item type
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
    
    // Generate stats
    const stats = {};
    const statTypes = getAllStatTypes();
    const selectedStats = this.shuffleArray(statTypes).slice(0, rarityData.statCount);
    
selectedStats.forEach(stat => {
    const weight = gearType.statWeights[stat] || 1; // Default weight if not defined
    const statDef = statDefinitions[stat];
    const difficultyMultiplier = missionDifficulty === 'hard' ? 2 : missionDifficulty === 'medium' ? 1.5 : 1;
    const baseValue = this.randomBetween(statDef.baseRange.min, statDef.baseRange.max) * difficultyMultiplier;
    stats[stat] = Math.floor(baseValue * weight * rarityData.statMultiplier);
});
    
    return {
        id: Date.now() + Math.random(), // Simple unique ID
        name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${baseType}`,
        slot: gearType.slot,
        rarity: rarity,
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
    const rarityData = rarityTiers[item.rarity];
    const statDef = statDefinitions[newStat];
    const baseValue = this.randomBetween(statDef.baseRange.min, statDef.baseRange.max);
    item.stats[newStat] = Math.floor(baseValue * weight * rarityData.statMultiplier);
    
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
    const rarityData = rarityTiers[item.rarity];
    const statDef = statDefinitions[newStat];
    const baseValue = this.randomBetween(statDef.baseRange.min, statDef.baseRange.max);
    item.stats[newStat] = Math.floor(baseValue * weight * rarityData.statMultiplier);
    
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
    
    return true;
},
    // End of use Alchemy

updateInventoryDisplay() {
    // Update equipped items
    ['weapon', 'armor', 'jewelry'].forEach(slot => {
        const slotElement = document.getElementById(`${slot}-slot`).querySelector('.slot-content');
        const equipped = gameState.inventory.equipped[slot];
        
        if (equipped) {
            slotElement.innerHTML = `
                <div class="item-equipped">
                    <div class="item-name ${equipped.rarity}">${equipped.name}</div>
                    <div class="item-stats">
                        ${Object.entries(equipped.stats).map(([stat, value]) => 
                            `<div class="item-stat">+${value} ${stat}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            slotElement.innerHTML = '<div class="empty-slot">Empty</div>';
        }
    });
    
    // Update inventory
    const inventoryElement = document.getElementById('inventory');
    const inventoryCount = document.getElementById('inventory-count');
    
    inventoryCount.textContent = `(${gameState.inventory.backpack.length}/20)`;
    
    if (gameState.inventory.backpack.length === 0) {
        inventoryElement.innerHTML = '<div style="color: #666; text-align: center;">No items in inventory</div>';
    } else {
        inventoryElement.innerHTML = gameState.inventory.backpack.map(item => `
    <div class="inventory-item ${item.rarity}">
        <div class="item-name ${item.rarity}">${item.name}</div>
        <div class="item-type">${item.slot}</div>
        <div class="item-stats">
            ${Object.entries(item.stats).map(([stat, value]) => 
                `<div class="item-stat">+${value} ${stat}</div>`
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

getAvailableStats(item) {
    const allStats = getAllStatTypes(); // Referneces Master List
    const currentStats = Object.keys(item.stats);
    return allStats.filter(stat => !currentStats.includes(stat));
},

// Crafting Subsection
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
    
    // Add new stat with similar value range
// Replace the stat generation part in useChaosOrb:
    const gearType = gearTypes[Object.keys(gearTypes).find(key => gearTypes[key].slot === item.slot)];
    const weight = gearType.statWeights[newStat] || 1; // Default weight
    const rarityData = rarityTiers[item.rarity];
    const statDef = statDefinitions[newStat];
    const baseValue = this.randomBetween(statDef.baseRange.min, statDef.baseRange.max);
    item.stats[newStat] = Math.floor(baseValue * weight * rarityData.statMultiplier);
    
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
    
    return true;
},
    // End of Crafting Subsection
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
        // Update exile info
        document.getElementById('exile-name').textContent = gameState.exile.name;
        document.getElementById('exile-class').textContent = gameState.exile.class;
        document.getElementById('exile-level').textContent = gameState.exile.level;
        document.getElementById('exile-exp').textContent = gameState.exile.experience;
        document.getElementById('exile-exp-needed').textContent = gameState.exile.experienceNeeded;
        
        // Apply morale effects before displaying
        this.applyMoraleEffects(gameState.exile);

        // Update stats
        document.getElementById('stat-life').textContent = gameState.exile.stats.life;
        document.getElementById('stat-damage').textContent = gameState.exile.stats.damage;
        document.getElementById('stat-defense').textContent = gameState.exile.stats.defense;
        document.getElementById('power-rating').textContent = this.calculatePowerRating();
        
        // Update resources
        document.getElementById('gold').textContent = gameState.resources.gold;
        document.getElementById('chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('exalted-orbs').textContent = gameState.resources.exaltedOrbs;
        // Update morale
        const moraleValue = gameState.exile.morale;
        const moraleStatus = this.getMoraleStatus(moraleValue);
        document.getElementById('morale-value').textContent = gameState.exile.morale;
        document.getElementById('morale-status').textContent = this.getMoraleStatus(gameState.exile.morale);

            // Set color based on morale level
            const moraleElement = document.getElementById('morale-status');
            if (moraleValue >= 85) moraleElement.style.color = '#4CAF50'; // Green
            else if (moraleValue >= 70) moraleElement.style.color = '#888'; // Gray
            else if (moraleValue >= 50) moraleElement.style.color = '#ff9800'; // Orange  
            else moraleElement.style.color = '#f44336'; // Red
    },
    
    log(message, type = "info") {
    const logContainer = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    // Always scroll to top to show newest entry
    logContainer.scrollTop = 0;
    
    // Keep only last 100 entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
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
    
    // Generate two random choices
    const choice1 = this.selectPassiveForLevelUp(tier);
    const choice2 = this.selectPassiveForLevelUp(tier);
    
    if (!choice1 || !choice2) {
        this.log("No more passives available!", "failure");
        return;
    }
    
    // Store choices in temporary state (we'll add UI for this next)
    this.currentPassiveChoices = {
        tier: tier,
        choice1: choice1,
        choice2: choice2,
        rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
    };
    
    this.log(`Choose your ${tier} passive! (Reroll cost: ${this.currentPassiveChoices.rerollCost} gold)`, "legendary");
    
    // For now, auto-select first choice (we'll add UI next phase)
    this.allocatePassive(choice1.id);
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