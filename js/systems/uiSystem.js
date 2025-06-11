// UI System
// Handles all display updates, modals, and user interface interactions, except world map which is in worldMapSystem.js

const uiSystem = {
    // === CORE DISPLAY METHODS ===
    
    updateDisplay() {
        // Update resource bar
        this.updateResourceDisplay();
    
        // Update exile rows with new system
        if (typeof exileRowManager !== 'undefined') {
            exileRowManager.refreshAllRows();
        }
        
        // Apply morale effects
        if (gameState.exile) {
            game.applyMoraleEffects(gameState.exile);
        }
    },


    updateResourceDisplay() {
     // Update main screen resources if they exist
     const goldEl = document.getElementById('gold');
     const chaosEl = document.getElementById('chaos-orbs');
     const exaltedEl = document.getElementById('exalted-orbs');

     if (goldEl) goldEl.textContent = gameState.resources.gold;
     if (chaosEl) chaosEl.textContent = gameState.resources.chaosOrbs;
     if (exaltedEl) exaltedEl.textContent = gameState.resources.exaltedOrbs;

        // Optional: Add the glow effect for currency changes
        const chaosElem = document.getElementById('chaos-orbs');
        const exaltedElem = document.getElementById('exalted-orbs');

        // Store previous values using data attributes
        const prevChaos = parseInt(chaosElem.getAttribute('data-prev') || "0", 10);
        const prevExalted = parseInt(exaltedElem.getAttribute('data-prev') || "0", 10);

        // Update stored values
        chaosElem.setAttribute('data-prev', gameState.resources.chaosOrbs);
        exaltedElem.setAttribute('data-prev', gameState.resources.exaltedOrbs);
    },

    // === LOG SYSTEM ===
    
    log(message, type = "info", isHtml = false) {
        const logContainer = document.getElementById('log');
        if (!logContainer) {
            // If no log container, store messages for later
            if (!this.pendingLogs) this.pendingLogs = [];
            this.pendingLogs.push({ message, type, isHtml, time: new Date() });
            console.log(`[${type}] ${message}`); // Also log to console
            return;
        }
    
        // If we have pending logs, add them first
        if (this.pendingLogs && this.pendingLogs.length > 0) {
            this.pendingLogs.forEach(log => {
                const entry = document.createElement('div');
                entry.className = `log-entry ${log.type}`;
                const timeString = log.time.toLocaleTimeString();
                if (log.isHtml) {
                    entry.innerHTML = `[${timeString}] ${log.message}`;
                } else {
                    entry.textContent = `[${timeString}] ${log.message}`;
                }
                logContainer.insertBefore(entry, logContainer.firstChild);
            });
            this.pendingLogs = [];
        }
    
        // Add the new log entry
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        if (isHtml) {
            entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
        } else {
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        }
        logContainer.insertBefore(entry, logContainer.firstChild);
    
        // Always scroll to top to show newest entry
        logContainer.scrollTop = 0;
    
        // Keep only last 100 entries
        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
};

// Make available globally
window.uiSystem = uiSystem;

// Export for module use
export { uiSystem };