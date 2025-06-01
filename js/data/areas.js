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
        scoutingInfo: [
            {
                text: "A windswept coastline with scattered wreckage from ancient storms. The carniviorous crabs are barely edible, but can keep us going.",
                threshold: 0,    // Unlocked at start
                tag: "initial"
            },
            {
                text: "The creatures that prowl the wreckages crackle with energy. But the risk may be worth it, signs point to a cargo ship containing a shipment of clothing and armor is amongst the other wrecks.",
                threshold: 15,
                tag: "danger"
            },
            {
                text: "The cannibals prowling the coast seem to have looted every weapon they could from the wrecks. They favor fire, trying to cook their prey alive.",
                threshold: 30,
                tag: "loot"
            },
            {
                text: "Sighted a massive crab-like creature, it was eating the smaller crabs like snacks. It left a frozen trail in it's wake.",
                threshold: 40,
                tag: "danger"
            },
            {
                text: "Placeholder: something about the boss or next area.",
                threshold: 75,
                tag: "general"
            },
            {
                text: "Placeholder: something about a nuance of the loot.",
                threshold: 100,
                tag: "secrets"
            }
        ],

        // Missions available in this area
        missions: {
            shorelineExploration: {
                type: "exploration",
                name: "Explore the Shoreline",
                description: "Survey the coastline for useful resources and potential threats",
                discovered: true, // Available immediately

                // Mission-specific overrides
                difficulty: 110,
                ilvl: { min: 1, max: 2 }, // Item level range for gear drops

                damage: {
                    min: 8, max: 23,
                    types: { physical: 0.9, cold: 0.1 } 
                },

                // Reward modifiers specific to this mission
                rewardModifiers: {
                    experienceMultiplier: 1.1, // 10% bonus XP for exploration
                    firstCompletionOnly: {
                        bonusGold: 22,
                        bonusExperience: 44
                    },
                },

                // Gear drop configuration
                gearDrop: {
                    baseChance: 0.4,           // 40% chance to drop gear
                    rarityBonus: 0             // No bonus to rare drop chance
                },

                // What this mission can potentially unlock
                canUnlock: [
                    { target: "wreckageScavenging", chance: 0.8 },      // 80% chance
                    { target: "cannibalHunting", chance: 0.25 },         // 25% chance
                    { target: "theSpits", chance: 0.05 }                  // AREA CONNECTION
                ]
            },

            wreckageScavenging: {
                type: "scavenging",
                name: "Scavenge Ship Wreckage",
                description: "Search through the remains of wrecked vessels for salvageable materials",
                discovered: false, // Must be found through exploration

                difficulty: 100,
                ilvl: { min: 2, max: 4 }, // Item level range for gear drops

                damage: {
                    min: 5, max: 20,
                    types: { physical: 0.7, lightning: 0.3 }
                },

                rewardModifiers: {
                    goldMultiplier: 1.3, // Better gold from scavenging
                    currencyMultiplier: 1.2, // Better currency drops
                    firstCompletionOnly: {
                        guaranteedCurrency: { exaltedOrbs: 1 },
                        bonusGold: 44,
                        bonusExperience: 82
                    },
                },

                // Better gear drops for scavenging
                gearDrop: {
                    baseChance: 0.5,           // 50% chance (better than exploration)
                    rarityBonus: 0.05          // 5% bonus to rare drop chance
                },

                gearTypeOverrides: { // These must add up to 1.0! 
                    armor: 0.8,    // 80% chance for armor
                    weapon: 0.15,  // 15% chance for weapons  
                    jewelry: 0.05  // 5% chance for jewelry
                },                 // Total = 1.0 (100%)


                canUnlock: [
                    { target: "tidePoolBoss", chance: 0.5 }, // 20% chance to discover the Tide Warden boss
                ]
            },

            // In beach area's missions object, add:
            cannibalHunting: {
                type: "hunting",
                name: "Cannibal Hunting",
                description: "Hunt the hunters that hide among the rocky outcroppings",
                discovered: false, // Must be found through exploration

                difficulty: 180,
                ilvl: { min: 3, max: 5 }, // Item level range for gear drops

                damage: {
                    min: 20, max: 45,
                    types: { physical: 0.8, fire: 0.2 } // Cannibals want to cook their prey alive
                },

                rewardModifiers: {
                    goldMultiplier: 0.8, // What use have they for gold?
                    experienceMultiplier: 1.2, // Slightly better XP for hunting
                    firstCompletionOnly: {
                        bonusExperience: 122
                    },
                },

                gearDrop: {
                    baseChance: 0.6,
                    rarityBonus: 0.1
                },

                // Override gear type droprates
                gearTypeOverrides: {
                    armor: 0.2,    // 20% chance for armor
                    weapon: 0.7,   // 70% chance for weapons  
                    jewelry: 0.1   // 10% chance for jewelry
                },

                canUnlock: [
                    { target: "beach_to_swamp_connection", chance: 0.5 } // 50% chance to discover swamp passage
                ]
            },

            tidePoolBoss: {
                type: "boss",
                name: "The Tide Warden",
                description: "A massive crustacean that has made its home in the largest tidal pool",
                discovered: false,

                difficulty: 300,
                ilvl: { min: 4, max: 6 },

                damage: {
                    min: 25, max: 60,
                    types: { physical: 0.5, cold: 0.5 }
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
                    rarityBonus: 0.15          // 15% bonus to rare drop chance
                },

                // Simple day-based cooldown
                cooldown: {
                    enabled: true,
                    days: 3  // Boss respawns after 3 days
                },
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