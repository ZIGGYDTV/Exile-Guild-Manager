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
    const missionState = gameState.worldState.areas[areaId]?.missions[missionId];
    if (!missionState || !missionState.discovered) return false;
    
    // Check day-based cooldown
    if (missionState.availableAgainOnDay && timeState.currentDay < missionState.availableAgainOnDay) {
        return false; // Still on cooldown
    }
    
    return true;
}

// Get how many days until mission is available
function getDaysUntilAvailable(areaId, missionId) {
    const missionState = gameState.worldState.areas[areaId]?.missions[missionId];
    if (!missionState?.availableAgainOnDay) return 0;
    
    return Math.max(0, missionState.availableAgainOnDay - timeState.currentDay);
}

// Start cooldown for a mission after completion
function startMissionCooldown(areaId, missionId) {
    const missionData = getCompleteMissionData(areaId, missionId);
    const missionState = gameState.worldState.areas[areaId].missions[missionId];
    
    if (missionData.cooldown && missionData.cooldown.enabled) {
        missionState.availableAgainOnDay = timeState.currentDay + missionData.cooldown.days;
    }
}

// === REWARD CALCULATION FUNCTIONS ===

// Calculate complete mission rewards including area bonuses and first-completion bonuses
function calculateCompleteMissionRewards(areaId, missionId, outcome) {
    const missionData = getCompleteMissionData(areaId, missionId);
    const areaData = getAreaData(areaId);
    const missionState = gameState.worldState.areas[areaId].missions[missionId];
    
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
    
    // Apply exile scouting bonuses (future: exile stats could affect this)
    scoutingGain += exileScoutingBonus;
    
    // Minimum 1 scouting progress for any attempt
    return Math.max(1, scoutingGain);
}

// Add scouting progress to an area and check for unlocks
function addScoutingProgress(areaId, amount) {
    const areaState = gameState.worldState.areas[areaId];
    if (!areaState) return;
    
    // Add to general scouting progress (always unlocked)
    areaState.scoutingProgress.general.progress += amount;
    
    // Calculate total scouting progress across all categories
    const totalProgress = Object.values(areaState.scoutingProgress)
        .reduce((sum, category) => sum + category.progress, 0);
    
    // Check for scouting info unlocks based on total progress
    const thresholds = {
        loot: 25,
        dangers: 50, 
        secrets: 75
    };
    
    Object.entries(thresholds).forEach(([category, threshold]) => {
        if (totalProgress >= threshold && !areaState.scoutingProgress[category].unlocked) {
            areaState.scoutingProgress[category].unlocked = true;
            // Could log discovery of new information here
        }
    });
}

// === DISCOVERY SYSTEM FUNCTIONS ===

// Check for mission/area discoveries after completing a mission
function checkForDiscoveries(areaId, missionId, outcome) {
    const missionData = getCompleteMissionData(areaId, missionId);
    if (!missionData || outcome === 'death') return [];
    
    const discoveries = [];
    
    // Only successful missions can unlock things (retreat might have partial chance)
    if (outcome === 'victory' && missionData.canUnlock) {
        missionData.canUnlock.forEach(unlockTarget => {
            if (unlockTarget.startsWith('beach_to_')) {
                // This is an area connection
                const connectionState = gameState.worldState.connections[unlockTarget];
                if (connectionState && !connectionState.discovered) {
                    connectionState.discovered = true;
                    discoveries.push({ type: 'connection', id: unlockTarget });
                }
            } else {
                // This is a mission in the same area
                const missionState = gameState.worldState.areas[areaId].missions[unlockTarget];
                if (missionState && !missionState.discovered) {
                    missionState.discovered = true;
                    discoveries.push({ type: 'mission', areaId: areaId, missionId: unlockTarget });
                }
            }
        });
    }
    
    return discoveries;
}

// === MISSION COMPLETION TRACKING ===

// Update mission state after completion
function completeMission(areaId, missionId, outcome) {
    const missionState = gameState.worldState.areas[areaId].missions[missionId];
    if (!missionState) return;
    
    // Update completion tracking
    if (outcome === 'victory') {
        missionState.completions++;
        if (!missionState.firstCompleted) {
            missionState.firstCompleted = true;
        }
        missionState.lastCompleted = timeState.currentDay;
        
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

// === UTILITY FUNCTIONS ===

// Helper function for random number generation (matches existing game.js function)
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get all available missions for an area
function getAvailableMissions(areaId) {
    const areaData = getAreaData(areaId);
    const areaState = gameState.worldState.areas[areaId];
    
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
    const areaState = gameState.worldState.areas[areaId];
    
    if (!areaData || !areaState) return {};
    
    const unlockedInfo = {};
    
    Object.entries(areaState.scoutingProgress).forEach(([category, state]) => {
        if (state.unlocked && areaData.scoutingInfo[category]) {
            unlockedInfo[category] = areaData.scoutingInfo[category];
        }
    });
    
    return unlockedInfo;
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
    console.log("🗺️ Updated Area State:", gameState.worldState.areas[areaId]);
    
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