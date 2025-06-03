// Core game object (The games verbs, "doing things" aka macros/widgets)
const game = {
    init() {
        // Load saved game first
        this.loadGame();

        // Initialize exile with class system and passives
        this.initializeExile();
        this.initializeItemTooltips();
        this.updateDisplay();
        this.updateInventoryDisplay();
        this.updateCommandCenterDisplay();
        this.log("Send exiles on missions. Make them more powerful. Each area has dangers and rewards to discover.", "info");
    },

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

        this.recalculateStats();
        this.updateDisplay();
    },

    runMission(missionKey) {
        const [areaId, missionId] = missionKey.split('.');

        if (!areaId || !missionId) {
            this.log("Invalid mission format!", "failure");
            return;
        }

        let moraleResult = null;

        if (!isMissionAvailable(areaId, missionId)) {
            const daysUntil = getDaysUntilAvailable(areaId, missionId);
            if (daysUntil > 0) {
                this.log(`Mission on cooldown for ${daysUntil} more days!`, "failure");
            } else {
                this.log("Mission not discovered yet!", "failure");
            }
            return;
        }

        const exile = gameState.exile;
        const missionData = getCompleteMissionData(areaId, missionId);

        // capture level before any changes
        const levelBeforeMission = exile.level;


        if (!missionData) {
            this.log("Mission data not found!", "failure");
            return;
        }

        this.log(`🗺️ ${exile.name} embarks on ${missionData.name}...`, "info");

        // Combat using new world system
        const combatResult = this.simulateCombat(exile, missionData);

        let goldEarned = 0;
        let expEarned = 0;
        let moraleHtml = "";
        let newGear = null;
        let rewards = null;

        if (combatResult.outcome === 'victory') {
            // Calculate rewards using world system
            const rewards = calculateCompleteMissionRewards(areaId, missionId, combatResult.outcome);

            goldEarned = rewards.gold;
            expEarned = rewards.experience;

            // Apply gold find bonus (preserve existing mechanic)
            const goldFindMultiplier = 1 + (exile.stats.goldFindBonus || 0) / 100;
            goldEarned = Math.floor(goldEarned * goldFindMultiplier);

            // Apply rewards to game state
            gameState.resources.gold += goldEarned;
            gameState.resources.chaosOrbs += rewards.chaosOrbs;
            gameState.resources.exaltedOrbs += rewards.exaltedOrbs;
            gameState.exile.experience += expEarned;

            // Log special currency rewards
            if (rewards.chaosOrbs > 0 || rewards.exaltedOrbs > 0) {
                let orbMessage = "";
                if (rewards.chaosOrbs > 0) orbMessage += `, +${rewards.chaosOrbs} Chaos Shard(s)`;
                if (rewards.exaltedOrbs > 0) orbMessage += `, +${rewards.exaltedOrbs} Exhultation shard(s)`;
                this.log(`🎁 Bonus rewards${orbMessage}!`, "legendary");
            }

            // Check for gear drop using world system
            if (Math.random() < (missionData.gearDrop?.baseChance || 0)) {
                // Generate gear with world system ilvl
                const ilvlRange = missionData.ilvl;
                const gearIlvl = this.randomBetween(ilvlRange.min, ilvlRange.max);

                // Use updated generateGear method
                const newGear = this.generateGear(areaId, missionId, gearIlvl);
                gameState.inventory.backpack.push(newGear);
                this.log(`⭐ Found ${newGear.name}!`, newGear.rarity === 'rare' ? 'legendary' : 'success');
                this.updateInventoryDisplay();
            }

            this.checkLevelUp();

            // Calculate and apply morale change (preserve existing system)
            if (combatResult.outcome !== 'death') {
                moraleResult = this.calculateMoraleChange(combatResult, exile);


                if (moraleResult.change !== 0) {
                    gameState.exile.morale = Math.max(0, Math.min(100, gameState.exile.morale + moraleResult.change));
                    const moraleIcon = moraleResult.change > 0 ? "🔥" : "😴";
                    const moraleText = moraleResult.change > 0 ? `(+${moraleResult.change} morale)` : `(${moraleResult.change} morale)`;
                    moraleHtml = `<br><span style="font-size:0.65em; color:#aaa;">${moraleIcon} ${exile.name}: "${moraleResult.message}" ${moraleText}</span>`;
                }
            }
        } else if (combatResult.outcome === 'death') {
            // Don't call gameOver() - let the day report handle death display
            // this.gameOver(); // DISABLED
            // Still continue to process the death and return data
        }

        let mainMessage = "";
        let breakdownHtml = "";

        // Build the main message for each outcome (preserve existing logic)
        if (combatResult.outcome === 'victory') {
            mainMessage = `✓ ${missionData.name} cleared! +${goldEarned} gold, +${expEarned} exp`;
        } else if (combatResult.outcome === 'death') {
            mainMessage = this.generateDeathMessage(combatResult);
        } else if (combatResult.outcome === 'retreat') {
            const retreatReason = combatResult.rounds >= 10 ? "after a prolonged fight" : "badly wounded";
            mainMessage = `✗ ${exile.name} retreated from ${missionData.name} ${retreatReason} (${combatResult.rounds} rounds, ${Math.floor(combatResult.heaviestHit * 10) / 10} heaviest hit).`;
        }

        // Build the detailed combat breakdown (preserve existing system)
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

            const logId = `combat-breakdown-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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

        // Complete mission and handle world system updates
        const completionResult = completeMission(areaId, missionId, combatResult.outcome);

        // Handle discoveries (new world system feature)
        if (completionResult.discoveries.length > 0) {
            completionResult.discoveries.forEach(discovery => {
                if (discovery.type === 'mission') {
                    const newMission = getMissionData(discovery.areaId, discovery.missionId);
                    if (newMission) {
                        this.log(`🔍 Discovered: ${newMission.name}!`, "legendary");
                    } else {
                        this.log(`🔍 Discovered: New mission in ${discovery.areaId}!`, "legendary");
                    }
                } else if (discovery.type === 'connection') {
                    this.log(`🗺️ Discovered passage to new area!`, "legendary");
                }
            });
            this.updateCommandCenterDisplay(); // Update mission counts
        }

        // Log scouting progress (new world system feature)
        if (completionResult.scoutingGain > 0) {
            this.log(`📖 Gained ${completionResult.scoutingGain} scouting knowledge about the area`, "info");
        }

        // Combine and log as a single entry (preserve existing detailed logging)
        if (mainMessage) {
            this.log(
                `${mainMessage}${breakdownHtml ? "<br>" + breakdownHtml : ""}${moraleHtml || ""}`,
                combatResult.outcome === 'victory' ? "success" : "failure",
                true // isHtml
            );
        }

        this.updateDisplay();
        this.saveGame();

        // Return comprehensive combat data for day report
        return {
            // Core combat results
            combatResult: combatResult,

            // Exile health status
            exileHealth: {
                startingLife: exile.stats.life,
                damageTotal: combatResult.totalDamageTaken,
                remainingLife: Math.max(0, exile.stats.life - combatResult.totalDamageTaken),
                healthPercent: Math.max(0, (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life * 100)
            },

            // Exile progression - simple level tracking
            exileProgression: {
                startingLevel: levelBeforeMission,
                startingExp: exile.experience - expEarned,
                expGained: expEarned,
                leveledUp: exile.level > levelBeforeMission, // Did level actually increase?
                newLevel: exile.level
            },

            // Morale changes
            moraleChange: moraleResult ? {
                change: moraleResult.change,
                message: moraleResult.message,
                oldMorale: exile.morale - moraleResult.change,
                newMorale: exile.morale
            } : null,

            // Rewards breakdown
            rewards: {
                gold: goldEarned,
                experience: expEarned,
                chaosOrbs: rewards ? rewards.chaosOrbs : 0,
                exaltedOrbs: rewards ? rewards.exaltedOrbs : 0,
                gearFound: newGear || null
            },

            // World progression
            worldProgression: {
                discoveries: completionResult?.discoveries || [],
                scoutingGain: completionResult?.scoutingGain || 0
            },

            // Mission context
            missionContext: {
                missionName: missionData.name,
                areaId: areaId,
                missionId: missionId,
                difficulty: missionData.difficulty,
                powerRating: this.calculatePowerRating(exile)
            },

            // Detailed combat log (for expandable section)
            combatDetails: {
                damageLog: combatResult.damageLog,
                heaviestHitBreakdown: combatResult.heaviestHitBreakdown,
                winChancePerRound: combatResult.winChancePerRound // Changed from the incorrect calculation
            }
        };
    },
    // End of runMission object


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

    // Combat Simulation For Missions
    simulateCombat(exile, missionData) {
        const combatData = {
            exile: exile,
            mission: missionData,
            rounds: 0,
            damageLog: [],
            heaviestHit: 0,
            totalDamageTaken: 0,
            outcome: null, // 'victory', 'death', 'retreat'
            deathType: null // 'oneshot', 'outclassed_barely', etc.
        };

        // Calculate win chance per round using new format
        const powerAdvantage = this.calculatePowerRating(exile) / missionData.difficulty;

        // New formula with gentler curve and 5% floor
        let winChancePerRound;
        if (powerAdvantage <= 0) {
            winChancePerRound = 0.05; // 5% floor
        } else if (powerAdvantage < 1) {
            // For underpowered: linear scale from 5% to 15%
            // At 0.5x power = 10%, at 0.667x power = 11.7%, at 1x power = 15%
            winChancePerRound = 0.05 + (powerAdvantage * 0.10);
        } else {
            // For overpowered: logarithmic curve from 15% to 90% cap
            // This maintains the feeling of diminishing returns when overpowered
            const scaledAdvantage = Math.log(powerAdvantage) / Math.log(3); // 0 at 1x, 1 at 3x
            winChancePerRound = Math.min(0.9, 0.15 + (scaledAdvantage * 0.75));
        }

        // Ensure minimum 5% chance
        winChancePerRound = Math.max(0.05, winChancePerRound);

        let currentLife = exile.stats.life;
        const maxRounds = 10;

        while (currentLife > 0 && combatData.rounds < maxRounds) {
            combatData.rounds++;

            // Mission attacks using new damage format
            const damageRoll = this.randomBetween(missionData.damage.min, missionData.damage.max);
            const damageResult = this.calculateDamageReduction(damageRoll, exile, missionData);
            const damageTaken = damageResult.damage;

            currentLife -= damageTaken;
            combatData.totalDamageTaken += damageTaken;
            if (damageTaken > combatData.heaviestHit) {
                combatData.heaviestHit = damageTaken;
                combatData.heaviestHitBreakdown = damageResult.breakdown;
            }

            combatData.damageLog.push({
                round: combatData.rounds,
                rawDamage: damageRoll,
                actualDamage: damageTaken,
                breakdown: damageResult.breakdown,
                lifeRemaining: Math.max(0, currentLife)
            });

            // Check for death
            if (currentLife <= 0) {
                console.log("EXILE DEATH DETECTED in combat!");  // DEBUG
                combatData.outcome = 'death';
                combatData.deathType = this.classifyDeath(combatData, winChancePerRound);
                this.lastDeathMission = missionData.name;
                break;
            }

            // Check for early retreat
            if (currentLife > 0 && currentLife < exile.stats.life * 0.2 && Math.random() < 0.65) {
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

        // Add winChancePerRound to the combatData object before returning
        combatData.winChancePerRound = winChancePerRound;
        return combatData;
    },

    //  Damage Calcs for Mission + Log
    calculateDamageReduction(rawDamage, exile, missionData) {
        // New world system always has damage.types
        const damageTypes = missionData.damage.types;

        let totalDamageAfterReduction = 0;
        const breakdown = [];

        Object.entries(damageTypes).forEach(([damageType, percentage]) => {
            const typeDamage = rawDamage * percentage;
            let reducedDamage = typeDamage;
            let reductionMethod = '';

            if (damageType === 'physical') {
                reducedDamage = Math.max(1, typeDamage * (1 - exile.stats.defense / 200) - exile.stats.defense / 4);
                const reductionPercent = Math.round((1 - reducedDamage / typeDamage) * 100);
                reductionMethod = `${reductionPercent}% reduced`;
            } else {
                const resistance = exile.stats[damageType + 'Resist'] || 0;
                reducedDamage = typeDamage * (1 - resistance / 100);
                reductionMethod = `${resistance}% resisted`;
            }

            breakdown.push({
                type: damageType,
                raw: typeDamage,
                final: reducedDamage,
                method: reductionMethod
            });

            totalDamageAfterReduction += reducedDamage;
        });

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

        // Calculate DPS: Damage × Attack Speed
        const dps = stats.damage * stats.attackSpeed;

        // 1:1 conversion: 1 DPS = 1 Power Rating
        return Math.floor(dps);
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
    },

    applyMoraleEffects(exile) {
        // Reset stats to base + level bonuses
        this.recalculateStats();

        // Apply morale bonuses/penalties
        const morale = exile.morale;
        let damageBonus = 0;
        let defenseBonus = 0;

        if (morale >= 90) {
            // Confident: +20% damage, +10% defense
            damageBonus = Math.floor(exile.stats.damage * 0.2);
            defenseBonus = Math.floor(exile.stats.defense * 0.1);
        } else if (morale >= 70) {
            // Content: No bonuses or penalties
            damageBonus = 0;
            defenseBonus = 0;
        } else if (morale >= 50) {
            // Discouraged: -5% damage
            damageBonus = -Math.floor(exile.stats.damage * 0.05);
        } else if (morale >= 25) {
            // Demoralized: -10% damage, -5% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.1);
            defenseBonus = -Math.floor(exile.stats.defense * 0.05);
        } else if (morale >= 10) {
            // Wavering: -20% damage, -10% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.2);
            defenseBonus = -Math.floor(exile.stats.defense * 0.1);
        } else {
            // Broken: -30% damage, -30% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.3);
            defenseBonus = -Math.floor(exile.stats.defense * 0.3);
        }

        exile.stats.damage += damageBonus;
        exile.stats.defense += defenseBonus;

        // Ensure minimum values
        exile.stats.damage = Math.max(1, exile.stats.damage);
        exile.stats.defense = Math.max(1, exile.stats.defense);
    },

    getMoraleStatus(morale) {
        if (morale >= 90) return "Confident";
        if (morale >= 70) return "Content";
        if (morale >= 50) return "Discouraged";
        if (morale >= 25) return "Demoralized";
        if (morale >= 10) return "Wavering";
        return "Broken";
    },

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
    },

    calculatePowerRating(exile = null) {
        // Use provided exile or default to current game exile
        const targetExile = exile || gameState.exile;
        const stats = targetExile.stats;
        return Math.floor(stats.damage * stats.attackSpeed);
    },


    // GEAR GEAR GEAR GEAR =====================>>>>>>>>>>> 
    generateGear(areaId, missionId, targetIlvl) {
        const missionData = getCompleteMissionData(areaId, missionId);

        // Generate item with new system
        const options = {
            targetIlvl: targetIlvl,
            missionThemes: missionData.themes || [],
            difficultyBonus: 0, // Could calculate this based on mission difficulty later
        };

        // Check for mission-specific gear type overrides
        if (missionData.gearDrop?.gearTypeOverrides) {
            options.slotWeights = missionData.gearDrop.gearTypeOverrides;
        }

        // Generate the item using new system
        const newItem = itemDB.generateItem(options);

        // The new system already rolls rarity and stats, so we just need to convert
        // it to the format our save system expects
        const itemForSave = {
            id: Date.now() + Math.random(),
            name: newItem.getDisplayName(),
            slot: newItem.slot,
            rarity: newItem.rarity ? newItem.rarity.name.toLowerCase() : 'common',
            ilvl: targetIlvl,
            implicitStats: {},  // store implicits separately
            stats: {},          // store only rolled stats
            equipped: false
        };

        // IMPORTANT: First, copy all implicit stats from the base item
        for (const [stat, value] of newItem.implicitStats) {
            itemForSave.implicitStats[stat] = value;
        }

        // Then, copy all rolled stats (these are in newItem.stats but NOT in implicitStats)
        for (const [stat, value] of newItem.stats) {
            // Only add to stats if it's NOT an implicit stat
            if (!newItem.implicitStats.has(stat)) {
                itemForSave.stats[stat] = value;
            }
        }

        // Store weapon-specific properties if they exist
        if (newItem.slot === 'weapon' && newItem.attackSpeed) {
            itemForSave.attackSpeed = newItem.attackSpeed;
            itemForSave.damageMultiplier = newItem.damageMultiplier || 1.0;
        }

        return itemForSave;
    },

    calculateItemSellValue(item) {
        // Base values per rarity
        const rarityMultipliers = {
            common: { min: 5, max: 10 },
            magic: { min: 15, max: 25 },
            rare: { min: 40, max: 60 }
        };

        const rarity = item.rarity || 'common';
        const ilvl = item.ilvl || 1;
        const multipliers = rarityMultipliers[rarity] || rarityMultipliers.common;

        // Calculate base value with some randomness
        const baseValue = this.randomBetween(multipliers.min, multipliers.max);
        const sellValue = Math.floor(baseValue * ilvl);

        // Minimum sell value of 10 gold
        return Math.max(10, sellValue);
    },

    calculateItemSellValue(item) {
        // Base values per rarity
        const rarityMultipliers = {
            common: { min: 5, max: 10 },
            magic: { min: 15, max: 25 },
            rare: { min: 40, max: 60 }
        };

        const rarity = item.rarity || 'common';
        const ilvl = item.ilvl || 1;
        const multipliers = rarityMultipliers[rarity] || rarityMultipliers.common;

        // Calculate base value with some randomness
        const baseValue = this.randomBetween(multipliers.min, multipliers.max);
        const sellValue = Math.floor(baseValue * ilvl);

        // Minimum sell value of 10 gold
        return Math.max(10, sellValue);
    },

    equipItem(itemId) {
        const item = gameState.inventory.backpack.find(i => i.id === itemId);
        if (!item) return;

        console.log("Equipping item:", item.name, "to slot:", item.slot);

        // Map new slots to old display categories
        let displaySlot = item.slot;
        if (['helmet', 'chest', 'gloves', 'boots', 'shield'].includes(item.slot)) {
            displaySlot = 'armor';
        } else if (['ring', 'amulet', 'belt'].includes(item.slot)) {
            displaySlot = 'jewelry';
        }

        // Unequip current item in that display slot if any
        const currentEquipped = gameState.inventory.equipped[displaySlot];
        if (currentEquipped) {
            currentEquipped.equipped = false;
            gameState.inventory.backpack.push(currentEquipped);
        }

        // Equip new item
        gameState.inventory.equipped[displaySlot] = item;
        item.equipped = true;

        // Remove from backpack
        gameState.inventory.backpack = gameState.inventory.backpack.filter(i => i.id !== itemId);

        this.recalculateStats();
        this.updateDisplay();
        this.updateInventoryDisplay();
        this.updateCharacterScreenIfOpen();
        this.saveGame();
    },

    equipItemToSlot(itemId, targetSlot) {
        console.log("Looking for item with ID:", itemId); // ADD THIS
        const item = gameState.inventory.backpack.find(i => i.id === itemId);
        console.log("Found item:", item); // ADD THIS

        if (!item) {
            console.error("Item not found!"); // ADD THIS
            return;
        }
        // Unequip current item in that slot if any
        const currentEquipped = gameState.inventory.equipped[targetSlot];
        if (currentEquipped) {
            currentEquipped.equipped = false;
            gameState.inventory.backpack.push(currentEquipped);
        }

        // Equip new item
        gameState.inventory.equipped[targetSlot] = item;
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
        const passiveEffects = this.calculatePassiveEffects();

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

        // Get only non-implicit stats
        const currentStatKeys = Object.keys(item.stats);
        if (currentStatKeys.length === 0) {
            this.log("No stats to reroll!", "failure");
            return false;
        }

        // Pick random stat to remove
        const statToRemove = currentStatKeys[Math.floor(Math.random() * currentStatKeys.length)];
        const oldValue = item.stats[statToRemove];

        // Get the item's base type from itemDB to access stat weights
        const baseTypes = ['weapon', 'armor', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring', 'amulet', 'belt'];
        let itemBase = null;

        for (const equipment of itemDB.equipment.values()) {
            if (equipment.slot === item.slot && item.name.includes(equipment.name)) {
                itemBase = equipment;
                break;
            }
        }

        if (!itemBase) {
            this.log("Cannot determine item base type!", "failure");
            return false;
        }

        // Get available stats that aren't already on the item
        const availableStats = Array.from(itemBase.statWeights.keys())
            .filter(stat => !currentStatKeys.includes(stat) && stat !== statToRemove);

        if (availableStats.length === 0) {
            this.log("No new stats available to roll!", "failure");
            return false;
        }

        // Pick a new stat
        const newStat = availableStats[Math.floor(Math.random() * availableStats.length)];

        // Roll value using stat system
        const statDef = statDB.getStat(newStat);
        if (!statDef) {
            this.log("Stat definition not found!", "failure");
            return false;
        }

        const range = statDef.getValueRange(item.ilvl);
        const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

        // Apply the change
        delete item.stats[statToRemove];
        item.stats[newStat] = value;

        // Consume orb
        gameState.resources.chaosOrbs--;

        this.log(`🌀 Chaotic Shard used! ${this.getStatDisplayName(statToRemove)} (${oldValue}) → ${this.getStatDisplayName(newStat)} (${value})`, "legendary");

        // Update main resource display
        this.updateResourceDisplay();

        // Update displays
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

    // USE Exalt
    useExaltedOrb(itemId) {
        const item = gameState.inventory.backpack.find(i => i.id === itemId);
        if (!item || gameState.resources.exaltedOrbs < 1) return false;

        // Get current stat count (excluding implicits)
        const currentStatCount = Object.keys(item.stats).length;

        // Get current rarity info
        const currentRarity = rarityDB.getRarity(item.rarity);
        if (!currentRarity) {
            this.log("Unknown item rarity!", "failure");
            return false;
        }

        // Check if item is already overcapped
        if (item.isOvercapped) {
            this.log("This item has already been perfected with an Exalted Shard!", "failure");
            return false;
        }

        // Check if we need to upgrade rarity or if it's a rare at max
        let targetRarity = currentRarity;
        let canAddStat = currentStatCount < currentRarity.maxStats;

        if (!canAddStat) {
            if (item.rarity === 'common') {
                targetRarity = rarityDB.getRarity('magic');
                item.rarity = 'magic';
                canAddStat = true;
                this.log(`⚡ Item upgraded to Magic rarity!`, "legendary");
            } else if (item.rarity === 'magic') {
                targetRarity = rarityDB.getRarity('rare');
                item.rarity = 'rare';
                canAddStat = true;
                this.log(`⚡ Item upgraded to Rare rarity!`, "legendary");
            } else if (item.rarity === 'rare' && currentStatCount >= currentRarity.maxStats) {
                // Only allow overcapping if the rare item is ALREADY at max stats (4)
                canAddStat = true;
                item.isOvercapped = true;
                this.log(`✨ Pushing beyond normal limits!`, "legendary");
            }

            // Update item name with new rarity (except for overcapped)
            if (!item.isOvercapped) {
                const baseName = item.name.replace(/^(Common|Magic|Rare)\s+/, '');
                item.name = `${targetRarity.name} ${baseName}`;
            }
        }

        // Now add a stat
        const baseTypes = ['weapon', 'armor', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring', 'amulet', 'belt'];
        let itemBase = null;

        for (const equipment of itemDB.equipment.values()) {
            if (equipment.slot === item.slot && item.name.includes(equipment.name)) {
                itemBase = equipment;
                break;
            }
        }

        if (!itemBase) {
            this.log("Cannot determine item base type!", "failure");
            return false;
        }

        // Get all possible stats for this slot from statDB
        const allPossibleStats = statDB.getStatsForSlot(item.slot);

        // Build list of stats that aren't already on the item
        const currentStats = Object.keys(item.stats);
        const availableStats = [];

        for (const statDef of allPossibleStats) {
            const statName = statDef.name;

            // Skip if already on the item (either as implicit or regular stat)
            if (currentStats.includes(statName) || (item.implicitStats && item.implicitStats[statName])) {
                continue;
            }

            // Add to available stats (we don't need weights for exalts, just possibilities)
            availableStats.push(statName);
        }

        if (availableStats.length === 0) {
            this.log("No available stats to add!", "failure");
            return false;
        }

        // Pick a random stat from available stats
        const newStat = availableStats[Math.floor(Math.random() * availableStats.length)];
        const statDef = statDB.getStat(newStat);
        const range = statDef.getValueRange(item.ilvl);
        const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

        // Add the stat
        item.stats[newStat] = value;

        // Consume orb
        gameState.resources.exaltedOrbs--;

        this.log(`⭐ Exalted Shard used! Added ${this.getStatDisplayName(newStat)} (${value})`, "legendary");

        // Update main resource display
        this.updateResourceDisplay();

        // Update displays
        if (item.equipped) {
            this.recalculateStats();
            this.updateDisplay();
        }
        this.updateInventoryDisplay();
        this.saveGame();
        this.updateCharacterScreenIfOpen();

        return true;
    },
    // End of use Exalt

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
            inventoryCount.textContent = `(${gameState.inventory.backpack.length})`;
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

    // Current exile is logged, "deleted" and new exile is created
    handleExileDeath() {
        console.log("handleExileDeath called!");
        const fallenExile = gameState.exile;
        const deathDay = timeState.currentDay;

        // Create a complete snapshot of the fallen exile
        const fallenRecord = {
            ...fallenExile,  // Copy all exile properties
            deathDay: deathDay,
            deathMission: this.lastDeathMission || "Unknown Mission",
            totalDaysAlive: deathDay - (fallenExile.birthDay || 1),
            equipped: { ...gameState.inventory.equipped }  // Snapshot of what they died wearing
        };

        // Add to fallen exiles array
        gameState.fallenExiles.push(fallenRecord);

        // Clear any mission assignments for the dead exile - ADD THIS
        gameState.assignments = gameState.assignments.filter(
            assignment => assignment.exileName !== fallenExile.name
        );

        // Update Command Center Display
        this.updateCommandCenterDisplay();


        // Delete equipped gear (hardcore death penalty)
        Object.keys(gameState.inventory.equipped).forEach(slot => {
            gameState.inventory.equipped[slot] = null;
        });

        // Generate new exile using existing system
        const classes = Object.keys(classDefinitions);
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        this.createNewExile(randomClass);

        // Give starting notable (same as original exile)
        this.giveStartingNotable();

        // Recalculate stats for new exile
        this.recalculateStats();
        this.updateDisplay();

        // Log the transition
        this.log(`⚰️ ${fallenRecord.name} has fallen. May they rest in peace.`, "failure");
        this.log(`🌟 ${gameState.exile.name} the ${classDefinitions[gameState.exile.class].name} has joined the guild!`, "legendary");

        // Save immediately
        this.saveGame();
    },
    // END OF EXILE DEATH

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


    // Equipment Selector Modal Methods
    openEquipmentSelector(slot) {
        this.currentEquipmentSlot = slot;

        // Update modal title
        const slotName = slot === 'ring1' || slot === 'ring2' ? 'Ring' :
            slot.charAt(0).toUpperCase() + slot.slice(1);
        document.getElementById('equipment-selector-title').textContent = `Select ${slotName}`;

        // Show current equipped item
        const currentItem = gameState.inventory.equipped[slot];
        const currentSection = document.getElementById('current-equipped-item');

        if (currentItem) {
            const displayName = currentItem.getDisplayName ? currentItem.getDisplayName() : currentItem.name;
            const displayColor = currentItem.getDisplayColor ? currentItem.getDisplayColor() :
                (currentItem.rarity ? rarityDB.getRarity(currentItem.rarity)?.color : null) || '#888';

            currentSection.innerHTML = `
                <div class="equipment-option current">
                    <div class="item-name" style="color: ${displayColor}">
                    ${displayName}
${currentItem.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                    </div>
                    <div class="item-stats">
                        ${this.formatItemStats(currentItem)}
                    </div>
                </div>
            `;
        } else {
            currentSection.innerHTML = '<div class="empty-slot">Nothing equipped</div>';
        }

        // Show available items for this slot
        const availableSection = document.getElementById('available-items-list');
        const validItems = this.getItemsForSlot(slot);

        if (validItems.length === 0) {
            availableSection.innerHTML = '<div class="empty-slot">No items available for this slot</div>';
        } else {
            availableSection.innerHTML = validItems
                .filter(item => item != null)  // Remove any null/undefined items
                .map(item => {
                    const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
                    // Get color from rarity system
                    const displayColor = item.getDisplayColor ? item.getDisplayColor() :
                        (item.rarity ? rarityDB.getRarity(item.rarity)?.color : null) || '#888';

                    return `
                        <div class="equipment-option" onclick="game.selectEquipment(${item.id})">
                            <div class="item-name" style="color: ${displayColor}">
                            ${displayName}
                             ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                            </div>
                            <div class="item-stats">
                                ${this.formatItemStats(item)}
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Add unequip option at the end if something is equipped
        if (currentItem) {
            availableSection.innerHTML += `
                <div class="equipment-option unequip-option" onclick="game.selectEquipment(null)">
                    <div>Unequip</div>
                </div>
            `;
        }

        // Show modal
        document.getElementById('equipment-selector-modal').style.display = 'flex';
    },

    closeEquipmentSelector() {
        document.getElementById('equipment-selector-modal').style.display = 'none';
        this.currentEquipmentSlot = null;
    },

    handleEquipmentSelectorClick(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.closeEquipmentSelector();
        }
    },

    getItemsForSlot(slot) {
        // Handle ring slots
        const itemSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;

        return gameState.inventory.backpack.filter(item => {
            return item.slot === itemSlot;
        });
    },

    formatItemStats(item) {
        let html = '';

        if (item.slot === 'weapon' && item.attackSpeed) {
            html += '<div class="weapon-attack-speed">';
            html += `<span class="item-stat-line">Attack Speed: ${item.attackSpeed.toFixed(2)}</span>`;
            html += '</div>';
        }

        // Get effective damage values for weapons
        const effectiveDamage = this.getEffectiveDamageValues(item);

        // Display implicit stats first with special styling
        if (item.implicitStats && Object.keys(item.implicitStats).length > 0) {
            const implicitStats = Object.entries(item.implicitStats);
            html += '<div class="implicit-stats">';
            html += implicitStats.map(([stat, value]) => {
                const statName = this.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.implicitDamage;
                    if (effectiveValue !== value) {
                        return `<span class="item-stat-line">+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span></span>`;
                    }
                }

                return `<span class="item-stat-line">+${value} ${statName}</span>`;
            }).join('');
            html += '</div>';
        }

        // Display regular stats
        const stats = item.stats instanceof Map ?
            Array.from(item.stats.entries()) :
            Object.entries(item.stats || {});

        if (stats.length > 0) {
            html += '<div class="regular-stats">';
            html += stats.map(([stat, value]) => {
                const statName = this.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.rolledDamage;
                    if (effectiveValue !== value) {
                        return `<span class="item-stat-line">+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span></span>`;
                    }
                }

                return `<span class="item-stat-line">+${value} ${statName}</span>`;
            }).join('');
            html += '</div>';
        }

        return html;
    },

    selectEquipment(itemId) {
        const slot = this.currentEquipmentSlot;

        console.log("Selecting equipment:", itemId, "for slot:", slot); // ADD THIS

        if (itemId === null) {
            // Unequip
            this.unequipItem(slot);
        } else {
            // Equip new item
            this.equipItemToSlot(itemId, slot);
        }

        this.closeEquipmentSelector();
        this.updateCharacterScreen();
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

    // Inventory Modal Methods
    openInventoryModal() {
        console.log("openInventoryModal called!");

        // Check if modal exists
        const modal = document.getElementById('inventory-modal');
        console.log("Modal element:", modal);

        if (!modal) {
            console.error("Inventory modal not found!");
            return;
        }

        // Update inventory count
        const count = gameState.inventory.backpack.length;
        document.getElementById('modal-inventory-count').textContent = `${count}`;
        document.getElementById('inventory-count-main').textContent = `${count}`;

        // Update currency display
        document.getElementById('modal-gold').textContent = gameState.resources.gold;
        document.getElementById('modal-chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('modal-exalted-orbs').textContent = gameState.resources.exaltedOrbs;

        // Populate inventory items
        this.updateInventoryModalDisplay();

        // Show modal
        console.log("Setting modal display to flex");
        modal.style.display = 'flex';
        console.log("Modal display is now:", modal.style.display);
    },

    closeInventoryModal() {
        document.getElementById('inventory-modal').style.display = 'none';
    },

    handleInventoryModalClick(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.closeInventoryModal();
        }
    },

    updateInventoryModalDisplay() {
        const container = document.getElementById('inventory-items-grid');

        if (gameState.inventory.backpack.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center; grid-column: 1/-1;">No items in inventory</div>';
            return;
        }

        container.innerHTML = gameState.inventory.backpack.map(item => {
            const displayName = item.name;
            const displayColor = rarityDB.getRarity(item.rarity)?.color || '#888';
            const sellValue = this.calculateItemSellValue(item);

            return `
                <div class="inventory-item ${item.rarity}">
                    <div class="item-details">
                        <div class="item-header">
                            <div class="item-name" style="color: ${displayColor}">
                                ${displayName}
                                ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                            </div>
                            <div class="item-type">${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</div>
                        </div>
                        <div class="item-ilvl">Item Level: ${item.ilvl}</div>
                        <div class="item-stats">
                            ${this.formatItemStats(item)}
                        </div>
                        <div class="item-sell-value">Sell: ${sellValue}g</div>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn chaos" onclick="game.useChaosOrbModal(${item.id})" 
                            ${gameState.resources.chaosOrbs < 1 ? 'disabled' : ''} 
                            title="Chaotic Orb (${gameState.resources.chaosOrbs})">
                            🌀
                        </button>
                        <button class="action-btn exalted" onclick="game.useExaltedOrbModal(${item.id})" 
                            ${gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}
                            title="Exalted Orb (${gameState.resources.exaltedOrbs})">
                            ⭐
                        </button>
                        <button class="action-btn sell" onclick="game.sellItem(${item.id})" title="Sell ${sellValue}g">
                            💰
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Helper methods for inventory modal actions
    equipItemFromModal(itemId) {
        const item = gameState.inventory.backpack.find(i => i.id === itemId);
        if (!item) return;

        // Determine the correct slot
        let targetSlot = item.slot;

        // For rings, find an empty ring slot
        if (item.slot === 'ring') {
            if (!gameState.inventory.equipped.ring1) {
                targetSlot = 'ring1';
            } else if (!gameState.inventory.equipped.ring2) {
                targetSlot = 'ring2';
            } else {
                targetSlot = 'ring1'; // Default to ring1 if both equipped
            }
        }

        this.equipItemToSlot(itemId, targetSlot);
        this.updateInventoryModalDisplay();
        this.updateCharacterScreenIfOpen();
    },

    useChaosOrbModal(itemId) {
        const result = this.useChaosOrb(itemId);

        // Update modal currency displays
        document.getElementById('modal-chaos-orbs').textContent = gameState.resources.chaosOrbs;

        this.updateInventoryModalDisplay();
    },

    useExaltedOrbModal(itemId) {
        const result = this.useExaltedOrb(itemId);

        // Update modal currency displays
        document.getElementById('modal-exalted-orbs').textContent = gameState.resources.exaltedOrbs;

        this.updateInventoryModalDisplay();
    },

    deleteItem(itemId) {
        if (confirm("Are you sure you want to delete this item?")) {
            gameState.inventory.backpack = gameState.inventory.backpack.filter(i => i.id !== itemId);
            this.updateInventoryModalDisplay();
            this.saveGame();

            // Update counts
            const count = gameState.inventory.backpack.length;
            document.getElementById('modal-inventory-count').textContent = `${count}`;
            document.getElementById('inventory-count-main').textContent = `${count}`;
        }
    },

    sellItem(itemId) {
        const item = gameState.inventory.backpack.find(i => i.id === itemId);
        if (!item) return;

        const sellValue = this.calculateItemSellValue(item);

        // Find the item element in the DOM
        const itemElements = document.querySelectorAll('.inventory-item');
        let itemElement = null;

        // Find the specific item element by checking if it contains the sell button with this itemId
        itemElements.forEach(el => {
            const sellBtn = el.querySelector(`button[onclick="game.sellItem(${itemId})"]`);
            if (sellBtn) {
                itemElement = el;
            }
        });

        if (itemElement) {
            // Add dissolving class for the main animation
            itemElement.classList.add('dissolving');

            // Create gold particles
            this.createGoldParticles(itemElement);

            // Wait for animation to complete before removing
            setTimeout(() => {
                this.completeSellItem(itemId, item, sellValue);
            }, 300);
        } else {
            // Fallback if element not found
            this.completeSellItem(itemId, item, sellValue);
        }
    },

    // New helper method to complete the sale after animation
    completeSellItem(itemId, item, sellValue) {
        // Remove item from backpack
        gameState.inventory.backpack = gameState.inventory.backpack.filter(i => i.id !== itemId);

        // Add gold
        gameState.resources.gold += sellValue;

        // Log the sale
        this.log(`💰 Sold ${item.name} for ${sellValue} gold`, "success");

        // Update displays
        this.updateInventoryModalDisplay();
        this.updateDisplay();

        // Update modal gold with pulse effect
        const modalGoldElement = document.getElementById('modal-gold');
        if (modalGoldElement) {
            modalGoldElement.textContent = gameState.resources.gold;

            // Add pulse effect
            modalGoldElement.classList.remove('resource-glow-pulse');
            void modalGoldElement.offsetWidth; // Force reflow to restart animation
            modalGoldElement.classList.add('resource-glow-pulse');

            // Remove class after animation
            setTimeout(() => {
                modalGoldElement.classList.remove('resource-glow-pulse');
            }, 700);
        }

        this.saveGame();

        // Update counts
        const count = gameState.inventory.backpack.length;
        document.getElementById('modal-inventory-count').textContent = `${count}`;
        document.getElementById('inventory-count-main').textContent = `${count}`;
    },

    // New method to create gold particle effects
    createGoldParticles(element) {
        const rect = element.getBoundingClientRect();
        const particleCount = 8;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'gold-particle';

            // Random starting position within the item
            const startX = rect.left + Math.random() * rect.width;
            const startY = rect.top + Math.random() * rect.height;

            // Random horizontal drift
            const dx = (Math.random() - 0.5) * 60;

            particle.style.left = startX + 'px';
            particle.style.top = startY + 'px';
            particle.style.setProperty('--dx', dx + 'px');

            // Random animation duration for variety
            const duration = 0.6 + Math.random() * 0.3;
            particle.style.animation = `floatUp ${duration}s ease-out forwards`;

            // Random delay for staggered effect
            particle.style.animationDelay = `${Math.random() * 0.1}s`;

            document.body.appendChild(particle);

            // Remove particle after animation
            setTimeout(() => {
                particle.remove();
            }, (duration + 0.1) * 1000);
        }
    },

    // End of Inventory Modal Methods

    updateCharacterScreen() {
        // Update character info
        document.getElementById('char-name').textContent = gameState.exile.name;
        document.getElementById('char-class').textContent = classDefinitions[gameState.exile.class].name;
        document.getElementById('char-level').textContent = gameState.exile.level;
        document.getElementById('char-exp').textContent = gameState.exile.experience;
        document.getElementById('char-exp-needed').textContent = gameState.exile.experienceNeeded;
        document.getElementById('char-morale').textContent = gameState.exile.morale;
        document.getElementById('char-morale-status').textContent = this.getMoraleStatus(gameState.exile.morale);

        // Update morale tooltip
        const moraleElement = document.querySelector('.morale-value-with-tooltip');
        if (moraleElement) {
            moraleElement.setAttribute('data-tooltip', this.createMoraleTooltip(gameState.exile.morale));
        }

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
        // Convert scoutingBonus (1.0 = 100%) to percentage display
        const explorationBonusPercent = Math.round((gameState.exile.stats.scoutingBonus - 1.0) * 100);
        document.getElementById('final-exploration-bonus').textContent = explorationBonusPercent + "%";

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

        // Format attack speed display (show to 2 decimal places)
        const formattedAttackSpeed = gameState.exile.stats.attackSpeed.toFixed(2);

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

        // Update attack speed display (we'll add the HTML element next)
        const attackSpeedElement = document.getElementById('final-attack-speed');
        if (attackSpeedElement) {
            attackSpeedElement.textContent = formattedAttackSpeed;
        }

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

        // Add flat passives BEFORE scaling
        const flatBase = {
            life: baseStats.life + gearBonuses.life + (passiveEffects.flatLife || 0),
            damage: baseStats.damage + gearBonuses.damage + (passiveEffects.flatDamage || 0),
            defense: baseStats.defense + gearBonuses.defense + (passiveEffects.flatDefense || 0)
        };

        // Apply passive scaling
        const passiveContribution = {
            life: Math.floor(flatBase.life * ((passiveEffects.increasedLife || 0) / 100) +
                flatBase.life * ((passiveEffects.moreLife || 0) / 100)),
            damage: Math.floor(flatBase.damage * ((passiveEffects.increasedDamage || 0) / 100) +
                flatBase.damage * ((passiveEffects.moreDamage || 0) / 100)),
            defense: Math.floor(flatBase.defense * ((passiveEffects.increasedDefense || 0) / 100) +
                flatBase.defense * ((passiveEffects.moreDefense || 0) / 100))
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
        // Update character screen equipment display for all slots
        const slots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring1', 'ring2', 'amulet', 'belt'];

        slots.forEach(slot => {
            const slotElement = document.getElementById(`char-${slot}-slot`);
            if (!slotElement) {
                console.warn(`Slot element not found: char-${slot}-slot`);
                return;
            }

            const slotContent = slotElement.querySelector('.slot-content');
            if (!slotContent) {
                console.warn(`Slot content not found for: ${slot}`);
                return;
            }

            const equipped = gameState.inventory.equipped[slot];

            if (equipped) {
                const displayName = equipped.getDisplayName ? equipped.getDisplayName() : equipped.name;
                const displayColor = equipped.getDisplayColor ? equipped.getDisplayColor() :
                    rarityDB.getRarity(equipped.rarity)?.color || '#888';

                slotContent.innerHTML = `
                    <div class="item-equipped">
                        <div class="item-name" style="color: ${displayColor}">
                            ${displayName}
                            ${equipped.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                        </div>
                        <div class="item-stats">
                            ${this.formatItemStats(equipped)}
                        </div>
                    </div>
                `;
            } else {
                // Check if items are available for this slot
                const availableItems = this.getItemsForSlot(slot);
                const hasItems = availableItems.length > 0;

                console.log(`Slot ${slot}: ${availableItems.length} items available`); // DEBUG

                slotContent.innerHTML = `
                    <div class="empty-slot">
                        Empty${hasItems ? '<span class="slot-has-items">+</span>' : ''}
                    </div>
                `;
            }
        });
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
        // Show assignment status in exile summary 
        const assignment = this.getExileAssignment(gameState.exile.name);
        const assignmentBadge = document.getElementById('exile-assignment-badge');

        if (assignment) {
            // Show the assignment badge
            if (assignmentBadge) {
                assignmentBadge.style.display = 'inline-flex';
            }

            const missionData = getMissionData(assignment.areaId, assignment.missionId);
            const assignmentText = `📋 Assigned: ${missionData.name}`;

            // Commented out in favor of simple icon but may want for showing who is doing what
            // // Add to notifications area if it exists
            // const notificationsArea = document.querySelector('.exile-notifications');
            // if (notificationsArea) {
            //     // Remove any existing assignment status
            //     const existingAssignment = notificationsArea.querySelector('.assignment-status');
            //     if (existingAssignment) existingAssignment.remove();

            //     // Add new assignment status
            //     const assignmentDiv = document.createElement('div');
            //     assignmentDiv.className = 'assignment-status';
            //     assignmentDiv.style.cssText = 'font-size: 0.8em; color: #c9aa71; margin-top: 5px;';
            //     assignmentDiv.textContent = assignmentText;
            //     notificationsArea.appendChild(assignmentDiv);
            // }
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
        // Update character screen equipment display for all slots
        const slots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring1', 'ring2', 'amulet', 'belt'];

        slots.forEach(slot => {
            const slotElement = document.getElementById(`char-${slot}-slot`);
            if (!slotElement) {
                console.warn(`Slot element not found: char-${slot}-slot`);
                return; // Skip if element doesn't exist
            }

            const slotContent = slotElement.querySelector('.slot-content');
            if (!slotContent) {
                console.warn(`Slot content not found for: ${slot}`);
                return;
            }

            const equipped = gameState.inventory.equipped[slot];

            if (equipped) {
                const displayName = equipped.getDisplayName ? equipped.getDisplayName() : equipped.name;
                const displayColor = equipped.getDisplayColor ? equipped.getDisplayColor() :
                    rarityDB.getRarity(equipped.rarity)?.color || '#888';

                slotContent.innerHTML = `
                    <div class="item-equipped">
                        <div class="item-name" style="color: ${displayColor}">
                        ${displayName}
                        ${equipped.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                        </div>
                        <div class="item-stats">
                            ${this.formatItemStats(equipped)}
                        </div>
                    </div>
                `;
            } else {
                // Check if items are available for this slot
                const checkSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;
                const availableItems = gameState.inventory.backpack.filter(item => item.slot === checkSlot);
                const hasItems = availableItems.length > 0;

                slotContent.innerHTML = `
                    <div class="empty-slot">
                        Empty${hasItems ? '<span class="slot-has-items">+</span>' : ''}
                    </div>
                `;
            }
        });
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
    // Helper to check if a mission caused a level up
    didThisMissionCauseLevelUp(startingExp, expGained, currentLevel) {
        if (expGained <= 0) return false;

        // Calculate what level we started at
        const startingLevel = Math.floor(startingExp / 100) + 1;

        // Calculate what level we should be at after gaining EXP
        const finalExp = startingExp + expGained;
        const finalLevel = Math.floor(finalExp / 100) + 1;

        // Did we actually level up from this mission?
        return finalLevel > startingLevel;
    },


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
        // Update main screen resources
        document.getElementById('gold').textContent = gameState.resources.gold;
        document.getElementById('chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('exalted-orbs').textContent = gameState.resources.exaltedOrbs;

        // Optional: Add the glow effect for currency changes
        const chaosElem = document.getElementById('chaos-orbs');
        const exaltedElem = document.getElementById('exalted-orbs');

        // Store previous values using data attributes
        const prevChaos = parseInt(chaosElem.getAttribute('data-prev') || "0", 10);
        const prevExalted = parseInt(exaltedElem.getAttribute('data-prev') || "0", 10);

        // Update stored values
        chaosElem.setAttribute('data-prev', gameState.resources.chaosOrbs);
        exaltedElem.setAttribute('data-prev', gameState.resources.exaltedOrbs);
    },


    saveGame() {
        if (gameState.settings.autoSave) {
            const saveData = {
                gameState: gameState,
                timeState: timeState  // ADD: Include time state in saves
            };
            localStorage.setItem('exileManagerSave', JSON.stringify(saveData));
        }
    },

    loadGame() {
        const savedGame = localStorage.getItem('exileManagerSave');
        if (savedGame) {
            const loadedData = JSON.parse(savedGame);

            // Handle both old saves (just gameState) and new saves (with timeState)
            if (loadedData.gameState) {
                Object.assign(gameState, loadedData.gameState);
                if (loadedData.timeState) {
                    Object.assign(timeState, loadedData.timeState);
                }
            } else {
                // Old save format - just gameState
                Object.assign(gameState, loadedData);
            }

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
        const stat = statDB.getStat(statKey);
        return stat ? stat.displayName : statKey;
    },

    // Helper function to get damage type icons
    getDamageTypeIcon(damageType) {
        const icons = {
            physical: '⚔️',
            fire: '🔥',
            cold: '❄️',
            lightning: '⚡',
            chaos: '🫧'
        };
        return icons[damageType] || '✦';
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

    // Helper Function for level ups on Mission Report Modal
    checkIfLeveledUp(oldExp, newExp) {
        // Simple check - did experience cross a level boundary?
        const oldLevel = Math.floor(oldExp / 100) + 1; // Simplified level calc
        const newLevel = Math.floor(newExp / 100) + 1;
        return newLevel > oldLevel;
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
        if (level % 4 === 0) return 'notable';    // 5, 15, 25...
        return 'normal';                          // All other levels
    },

    startPassiveSelection() {
        if (gameState.exile.passives.pendingPoints <= 0) return;

        const currentLevel = gameState.exile.level;
        const tier = this.getPassiveTierForLevel(currentLevel);

        // Get available passives for this tier
        let pool = passiveHelpers.getWeightedPassivePool(gameState.exile.class, tier);

        // For normal passives, include already allocated ones (for stacking)
        // For notable/keystone, exclude already allocated
        if (tier !== 'normal') {
            pool = pool.filter(passive => !gameState.exile.passives.allocated[passive.id]);
        }

        if (pool.length === 0) {
            this.log("No more passives available!", "failure");
            return;
        }

        const choice1 = this.weightedRandomSelect(pool);
        let choice2 = null;

        if (pool.length > 1) {
            // Remove choice1 from pool for choice2 to prevent duplicates
            const poolWithoutChoice1 = pool.filter(p => p.id !== choice1.id);
            if (poolWithoutChoice1.length > 0) {
                choice2 = this.weightedRandomSelect(poolWithoutChoice1);
            } else {
                // If only one passive left in pool, use it again
                choice2 = choice1;
            }
        } else {
            // Only one passive in pool
            choice2 = choice1;
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


    // === WORLD MAP INTERFACE ===================================================
    openWorldMap() {
        // Create world map modal if it doesn't exist
        if (!document.getElementById('world-map-modal')) {
            this.createWorldMapModal();
        }

        // Show the modal
        document.getElementById('world-map-modal').style.display = 'flex';

        // Populate with current world state
        this.updateWorldMapDisplay();

        // Add escape key listener
        document.addEventListener('keydown', this.handleWorldMapKeydown.bind(this));
    },

    closeWorldMap() {
        const modal = document.getElementById('world-map-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleWorldMapKeydown.bind(this));

        // Update main screen status
        this.updateCommandCenterDisplay();
    },

    handleWorldMapKeydown(event) {
        if (event.key === 'Escape') {
            this.closeWorldMap();
        }
    },

    // === DAY REPORT MODAL METHODS ===
    openDayReport() {
        // Show the modal
        document.getElementById('day-report-modal').style.display = 'flex';

        // Update day number
        document.getElementById('day-report-day').textContent = timeState.currentDay;

        // Clear previous content
        this.clearDayReportContent();

        //DEBUG for Assignment Data
        this.clearDayReportContent();
        // TEMP: Debug - log collected data
        console.log("Day Report Data:", this.dayReportData);
        // DEBUG END

        // Start the animation sequence
        this.animateDayReport();

        // Add escape key listener
        document.addEventListener('keydown', this.handleDayReportKeydown.bind(this));
    },

    closeDayReport() {
        const modal = document.getElementById('day-report-modal');
        modal.style.display = 'none';

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleDayReportKeydown.bind(this));

        // Reset animation state
        this.dayReportAnimationState = { skipped: false, currentStep: 0 };

        // ADD: Check if any exile died during this day
        const hadDeath = this.dayReportData.missionResults.some(result =>
            result.combatResult.outcome === 'death'
        );

        console.log("Day report closed. Had death?", hadDeath);  // TEMPORARY DEBUG
        console.log("Mission results:", this.dayReportData.missionResults);  // TEMPORARY DEBUG

        if (hadDeath) {
            this.handleExileDeath();
        }
    },

    handleDayReportClick(event) {
        // Close if clicking the overlay (not the content)
        if (event.target.classList.contains('modal-overlay')) {
            this.closeDayReport();
        }
    },

    handleDayReportKeydown(event) {
        if (event.key === 'Escape') {
            this.closeDayReport();
        }
    },

    clearDayReportContent() {
        // Clear all content containers
        document.getElementById('mission-summary-container').innerHTML = '';
        document.getElementById('loot-container').innerHTML = '';
        document.getElementById('discovery-content').innerHTML = '';
        document.getElementById('detailed-content').innerHTML = '';

        // Hide discovery section by default
        document.getElementById('discovery-section').style.display = 'none';

        // Reset collapsible sections
        document.getElementById('discovery-content').style.display = 'none';
        document.getElementById('detailed-content').style.display = 'none';
    },

    // Animation control
    dayReportAnimationState: {
        skipped: false,
        currentStep: 0
    },

    skipAnimations() {
        this.dayReportAnimationState.skipped = true;

        // Immediately show all content without animations
        this.showAllDayReportContent();
    },

    // Collapsible section toggles
    toggleDiscoverySection() {
        const content = document.getElementById('discovery-content');
        const triangle = document.querySelector('#discovery-section .triangle');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            triangle.innerHTML = '&#x25B2;';
        } else {
            content.style.display = 'none';
            triangle.innerHTML = '&#x25BC;';
        }
    },

    toggleDetailedSection() {
        const content = document.getElementById('detailed-content');
        const triangle = document.querySelector('.detailed-section .triangle');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            triangle.innerHTML = '&#x25B2;';
        } else {
            content.style.display = 'none';
            triangle.innerHTML = '&#x25BC;';
        }
    },

    // === DAY REPORT ANIMATION SEQUENCE ===
    animateDayReport() {
        if (this.dayReportAnimationState.skipped) {
            this.showAllDayReportContent();
            return;
        }

        // Step 1: Mission Summary Panels (fade in one by one)
        this.animateMissionSummaries();
    },

    animateMissionSummaries() {
        const container = document.getElementById('mission-summary-container');

        // Create mission summary panels from collected data
        this.dayReportData.missionResults.forEach((result, index) => {
            const panel = this.createMissionSummaryPanel(result);
            container.appendChild(panel);

            // Animate in with delay
            setTimeout(() => {
                if (!this.dayReportAnimationState.skipped) {
                    panel.classList.add('animate-in');
                }
            }, index * 200); // 200ms delay between each panel
        });

        // Move to next step after all panels animate in
        const totalDelay = this.dayReportData.missionResults.length * 200 + 100;
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.animateExileStatus();
            }
        }, totalDelay);
    },

    // Create Exile Summary on Mission Report, Then Give it a Delayed Animation
    animateExileStatus() {
        // Just animate the panels in - EXP bars are already there
        const missionPairs = document.querySelectorAll('.mission-exile-pair');

        this.dayReportData.missionResults.forEach((result, index) => {
            const pair = missionPairs[index];
            if (!pair) return;

            // Animate panel in
            setTimeout(() => {
                if (!this.dayReportAnimationState.skipped) {
                    pair.classList.add('animate-in');

                    // Start EXP animation after panel appears
                    setTimeout(() => {
                        this.animateExpSequence(pair, result);
                    }, 100);
                }
            }, index * 150);
        });

        // Move to next step
        const totalDelay = this.dayReportData.missionResults.length * 150 + 500;
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.animateLootExplosion();
            }
        }, totalDelay);
    },



    animateExpSequence(missionPair, missionResult) {
        if (this.dayReportAnimationState.skipped) return;

        const expFill = missionPair.querySelector('.exile-exp-fill');
        const expLabel = missionPair.querySelector('.exile-exp-label');
        const levelDisplay = missionPair.querySelector('.exile-level');
        const exilePanel = missionPair.querySelector('.exile-info-side');

        if (!expFill) return;

        const startingExp = missionResult.exileProgression.startingExp;
        const expGained = missionResult.exileProgression.expGained;
        const leveledUp = missionResult.exileProgression.leveledUp;
        const finalLevel = missionResult.exileProgression.newLevel;
        const startingLevel = missionResult.exileProgression.startingLevel;

        // Only animate if EXP was actually gained
        if (expGained > 0) {
            setTimeout(() => {
                if (leveledUp) {
                    // Show level up immediately - no complex animation
                    exilePanel.classList.add('levelup-animate');
                    levelDisplay.textContent = `Level ${finalLevel}`;

                    // Show final EXP state after level up
                    const newExpNeeded = finalLevel * 100;
                    const remainingExp = (startingExp + expGained) % 100; // EXP left after leveling
                    const finalPercent = Math.min(100, Math.round((remainingExp / newExpNeeded) * 100));

                    expFill.style.width = `${finalPercent}%`;
                    expLabel.textContent = `${remainingExp} / ${newExpNeeded} EXP (+${expGained})`;
                } else {
                    // No level up - simple animation to final state
                    const finalExp = startingExp + expGained;
                    const expNeeded = startingLevel * 100;
                    const finalPercent = Math.min(100, Math.round((finalExp / expNeeded) * 100));

                    expFill.style.width = `${finalPercent}%`;
                    expLabel.textContent = `${finalExp} / ${expNeeded} EXP (+${expGained})`;
                }
            }, 200);
        }
    },
    // End of Exile Status Animation

    animateLootExplosion() {
        const container = document.getElementById('loot-container');

        // DEBUG: Check what's in loot data
        console.log("Loot Data Debug:", this.dayReportData.lootGained);

        const lootData = this.dayReportData.lootGained;
        let itemIndex = 0;

        // Gold
        if (lootData.gold > 0) {
            const goldItem = document.createElement('div');
            goldItem.className = 'loot-item gold';
            goldItem.innerHTML = `<span>💰</span><span>+${lootData.gold} Gold</span>`;
            container.appendChild(goldItem);
            this.animateLootPop(goldItem, itemIndex * 150);
            itemIndex++;
        }

        // Chaos Orbs
        if (lootData.chaosOrbs > 0) {
            const chaosItem = document.createElement('div');
            chaosItem.className = 'loot-item chaos';
            chaosItem.innerHTML = `<span>🌀</span><span>+${lootData.chaosOrbs} Chaotic Shard${lootData.chaosOrbs > 1 ? 's' : ''}</span>`;
            container.appendChild(chaosItem);
            this.animateLootPop(chaosItem, itemIndex * 150);
            itemIndex++;
        }

        // Exalted Orbs
        if (lootData.exaltedOrbs > 0) {
            const exaltedItem = document.createElement('div');
            exaltedItem.className = 'loot-item exalted';
            exaltedItem.innerHTML = `<span>⭐</span><span>+${lootData.exaltedOrbs} Exalted Orb${lootData.exaltedOrbs > 1 ? 's' : ''}</span>`;
            container.appendChild(exaltedItem);
            this.animateLootPop(exaltedItem, itemIndex * 150);
            itemIndex++;
        }

        // Items
        if (lootData.items && lootData.items.length > 0) {
            lootData.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'loot-item gear';

                // Get item rarity color
                const itemColor = rarityDB.getRarity(item.rarity)?.color || '#888';

                itemElement.innerHTML = `
            <span>⚔️</span>
            <span class="item-name-hover" 
                  style="color: ${itemColor}" 
                  data-item-tooltip='${JSON.stringify(item)}'>
                ${item.name}
                ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
            </span>
        `;

                container.appendChild(itemElement);
                this.animateLootPop(itemElement, itemIndex * 150);
                itemIndex++;
            });
        }

        // Show "No additional loot" if only gold
        if (lootData.chaosOrbs === 0 && lootData.exaltedOrbs === 0 && lootData.items.length === 0) {
            console.log("No currency or items found - only gold dropped");
        }

        // Move to discoveries after all loot animations
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.showDiscoveries();
            }
        }, itemIndex * 150 + 600);
    },

    // Satisfying pop animation
    animateLootPop(element, delay) {
        // Start invisible and small
        element.style.opacity = '0';
        element.style.transform = 'scale(0.5)';
        element.style.transition = 'none';

        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                // Phase 1: Pop in and overshoot (bounce effect)
                element.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'; // Bouncy easing
                element.style.opacity = '1';
                element.style.transform = 'scale(1.15)'; // Overshoot

                // Phase 2: Settle back to normal size
                setTimeout(() => {
                    element.style.transition = 'transform 0.2s ease-out';
                    element.style.transform = 'scale(1)';

                    // Optional: Add a subtle float effect
                    setTimeout(() => {
                        element.style.transition = 'transform 2s ease-in-out infinite alternate';
                        element.style.transform = 'translateY(-2px)';
                    }, 200);
                }, 300);
            } else {
                // Skip animation - just show immediately
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            }
        }, delay);
    },

    // Krangled Combination of Discoveries and Combat Details
    showDiscoveries() {
        let discoveryContent = '';

        // Handle mission/area discoveries
        if (this.dayReportData.discoveries.length > 0) {
            discoveryContent += this.dayReportData.discoveries.map(discovery => {
                if (discovery.type === 'mission') {
                    const missionData = getMissionData(discovery.areaId, discovery.missionId);
                    if (missionData) {
                        return `<div class="discovery-item mission-discovery">🔍 <strong>Mission Discovered:</strong> ${missionData.name}</div>`;
                    } else {
                        console.warn(`Mission data not found for ${discovery.areaId}.${discovery.missionId}`);
                        return `<div class="discovery-item mission-discovery">🔍 <strong>Mission Discovered:</strong> New mission in ${discovery.areaId}</div>`;
                    }
                } else if (discovery.type === 'connection') {
                    return `<div class="discovery-item connection-discovery">🗺️ <strong>Area Connection:</strong> Discovered passage to new area!</div>`;
                } else if (discovery.type === 'area') {
                    const areaData = getAreaData(discovery.areaId);
                    const areaName = areaData ? areaData.name : discovery.areaId;
                    return `<div class="discovery-item area-discovery">🌍 <strong>New Area Discovered:</strong> ${areaName}!</div>`;
                }
                return '';
            }).join('');
        }

        // Add scouting knowledge that was unlocked this day
        const newScoutingKnowledge = this.getNewScoutingKnowledgeUnlocked();
        if (newScoutingKnowledge.length > 0) {
            discoveryContent += newScoutingKnowledge.map(knowledge => `
                <div class="discovery-item scouting-knowledge ${knowledge.tag}">
                    <div class="scouting-threshold">Knowledge Unlocked (${knowledge.threshold} scouting)</div>
                    <div class="scouting-text">${knowledge.text}</div>
                </div>
            `).join('');
        }

        // Show discoveries section only if we have actual discoveries or new knowledge
        if (this.dayReportData.discoveries.length > 0 || newScoutingKnowledge.length > 0) {
            const section = document.getElementById('discovery-section');
            section.style.display = 'block';

            // Update section title and count
            section.querySelector('.section-toggle span:nth-child(2)').textContent = 'New Discoveries';

            const count = document.getElementById('discovery-count');
            const totalCount = this.dayReportData.discoveries.length + newScoutingKnowledge.length;
            count.textContent = totalCount;

            // Fill in discovery content
            const content = document.getElementById('discovery-content');
            content.innerHTML = discoveryContent;

            // Show content by default (not collapsed)
            content.style.display = 'block';
        } else {
            // Hide the section if there are no actual discoveries
            const section = document.getElementById('discovery-section');
            section.style.display = 'none';
        }

        // Populate combat details from mission results
        const detailedContent = document.getElementById('detailed-content');
        if (this.dayReportData.missionResults.length > 0) {
            detailedContent.innerHTML = this.dayReportData.missionResults.map((result, index) => {
                const combatDetails = result.combatDetails;
                const combatResult = result.combatResult;

                // Generate round-by-round damage log with breakdowns
                let roundByRoundHtml = '';
                if (combatDetails.damageLog && combatDetails.damageLog.length > 0) {
                    // Create the table header
                    roundByRoundHtml = `
                        <div class="combat-log-table">
                            <div class="combat-log-header">
                                <span class="col-round">Round</span>
                                <span class="col-damage-types">Unmitigated → Mitigated Damage</span>
                                <span class="col-total">Total Damage</span>
                                <span class="col-life">Life</span>
                            </div>
                    `;

                    // Add each round as a row
                    roundByRoundHtml += combatDetails.damageLog.map(log => {
                        // Build damage type cells
                        let damageTypeCells = '';
                        if (log.breakdown && log.breakdown.length > 0) {
                            damageTypeCells = log.breakdown.map(b => {
                                const typeClass = `element-${b.type.toLowerCase()}`;
                                const icon = this.getDamageTypeIcon(b.type);
                                return `
                                    <span class="damage-type-cell ${typeClass}">
                                        <span class="damage-icon">${icon}</span>
                                        <span class="damage-values">${Math.round(b.raw * 10) / 10} → ${Math.round(b.final * 10) / 10}</span>
                                    </span>
                                `;
                            }).join('');
                        }

                        return `
                            <div class="combat-log-row">
                                <span class="col-round">${log.round}</span>
                                <span class="col-damage-types">${damageTypeCells}</span>
                                <span class="col-total">${Math.round(log.rawDamage)} → ${Math.round(log.actualDamage * 10) / 10} total damage</span>
                                <span class="col-life">${Math.round(log.lifeRemaining)}</span>
                            </div>
                        `;
                    }).join('');

                    roundByRoundHtml += '</div>'; // Close the table
                }

                // Find the heaviest hit for summary
                let heaviestHitSummary = '';
                if (combatResult.heaviestHitBreakdown) {
                    const totalRaw = combatResult.heaviestHitBreakdown.reduce((sum, b) => sum + b.raw, 0);
                    const totalFinal = combatResult.heaviestHitBreakdown.reduce((sum, b) => sum + b.final, 0);

                    heaviestHitSummary = `
                        <div class="heaviest-hit-summary">
                            <strong>Heaviest Hit:</strong> ${Math.round(totalRaw)} → ${Math.round(totalFinal * 10) / 10} damage
                        </div>
                    `;
                }

                return `
                    <div class="combat-detail-section">
                        <h5>${result.missionContext.missionName} - Combat Analysis</h5>
                        <div class="combat-summary">
                            <div><strong>Power vs Difficulty:</strong> ${result.missionContext.powerRating} vs ${result.missionContext.difficulty}</div>
                            <div><strong>Win Chance per Round:</strong> ${Math.round(combatDetails.winChancePerRound * 100)}%</div>
                            <div><strong>Combat Duration:</strong> ${combatResult.rounds} rounds</div>
                            <div><strong>Total Damage Taken:</strong> ${Math.round(combatResult.totalDamageTaken)}</div>
                        </div>
                        
                        ${roundByRoundHtml ? `
                            <div class="round-by-round-section">
                                <h6>Round-by-Round Combat Log:</h6>
                                ${roundByRoundHtml}
                            </div>
                        ` : '<div class="no-combat-data">No detailed combat data available</div>'}
                        
                        ${heaviestHitSummary}
                    </div>
                `;
            }).join('');
        }
    },

    createMissionSummaryPanel(missionResult) {
        const container = document.createElement('div');
        container.className = `mission-exile-pair ${missionResult.combatResult.outcome}`;

        // Left side - Mission Info
        const missionPanel = document.createElement('div');
        missionPanel.className = 'mission-info-side';

        let resultIcon = '';
        let resultText = '';
        switch (missionResult.combatResult.outcome) {
            case 'victory':
                resultIcon = '✓';
                resultText = 'Success';
                break;
            case 'retreat':
                resultIcon = '↩';
                resultText = 'Retreated';
                break;
            case 'death':
                resultIcon = '☠';
                resultText = 'DIED';
                break;
        }

        missionPanel.innerHTML = `
            <div class="mission-name">${missionResult.missionContext.missionName}</div>
            <div class="mission-outcome">
                <span class="outcome-icon">${resultIcon}</span>
                <span class="outcome-text">${resultText}</span>
            </div>
            <div class="scouting-gained">+${missionResult.worldProgression.scoutingGain} scouting</div>
        `;

        // Right side - Exile Info
        const exilePanel = document.createElement('div');
        exilePanel.className = `exile-info-side ${missionResult.combatResult.outcome === 'death' ? 'dead' : ''}`;

        const exileName = gameState.exile.name;
        const startingLevel = missionResult.exileProgression.startingLevel;
        const healthPercent = missionResult.exileHealth.healthPercent;
        const remainingLife = missionResult.exileHealth.remainingLife;
        const totalLife = missionResult.exileHealth.startingLife;

        // Add these after the EXP variables:
        const startingExp = missionResult.exileProgression.startingExp;
        const startingExpNeeded = startingLevel * 100;
        const startingExpPercent = Math.min(100, Math.round((startingExp / startingExpNeeded) * 100));

        // Add morale variables:
        const moraleChange = missionResult.moraleChange;

        exilePanel.innerHTML = `
            <div class="exile-name-level">
                <span class="exile-name">${exileName}</span>
                <span class="exile-level">Level ${startingLevel}</span>
            </div>
            <div class="exile-health-container">
                <div class="health-bar">
                    <div class="health-fill" style="width: ${healthPercent}%"></div>
                    <span class="health-text">${Math.round(remainingLife)} / ${Math.round(totalLife)} Life</span>
                </div>
            </div>
            <div class="exile-exp-container">
                <div class="exile-exp-bar">
                    <div class="exile-exp-fill" style="width: ${startingExpPercent}%"></div>
                    <span class="exile-exp-label">${startingExp} / ${startingExpNeeded} EXP</span>
                </div>
            </div>
            <div class="morale-change-container">
            </div>
            <div class="morale-change-container">
                ${moraleChange ? `
                    <div class="morale-change ${moraleChange.change >= 0 ? 'positive' : 'negative'}">
                        <span class="morale-icon">${moraleChange.change >= 0 ? '🔥' : '😴'}</span>
                        <span class="morale-text">"${moraleChange.message}"</span>
                        <span class="morale-value">(${moraleChange.change >= 0 ? '+' : ''}${moraleChange.change} morale)</span>
                    </div>
                ` : '<div class="no-morale-change">No morale change</div>'}
            </div>
        `;

        container.appendChild(missionPanel);
        container.appendChild(exilePanel);

        return container;
    },
    // End of Day Report Modal Methods



    createWorldMapModal() {
        const modalHTML = `
        <div id="world-map-modal" class="world-map-overlay" style="display: none;" onclick="game.handleWorldMapClick(event)">
            <div class="world-map-content" onclick="event.stopPropagation()">
                <div class="world-map-header">
                    <h2>🗺️ World Map - Day <span id="world-map-day">${timeState.currentDay}</span></h2>
                    <button class="close-btn" onclick="game.closeWorldMap()">&times;</button>
                </div>
                
                <div class="world-map-body">
                    <!-- Areas Panel -->
                    <div class="world-areas-panel">
                        <h3 style="color: #c9aa71; margin-bottom: 15px;">Discovered Areas</h3>
                        <div id="world-areas-list">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                    
                    <!-- Mission Panel -->
                    <div class="world-mission-panel">
                        <div id="world-mission-content">
                            <div style="text-align: center; color: #666; margin-top: 50px;">
                                <h3>Select an area to view missions</h3>
                                <p>Choose an area from the left panel to see available missions and plan your expedition.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    handleWorldMapClick(event) {
        // Close if clicking the overlay (not the content)
        if (event.target.classList.contains('world-map-overlay')) {
            this.closeWorldMap();
        }
    },

    updateWorldMapDisplay() {
        // Update day display
        document.getElementById('world-map-day').textContent = timeState.currentDay;

        // Update areas list
        this.updateWorldAreasDisplay();
        // AUTO-SELECT FIRST AREA: Automatically select the first discovered area
        const discoveredAreas = getDiscoveredAreas();
        if (discoveredAreas.length > 0) {
            // Select the first area automatically
            setTimeout(() => {
                this.selectArea(discoveredAreas[0].id);
            }, 50); // Small delay to ensure DOM is updated
        } else {
            // Clear mission panel
            document.getElementById('world-mission-content').innerHTML = `
        <div style="text-align: center; color: #666; margin-top: 50px;">
            <h3>Select an area to view missions</h3>
            <p>Choose an area from the left panel to see available missions and plan your expedition.</p>
        </div>
    `;
        }
    },
    updateWorldAreasDisplay() {
        const areasContainer = document.getElementById('world-areas-list');
        const discoveredAreas = getDiscoveredAreas();

        areasContainer.innerHTML = discoveredAreas.map(area => {
            const areaState = gameState.worldState.areas[area.id];
            const availableMissions = getAvailableMissions(area.id);

            return `
            <div class="area-card" onclick="game.selectArea('${area.id}')">
                <div class="area-name">${area.name}</div>
                <div class="area-progress">Exploration: ${areaState.explorationProgress}%</div>
                <div class="area-missions-count">${availableMissions.length} missions available</div>
            </div>
        `;
        }).join('');
    },

    selectArea(areaId) {
        // Update selected area visual state
        document.querySelectorAll('.area-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Find and select the correct area card by areaId
        // This works for both click events and programmatic calls
        const areaCards = document.querySelectorAll('.area-card');
        areaCards.forEach(card => {
            // Check if this card's onclick contains the areaId we want
            const onclickAttr = card.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${areaId}'`)) {
                card.classList.add('selected');
            }
        });

        // Show missions for this area
        this.showAreaMissions(areaId);
    },

    showAreaMissions(areaId) {
        const areaData = getAreaData(areaId);
        const areaState = gameState.worldState.areas[areaId];

        if (!areaData || !areaState) return;

        // Get scouting info
        const unlockedScouting = getUnlockedScoutingInfo(areaId);
        const totalScoutingProgress = areaState.totalScoutingProgress || 0;

        // Get discovered missions
        const discoveredMissions = Object.entries(areaData.missions)
            .filter(([missionId, mission]) => {
                const missionState = areaState.missions[missionId];
                return missionState && missionState.discovered;
            })
            .map(([missionId, mission]) => ({
                ...mission,
                missionId: missionId,
                areaId: areaId
            }));

        const missionContent = document.getElementById('world-mission-content');

        if (discoveredMissions.length === 0) {
            missionContent.innerHTML = `
            <div style="text-align: center; color: #666; margin-top: 50px;">
                <h3>No missions discovered in ${areaData.name}</h3>
                <p>Complete missions to discover new opportunities in this area.</p>
            </div>
        `;
            return;
        }

        missionContent.innerHTML = `
        <div class="area-mission-layout">
            <!-- Left side: Area info and scouting -->
            <div class="area-info-panel">
                <h3 style="color: #c9aa71; margin-bottom: 15px;">${areaData.name}</h3>
                
                <div class="area-progress-section">
                    <h4>Area Progress</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${areaState.explorationProgress}%"></div>
                        <span class="progress-text">${areaState.explorationProgress}% Explored</span>
                    </div>
                    <div class="scouting-progress">
                        Scouting Knowledge: ${totalScoutingProgress}
                    </div>
                </div>

                <div class="scouting-info-section">
                    <h4>Area Knowledge</h4>
                    ${unlockedScouting.length === 0 ?
                '<div class="no-scouting">No detailed knowledge yet. Complete missions to learn more.</div>' :
                unlockedScouting.map(info => `
                            <div class="scouting-info-item ${info.tag}">
                                <div class="scouting-threshold">Learned at ${info.threshold} scouting</div>
                                <div class="scouting-text">${info.text}</div>
                            </div>
                        `).join('')
            }
                </div>
            </div>

            <!-- Right side: Missions -->
            <div class="missions-panel">
                <h4>Available Missions</h4>
                <div class="missions-grid">
                    ${discoveredMissions.map(mission => {
                const isAvailable = isMissionAvailable(areaId, mission.missionId);
                const daysUntil = getDaysUntilAvailable(areaId, mission.missionId);

                // Assign Mission from World Map: Check if any exile is assigned to this mission
                const isAssigned = gameState.assignments.some(a => a.areaId === areaId && a.missionId === mission.missionId);
                const assignedExile = gameState.assignments.find(a => a.areaId === areaId && a.missionId === mission.missionId);

                let buttonText = "Assign Mission";
                let buttonClass = "assign-mission-btn";
                let buttonDisabled = "";

                if (!isAvailable && daysUntil > 0) {
                    buttonText = `On Cooldown (${daysUntil} day${daysUntil > 1 ? 's' : ''})`;
                    buttonClass = "assign-mission-btn disabled";
                    buttonDisabled = "disabled";
                } else if (isAssigned) {
                    buttonText = `Assigned ✓ (${assignedExile.exileName})`;
                    buttonClass = "assign-mission-btn assigned";
                }

                return `
                            <div class="world-mission-card ${!isAvailable ? 'mission-on-cooldown' : ''}">
                                <div class="mission-header">
                                    <div class="mission-name">${mission.name}</div>
                                    <div class="mission-type ${mission.type}">${getMissionTypeData(mission.type).name}</div>
                                </div>
                                <div class="mission-description">${mission.description}</div>
                                <div class="mission-stats">
                                    <div class="stat">
                                        <strong>Difficulty:</strong><br>${mission.difficulty}
                                    </div>
                                    <div class="stat">
                                        <strong>Item Level:</strong><br>${mission.ilvl.min} - ${mission.ilvl.max}
                                    </div>
                                    <div class="stat">
                                        <strong>Gear Drop:</strong><br>${Math.round((mission.gearDrop?.baseChance || 0) * 100)}%
                                    </div>
                                </div>
                                <button class="${buttonClass}" ${buttonDisabled} 
                                        onclick="game.toggleMissionAssignment('${areaId}', '${mission.missionId}')">
                                    ${buttonText}
                                </button>
                            </div>
                        `;
            }).join('')}
                </div>
            </div>
        </div>
    `;
    },

    runMissionFromWorldMap(areaId, missionId) {
        // Run the mission
        this.runMission(`${areaId}.${missionId}`);

        // Close world map
        this.closeWorldMap();

        // Update displays
        this.updateCommandCenterDisplay();
    },

    // Update command center display on main screen
    updateCommandCenterDisplay() {
        // Update day displays
        document.getElementById('current-day-display').textContent = `(Day ${timeState.currentDay})`;
        document.getElementById('current-day-main').textContent = timeState.currentDay;

        // Update inventory count on main screen
        const inventoryCount = gameState.inventory.backpack.length;
        const countElement = document.getElementById('inventory-count-main');
        if (countElement) {
            countElement.textContent = `${inventoryCount}`;
        }
        // Update assignment status
        const assignedMissionsEl = document.getElementById('assigned-missions-count');
        const processBtn = document.querySelector('.process-day-btn');

        if (gameState.assignments.length > 0) {
            // Show assignment summary
            if (gameState.assignments.length === 1) {
                const assignment = gameState.assignments[0];
                const missionData = getMissionData(assignment.areaId, assignment.missionId);
                assignedMissionsEl.textContent = `${assignment.exileName} → ${missionData.name}`;
            } else {
                assignedMissionsEl.textContent = `${gameState.assignments.length} exiles assigned`;
            }
            processBtn.classList.add('has-assignments');
        } else {
            assignedMissionsEl.textContent = "No missions assigned";
            processBtn.classList.remove('has-assignments');
        }
    },

    // Process Day Method: Time passing and what occurs (triggering missions, etc.)
    processDay() {
        // Clear previous day's data and prepare for new day report (before adding this infinite data report stacking lol)
        this.dayReportData = {
            missionResults: [],
            exileUpdates: [],
            lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, items: [] },
            discoveries: [],
            combatDetails: []
        };

        // Check if any assignments exist
        if (gameState.assignments.length === 0) {
            this.log("⚠️ No assignments given! Assign exiles to missions before processing the day.", "failure");
            return; // Stop processing
        }

        // Process all assigned missions
        if (gameState.assignments.length > 0) {
            this.log(`🌅 Day ${timeState.currentDay + 1} begins...`, "info");

            // Run each assigned mission
            gameState.assignments.forEach(assignment => {
                const { exileName, areaId, missionId } = assignment;

                // Check if mission is still available (might have gone on cooldown)
                if (isMissionAvailable(areaId, missionId)) {
                    const missionData = getMissionData(areaId, missionId);
                    this.log(`⚔️ ${exileName} embarks on ${missionData.name}...`, "info");

                    // CAPTURE PRE-MISSION STATE for reward tracking
                    const preMissionResources = {
                        gold: gameState.resources.gold,
                        chaosOrbs: gameState.resources.chaosOrbs,
                        exaltedOrbs: gameState.resources.exaltedOrbs
                    };
                    const preMissionInventoryCount = gameState.inventory.backpack.length;

                    // Run the assigned mission
                    const missionResult = this.runMission(`${areaId}.${missionId}`);

                    // CALCULATE ACTUAL REWARDS from game state changes
                    const actualRewards = {
                        gold: gameState.resources.gold - preMissionResources.gold,
                        chaosOrbs: gameState.resources.chaosOrbs - preMissionResources.chaosOrbs,
                        exaltedOrbs: gameState.resources.exaltedOrbs - preMissionResources.exaltedOrbs,
                        gearFound: gameState.inventory.backpack.length > preMissionInventoryCount ?
                            gameState.inventory.backpack[gameState.inventory.backpack.length - 1] : null
                    };

                    // DEBUG: Compare returned vs actual rewards
                    console.log("Returned rewards:", missionResult.rewards);
                    console.log("Actual game state rewards:", actualRewards);

                    // Update mission result with ACTUAL rewards
                    missionResult.rewards = actualRewards;

                    // Collect comprehensive mission result for day report
                    this.dayReportData.missionResults.push(missionResult);

                    // Also accumulate total loot for loot explosion using ACTUAL rewards
                    this.dayReportData.lootGained.gold += actualRewards.gold;
                    this.dayReportData.lootGained.chaosOrbs += actualRewards.chaosOrbs;
                    this.dayReportData.lootGained.exaltedOrbs += actualRewards.exaltedOrbs;
                    if (actualRewards.gearFound) {
                        this.dayReportData.lootGained.items.push(actualRewards.gearFound);
                    }

                    // Collect discoveries
                    this.dayReportData.discoveries.push(...missionResult.worldProgression.discoveries);

                    // Check if mission went on cooldown - if so, unassign
                    if (!isMissionAvailable(areaId, missionId)) {
                        this.log(`📋 Mission went on cooldown - ${exileName} unassigned`, "info");
                        // Remove this assignment from the array
                        const assignmentIndex = gameState.assignments.findIndex(a =>
                            a.exileName === exileName && a.areaId === areaId && a.missionId === missionId
                        );
                        if (assignmentIndex !== -1) {
                            gameState.assignments.splice(assignmentIndex, 1);
                        }
                    }
                } else {
                    const missionData = getMissionData(areaId, missionId);
                    this.log(`📋 ${missionData.name} unavailable - ${exileName} unassigned`, "info");
                    // Remove this assignment from the array
                    const assignmentIndex = gameState.assignments.findIndex(a =>
                        a.exileName === exileName && a.areaId === areaId && a.missionId === missionId
                    );
                    if (assignmentIndex !== -1) {
                        gameState.assignments.splice(assignmentIndex, 1);
                    }
                }
            });
        } else {
            this.log("⏳ Time passes... No missions assigned.", "info");
        }

        // Advance time
        timeState.currentDay++;

        // Update all displays
        this.updateCommandCenterDisplay();

        // Check for missions coming off cooldown
        let missionsBackOnline = 0;
        Object.keys(gameState.worldState.areas).forEach(areaId => {
            const areaState = gameState.worldState.areas[areaId];
            Object.keys(areaState.missions).forEach(missionId => {
                const missionState = areaState.missions[missionId];
                if (missionState.availableAgainOnDay && timeState.currentDay >= missionState.availableAgainOnDay) {
                    missionState.availableAgainOnDay = null;
                    missionsBackOnline++;
                }
            });
        });

        if (missionsBackOnline > 0) {
            this.log(`⏰ ${missionsBackOnline} mission(s) are no longer on cooldown`, "info");
        }

        this.saveGame(); // saves the game state after processing the day
        this.openDayReport();  // Open the day report after processing the day
    },
    // end of processDay method ===


    // === ASSIGNMENT SYSTEM METHODS ===
    assignMissionToExile(exileName, areaId, missionId) {
        // Check if mission is available
        if (!isMissionAvailable(areaId, missionId)) {
            this.log("Cannot assign to unavailable mission!", "failure");
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
        this.log(`📋 ${exileName} assigned to ${missionData.name}`, "info");

        // Update displays
        this.updateCommandCenterDisplay();
        this.updateWorldMapDisplay();
        this.saveGame();

        return true;
    },

    unassignExile(exileName) {
        const assignmentIndex = gameState.assignments.findIndex(a => a.exileName === exileName);

        if (assignmentIndex === -1) {
            this.log(`${exileName} is not assigned to any mission`, "info");
            return false;
        }

        // Remove assignment
        gameState.assignments.splice(assignmentIndex, 1);
        this.log(`📋 ${exileName} unassigned from mission`, "info");

        // Update displays
        this.updateCommandCenterDisplay();
        this.updateWorldMapDisplay();
        this.saveGame();

        return true;
    },

    getExileAssignment(exileName) {
        return gameState.assignments.find(a => a.exileName === exileName) || null;
    },

    isExileAssigned(exileName, areaId, missionId) {
        const assignment = this.getExileAssignment(exileName);
        return assignment && assignment.areaId === areaId && assignment.missionId === missionId;
    },

    // Mission Assignment Toggle
    toggleMissionAssignment(areaId, missionId) {
        // Check if mission is already assigned
        const assignment = gameState.assignments.find(a => a.areaId === areaId && a.missionId === missionId);

        if (assignment) {
            // Unassign the exile
            this.unassignExile(assignment.exileName);
        } else {
            // Assign our main exile (for now - later we'll add exile selection)
            this.assignMissionToExile(gameState.exile.name, areaId, missionId);
        }

        // Update world map display
        this.updateWorldMapDisplay();
    },
    // end of Assignment System Methods ===

    // Day report data collection
    dayReportData: {
        missionResults: [],
        exileUpdates: [],
        lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, items: [] },
        discoveries: [],
        combatDetails: []
    },


    // Detect New Scouting Knowledge Unlocks
    getNewScoutingKnowledgeUnlocked() {
        const newKnowledge = [];

        // Check each mission result for scouting gains
        this.dayReportData.missionResults.forEach(result => {
            const areaId = result.missionContext.areaId;
            const scoutingGained = result.worldProgression.scoutingGain;

            if (scoutingGained > 0) {
                const areaData = getAreaData(areaId);
                const areaState = gameState.worldState.areas[areaId];

                if (areaData && areaState) {
                    const currentScouting = areaState.totalScoutingProgress || 0;
                    const previousScouting = currentScouting - scoutingGained;

                    // Check which scouting info thresholds we crossed today
                    areaData.scoutingInfo.forEach((info, index) => {
                        if (previousScouting < info.threshold && currentScouting >= info.threshold) {
                            newKnowledge.push({
                                text: info.text,
                                tag: info.tag,
                                threshold: info.threshold,
                                areaId: areaId
                            });
                        }
                    });
                }
            }
        });

        return newKnowledge;
    },


    // Item Tooltips Method
    initializeItemTooltips() {
        // Add event listeners for item tooltips
        document.addEventListener('mouseover', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.showItemTooltip(event.target, event);
            }
        });

        document.addEventListener('mouseout', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.hideItemTooltip();
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.updateTooltipPosition(event);
            }
        });
    },

    showItemTooltip(element, event) {
        // Remove any existing tooltip
        this.hideItemTooltip();

        try {
            const item = JSON.parse(element.getAttribute('data-item-tooltip'));

            const tooltip = document.createElement('div');
            tooltip.id = 'item-tooltip';
            tooltip.className = 'item-tooltip';

            // Get item color
            const itemColor = rarityDB.getRarity(item.rarity)?.color || '#888';

            tooltip.innerHTML = `
            <div class="tooltip-item-name" style="color: ${itemColor}">
                ${item.name}
                ${item.isOvercapped ? '<span class="overcapped-icon">✦</span>' : ''}
            </div>
            <div class="tooltip-item-type">${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</div>
            <div class="tooltip-item-ilvl">Item Level: ${item.ilvl}</div>
            <div class="tooltip-item-stats">
                ${this.formatItemStatsForTooltip(item)}
            </div>
        `;

            document.body.appendChild(tooltip);
            this.updateTooltipPosition(event);
        } catch (e) {
            console.error('Error showing item tooltip:', e);
        }
    },

    hideItemTooltip() {
        const existingTooltip = document.getElementById('item-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    },

    updateTooltipPosition(event) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;

        const x = event.clientX + 10;
        const y = event.clientY + 10;

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    formatItemStatsForTooltip(item) {
        let html = '';

        if (item.slot === 'weapon' && item.attackSpeed) {
            html += '<div class="tooltip-weapon-stats">';
            html += `Attack Speed: ${item.attackSpeed.toFixed(2)}`;
            html += '</div>';
            html += '<div class="stat-divider"></div>'; // Visual separator
        }

        // Get effective damage values for weapons
        const effectiveDamage = this.getEffectiveDamageValues(item);

        // Display implicit stats first with special styling
        if (item.implicitStats && Object.keys(item.implicitStats).length > 0) {
            const implicitStats = Object.entries(item.implicitStats);
            html += '<div class="tooltip-implicit-stats">';
            html += implicitStats.map(([stat, value]) => {
                const statName = this.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.implicitDamage;
                    if (effectiveValue !== value) {
                        return `+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span>`;
                    }
                }

                return `+${value} ${statName}`;
            }).join('<br>');
            html += '</div>';
            html += '<div class="stat-divider"></div>'; // Visual separator
        }

        // Display regular stats
        const stats = Object.entries(item.stats || {});
        if (stats.length > 0) {
            html += '<div class="tooltip-regular-stats">';
            html += stats.map(([stat, value]) => {
                const statName = this.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.rolledDamage;
                    if (effectiveValue !== value) {
                        return `+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span>`;
                    }
                }

                return `+${value} ${statName}`;
            }).join('<br>');
            html += '</div>';
        }

        return html;
    },

    // Helper function to calculate effective damage values for weapons
    getEffectiveDamageValues(item) {
        if (item.slot !== 'weapon' || !item.damageMultiplier) {
            return null; // Not a weapon or no multiplier
        }

        const implicitDamage = (item.implicitStats?.damage || 0);
        const rolledDamage = (item.stats?.damage || 0);

        return {
            implicitDamage: Math.floor(implicitDamage * item.damageMultiplier),
            rolledDamage: Math.floor(rolledDamage * item.damageMultiplier),
            originalImplicitDamage: implicitDamage,
            originalRolledDamage: rolledDamage,
            multiplier: item.damageMultiplier
        };
    },

};
// END OF GAME OBJECT =====================

window.game = game;
