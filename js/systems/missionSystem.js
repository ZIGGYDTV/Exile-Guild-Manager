// Mission System
// Handles mission execution, rewards, and world progression

class MissionSystem {
    constructor() {
        console.log("Mission system initialized");
    }

    runMission(missionKey) {
        const [areaId, missionId] = missionKey.split('.');

        if (!areaId || !missionId) {
            uiSystem.log("Invalid mission format!", "failure");
            return;
        }

        let moraleResult = null;

        if (!isMissionAvailable(areaId, missionId)) {
            const daysUntil = getDaysUntilAvailable(areaId, missionId);
            if (daysUntil > 0) {
                uiSystem.log(`Mission on cooldown for ${daysUntil} more days!`, "failure");
            } else {
                uiSystem.log("Mission not discovered yet!", "failure");
            }
            return;
        }

        const exile = gameState.exile;
        const missionData = getCompleteMissionData(areaId, missionId);

        // capture level before any changes
        const levelBeforeMission = exile.level;

        if (!missionData) {
            uiSystem.log("Mission data not found!", "failure");
            return;
        }

        uiSystem.log(`🗺️ ${exile.name} embarks on ${missionData.name}...`, "info");

        // Combat using new world system
        const combatResult = combatSystem.simulateCombat(exile, missionData);

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
                uiSystem.log(`🎁 Bonus rewards${orbMessage}!`, "legendary");
            }

            // Check for gear drop using world system
            if (Math.random() < (missionData.gearDrop?.baseChance || 0)) {
                // Generate gear with world system ilvl
                const ilvlRange = missionData.ilvl;
                const gearIlvl = game.randomBetween(ilvlRange.min, ilvlRange.max);

                // Use updated generateGear method
                const newGear = this.generateGear(areaId, missionId, gearIlvl);
                gameState.inventory.backpack.push(newGear);
                uiSystem.log(`⭐ Found ${newGear.name}!`, newGear.rarity === 'rare' ? 'legendary' : 'success');
            }

            game.checkLevelUp();

            // Calculate and apply morale change (preserve existing system)
            if (combatResult.outcome !== 'death') {
                moraleResult = exileSystem.calculateMoraleChange(combatResult, exile);

                if (moraleResult.change !== 0) {
                    gameState.exile.morale = Math.max(0, Math.min(100, gameState.exile.morale + moraleResult.change));
                    const moraleIcon = moraleResult.change > 0 ? "🔥" : "😴";
                    const moraleText = moraleResult.change > 0 ? `(+${moraleResult.change} morale)` : `(${moraleResult.change} morale)`;
                    moraleHtml = `<br><span style="font-size:0.65em; color:#aaa;">${moraleIcon} ${exile.name}: "${moraleResult.message}" ${moraleText}</span>`;
                }
            }
        } else if (combatResult.outcome === 'death') {
            // Don't call gameOver() - let the day report handle death display
            // game.gameOver(); // DISABLED
            // Still continue to process the death and return data
        }

        let mainMessage = "";
        let breakdownHtml = "";

        // Build the main message for each outcome (preserve existing logic)
        if (combatResult.outcome === 'victory') {
            mainMessage = `✓ ${missionData.name} cleared! +${goldEarned} gold, +${expEarned} exp`;
        } else if (combatResult.outcome === 'death') {
            mainMessage = combatSystem.generateDeathMessage(combatResult);
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
                        uiSystem.log(`🔍 Discovered: ${newMission.name}!`, "legendary");
                    } else {
                        uiSystem.log(`🔍 Discovered: New mission in ${discovery.areaId}!`, "legendary");
                    }
                } else if (discovery.type === 'connection') {
                    uiSystem.log(`🗺️ Discovered passage to new area!`, "legendary");
                }
            });
        }

        // Log scouting progress (new world system feature)
        if (completionResult.scoutingGain > 0) {
            uiSystem.log(`📖 Gained ${completionResult.scoutingGain} scouting knowledge about the area`, "info");
        }

        // Combine and log as a single entry (preserve existing detailed logging)
        if (mainMessage) {
            uiSystem.log(
                `${mainMessage}${breakdownHtml ? "<br>" + breakdownHtml : ""}${moraleHtml || ""}`,
                combatResult.outcome === 'victory' ? "success" : "failure",
                true // isHtml
            );
        }

        uiSystem.updateDisplay();
        game.saveGame();

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
                powerRating: combatSystem.calculatePowerRating(exile)
            },

            // Detailed combat log (for expandable section)
            combatDetails: {
                damageLog: combatResult.damageLog,
                heaviestHitBreakdown: combatResult.heaviestHitBreakdown,
                winChancePerRound: combatResult.winChancePerRound // Changed from the incorrect calculation
            }
        };
    }

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
            id: newItem.id,
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
    }

    // Process Day Method: Time passing and what occurs (triggering missions, etc.)
    processDay() {
        // Clear previous day's data and prepare for new day report (before adding this infinite data report stacking lol)
        game.dayReportData = {
            missionResults: [],
            exileUpdates: [],
            lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, items: [] },
            discoveries: [],
            combatDetails: []
        };

        // Check if any assignments exist
        if (gameState.assignments.length === 0) {
            uiSystem.log("⚠️ No assignments given! Assign exiles to missions before processing the day.", "failure");
            return; // Stop processing
        }

        // Process all assigned missions
        if (gameState.assignments.length > 0) {
            uiSystem.log(`🌅 Day ${timeState.currentDay + 1} begins...`, "info");

            // Run each assigned mission
            gameState.assignments.forEach(assignment => {
                const { exileName, areaId, missionId } = assignment;

                // Check if mission is still available (might have gone on cooldown)
                if (isMissionAvailable(areaId, missionId)) {
                    const missionData = getMissionData(areaId, missionId);
                    uiSystem.log(`⚔️ ${exileName} embarks on ${missionData.name}...`, "info");

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
                    game.dayReportData.missionResults.push(missionResult);

                    // Also accumulate total loot for loot explosion using ACTUAL rewards
                    game.dayReportData.lootGained.gold += actualRewards.gold;
                    game.dayReportData.lootGained.chaosOrbs += actualRewards.chaosOrbs;
                    game.dayReportData.lootGained.exaltedOrbs += actualRewards.exaltedOrbs;
                    if (actualRewards.gearFound) {
                        game.dayReportData.lootGained.items.push(actualRewards.gearFound);
                    }

                    // Collect discoveries
                    game.dayReportData.discoveries.push(...missionResult.worldProgression.discoveries);

                    // Check if mission went on cooldown - if so, unassign
                    if (!isMissionAvailable(areaId, missionId)) {
                        uiSystem.log(`📋 Mission went on cooldown - ${exileName} unassigned`, "info");
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
                    uiSystem.log(`📋 ${missionData.name} unavailable - ${exileName} unassigned`, "info");
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
            uiSystem.log("⏳ Time passes... No missions assigned.", "info");
        }

        // Advance time
        timeState.currentDay++;


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
            uiSystem.log(`⏰ ${missionsBackOnline} mission(s) are no longer on cooldown`, "info");
        }

        game.saveGame(); // saves the game state after processing the day
        game.openDayReport();  // Open the day report after processing the day
    }

    runMissionFromWorldMap(areaId, missionId) {
        // Run the mission
        this.runMission(`${areaId}.${missionId}`);

        // Close world map
                    worldMapSystem.closeWorldMap();
    }

    // Mission Assignment Toggle
    toggleMissionAssignment(areaId, missionId) {
        // Check if mission is already assigned
        const assignment = gameState.assignments.find(a => a.areaId === areaId && a.missionId === missionId);

        if (assignment) {
            // Unassign the exile
            exileSystem.unassignExile(assignment.exileName);
        } else {
            // Assign our main exile (for now - later we'll add exile selection)
            exileSystem.assignMissionToExile(gameState.exile.name, areaId, missionId);
        }

        // Update world map display
        worldMapSystem.updateWorldMapDisplay();
    }
}

const missionSystem = new MissionSystem();
export { missionSystem };