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
            gameState.resources.food = (gameState.resources.food || 0) + rewards.food;
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
                moraleResult = moraleSystem.calculateMoraleChange(combatResult, exile);

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
                food: rewards ? rewards.food : 0,
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

        // Determine ilvl: use targetIlvl if provided, otherwise roll from missionData.ilvl if it's a range
        let ilvl = targetIlvl;
        if (ilvl == null) {
            if (missionData.ilvl && typeof missionData.ilvl === 'object' && missionData.ilvl.min !== undefined && missionData.ilvl.max !== undefined) {
                ilvl = Math.floor(Math.random() * (missionData.ilvl.max - missionData.ilvl.min + 1)) + missionData.ilvl.min;
            } else if (typeof missionData.ilvl === 'number') {
                ilvl = missionData.ilvl;
            } else {
                ilvl = 1; // fallback
            }
        }

        // Generate item with new system
        const options = {
            targetIlvl: ilvl,
            missionThemes: missionData.themes || [],
            difficultyBonus: missionData.difficulty || 0,
        };

        // Check for mission-specific gear type overrides
        if (missionData.gearDrop?.gearTypeOverrides) {
            options.slotWeights = missionData.gearDrop.gearTypeOverrides;
        }

        // Generate the item using new system
        const newItem = itemDB.generateItem(options);
        if (!newItem) return null;
        newItem.ilvl = ilvl; // Ensure ilvl matches the rolled/generated value

        // Convert to saveable format
        return {
            id: newItem.id,
            name: newItem.getDisplayName(),
            slot: newItem.slot,
            type: newItem.category || newItem.slot,
            rarity: newItem.rarity?.name?.toLowerCase() || 'common',
            ilvl: newItem.ilvl,
            icon: newItem.icon,
            description: newItem.description,
            attackSpeed: newItem.attackSpeed,
            damageMultiplier: newItem.damageMultiplier,
            stats: newItem.stats,
            implicitStats: newItem.implicitStats
        };
    }

    // Process Day Method: Time passing and what occurs (triggering missions, etc.)
    processDay() {
        // Clear previous day's data
        game.dayReportData = {
            missionResults: [],
            exileUpdates: [],
            lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, food: 0, items: [] },
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
                    exaltedOrbs: gameState.resources.exaltedOrbs,
                    food: gameState.resources.food
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
                        food: gameState.resources.food - preMissionResources.food,
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
                    game.dayReportData.lootGained.food += actualRewards.food;
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

        // NEW: Handle between-encounters state
        if (missionState.awaitingNextEncounter) {
            missionState.awaitingNextEncounter = false;
            missionState.nextEncounter();
            // After advancing, return a result to trigger the next encounter's combat
            return {
                type: 'next_encounter_started',
                exileId: exileId,
                encounter: missionState.getCurrentEncounter().getDescription()
            };
        }

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
            // DEBUG: Log combat log after processing turn
            console.log('[DEBUG] processMissionTurn (victory/culled):', {
                currentEncounterNumber: currentEncounter.encounterNumber,
                combatLog: missionState.combatLog
            });
            return this.handleEncounterVictory(activeMission, turnResult);
        } else if (turnResult.outcome === 'death') {
            // DEBUG: Log combat log after processing turn
            console.log('[DEBUG] processMissionTurn (death):', {
                currentEncounterNumber: currentEncounter.encounterNumber,
                combatLog: missionState.combatLog
            });
            
            // Return death result for animation system to handle
            return {
                type: 'death',
                exileId: exileId,
                activeMission: activeMission,
                turnResult: turnResult
            };
        } else {
            // Combat continues - present choices to player
            // DEBUG: Log combat log after processing turn
            console.log('[DEBUG] processMissionTurn (combat_continue):', {
                currentEncounterNumber: currentEncounter.encounterNumber,
                combatLog: missionState.combatLog
            });
            return {
                type: 'combat_continue',
                exileId: exileId,
                encounter: currentEncounter.getDescription()
            };
        }
    }

    // Handle encounter victory
    handleEncounterVictory(activeMission, turnResult) {
        const { missionState, exileId } = activeMission;
        const encounter = missionState.getCurrentEncounter();

        // Generate loot for this monster
        const loot = this.generateMonsterLoot(encounter.monster);
        if (Array.isArray(loot)) {
            loot.forEach(item => missionState.addLoot(item));
        } else if (loot) {
            missionState.addLoot(loot);
        }

        // Generate currency drops using monster definitions
        let goldDrop = 0;
        let chaosDrop = 0;
        let exaltedDrop = 0;
        let foodDrop = 0;

        if (encounter.monster.drops) {
            if (encounter.monster.drops.gold) {
                const goldRange = encounter.monster.drops.gold;
                goldDrop = Math.floor(Math.random() * (goldRange.max - goldRange.min + 1)) + goldRange.min;

                if (encounter.monster.lootBonus && encounter.monster.lootBonus > 1) {
                    goldDrop = Math.floor(goldDrop * encounter.monster.lootBonus);
                }
            }
            if (encounter.monster.drops.chaosOrbs && Math.random() < encounter.monster.drops.chaosOrbs) {
                chaosDrop = 1;
            }
            if (encounter.monster.drops.exaltedOrbs && Math.random() < encounter.monster.drops.exaltedOrbs) {
                exaltedDrop = 1;
            }
            if (encounter.monster.drops.food && Math.random() < encounter.monster.drops.food) {
                foodDrop = 1;
            }
        }

        // Add currency to mission pool (applied when mission completes)
        // Notice we are now passing the variables, not hardcoded 0s.
        missionState.addCurrency(goldDrop, chaosDrop, exaltedDrop, foodDrop);
        missionState.totalExperience += encounter.monster.xpValue;

        // Update encounter status
        encounter.status = 'victory';

        // Check if more encounters remain
        const nextEncounter = missionState.encounters[missionState.currentEncounterIndex + 1];
        if (nextEncounter) {
            // Set between-encounters flag, do NOT advance yet
            missionState.awaitingNextEncounter = true;
            return {
                type: 'awaiting_next_encounter',
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

    // Process player's decision
    processDecision(exileId, decision) {
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) return null;

        const exile = gameState.exiles.find(e => e.id === exileId);

        switch (decision) {
            case 'continue':
                // Just process next turn
                return this.processMissionTurn(exileId);

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

    // Placeholder for using a flask.
    useFlask(exile) {
        if (!exile || !exile.flask || exile.flask.charges <= 0) {
            console.log("Cannot use flask.");
            return;
        }

        const healing = exile.flask.healing || 50; // Default healing value
        exile.currentLife = Math.min(exile.stats.life, (exile.currentLife || 0) + healing);
        exile.flask.charges--;

        uiSystem.log(`🧪 ${exile.name} used a flask, restoring ${healing} life. (${exile.flask.charges} charges left)`, 'info');

        // In the future, you might want to update the UI immediately here.
        if (typeof exileRowManager !== 'undefined') {
            const rowId = exileRowManager.getRowForExile(exile.id);
            if (rowId) {
                exileRowManager.updateRow(rowId, exile);
            }
        }
    }

    generateMonsterLoot(monster) {
        // Improved dropChance logic: integer part = guaranteed drops, fractional part = chance for one extra
        const dropChance = monster.drops?.dropChance || 0.1;
        const guaranteed = Math.floor(dropChance);
        const extraChance = dropChance - guaranteed;
        let numDrops = guaranteed;
        if (Math.random() < extraChance) {
            numDrops += 1;
        }
        if (numDrops === 0) return null;
        const items = [];
        for (let i = 0; i < numDrops; i++) {
            const item = itemDB.generateItem({
                targetIlvl: monster.ilvl,
                missionThemes: monster.tags || [],
                difficultyBonus: monster.tier === 'rare' ? 10 : (monster.tier === 'magic' ? 5 : 0)
            });
            if (item) {
                item.ilvl = monster.ilvl;
                items.push({
                    id: item.id,
                    name: item.getDisplayName(),
                    slot: item.slot,
                    type: item.category || item.slot,
                    rarity: item.rarity?.name?.toLowerCase() || 'common',
                    ilvl: item.ilvl,
                    icon: item.icon,
                    description: item.description,
                    attackSpeed: item.attackSpeed,
                    damageMultiplier: item.damageMultiplier,
                    stats: item.stats,
                    implicitStats: item.implicitStats
                });
            }
        }
        if (items.length === 0) return null;
        if (items.length === 1) return items[0]; // backward compatible
        return items;
    }

    // Modified method: Don't apply rewards immediately, just prepare them
    completeMissionSuccess(activeMission) {
        const { missionState, exileId, areaId, missionId } = activeMission;

        // Calculate rewards but DON'T apply them yet
        const rewards = this.calculateMissionRewards(missionState);

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

        return {
            type: 'mission_complete',
            exileId: exileId,
            rewards: rewards,
            missionState: missionState // Include mission state for delayed reward application
        };
    }

    // New helper method to calculate rewards without applying them
    calculateMissionRewards(missionState) {
        // Apply retreat penalty if needed
        if (missionState.status === 'retreated') {
            missionState.applyRetreatPenalty();
        }

        // Return rewards data without applying to game state
        return {
            gold: missionState.totalGold,
            chaosOrbs: missionState.totalChaosOrbs,
            exaltedOrbs: missionState.totalExaltedOrbs,
            food: missionState.totalFood,
            items: missionState.lootPool.length,
            experience: missionState.totalExperience,
            wasRetreat: missionState.status === 'retreated',
            retreatType: missionState.retreatType,
            itemList: [...missionState.lootPool]
        };
    }

    // New method to actually apply rewards after animation
    applyMissionRewards(exileId, rewards) {
        if (!rewards) return;

        // Find the exile
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) {
            console.error('Could not find exile to apply rewards!');
            return;
        }

        // Add currency to game state
        gameState.resources.gold += rewards.gold || 0;
        gameState.resources.chaosOrbs += rewards.chaosOrbs || 0;
        gameState.resources.exaltedOrbs += rewards.exaltedOrbs || 0;
        gameState.resources.food += rewards.food || 0;

        // Add items to inventory
        if (rewards.itemList && rewards.itemList.length > 0) {
            rewards.itemList.forEach(item => {
                gameState.inventory.items.push(item);

                // Update inventory grid if it exists
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.addNewItemToInventory) {
                    inventoryGridManager.addNewItemToInventory(item);
                }
            });
        }

        // Add experience to exile using exileFactory
        if (rewards.experience > 0) {
            exileFactory.addExperience(exile, rewards.experience);
        }

        // Log success
        uiSystem.log(`${exile.name} mission rewards applied: +${rewards.gold} gold, +${rewards.experience} exp`, "success");
        // Log food gains if any
        if (rewards.food > 0) {
            uiSystem.log(`🍖 Found ${rewards.food} food!`, "success");
        }
    }

    // Advance to the next encounter without processing a turn
    advanceToNextEncounter(exileId) {
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) return null;
        const missionState = activeMission.missionState;
        if (missionState.awaitingNextEncounter) {
            missionState.awaitingNextEncounter = false;
            const next = missionState.nextEncounter();
            return next;
        }
        return null;
    }
}


const missionSystem = new MissionSystem();
export { missionSystem };