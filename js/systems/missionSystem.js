// Mission System
// Handles mission execution, rewards, and world progression

class MissionSystem {
    constructor() {
        console.log("Mission system initialized");
    }

    deployExileOnMission(exileId, areaId, missionId) {
        // Make sure MissionState is available
        if (typeof MissionState === 'undefined') {
            console.error("MissionState not loaded yet!");
            return;
        }

        const missionData = getCompleteMissionData(areaId, missionId);
        const missionInstance = worldState.areas[areaId].missions[missionId].currentInstance;

        if (!missionInstance) {
            console.error("No mission instance found!");
            return;
        }

        // Create the mission state - use window.MissionState if needed
        const missionState = new (window.MissionState || MissionState)(missionData, exileId);

        // Generate actual monster instances for each encounter
        missionInstance.encounters.forEach((encData, index) => {
            const monster = monsterSpawnSystem.spawnMonster(
                encData.monsterId,
                areaId,
                missionId,
                encData.elite
            );
            const encounter = new Encounter(monster, index + 1, missionInstance.encounters.length);
            missionState.encounters.push(encounter);
        });

        // Add to active missions
        turnState.activeMissions.push({
            exileId: exileId,
            areaId: areaId,
            missionId: missionId,
            missionState: missionState
        });

        // Update exile status
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (exile) {
            exile.status = 'in_mission';
            exile.currentMission = { areaId, missionId };
        }
    }

    runMission(missionKey, exileId = null) {
        const [areaId, missionId] = missionKey.split('.');

        if (!areaId || !missionId) {
            uiSystem.log("Invalid mission format!", "failure");
            return;
        }

        // Get the exile - either passed in or currently selected
        const exile = exileId ?
            gameState.exiles.find(e => e.id === exileId) :
            getCurrentExile();

        if (!exile) {
            uiSystem.log("No exile found!", "failure");
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
            rewards = calculateCompleteMissionRewards(areaId, missionId, combatResult.outcome);

            goldEarned = rewards.gold;
            expEarned = rewards.experience;

            // Apply gold find bonus (preserve existing mechanic)
            const goldFindMultiplier = 1 + (exile.stats.goldFindBonus || 0) / 100;
            goldEarned = Math.floor(goldEarned * goldFindMultiplier);

            // Apply rewards to game state
            gameState.resources.gold += goldEarned;
            gameState.resources.chaosOrbs += rewards.chaosOrbs;
            gameState.resources.exaltedOrbs += rewards.exaltedOrbs;
            exile.experience += expEarned;  // Update the specific exile's experience

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
                newGear = this.generateGear(areaId, missionId, gearIlvl);
                gameState.inventory.items.push(newGear);  // Use items instead of backpack

                // Update inventory grid if it exists
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.gridContainer) {
                    inventoryGridManager.addNewItemToInventory(newGear);
                }

                uiSystem.log(`⭐ Found ${newGear.name}!`, newGear.rarity === 'rare' ? 'legendary' : 'success');
            }

            game.checkLevelUp(exile);  // Pass the specific exile

            // Calculate and apply morale change (preserve existing system)
            if (combatResult.outcome !== 'death') {
                moraleResult = exileSystem.calculateMoraleChange(combatResult, exile);

                if (moraleResult.change !== 0) {
                    exile.morale = Math.max(0, Math.min(100, exile.morale + moraleResult.change));
                    const moraleIcon = moraleResult.change > 0 ? "🔥" : "😴";
                    const moraleText = moraleResult.change > 0 ? `(+${moraleResult.change} morale)` : `(${moraleResult.change} morale)`;
                    moraleHtml = `<br><span style="font-size:0.65em; color:#aaa;">${moraleIcon} ${exile.name}: "${moraleResult.message}" ${moraleText}</span>`;
                }
            }
        } else if (combatResult.outcome === 'death') {
            // Handle exile death
            exileSystem.handleExileDeath(exile.id);
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
            type: newItem.name,  // Add the base item type (Sword, Axe, etc.)
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
        // Clear previous day's data
        game.dayReportData = {
            missionResults: [],
            exileUpdates: [],
            lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, items: [] },
            discoveries: [],
            combatDetails: []
        };

        // Check if any assignments exist
        if (!turnState.assignments || turnState.assignments.length === 0) {
            uiSystem.log("⚠️ No assignments given! Assign exiles to missions before processing the day.", "failure");
            return;
        }

        // Process all assigned missions
        uiSystem.log(`🌅 Day ${turnState.currentTurn + 1} begins...`, "info");

        // Track assignments to remove (avoid modifying array while iterating)
        const assignmentsToRemove = [];

        // Run each assigned mission
        turnState.assignments.forEach((assignment, index) => {
            const { exileId, areaId, missionId } = assignment;

            // Find the exile
            const exile = gameState.exiles.find(e => e.id === exileId);
            if (!exile || exile.status === 'dead') {
                console.log(`Exile ${exileId} not found or dead, skipping assignment`);
                assignmentsToRemove.push(index);
                return;
            }

            // Check if mission is still available
            if (isMissionAvailable(areaId, missionId)) {
                const missionData = getMissionData(areaId, missionId);
                uiSystem.log(`⚔️ ${exile.name} embarks on ${missionData.name}...`, "info");

                // CAPTURE PRE-MISSION STATE
                const preMissionResources = {
                    gold: gameState.resources.gold,
                    chaosOrbs: gameState.resources.chaosOrbs,
                    exaltedOrbs: gameState.resources.exaltedOrbs
                };
                const preMissionInventoryCount = gameState.inventory.items.length;

                // Run the mission with the specific exile
                const missionResult = this.runMission(`${areaId}.${missionId}`, exileId);

                if (missionResult) {
                    // CALCULATE ACTUAL REWARDS from game state changes
                    const actualRewards = {
                        gold: gameState.resources.gold - preMissionResources.gold,
                        chaosOrbs: gameState.resources.chaosOrbs - preMissionResources.chaosOrbs,
                        exaltedOrbs: gameState.resources.exaltedOrbs - preMissionResources.exaltedOrbs,
                        gearFound: gameState.inventory.items.length > preMissionInventoryCount ?
                            gameState.inventory.items[gameState.inventory.items.length - 1] : null
                    };

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
                }

                // Check if mission went on cooldown - if so, mark for removal
                if (!isMissionAvailable(areaId, missionId)) {
                    uiSystem.log(`📋 Mission went on cooldown - ${exile.name} unassigned`, "info");
                    assignmentsToRemove.push(index);
                }
            } else {
                const missionData = getMissionData(areaId, missionId);
                uiSystem.log(`📋 ${missionData.name} unavailable - ${exile.name} unassigned`, "info");
                assignmentsToRemove.push(index);
            }
        });

        // Remove assignments that are no longer valid (in reverse order to maintain indices)
        assignmentsToRemove.sort((a, b) => b - a).forEach(index => {
            const assignment = turnState.assignments[index];
            const exile = gameState.exiles.find(e => e.id === assignment.exileId);
            if (exile) exile.status = 'idle';
            turnState.assignments.splice(index, 1);
        });

        // Advance time
        turnState.currentTurn++;

        // Check for missions coming off cooldown
        let missionsBackOnline = 0;
        Object.keys(worldState.areas).forEach(areaId => {
            const areaState = worldState.areas[areaId];
            Object.keys(areaState.missions).forEach(missionId => {
                const missionState = areaState.missions[missionId];
                if (missionState.availableAgainOnDay && turnState.currentTurn >= missionState.availableAgainOnDay) {
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
        // Initialize assignments if needed
        if (!turnState.assignments) {
            turnState.assignments = [];
        }

        const assignment = turnState.assignments.find(a => a.areaId === areaId && a.missionId === missionId);

        if (assignment) {
            // Unassign the exile
            const exile = gameState.exiles.find(e => e.id === assignment.exileId);
            if (exile) exile.status = 'idle';
            // Remove assignment
            turnState.assignments = turnState.assignments.filter(a => a !== assignment);
        } else {
            // Assign selected exile
            const exile = getCurrentExile();
            if (!exile) {
                uiSystem.log("No exile selected!", "failure");
                return;
            }

            exile.status = 'assigned';
            turnState.assignments.push({
                exileId: exile.id,
                areaId: areaId,
                missionId: missionId
            });
        }

        // Update displays
        if (typeof worldMapSystem !== 'undefined') {
            worldMapSystem.updateWorldMapDisplay();
        }
    }

    // Inside the MissionSystem class, add these methods:

    // Process one turn for an active mission
    processMissionTurn(exileId) {
        // Find the active mission for this exile
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) {
            console.error("No active mission for exile:", exileId);
            return null;
        }

        const { missionState } = activeMission;
        const exile = gameState.exiles.find(e => e.id === exileId);
        const currentEncounter = missionState.getCurrentEncounter();

        if (!currentEncounter || !exile) {
            console.error("Invalid mission state");
            return null;
        }

        // Run combat for this turn (5 rounds)
        const turnResult = turnBasedCombat.simulateTurn(exile, currentEncounter);

        // Store the result in mission log
        missionState.combatLog.push({
            encounter: currentEncounter.encounterNumber,
            turn: currentEncounter.turnsElapsed,
            result: turnResult
        });

        // Handle outcomes
        if (turnResult.outcome === 'victory' || turnResult.outcome === 'culled') {
            return this.handleEncounterVictory(activeMission, turnResult);
        } else if (turnResult.outcome === 'death') {
            return this.handleExileDeath(activeMission, turnResult);
        } else {
            // Combat continues - present choices to player
            return {
                type: 'decision_needed',
                exileId: exileId,
                choices: this.getAvailableChoices(exile, currentEncounter, turnResult),
                turnResult: turnResult
            };
        }
    }

    // Handle encounter victory
    handleEncounterVictory(activeMission, turnResult) {
        const { missionState, exileId } = activeMission;
        const encounter = missionState.getCurrentEncounter();

        // Generate loot for this monster
        const loot = this.generateMonsterLoot(encounter.monster);
        if (loot) {
            missionState.addLoot(loot);
        }

        // Add gold/exp to pool
        const goldDrop = Math.floor(encounter.monster.xpValue * 2); // Simple formula
        missionState.addCurrency(goldDrop, 0, 0);
        missionState.totalExperience += encounter.monster.xpValue;

        // Update encounter status
        encounter.status = 'victory';

        // Check if more encounters remain
        const nextEncounter = missionState.nextEncounter();

        if (nextEncounter) {
            // More encounters - allow safe retreat or continue
            return {
                type: 'encounter_complete',
                exileId: exileId,
                loot: loot,
                gold: goldDrop,
                hasNextEncounter: true,
                nextEncounter: nextEncounter.getDescription()
            };
        } else {
            // Mission complete!
            return this.completeMissionSuccess(activeMission);
        }
    }

    // Get available choices after a turn
    getAvailableChoices(exile, encounter, turnResult) {
        const choices = [];

        // Always can continue fighting or retreat
        choices.push({
            id: 'continue',
            label: 'Continue Fighting',
            description: 'Attack for another 5 rounds'
        });

        choices.push({
            id: 'retreat',
            label: 'Combat Retreat',
            description: 'Flee with injuries and lose some loot',
            warning: true
        });

        // Add flask option if available and needed
        if (exile.flask && exile.flask.charges > 0 &&
            exile.currentLife < exile.stats.life * 0.7) {
            choices.push({
                id: 'use_flask',
                label: `Use ${exile.flask.name}`,
                description: `Restore ${exile.flask.healing} life (${exile.flask.charges} charges left)`
            });
        }

        return choices;
    }

    // Process player's decision
    processDecision(exileId, decision) {
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) return null;

        const exile = gameState.exiles.find(e => e.id === exileId);

        switch (decision) {
            case 'continue':
                // Just process next turn
                return this.processMissionTurn(exileId);

            case 'retreat':
                return this.handleCombatRetreat(activeMission);

            case 'use_flask':
                this.useFlask(exile);
                // Then continue to next turn
                return this.processMissionTurn(exileId);

            case 'safe_retreat':
                // Between encounters - no penalty
                return this.completeMissionRetreat(activeMission, false);

            case 'next_encounter':
                // Move to next encounter
                return {
                    type: 'encounter_started',
                    exileId: exileId,
                    encounter: activeMission.missionState.getCurrentEncounter().getDescription()
                };
        }
    }

    // Generate loot from a monster (simplified for now)
    generateMonsterLoot(monster) {
        // Use monster's drop chance
        if (Math.random() > (monster.drops?.dropChance || 0.1)) {
            return null;
        }

        // Generate item based on monster's ilvl
        // This would use your existing gear generation
        return {
            name: "Placeholder Item",
            // ... generate real item
        };
    }

    // Add this method to MissionSystem class:
    completeMissionSuccess(activeMission) {
        const { missionState, exileId, areaId, missionId } = activeMission;

        // Apply all accumulated rewards
        const rewards = missionState.applyRewards();

        // Update mission completion in world state
        completeMission(areaId, missionId, 'victory');

        // Remove from active missions
        turnState.activeMissions = turnState.activeMissions.filter(m => m.exileId !== exileId);

        // Update exile status
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (exile) {
            exile.status = 'idle';
            exile.currentMission = null;
        }

        // Log success
        uiSystem.log(`${exile.name} completed ${missionState.missionData.name}! Earned ${rewards.gold} gold, ${rewards.experience} exp`, "success");

        return {
            type: 'mission_complete',
            exileId: exileId,
            rewards: rewards
        };
    }
}


const missionSystem = new MissionSystem();
export { missionSystem };