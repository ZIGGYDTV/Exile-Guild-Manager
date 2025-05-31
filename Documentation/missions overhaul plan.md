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


✅ Completed Steps:

Step 1: ✅ Added World Map button and Command Center layout
Step 2: ✅ Added world map methods to game object
Step 3: ✅ Updated initialization
Step 4: ✅ Basic world map interface working
Step 5: ✅ CSS styling added

🔄 Issues We Found & Fixed:

✅ Mission system integration (gear drops, combat, etc.)
✅ Scouting system implementation
✅ Discovery system with chance-based unlocks
✅ Mission types and areas working
✅ Currency drops working
✅ UI showing cooldown missions instead of hiding them
Also: added scouting info to world map.

We've actually overdelivered on Phase 2A by adding:

Chance-based discovery system
Scouting system with flexible thresholds
Currency drops
Cooldown UI improvements

Still pending: 
Phase 2B: Multi-Exile Assignment System

Modify world state to track mission assignments 
Add exile selection to world map
"Process Day" button that runs all assignments

Phase 2C: Enhanced World Map

Area connections and unlock status display
Scouting information display in world map
Progress tracking and visual feedback
Color code scouting info based on tags.


CURRENT TASK:

UIUX change thatll be important for the future: I want to assign the Exile to a mission and then click process day to have them run it. Ideally they stay assigned to that mission unless it goes on cooldown. 

The idea is that you can assign exiles to missions (just our 1 for now) and then process day to have them run them. And that'll naturally cause time progression to occur. What steps would be involved in implementing this?

Mission Assignment System
This is a bigger change! Here's the implementation plan:
Step 1: Add Assignment Tracking
File: Update js/gameState.js
Add to exile object:
javascriptexile: {
    // ... existing properties ...
    
    // NEW: Mission assignment
    assignedMission: null  // { areaId: "beach", missionId: "shorelineExploration" }
},
Step 2: Update World Map UI
Change "Run Mission Now" buttons to "Assign Mission"
File: Update js/game.js in showAreaMissions method:
javascriptbuttonText = isAssigned ? "Assigned ✓" : "Assign Mission";
buttonClass = `assign-mission-btn ${isAssigned ? 'assigned' : ''}`;

// Change onclick to assignment instead of immediate run
onclick="game.assignMissionToExile('${areaId}', '${mission.missionId}')"
Step 3: Add Assignment Logic
File: Add to js/game.js:
javascriptassignMissionToExile(areaId, missionId) {
    // Check if mission is available
    if (!isMissionAvailable(areaId, missionId)) {
        this.log("Cannot assign to unavailable mission!", "failure");
        return;
    }
    
    // Assign the mission
    gameState.exile.assignedMission = { areaId, missionId };
    
    const missionData = getMissionData(areaId, missionId);
    this.log(`📋 ${gameState.exile.name} assigned to ${missionData.name}`, "info");
    
    // Update displays
    this.updateCommandCenterDisplay();
    this.updateWorldMapDisplay();
    this.saveGame();
},

unassignExile() {
    if (!gameState.exile.assignedMission) return;
    
    gameState.exile.assignedMission = null;
    this.log(`📋 ${gameState.exile.name} unassigned from mission`, "info");
    
    this.updateCommandCenterDisplay();
    this.updateWorldMapDisplay();
    this.saveGame();
},
Step 4: Update Process Day
File: Update js/game.js processDay method:
javascriptprocessDay() {
    // Check for assigned missions
    if (gameState.exile.assignedMission) {
        const { areaId, missionId } = gameState.exile.assignedMission;
        
        // Check if mission is still available (might have gone on cooldown)
        if (isMissionAvailable(areaId, missionId)) {
            this.log(`⚔️ ${gameState.exile.name} embarks on their assigned mission...`, "info");
            
            // Run the assigned mission
            this.runMission(`${areaId}.${missionId}`);
            
            // Check if mission went on cooldown - if so, unassign
            if (!isMissionAvailable(areaId, missionId)) {
                this.log(`📋 Mission went on cooldown - ${gameState.exile.name} unassigned`, "info");
                gameState.exile.assignedMission = null;
            }
        } else {
            this.log(`📋 Assigned mission unavailable - ${gameState.exile.name} unassigned`, "info");
            gameState.exile.assignedMission = null;
        }
    } else {
        this.log("⏳ Time passes... No missions assigned.", "info");
    }
    
    // Advance time
    timeState.currentDay++;
    
    // ... rest of existing processDay logic ...
},
Step 5: Update Command Center Display
File: Update js/game.js updateCommandCenterDisplay method:
javascriptupdateCommandCenterDisplay() {
    // ... existing code ...
    
    // Update assignment status
    const assignedMissionsEl = document.getElementById('assigned-missions-count');
    const processBtn = document.querySelector('.process-day-btn');
    
    if (gameState.exile.assignedMission) {
        const { areaId, missionId } = gameState.exile.assignedMission;
        const missionData = getMissionData(areaId, missionId);
        assignedMissionsEl.textContent = `${gameState.exile.name} → ${missionData.name}`;
        processBtn.classList.add('has-assignments');
    } else {
        assignedMissionsEl.textContent = "No missions assigned";
        processBtn.classList.remove('has-assignments');
    }
},
Step 6: Add CSS for Assignment States
File: Add to css/worldMap.css:
css.assign-mission-btn.assigned {
    background-color: #4CAF50;
    color: #000;
}

.assign-mission-btn.assigned:hover {
    background-color: #66BB6A;
}
Implementation Order:

Fix save/load (quick fix)
Add assignment tracking to gameState
Update world map UI to show assign/unassign
Add assignment logic methods
Update process day to run assigned missions
Update command center to show assignment status