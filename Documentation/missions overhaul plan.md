Exile Manager World System Implementation Plan
Overview
Transform the current flat mission system into a connected world map with areas, discoverable missions, and scouting-based information gathering.
Terminology

Area: Geographic location containing multiple missions (Beach, Swamp, Crypt)
Mission: Specific repeatable task within an area (Explore Shoreline, Hunt Cannibals)
Mission Type: Category defining base behavior (Exploration, Scavenging, Boss Fight)
Scouting: Information gathering about areas and missions through gameplay
Discovery: Process of finding new missions/areas through scouting
World Map: UI showing areas, connections, and player progress

File Structure Changes
js/
├── data/
│   ├── areas.js          // Area definitions, themes, loot bonuses
│   ├── missionTypes.js   // Mission type templates (Exploration, Scavenging, Boss)
│   ├── worldConnections.js // How areas connect and unlock requirements
└── systems/
    ├── worldSystem.js    // Area/mission management, discovery logic
    ├── scoutingSystem.js // Information gathering calculations
    └── worldUI.js        // World map interface (future)
Data Structure Design
Area Definition Template
javascript// In areas.js
const areaDefinitions = {
    beach: {
        name: "The Beach",
        discovered: true, // Starting area
        
        // Area-wide characteristics
        theme: "coastal",
        lootBonuses: {
            goldMultiplier: 1.0,
            currencyBonuses: { chaosOrbs: 0.0, exaltedOrbs: 0.0 },
            gearBonuses: { weaponBonus: 0.1, jewelryBonus: -0.05 },
            forcedThemes: ["coastal"]
        },
        
        // Scouting information (what players can learn)
        scoutingInfo: {
            initial: "A windswept coastline with scattered wreckage.",
            general: "The salt air corrodes metal quickly here.",
            loot: "Weapons wash ashore regularly, but jewelry is claimed by the tides.",
            dangers: "Shifting sands hide dangers beneath.",
            secrets: "Local fishermen speak of passages through the cliffs."
        },
        
        // Missions available in this area
        missions: {
            shorelineExploration: {
                type: "exploration",
                name: "Explore the Shoreline",
                discovered: true, // Available from start
                // Mission-specific data...
            },
            wreckageScavenging: {
                type: "scavenging",
                name: "Scavenge Ship Wreckage", 
                discovered: false, // Must be found through scouting
                // Mission-specific data...
            }
        }
    }
}
Mission Type Templates
javascript// In missionTypes.js
const missionTypeDefinitions = {
    exploration: {
        name: "Exploration",
        description: "Venture into unknown territory",
        baseRewards: { gold: {min: 10, max: 30}, experience: {min: 20, max: 40} },
        baseDanger: 1.0,
        scoutingGain: { base: 15, onSuccess: 5, onFailure: -5 },
        discoveryChance: 0.15 // Base chance to discover new missions/areas
    },
    scavenging: {
        name: "Scavenging",
        description: "Search for useful materials",
        baseRewards: { gold: {min: 5, max: 15}, experience: {min: 15, max: 25} },
        baseDanger: 0.8,
        scoutingGain: { base: 10, onSuccess: 3, onFailure: -2 },
        discoveryChance: 0.05,
        specialMechanics: ["enhancedLoot"] // Better currency/material drops
    },
    boss: {
        name: "Boss Fight", 
        description: "Face a dangerous enemy",
        baseRewards: { gold: {min: 50, max: 100}, experience: {min: 80, max: 120} },
        baseDanger: 1.5,
        scoutingGain: { base: 20, onSuccess: 10, onFailure: 0 },
        discoveryChance: 0.25,
        specialMechanics: ["unlockGuaranteed"] // Always unlocks something on victory
    }
}
Game State Additions
javascript// In gameState.js - add new section
worldState: {
    areas: {
        beach: {
            discovered: true,
            explorationProgress: 0, // 0-100, increases with mission completions
            scoutingProgress: {
                general: { unlocked: true, progress: 0 },
                loot: { unlocked: false, progress: 0 },
                dangers: { unlocked: false, progress: 0 },
                secrets: { unlocked: false, progress: 0 }
            },
            missions: {
                shorelineExploration: {
                    discovered: true,
                    completions: 0,
                    lastCompleted: null,
                    onCooldown: false
                }
            }
        }
    },
    connections: {
        beach_to_swamp: { 
            discovered: false, 
            unlocked: false,
            unlockType: "exploration", // exploration progress, boss kill, discovery chance
            unlockRequirement: 75 // 75% exploration or boss defeated, etc.
        }
    }
}
Implementation Phases
Phase 1: Foundation (First Implementation)
Goal: Create new data structure alongside existing system
Files to Create:

js/data/areas.js - Define beach area with 2-3 missions
js/data/missionTypes.js - Define exploration, scavenging, boss types
js/systems/worldSystem.js - Basic helper functions

Functions to Build:
javascript// In worldSystem.js
function getAreaData(areaId)
function getMissionData(areaId, missionId) 
function calculateMissionRewards(area, missionType, mission, outcome)
function updateScoutingProgress(areaId, scoutingType, amount)
function checkForDiscoveries(areaId, missionType, scoutingBonus)
Updates Needed:

Add worldState to gameState.js
Update index.html to load new files
Create basic migration function to convert existing missions

Phase 2: Scouting System (Second Implementation)
Goal: Implement information gathering mechanics
New Functions:
javascriptfunction calculateScoutingGain(exile, missionType, outcome)
function unlockScoutingInfo(areaId, infoType)
function getAvailableScoutingInfo(areaId)
function formatScoutingDisplay(areaId)
Integration Points:

Modify game.runMission() to award scouting progress
Add scouting info display to mission selection
Create discovery chance calculations

Phase 3: World Map UI (Third Implementation)
Goal: Create player-facing interface for the world system
New Files:

js/systems/worldUI.js - World map interface
CSS additions for world map styling

UI Components:

Area overview cards showing discovery status
Mission lists with scouting information revealed
Progress bars for exploration and scouting
Connection indicators between areas

Phase 4: Migration (Fourth Implementation)
Goal: Convert existing missions to new system, add connections
Tasks:

Convert The Coast, Fire Fury, Mud Flats, etc. to new area/mission structure
Define area connections and unlock requirements
Create swamp/prison areas for existing missions
Add discovery mechanics to unlock new areas

Migration Function:
javascriptfunction migrateOldMissions() {
    // Convert old mission completions to new world state
    // Preserve player progress where possible
}
Phase 5: Enhancement (Fifth Implementation)
Goal: Add advanced features and polish
Features:

Mission cooldown system
Advanced discovery mechanics
Multiple unlock paths per area
Special encounters/events system foundation
Enhanced scouting with exile stat bonuses

Phase 6: Cleanup (Final Implementation)
Goal: Remove old mission system completely
Tasks:

Delete old mission definitions
Remove old mission UI elements
Clean up unused code
Update save/load system
Final testing and balancing

Key Design Principles

Data-Driven: All areas, missions, and connections defined in data files
Backwards Compatible: Preserve existing save games during migration
Easily Expandable: Adding new areas/missions should be simple
Helper-Heavy: Complex logic in functions, simple data definitions
Progressive Disclosure: Information revealed through gameplay, not all at once

Success Metrics

 Can define new areas with 2-3 lines of data
 Scouting system provides meaningful information gathering
 Discovery mechanics create sense of exploration
 World map provides clear navigation and progress tracking
 Migration preserves existing player progress
 System supports future expansion (multiple exiles, cooldowns, events)


Ready to begin with Phase 1? We'll start by creating the basic data structure and helper functions, then test with a single area before expanding.RetryClaude can make mistakes. Please double-check responses. Sonnet 4