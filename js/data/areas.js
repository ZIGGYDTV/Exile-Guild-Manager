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
                text: "A windswept coastline with scattered shipwrecks from ancient storms. Corpsecrab spawn cause the bodies washed ashore to twitch. There's little close to our refuge to sustain us, we must explore further afield.",
                threshold: 0,    // Unlocked at start
                tag: "initial"
            },
            {
                text: "I see sparks of light comin' from the wreckages sometimes... crackles and scraping. There's crates of clothing and other goods scattered about one larger wreck, but no sign of weapons I can see.",
                threshold: 15,
                tag: "danger"
            },
            {
                text: "The Cannibals seem to have looted every weapon they could from the wrecks - they're armed to the teeth. I saw one with 4 axes... like what the fuck? Some of em carry torches and buckets of coals. I don't wanna find out why.",
                threshold: 30,
                tag: "loot"
            },
            {
                text: "Sighted a massive crab-like cbomination... it was eating the smaller crabs like grapes. Where it stepped, spikes of seawater froze into shards of ice.",
                threshold: 50,
                tag: "danger"
            },
            {
                text: "Looks to be a large camp blocking the pass through the coastal cliffs. The smell cooking meat... barely covers the stink of rot.",
                threshold: 75,
                tag: "general"
            },
            {
                text: "The leader of the Cannibals seems to be the one what ate all the others who came before 'im. I hid in the rocks and caught a glimpse of him... his bloody limb hacker was on fire, I pissed myself and choofed off outta there.",
                threshold: 100,
                tag: "secrets"
            }
        ],

        // Missions available in this area
        missions: {
            crab_hunting: {
                type: "hunting",
                name: "Corpsecrab Hunting",
                description: "Corpsecrabs scuttle about those lucky enough to wash ashore dead. No-one but the most 'scraping-the-bottom-of-the-barrel' recruits hunt them, but that's who we've got here.",
                discovered: true, 
                difficulty: 1,
                ilvl: { min: 1, max: 1 },

                damage: {
                    min: 1, max: 19,
                    types: { physical: 1},
                },

                rewardModifiers: {
                    goldMultiplier: 0.1,
                    experienceMultiplier: 0.4,
                    currencyMultiplier: 0.1,
                    firstCompletionOnly: {
                        bonusExperience: 11,
                    },
                },

                gearDrop: {
                    baseChance: 0.1,
                    rarityBonus: 0,
                },
            },     
            
            shorelineExploration: {
                type: "exploration",
                name: "Explore the Shoreline",
                description: "The shoreline is dangerous, the water frigid, the corpses stir. But we'll wither and die if we don't push further out from here. We can send recruits to their deaths in the hopes of finding something good so that the next ones live.",
                discovered: true, // Available immediately

                // Mission-specific overrides
                difficulty: 7,
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

                difficulty: 15,
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

                scoutingGain: {
                    base: 1,
                    onSuccess: 1,
                    onFailure: -1
                },

                // Better gear drops for scavenging
                gearDrop: {
                    baseChance: 0.5,           // 50% chance (better than exploration)
                    rarityBonus: 0.05,          // 5% bonus to rare drop chance
                    gearTypeOverrides: { // These must add up to 1.0! 
                        armor: 0.9,
                        jewelry: 0.1,
                    },

                },




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

                difficulty: 18,
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
                    rarityBonus: 0.1,
                    // Override gear type droprates
                    gearTypeOverrides: {
                        armor: 0.15,
                        weapon: 0.8,
                        jewelry: 0.05
                    },
                },



                canUnlock: [
                    { target: "cannibal_camps", chance: 0.2 }
                ]
            },

            cannibal_camps: {
                type: "raid",
                name: "Cannibal Camp Raid",
                description: "A collection of campsites where the cannibals live.",
                discovered: false,
                difficulty: 25,

                ilvl: { min: 4, max: 6 }, // Item level range for gear drops

                damage: {
                    min: 25, max: 55,
                    types: { physical: 0.7, fire: 0.4 } // Cannibals want to cook their prey alive
                },

                rewardModifiers: {
                    goldMultiplier: 0.8, // What use have they for gold?
                    experienceMultiplier: 1.4,
                    firstCompletionOnly: {
                        bonusExperience: 188
                    },
                },

                gearDrop: {
                    baseChance: 0.6,
                    rarityBonus: 0.1,
                    gearTypeOverrides: {
                        armor: 0.2,    // 20% chance for armor
                        weapon: 0.7,   // 70% chance for weapons  
                        jewelry: 0.1   // 10% chance for jewelry
                    },
                },

                canUnlock: [
                    { target: "meat_boss", chance: 0.5 }
                ]
            },

            meat_boss: {
                type: "boss",
                name: "Meat, the Butcher",
                description: "Amongst cannibal-kind the only law is that of who takes the most meat. Meat is the law and when one Meat falls another takes their place. ",
                discovered: false,
                difficulty: 40,
                ilvl: { min: 5, max: 7 },
                damage: {
                    min: 35, max: 85,
                    types: { physical: 0.8, fire: 0.4 }
                },
                rewardModifiers: {
                    goldMultiplier: 1.0,
                    experienceMultiplier: 1.6,
                    guaranteedCurrency: { chaosOrbs: 1 },
                    firstCompletionOnly: {
                        guaranteedCurrency: { exaltedOrbs: 2 },
                        bonusGold: 122,
                        bonusExperience: 227
                    }
                },
                // Boss has guaranteed good gear
                gearDrop: {
                    baseChance: 1,
                    rarityBonus: 0.50
                },
                // Simple day-based cooldown
                cooldown: {
                    enabled: true,
                    days: 5  // Boss respawns after 3 days
                },
                canUnlock: [
                    { target: "the_midden", chance: 1  },
                    { target: "rot", chance: 1 }
                ]
            },

            tidePoolBoss: {
                type: "boss",
                name: "The Tide Warden",
                description: "A massive crustacean that has made its home in the largest tidal pool",
                discovered: false,

                difficulty: 30,
                ilvl: { min: 4, max: 6 },

                damage: {
                    min: 25, max: 60,
                    types: { physical: 0.4, cold: 0.6 }
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

                canUnlock: [
                    { target: "the_depths", chance: 0.2 }
                ]
            }
        }
    },

    the_depths: {
        name: "The Depths",
        discovered: false,
        theme: "underground",
        description: "Who in their right mind would go down there...",

        lootBonuses: {
            goldMultiplier: 1.1,
            currencyMultiplier: 1.1,
            gearMultiplier: 1.1
        },

        currencyBonuses: {
            chaosOrbs: 0.1,    // No bonus/penalty to chaos orb drops
            exaltedOrbs: 0.1   // No bonus/penalty to exalted orb drops
        },

        // Gear type drop rate modifiers  
        gearBonuses: {
            weaponBonus: 0.0,    
            armorBonus: 0.0,      
            jewelryBonus: 0.1    
        },

        // Themes that force certain gear stats to appear
        forcedThemes: ["underground"],
        availableThemes: ["underground", "cold", "delve"]
    },
  
    scoutingInfo: [
        {
            text: "We found out where that crab-abomination came from. Who in their right mind would go down there...",
            threshold: 0,    // Unlocked at start
            tag: "initial"
        },
        {
            text: "It was just a little tiny thing, tiny 'lil pinprick... just barely scraped him it did... 'n he dropped like a sack of shit.",
            threshold: 15,
            tag: "danger"
        },
        {
            text: "Their eyes glow in the dark, but they ain't human no more, their fingers are frozen solid and leave frostbite in a heartbeat.",
            threshold: 30,
            tag: "general"
        },
        {
            text: "Come back later to learn more... (placeholder)",
            threshold: 50,
            tag: "secrets"
        },
    ],  

        

    rot: {
        name: "The Rot",
        discovered: false,
        startingMissions: ["the_midden"], 
        // Visual/thematic information
        theme: "swamp",
        description: "Beyond the Coast is not salvation but a new hell, thick with rot and pestilence.",

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
                weaponBonus: 0.0,    // 15% more weapons drop here
                armorBonus: 0.0,      // Normal armor drop rate
                jewelryBonus: 0.0    // 10% fewer jewelry drops (claimed by tides)
            },

            // Themes that force certain gear stats to appear
            forcedThemes: ["swamp"],
            availableThemes: ["swamp", "chaos", "basic"]
        },

        scoutingInfo: [
            {
                text: "Beyond the Coast is not salvation but a new hell, thick with rot and pestilence.",
                threshold: 0,    // Unlocked at start
                tag: "initial"
            },
            {
                text: "The creatures here have not only adapted to survive the toxic miasma here, but have adopted it also. Plagued spit, venomous stings, necrotic energies borne of filthe and corruption.",
                threshold: 15,
                tag: "danger"
            },
            {
                text: "Come back later to learn more... (placeholder)",
                threshold: 30,
                tag: "secrets"
            },
        ],

        missions: {
        the_midden: {
            type: "exploration",
            name: "The Midden",
            description: "Only the most wrectched and foul can tolerate the toxic sludge, splintered bones and rotting contagion of the refuse lands beyond the Cannibal's camp.",
            discovered: false,
            difficulty: 50,
            ilvl: { min: 6, max: 10 },

            damage: {
                min: 40, max: 95,
                types: { physical: 0.4, chaos: 0.8 }
            },

            rewardModifiers: {
                goldMultiplier: 0.1,
                experienceMultiplier: 1.6,
            },
            canUnlock: [
                { target: "puswyrm", chance: 0.5 },
            ]
        },

        puswyrm: {
            type: "boss",
            name: "Puswyrm",
            description: "A tangled knot of rotting organs and limbs snakes it's way through the refuse heaps, feeding of the corruption to fuel it's unlife.",
            discovered: false,
            difficulty: 60,
            ilvl: { min: 7, max: 12 },
            damage: {
                min: 50, max: 120,
                types: { physical: 0.4, chaos: 0.8 }
            },
            rewardModifiers: {
                goldMultiplier: 0.1,
                experienceMultiplier: 1.8,
                guaranteedCurrency: { chaosOrbs: 1 },
                firstCompletionOnly: {
                    guaranteedCurrency: { exaltedOrbs: 2 },
                    bonusGold: 100,
                    bonusExperience: 200
                }
            },
            gearDrop: {
                baseChance: 0.8,
                rarityBonus: 0.2,
                gearTypeOverrides: {
                    armor: 0.2,
                    weapon: 0.2,
                    jewelry: 0.6
                }
            },
        }
    }
}
}

// Helper function to get area data
function getAreaData(areaId) {
    return areaDefinitions[areaId] || null;
}

// Helper function to get all discovered areas
function getDiscoveredAreas() {
    // Check both the area definitions AND the gameState for discovered areas
    return Object.entries(areaDefinitions)
        .filter(([id, area]) => {
            // Check if discovered in definition OR in gameState
            const isDiscoveredInDefinition = area.discovered === true;
            const isDiscoveredInGameState = gameState.worldState.areas[id]?.discovered === true;
            return isDiscoveredInDefinition || isDiscoveredInGameState;
        })
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