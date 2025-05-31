// Area definitions - geographic locations containing missions
const areaDefinitions = {
    // The Beach area - starting point for players
    beach: {
        name: "The Beach",
        discovered: true, // Initially discovered area

        // Visual/thematic information
        theme: "coastal",
        description: "A windswept coastline littered with the remnants of shipwrecks",

        // Area-wide loot and reward modifiers
        lootBonuses: {
            goldMultiplier: 1.0,

            // Currency drop rate modifiers
            currencyBonuses: {
                chaosOrbs: 0.0,    // No bonus/penalty to chaos orb drops
                exaltedOrbs: 0.0   // No bonus/penalty to exalted orb drops
            },

            // Gear type drop rate modifiers  
            gearBonuses: {
                weaponBonus: 0.15,    // 15% more weapons drop here
                armorBonus: 0.0,      // Normal armor drop rate
                jewelryBonus: -0.1    // 10% fewer jewelry drops (claimed by tides)
            },

            // Themes that force certain gear stats to appear
            forcedThemes: ["coastal"],
            availableThemes: ["coastal", "basic"]
        },

        // Information players can discover through scouting
        scoutingInfo: {
            // Always visible when area is discovered
            initial: "A windswept coastline with scattered wreckage from ancient storms.",

            // Unlocked at 25% scouting progress
            general: "The salt air corrodes metal quickly here, but the constant wind keeps the area free of dangerous gases.",

            // Unlocked at 50% scouting progress  
            loot: "Weapons wash ashore regularly from distant battles, but jewelry is quickly claimed by the tides or buried in sand.",

            // Unlocked at 75% scouting progress
            dangers: "Shifting sands can reveal sinkholes without warning. The wreckage provides shelter for aggressive scavenger creatures.",

            // Unlocked at 100% scouting progress
            secrets: "Local fishermen speak in hushed tones of hidden passages through the cliff faces, leading to darker places inland."
        },

        // Missions available in this area
        missions: {
            shorelineExploration: {
                type: "exploration",
                name: "Explore the Shoreline",
                description: "Survey the coastline for useful resources and potential threats",
                discovered: true, // Available immediately

                // Mission-specific overrides
                difficulty: 120,
                ilvl: 1,

                damage: {
                    min: 8, max: 25,
                    types: { physical: 0.9, cold: 0.1 } // Mostly physical with some cold from ocean spray
                },

                // Reward modifiers specific to this mission
                rewardModifiers: {
                    experienceMultiplier: 1.1 // 10% bonus XP for exploration
                },

                // Gear drop configuration
                gearDrop: {
                    baseChance: 0.4,           // 40% chance to drop gear
                    ilvlRange: { min: 1, max: 2 }, // Drop ilvl 1-2 gear
                    rarityBonus: 0             // No bonus to rare drop chance
                },

                // What this mission can potentially unlock
                canUnlock: ["wreckageScavenging", "beach_to_swamp_connection"]
            },

            wreckageScavenging: {
                type: "scavenging",
                name: "Scavenge Ship Wreckage",
                description: "Search through the remains of wrecked vessels for salvageable materials",
                discovered: false, // Must be found through exploration

                difficulty: 100,
                ilvl: 2,

                damage: {
                    min: 5, max: 20,
                    types: { physical: 0.7, fire: 0.3 } // Rusty metal and occasional burning debris
                },

                rewardModifiers: {
                    goldMultiplier: 1.3, // Better gold from scavenging
                    currencyMultiplier: 1.2 // Better currency drops
                },

                // Better gear drops for scavenging
                gearDrop: {
                    baseChance: 0.5,           // 50% chance (better than exploration)
                    ilvlRange: { min: 1, max: 3 }, // Drop ilvl 1-3 gear
                    rarityBonus: 0.05          // 5% bonus to rare drop chance
            },

                canUnlock: ["tidePoolBoss"]
            },

            tidePoolBoss: {
                type: "boss",
                name: "The Tide Warden",
                description: "A massive crustacean that has made its home in the largest tidal pool",
                discovered: false,

                difficulty: 300,
                ilvl: 4,

                damage: {
                    min: 25, max: 60,
                    types: { physical: 0.6, cold: 0.4 }
                },

                rewardModifiers: {
                    goldMultiplier: 2.0,
                    experienceMultiplier: 1.5,
                    guaranteedCurrency: { chaosOrbs: 1 },

                    firstCompletionOnly: {
                        guaranteedCurrency: { exaltedOrbs: 1 },
                        bonusGold: 100,
                        bonusExperience: 200
                    }
                },
                
                // Boss has guaranteed good gear
                gearDrop: {
                    baseChance: 0.8,           // 80% chance (bosses almost always drop gear)
                    ilvlRange: { min: 3, max: 5 }, // Drop ilvl 3-5 gear
                    rarityBonus: 0.15          // 15% bonus to rare drop chance
                },

                // Simple day-based cooldown
                cooldown: {
                    enabled: true,
                    days: 3  // Boss respawns after 3 days
                },

                canUnlock: ["beach_to_swamp_connection"]
            }
        }
    }
};

// Helper function to get area data
function getAreaData(areaId) {
    return areaDefinitions[areaId] || null;
}

// Helper function to get all discovered areas
function getDiscoveredAreas() {
    return Object.entries(areaDefinitions)
        .filter(([id, area]) => area.discovered)
        .map(([id, area]) => ({ id, ...area }));
}

// Helper function to get missions in an area
function getAreaMissions(areaId) {
    const area = getAreaData(areaId);
    return area ? area.missions : {};
}

// Helper function to get a specific mission
function getMissionData(areaId, missionId) {
    const area = getAreaData(areaId);
    return area && area.missions[missionId] ? area.missions[missionId] : null;
}