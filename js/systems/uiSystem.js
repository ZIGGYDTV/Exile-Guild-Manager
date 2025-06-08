// UI System
// Handles all display updates, modals, and user interface interactions, except world map which is in worldMapSystem.js

const uiSystem = {
    // === CORE DISPLAY METHODS ===
    
    updateDisplay() {
        // Only update elements that still exist
        // Try to update old elements if they exist (for backwards compatibility)
        const elements = {
            'exile-name': gameState.exile.name,
            'exile-class': gameState.exile.class,
            'exile-level': gameState.exile.level,
            'exile-exp': gameState.exile.experience,
            'exile-exp-needed': gameState.exile.experienceNeeded,
            'stat-life': gameState.exile.stats.life,
            'stat-damage': gameState.exile.stats.damage,
            'stat-defense': gameState.exile.stats.defense,
            'power-rating': combatSystem.calculatePowerRating(),
            'morale-value': gameState.exile.morale,
            'morale-status': exileSystem.getMoraleStatus(gameState.exile.morale)
        };

        // Safely update elements that exist
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update resources
        document.getElementById('gold').textContent = gameState.resources.gold;
        document.getElementById('chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('exalted-orbs').textContent = gameState.resources.exaltedOrbs;
        this.updateResourceDisplay();

        // Apply morale effects before displaying
        game.applyMoraleEffects(gameState.exile);

        // Set morale color if element exists
        const moraleElement = document.getElementById('morale-status');
        if (moraleElement) {
            const moraleValue = gameState.exile.morale;
            if (moraleValue >= 85) moraleElement.style.color = '#4CAF50';
            else if (moraleValue >= 70) moraleElement.style.color = '#888';
            else if (moraleValue >= 50) moraleElement.style.color = '#ff9800';
            else moraleElement.style.color = '#f44336';
        }

        // Update exile summary for new UI
        this.updateExileSummary();
    },

    updateExileSummary() {
        // Update the compact exile summary on main screen
        document.getElementById('exile-name-summary').textContent = gameState.exile.name;
        document.getElementById('exile-class-summary').textContent = classDefinitions[gameState.exile.class].name;
        document.getElementById('exile-level-summary').textContent = gameState.exile.level;

        document.getElementById('exile-life-summary').textContent = gameState.exile.stats.life;
        document.getElementById('exile-damage-summary').textContent = gameState.exile.stats.damage;
        document.getElementById('exile-defense-summary').textContent = gameState.exile.stats.defense;
        document.getElementById('exile-morale-summary').textContent = gameState.exile.morale;

        // Update EXP bar
        const exp = gameState.exile.experience;
        const expNeeded = gameState.exile.experienceNeeded;
        const percent = Math.min(100, Math.round((exp / expNeeded) * 100));
        document.getElementById('exp-bar-fill').style.width = percent + "%";
        document.getElementById('exp-bar-label').textContent = `${exp} / ${expNeeded} EXP`;

        // Set morale color
        const moraleElement = document.getElementById('exile-morale-summary');
        const moraleValue = gameState.exile.morale;
        if (moraleValue >= 85) moraleElement.style.color = '#4CAF50';
        else if (moraleValue >= 70) moraleElement.style.color = '#888';
        else if (moraleValue >= 50) moraleElement.style.color = '#ff9800';
        else moraleElement.style.color = '#f44336';

        // Show passive points indicator
        const indicator = document.getElementById('passive-points-indicator');
        if (gameState.exile.passives.pendingPoints > 0) {
            indicator.style.display = 'block';
            indicator.textContent = `(+) ${gameState.exile.passives.pendingPoints} Passive Point${gameState.exile.passives.pendingPoints > 1 ? 's' : ''} Available`;
        } else {
            indicator.style.display = 'none';
        }
        // Show assignment status in exile summary 
        const assignment = exileSystem.getExileAssignment(gameState.exile.name);
        const assignmentBadge = document.getElementById('exile-assignment-badge');

        if (assignment) {
            // Show the assignment badge
            if (assignmentBadge) {
                assignmentBadge.style.display = 'inline-flex';
            }

            const missionData = getMissionData(assignment.areaId, assignment.missionId);
            const assignmentText = `📋 Assigned: ${missionData.name}`;
        }
    },

    updateCommandCenterDisplay() {
        // Update day displays
        document.getElementById('current-day-display').textContent = `(Day ${timeState.currentDay})`;
        document.getElementById('current-day-main').textContent = timeState.currentDay;

        // Update inventory count on main screen
        const inventoryCount = gameState.inventory.backpack.length;
        const countElement = document.getElementById('inventory-count-main');
        if (countElement) {
            countElement.textContent = `${inventoryCount}`;
        }
        // Update assignment status
        const assignedMissionsEl = document.getElementById('assigned-missions-count');
        const processBtn = document.querySelector('.process-day-btn');

        if (gameState.assignments.length > 0) {
            // Show assignment summary
            if (gameState.assignments.length === 1) {
                const assignment = gameState.assignments[0];
                const missionData = getMissionData(assignment.areaId, assignment.missionId);
                assignedMissionsEl.textContent = `${assignment.exileName} → ${missionData.name}`;
            } else {
                assignedMissionsEl.textContent = `${gameState.assignments.length} exiles assigned`;
            }
            processBtn.classList.add('has-assignments');
        } else {
            assignedMissionsEl.textContent = "No missions assigned";
            processBtn.classList.remove('has-assignments');
        }
    },

    updateResourceDisplay() {
        // Update main screen resources
        document.getElementById('gold').textContent = gameState.resources.gold;
        document.getElementById('chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('exalted-orbs').textContent = gameState.resources.exaltedOrbs;

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