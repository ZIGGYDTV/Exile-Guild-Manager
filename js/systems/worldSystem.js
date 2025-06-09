// World System - Core helper functions for areas, missions, and discoveries

// === BASIC DATA ACCESS FUNCTIONS ===

// Get combined mission data (mission type + area mission + overrides)
function getCompleteMissionData(areaId, missionId) {
    const areaData = getAreaData(areaId);
    const mission = areaData?.missions[missionId];
    if (!mission) return null;

    const missionType = getMissionTypeData(mission.type);
    if (!missionType) return null;

    // Combine mission type defaults with mission-specific overrides
    return {
        ...missionType,
        ...mission,
        areaId: areaId,
        missionId: missionId,
        // Merge rewards properly
        baseRewards: {
            ...missionType.baseRewards,
            ...(mission.baseRewards || {})
        }
    };
}

// === MISSION AVAILABILITY FUNCTIONS ===

// Check if a mission is currently available to run
function isMissionAvailable(areaId, missionId) {
    const missionState = worldState.areas[areaId]?.missions[missionId];
    if (!missionState || !missionState.discovered) return false;

    // Check day-based cooldown
    if (missionState.availableAgainOnDay && turnState.currentTurn < missionState.availableAgainOnDay) {
        return false; // Still on cooldown
    }

    return true;
}

// Get how many days until mission is available
function getDaysUntilAvailable(areaId, missionId) {
    const missionState = worldState.areas[areaId]?.missions[missionId];
    if (!missionState?.availableAgainOnDay) return 0;

    return Math.max(0, missionState.availableAgainOnDay - turnState.currentTurn);
}

// Start cooldown for a mission after completion
function startMissionCooldown(areaId, missionId) {
    const missionData = getCompleteMissionData(areaId, missionId);
    const missionState = worldState.areas[areaId].missions[missionId];

    if (missionData.cooldown && missionData.cooldown.enabled) {
        missionState.availableAgainOnDay = turnState.currentTurn + missionData.cooldown.days;
    }
}

// === REWARD CALCULATION FUNCTIONS ===

// Calculate complete mission rewards including area bonuses and first-completion bonuses
function calculateCompleteMissionRewards(areaId, missionId, outcome) {
    const missionData = getCompleteMissionData(areaId, missionId);
    const areaData = getAreaData(areaId);
    const missionState = worldState.areas[areaId].missions[missionId];

    if (!missionData || !areaData) return null;

    // Start with base rewards from mission type
    let rewards = {
        gold: randomBetween(missionData.baseRewards.gold.min, missionData.baseRewards.gold.max),
        experience: randomBetween(missionData.baseRewards.experience.min, missionData.baseRewards.experience.max),
        chaosOrbs: 0,
        exaltedOrbs: 0
    };

    // Apply mission-specific reward modifiers
    if (missionData.rewardModifiers) {
        const modifiers = missionData.rewardModifiers;

        rewards.gold = Math.floor(rewards.gold * (modifiers.goldMultiplier || 1.0));
        rewards.experience = Math.floor(rewards.experience * (modifiers.experienceMultiplier || 1.0));

        // Apply guaranteed currency
        if (modifiers.guaranteedCurrency) {
            rewards.chaosOrbs += modifiers.guaranteedCurrency.chaosOrbs || 0;
            rewards.exaltedOrbs += modifiers.guaranteedCurrency.exaltedOrbs || 0;
        }

        // Random currency drops based on mission type
        const missionTypeData = getMissionTypeData(missionData.type);
        if (missionTypeData.randomCurrency) {
            if (Math.random() < missionTypeData.randomCurrency.chaosOrbChance) {
                rewards.chaosOrbs += 1;
            }
            if (Math.random() < missionTypeData.randomCurrency.exaltedOrbChance) {
                rewards.exaltedOrbs += 1;
            }
        }

        // Apply first completion bonuses
        if (!missionState.firstCompleted && modifiers.firstCompletionOnly) {
            const firstBonus = modifiers.firstCompletionOnly;

            if (firstBonus.guaranteedCurrency) {
                rewards.chaosOrbs += firstBonus.guaranteedCurrency.chaosOrbs || 0;
                rewards.exaltedOrbs += firstBonus.guaranteedCurrency.exaltedOrbs || 0;
            }

            rewards.gold += firstBonus.bonusGold || 0;
            rewards.experience += firstBonus.bonusExperience || 0;
        }
    }

    // Apply area-wide bonuses
    if (areaData.lootBonuses) {
        rewards.gold = Math.floor(rewards.gold * (areaData.lootBonuses.goldMultiplier || 1.0));

        if (areaData.lootBonuses.currencyBonuses) {
            // These would affect random currency drops (not implemented yet)
        }
    }

    return rewards;
}

// === SCOUTING SYSTEM FUNCTIONS ===

// Calculate scouting progress gained from a mission attempt
// Calculate scouting progress gained from a mission attempt
function calculateScoutingGain(areaId, missionId, outcome, exileScoutingBonus = 0) {
    const missionData = getCompleteMissionData(areaId, missionId);
    if (!missionData) return 0;

    let scoutingGain = missionData.scoutingGain.base;

    if (outcome === 'victory') {
        scoutingGain += missionData.scoutingGain.onSuccess;
    } else if (outcome === 'death') {
        // No scouting gain on death
        return 0;
    } else if (outcome === 'retreat') {
        scoutingGain += missionData.scoutingGain.onFailure;
    }

    // Apply scouting bonus as percentage multiplier
    const scoutingMultiplier = 1.0 + (exileScoutingBonus / 100 || 0);
    scoutingGain = Math.floor(scoutingGain * scoutingMultiplier);

    // Minimum 1 scouting progress for any attempt
    return Math.max(1, scoutingGain);
}


// Add scouting progress to an area and check for unlocks
function addScoutingProgress(areaId, amount) {
    const areaState = worldState.areas[areaId];
    const areaData = getAreaData(areaId);
    if (!areaState || !areaData) return;

    // Add to total scouting progress
    areaState.totalScoutingProgress = (areaState.totalScoutingProgress || 0) + amount;

    // Check each scouting info entry for unlocks
    areaData.scoutingInfo.forEach((info, index) => {
        const infoKey = `info_${index}`;

        // Initialize tracking if it doesn't exist
        if (!areaState.unlockedScoutingInfo) {
            areaState.unlockedScoutingInfo = {};
        }

        // Check if this info should be unlocked
        if (areaState.totalScoutingProgress >= info.threshold && !areaState.unlockedScoutingInfo[infoKey]) {
            areaState.unlockedScoutingInfo[infoKey] = true;

            // Could log discovery of new information here
            console.log(`Unlocked scouting info: ${info.text}`);
        }
    });
}


// === DISCOVERY SYSTEM FUNCTIONS ===
// Check for mission/area discoveries after completing a mission
function checkForDiscoveries(areaId, missionId, outcome) {
    const missionData = getCompleteMissionData(areaId, missionId);
    if (!missionData || outcome === 'death') return [];

    const discoveries = [];

    // Only successful missions can unlock things
    if (outcome === 'victory' && missionData.canUnlock) {
        missionData.canUnlock.forEach(unlockEntry => {
            let target, chance;

            if (typeof unlockEntry === 'string') {
                target = unlockEntry;
                chance = 1.0;
            } else {
                target = unlockEntry.target;
                chance = unlockEntry.chance;
            }

            // Apply scouting bonus as percentage multiplier to discovery chance
            // TODO: Pass exile scouting bonus from mission system
            const scoutingMultiplier = 1.0; // Temporarily disabled until exile info is passed
            const adjustedChance = Math.min(1.0, chance * scoutingMultiplier);

            // Roll for discovery
            if (Math.random() < adjustedChance) {
                if (target.includes('_to_')) {
                    // Handle area connections
                    const connectionState = worldState.connections[target];
                    if (connectionState && !connectionState.discovered) {
                        connectionState.discovered = true;
                        discoveries.push({ type: 'connection', id: target });
                    }
                } else {
                    // Check if target is an area name (for area unlocks)
                    const targetAreaData = getAreaData(target);

                    if (targetAreaData) {
                        // Handle area discovery
                        if (!worldState.areas[target]) {
                            // Initialize the area in game state if it doesn't exist
                            worldState.areas[target] = {
                                discovered: true,
                                explorationProgress: 0,
                                totalScoutingProgress: 0,
                                unlockedScoutingInfo: {},
                                missions: {}
                            };

                            // Initialize starting missions if any
                            if (targetAreaData.missions) {
                                Object.entries(targetAreaData.missions).forEach(([missionId, missionDef]) => {
                                    // Check if this mission should start discovered
                                    const startDiscovered = missionDef.discovered ||
                                        (targetAreaData.startingMissions && targetAreaData.startingMissions.includes(missionId));

                                    worldState.areas[target].missions[missionId] = {
                                        discovered: startDiscovered,
                                        completions: 0,
                                        firstCompleted: false,
                                        lastCompleted: null,
                                        availableAgainOnDay: null
                                    };
                                });
                            }

                            discoveries.push({ type: 'area', areaId: target });
                        }
                    } else {
                        // Handle mission discovery within current area
                        const areaData = getAreaData(areaId);
                        if (areaData && areaData.missions && areaData.missions[target]) {
                                                    if (!worldState.areas[areaId].missions[target]) {
                            worldState.areas[areaId].missions[target] = {
                                    discovered: false,
                                    completions: 0,
                                    firstCompleted: false,
                                    lastCompleted: null,
                                    availableAgainOnDay: null
                                };
                            }
                            const missionState = worldState.areas[areaId].missions[target];
                            if (!missionState.discovered) {
                                missionState.discovered = true;
                                discoveries.push({ type: 'mission', areaId: areaId, missionId: target });
                            }
                        } else {
                            console.warn(`Invalid mission reference in canUnlock: "${target}" does not exist in area "${areaId}"`);
                        }
                    }
                }
            }
        });
    }

    return discoveries;
}

// === MISSION COMPLETION TRACKING ===
// Update mission state after completion
function completeMission(areaId, missionId, outcome) {
    const missionState = worldState.areas[areaId].missions[missionId];
    if (!missionState) return;

    // Update completion tracking
    if (outcome === 'victory') {
        missionState.completions++;
        if (!missionState.firstCompleted) {
            missionState.firstCompleted = true;
        }
        missionState.lastCompleted = turnState.currentTurn;

        // ADD: Update exploration progress
        updateExplorationProgress(areaId, missionId);

        // Start cooldown if applicable
        startMissionCooldown(areaId, missionId);
    }

    // Add scouting progress
    const scoutingGain = calculateScoutingGain(areaId, missionId, outcome);
    addScoutingProgress(areaId, scoutingGain);

    // Check for discoveries
    const discoveries = checkForDiscoveries(areaId, missionId, outcome);

    return {
        discoveries: discoveries,
        scoutingGain: scoutingGain
    };
}

// New function to calculate exploration progress
function updateExplorationProgress(areaId, missionId) {
    const areaState = worldState.areas[areaId];
    const areaData = getAreaData(areaId);

    if (!areaState || !areaData) return;

    // Calculate progress based on discovered missions and their completions
    const totalMissions = Object.keys(areaData.missions).length;
    const discoveredMissions = Object.values(areaState.missions).filter(m => m.discovered);
    const completedMissions = Object.values(areaState.missions).filter(m => m.completions > 0);

    // Progress formula: 50% for discovery + 50% for completion
    const discoveryProgress = (discoveredMissions.length / totalMissions) * 50;
    const completionProgress = (completedMissions.length / totalMissions) * 50;

    areaState.explorationProgress = Math.min(100, Math.round(discoveryProgress + completionProgress));
}

// === UTILITY FUNCTIONS ===

// Helper function for random number generation (matches existing game.js function)
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get all available missions for an area
function getAvailableMissions(areaId) {
    const areaData = getAreaData(areaId);
    const areaState = worldState.areas[areaId];

    if (!areaData || !areaState) return [];

    return Object.entries(areaData.missions)
        .filter(([missionId, mission]) => {
            const missionState = areaState.missions[missionId];
            return missionState && missionState.discovered && isMissionAvailable(areaId, missionId);
        })
        .map(([missionId, mission]) => ({
            ...mission,
            missionId: missionId,
            areaId: areaId
        }));
}

// Get scouting information that has been unlocked for an area
function getUnlockedScoutingInfo(areaId) {
    const areaData = getAreaData(areaId);
    const areaState = worldState.areas[areaId];

    if (!areaData || !areaState) return [];

    const unlockedInfo = [];

    areaData.scoutingInfo.forEach((info, index) => {
        const infoKey = `info_${index}`;
        const totalProgress = areaState.totalScoutingProgress || 0;

        if (totalProgress >= info.threshold) {
            unlockedInfo.push({
                text: info.text,
                tag: info.tag,
                threshold: info.threshold
            });
        }
    });

    // Sort by threshold (earliest unlocks first)
    return unlockedInfo.sort((a, b) => a.threshold - b.threshold);
}

// === TESTING FUNCTION ===

// Test function to run a mission using the new world system
function testWorldMission(areaId, missionId) {
    console.log(`=== Testing Mission: ${areaId} - ${missionId} ===`);

    // Check if mission is available
    if (!isMissionAvailable(areaId, missionId)) {
        console.log("❌ Mission not available!");
        return;
    }

    // Get complete mission data
    const missionData = getCompleteMissionData(areaId, missionId);
    console.log("📋 Mission Data:", missionData);

    // Simulate mission outcome (75% success rate for testing)
    const outcome = Math.random() < 0.75 ? 'victory' : 'retreat';
    console.log(`⚔️ Mission Result: ${outcome}`);

    // Calculate rewards
    const rewards = calculateCompleteMissionRewards(areaId, missionId, outcome);
    console.log("💰 Rewards:", rewards);

    // Calculate gear drop
    const gearDrop = calculateGearDrop(areaId, missionId, outcome);
    if (gearDrop) {
        console.log("⚔️ Gear Dropped:", gearDrop);
    } else {
        console.log("⚔️ No gear dropped");
    }

    // Calculate scouting gain
    const scoutingGain = calculateScoutingGain(areaId, missionId, outcome);
    console.log(`🔍 Scouting Gain: ${scoutingGain}`);

    // Complete the mission (updates all state)
    const completionResult = completeMission(areaId, missionId, outcome);
    console.log("🎯 Completion Result:", completionResult);

    // Show updated area state
    console.log("🗺️ Updated Area State:", worldState.areas[areaId]);

    // Check what missions are now available
    const availableMissions = getAvailableMissions(areaId);
    console.log("✅ Available Missions:", availableMissions.map(m => m.name));

    console.log("=== Test Complete ===\n");
}
// End test function


// === GEAR DROP SYSTEM ===

// Calculate and generate gear drop for a mission
function calculateGearDrop(areaId, missionId, outcome) {
    // Only successful missions drop gear
    if (outcome !== 'victory') return null;

    const missionData = getCompleteMissionData(areaId, missionId);
    const areaData = getAreaData(areaId);

    if (!missionData?.gearDrop || !areaData) return null;

    // Check base drop chance
    if (Math.random() > missionData.gearDrop.baseChance) {
        return null; // No gear dropped
    }

    // Determine ilvl within the mission's range
    const ilvlRange = missionData.gearDrop.ilvlRange;
    const gearIlvl = randomBetween(ilvlRange.min, ilvlRange.max);

    // Create a fake mission object for gear generation (reusing existing system)
    const gearGenMission = {
        ilvl: gearIlvl,
        rewards: {
            // Apply mission's rarity bonus to base rare chance
            rareChance: (missionData.gearDrop.rarityBonus || 0)
        }
    };

    // Use existing gear generation system but with area bonuses
    return generateGearWithAreaBonuses(areaData, gearGenMission);
}

// Helper function to generate gear with area-specific bonuses
function generateGearWithAreaBonuses(areaData, missionData) {
    // This will integrate with your existing gear generation
    // For now, return a placeholder that shows the concept

    const gearBonuses = areaData.lootBonuses?.gearBonuses || {};
    const themes = areaData.lootBonuses?.forcedThemes || [];

    // Determine gear type with area bonuses
    const baseTypeChances = {
        weapon: 0.4,
        armor: 0.35,
        jewelry: 0.25
    };

    // Apply area modifiers
    const modifiedChances = {
        weapon: baseTypeChances.weapon * (1 + (gearBonuses.weaponBonus || 0)),
        armor: baseTypeChances.armor * (1 + (gearBonuses.armorBonus || 0)),
        jewelry: baseTypeChances.jewelry * (1 + (gearBonuses.jewelryBonus || 0))
    };

    // Normalize chances back to 1.0 total
    const total = Object.values(modifiedChances).reduce((sum, chance) => sum + chance, 0);
    Object.keys(modifiedChances).forEach(key => {
        modifiedChances[key] /= total;
    });

    // For now, return info about what would be generated
    return {
        ilvl: missionData.ilvl,
        areaThemes: themes,
        typeChances: modifiedChances,
        rarityBonus: missionData.rewards?.rareChance || 0,
        // This would call your existing generateGear() function
        placeholder: "Gear would be generated here with existing system"
    };
}