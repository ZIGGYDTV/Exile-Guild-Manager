// ===== RESISTANCE SYSTEM CONSTANTS =====
const RESISTANCE_CAPS = {
    default: 75,        // Normal resistance cap
    hardMax: 90         // Absolute maximum (even with +max res gear)
};

// ===== TIME/TURN SYSTEM =====
const turnState = {
    currentTurn: 1,      // Total turns taken ever
    currentDay: 1,       // Current day (turn / turnsPerDay)
    turnsToday: 1,       // Turns taken today (1-10)
    turnsPerDay: 10,     // Config: how many turns per day
    assignments: [
        // { exileId: 1, areaId: "beach", missionId: "shorelineExploration", encountersRemaining: 3 }
    ],
    
    // Missions currently being processed
    activeMissions: [],
    
    // Pending player decisions (retreat, use flask, etc.)
    pendingDecisions: []
};

// ===== MAIN GAME STATE =====
const gameState = {
    // === EXILE MANAGEMENT ===
    exiles: [], // Array of all exiles (up to 6)
    selectedExileId: null, // Currently selected exile for UI context
    nextExileId: 1, // Auto-incrementing ID generator
    maxExiles: 6, // Maximum exile slots
    
    // Death tracking
    fallenExiles: [], // Array of dead exiles with full data snapshots
    
    // Passive selection state
    currentPassiveChoices: null,

    // === SHARED RESOURCES ===
    resources: {
        gold: 50,
        chaosOrbs: 0,
        exaltedOrbs: 1,
        materials: 0, // For future crafting
        rations: 0    // For future vitality system
    },
    
    // === INVENTORY ===
    inventory: {
        items: [], 
    },
    
    // === INVENTORY GRID LAYOUT ===
    inventoryGridData: {
        // Structure: { itemId: { tabId, x, y, rotation, locked } }
        itemPositions: {},
        // Track which tab was last active
        activeTab: 'tab1'
    },
    
    // === SETTINGS ===
    settings: {
        autoSave: true,
        combatSpeed: 1, // 1x, 2x, skip
        pauseOnDecisions: true
    }
};

console.log("Initial gold value:", gameState.resources.gold);

// ===== WORLD STATE =====
const worldState = {
    // === DISCOVERED AREAS ===
    areas: {
        beach: {
            discovered: true,
            name: "The Beach",
            scoutingProgress: 0,
            totalExploration: 0, // 0-100%
            
            missions: {
                shorelineExploration: {
                    discovered: true,
                    completions: 0,
                    firstCompleted: false,
                    lastCompleted: null,
                    cooldownUntil: null,
                    bestTime: null,
                    casualtyCount: 0,
                    currentInstance: null  
                },
                crab_hunting: {
                    discovered: true,
                    completions: 0,
                    firstCompleted: false,
                    lastCompleted: null,
                    cooldownUntil: null,
                    bestTime: null,
                    casualtyCount: 0,
                    currentInstance: null  
                }
                // More missions discovered through play
            }
        }
        // More areas discovered through play
    },
    
    // // === AREA CONNECTIONS ===
    // connections: {
    //     beach_to_swamp: {
    //         discovered: false,  // Has player learned this exists?
    //         unlocked: false,    // Can player travel here?
    //         from: "beach",
    //         to: "swamp",
    //         requirements: {
    //             type: "mission",  // mission, boss, exploration, item
    //             target: "wreckageScavenging",
    //             value: 1 // Complete wreckage scavenging once
    //         }
    //     },
    //     beach_to_cliffs: {
    //         discovered: false,
    //         unlocked: false,
    //         from: "beach",
    //         to: "cliffs", 
    //         requirements: {
    //             type: "boss",
    //             target: "tideWarden",
    //             value: 1
    //         }
    //     }
    //     // More connections discovered through play
    // },
    
    // === GLOBAL WORLD EVENTS ===
    activeEvents: [], // Future: storms, invasions, etc.
    eventHistory: []  // Track past events
};

// ===== HELPER FUNCTIONS =====

// Get current exile (for backwards compatibility during transition)
function getCurrentExile() {
    if (!gameState.selectedExileId) return null;
    return gameState.exiles.find(e => e.id === gameState.selectedExileId);
}

// Get living exiles
function getLivingExiles() {
    return gameState.exiles.filter(e => e.status !== 'dead');
}

// Get available exiles (not on mission or dead)
function getAvailableExiles() {
    return gameState.exiles.filter(e => 
        e.status === 'idle' || e.status === 'resting'
    );
}

// Check if an area is accessible
function isAreaAccessible(areaId) {
    // Starting area is always accessible
    if (worldState.areas[areaId]?.discovered) return true;
    
    // Check connections
    for (const connection of Object.values(worldState.connections)) {
        if (connection.to === areaId && connection.unlocked) {
            return true;
        }
    }
    
    return false;
}

// Get accessible areas
function getAccessibleAreas() {
    return Object.entries(worldState.areas)
        .filter(([areaId, area]) => area.discovered || isAreaAccessible(areaId))
        .map(([areaId, area]) => ({ id: areaId, ...area }));
}

// Check if mission is available
function isMissionAvailable(areaId, missionId) {
    const mission = worldState.areas[areaId]?.missions[missionId];
    if (!mission || !mission.discovered) return false;
    
    // Check cooldown
    if (mission.cooldownUntil && turnState.currentTurn < mission.cooldownUntil) {
        return false;
    }
    
    return true;
}

// Get all available missions across all areas
function getAllAvailableMissions() {
    const available = [];
    
    for (const [areaId, area] of Object.entries(worldState.areas)) {
        if (!isAreaAccessible(areaId)) continue;
        
        for (const [missionId, mission] of Object.entries(area.missions)) {
            if (isMissionAvailable(areaId, missionId)) {
                available.push({
                    areaId,
                    missionId,
                    areaName: area.name,
                    ...mission
                });
            }
        }
    }
    
    return available;
}

// Save/Load helpers
function saveGameState() {
    if (!gameState.settings.autoSave) return;
    
    const saveData = {
        version: 1,
        gameState: gameState,
        worldState: worldState,
        turnState: turnState,
        timestamp: Date.now()
    };
    
    localStorage.setItem('exileManagerSave', JSON.stringify(saveData));
}

function loadGameState() {
    const savedData = localStorage.getItem('exileManagerSave');
    if (!savedData) return false;
    
    try {
        const data = JSON.parse(savedData);
        
        // Merge loaded data with defaults (in case structure changed)
        Object.assign(gameState, data.gameState);
        Object.assign(worldState, data.worldState);
        Object.assign(turnState, data.turnState);
        
        return true;
    } catch (error) {
        console.error('Failed to load save:', error);
        return false;
    }
}