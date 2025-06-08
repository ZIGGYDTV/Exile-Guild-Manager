// UI System
// Handles all display updates, modals, and user interface interactions, except world map which is in worldMapSystem.js

class UISystem {
    constructor() {
        console.log("UI system initialized");
    }

    // === CORE DISPLAY METHODS ===
    
    // Main display update method
    updateDisplay() {
        // Will move from game.js
    }

    // === LOG SYSTEM ===
    
    log(message, type = "info", isHtml = false) {
        // Will move from game.js
    }

    // === MODAL MANAGEMENT ===
    // Character screen, day report, world map, etc.

    // === UPDATE METHODS ===
    // Specific UI updates for different game areas
}

// Create singleton instance
const uiSystem = new UISystem();

// Export for module use
export { uiSystem };