// Exile Row Manager - Handles the display and state of exile rows
const exileRowManager = {
    // Track row states
    rowStates: {
        1: { state: 'empty', exileId: null },
        2: { state: 'empty', exileId: null },
        3: { state: 'empty', exileId: null },
        4: { state: 'empty', exileId: null },
        5: { state: 'empty', exileId: null },
        6: { state: 'empty', exileId: null }
    },

    // Initialize the system
    init() {
        // Add click handlers to all exile rows
        document.querySelectorAll('.exile-row').forEach(row => {
            row.addEventListener('click', (e) => this.handleRowClick(e));
        });

        // Update all rows with current game state
        this.refreshAllRows();
    },

    // Handle clicking on an exile row
    handleRowClick(event) {
        const row = event.currentTarget;
        const rowId = parseInt(row.dataset.exileId);
        const rowState = this.rowStates[rowId];

        if (rowState.state === 'empty') {
            // Can't select empty rows
            return;
        }

        // Toggle selection
        this.selectRow(rowId);
    },

    // Select a specific row
    selectRow(rowId) {
        // Clear other selections
        document.querySelectorAll('.exile-row').forEach(row => {
            row.classList.remove('selected');
        });

        // Select this row
        const row = document.querySelector(`[data-exile-id="${rowId}"]`);
        row.classList.add('selected');

        // Update game state with selected exile
        gameState.selectedExileId = this.rowStates[rowId].exileId;

        // Remove this line that changes tabs:
        // this.showExileDetails(this.rowStates[rowId].exileId);

        // Instead, refresh the current dynamic display tab with new context
        this.refreshCurrentDisplay();
    },

    // Add this new method to refresh whatever tab is currently active
    refreshCurrentDisplay() {
        // Tell the dynamic display manager to refresh its current tab
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.refreshCurrentTab();
        }
    },

    // Open mission assignment from Exile Row Button
    openMissionAssignment(rowId) {
        // Select this row first
        this.selectRow(rowId);

        // Switch to world map tab
        dynamicDisplayManager.switchTab('world');
    },

    // Update the updateRow method to support the new combat display
    updateRow(rowId, exile = null) {
        const row = document.querySelector(`[data-exile-id="${rowId}"]`);
        if (!row) return;

        if (!exile) {
            // Empty row - keep your existing empty row code
            this.rowStates[rowId] = { state: 'empty', exileId: null };
            row.className = 'exile-row empty';
            row.innerHTML = `
            <div class="exile-status">
                <div class="exile-name">Empty Slot</div>
                <div class="exile-vitals">
                    <span>HP: --</span>
                    <span>Morale: --</span>
                </div>
            </div>
            <div class="exile-main-area">
                <div class="idle-message">No exile assigned</div>
            </div>
            <div class="exile-actions"></div>
        `;
            return;
        }

        // Update row state
        this.rowStates[rowId] = {
            state: exile.status || 'idle',
            exileId: exile.id
        };

        // Update row display based on state
        row.className = `exile-row ${exile.status || 'idle'}`;

        // Build status area with new status bars
        const statusHTML = `
        <div class="exile-status">
            <div class="exile-name">${exile.name}</div>
            <div class="status-bars">
                <div class="status-bar health-bar">
                    <div class="status-bar-fill" style="width: ${(exile.currentLife || exile.stats.life) / exile.stats.life * 100}%"></div>
                    <div class="status-bar-text">${exile.currentLife || exile.stats.life}/${exile.stats.life}</div>
                </div>
                <div class="status-bar morale-bar">
                    <div class="status-bar-fill" style="width: ${exile.morale}%"></div>
                    <div class="status-bar-text">${exile.morale}/100</div>
                </div>
                <div class="status-bar vitality-bar">
                    <div class="status-bar-fill" style="width: 100%"></div>
                    <div class="status-bar-text">100/100</div>
                </div>
            </div>
        </div>
    `;

        // Build main area content based on exile state
        let mainAreaContent = '';
        let actionButtons = '';

        // Check if exile is in active mission
        const activeMission = turnState.activeMissions.find(m => m.exileId === exile.id);

        if (activeMission && activeMission.missionState) {
            const currentEncounter = activeMission.missionState.getCurrentEncounter();
            if (currentEncounter) {
                // Show combat display for active missions
                mainAreaContent = `
                <div class="combat-display" data-exile-id="${exile.id}">
                    <div class="combat-icon exile-icon" data-side="exile">⚔️</div>
                    <div class="vs-text">VS</div>
                    <div class="combat-icon monster-icon" data-side="monster">👹</div>
                    <div class="round-indicator">Ready - ${currentEncounter.getDescription()}</div>
                </div>
            `;

                // Check for pending decisions
                const pendingDecision = turnState.pendingDecisions.find(d => d.exileId === exile.id);
                if (pendingDecision) {
                    actionButtons = pendingDecision.choices.map(choice => `
                    <button class="btn-small decision-btn ${choice.warning ? 'warning' : ''}" 
                            onclick="exileRowManager.handleDecision(${exile.id}, '${choice.id}')">
                        ${choice.label}
                    </button>
                `).join('');
                } else {
                    actionButtons = `
                    <button class="btn-small end-turn-btn" onclick="exileRowManager.handleEndTurn()">
                        End Turn
                    </button>
                `;
                }
            }
        } else {
            // Use existing status-based display
            switch (exile.status) {
                case 'idle':
                case 'resting':
                    mainAreaContent = `<div class="idle-message">Resting in town</div>`;
                    actionButtons = `<button class="btn-small" onclick="exileRowManager.assignToMission(${rowId})">Assign Mission</button>`;
                    break;

                case 'assigned':
                    mainAreaContent = `<div class="assigned-message">Ready for deployment</div>`;
                    actionButtons = `<button class="btn-small" onclick="exileRowManager.unassign(${rowId})">Cancel</button>`;
                    break;

                case 'in_mission':
                    mainAreaContent = `<div class="mission-progress">Mission in progress...</div>`;
                    break;
            }
        }

        // Update the row HTML
        row.innerHTML = statusHTML + `
        <div class="exile-main-area">
            ${mainAreaContent}
        </div>
        <div class="exile-actions">
            ${actionButtons}
        </div>
    `;
    },

    // Refresh all rows from game state
    refreshAllRows() {
        // Clear all row states first
        for (let i = 1; i <= 6; i++) {
            this.rowStates[i] = { state: 'empty', exileId: null };
        }

        // Populate rows with exiles from the new system
        gameState.exiles.forEach((exile, index) => {
            if (index < 6) { // Only show first 6 exiles
                const rowId = index + 1;
                this.updateRow(rowId, exile);
                this.rowStates[rowId] = {
                    state: exile.status || 'idle',
                    exileId: exile.id
                };
            }
        });

        // Clear remaining rows
        for (let i = gameState.exiles.length + 1; i <= 6; i++) {
            this.updateRow(i, null);
        }
    },

    // Update the existing placeholder method
    assignToMission(rowId) {
        // Just call the new method - it will handle everything
        this.openMissionAssignment(rowId);
    },

    unassign(rowId) {
        const rowState = this.rowStates[rowId];
        if (!rowState || !rowState.exileId) return;

        const exile = gameState.exiles.find(e => e.id === rowState.exileId);
        if (!exile) return;

        // Find and remove assignment
        if (turnState.assignments) {
            const assignmentIndex = turnState.assignments.findIndex(a => a.exileId === exile.id);
            if (assignmentIndex !== -1) {
                turnState.assignments.splice(assignmentIndex, 1);
                uiSystem.log(`${exile.name} unassigned from mission`, "info");
            }
        }

        // Update exile status
        exile.status = 'idle';

        // Update the row display
        this.updateRow(rowId, exile);

        // Refresh dynamic display if on world tab
        if (typeof dynamicDisplayManager !== 'undefined' && dynamicDisplayManager.currentTab === 'world') {
            dynamicDisplayManager.refreshCurrentTab();
        }

        // Save game state
        game.saveGame();
    },

    // Helper method to find row for an exile
    getRowForExile(exileId) {
        for (let rowId in this.rowStates) {
            if (this.rowStates[rowId].exileId === exileId) {
                return parseInt(rowId);
            }
        }
        return null;
    },

    // Handle End Turn for all exiles
    async handleEndTurn() {
        // Disable all end turn buttons
        document.querySelectorAll('.end-turn-btn').forEach(btn => btn.disabled = true);

        // Get all active missions without pending decisions
        const activeMissions = turnState.activeMissions.filter(m =>
            !turnState.pendingDecisions.find(d => d.exileId === m.exileId)
        );

        // Process all missions simultaneously
        const combatPromises = activeMissions.map(mission =>
            this.animateCombat(mission.exileId)
        );

        await Promise.all(combatPromises);

        // Refresh all rows to show new states
        this.refreshAllRows();
    },

    // Animate combat for one exile
    async animateCombat(exileId) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        const row = document.querySelector(`[data-exile-id="${exile.id}"]`);
        if (!row || !exile) return;

        const combatDisplay = row.querySelector('.combat-display');
        if (!combatDisplay) return;

        // Process the turn
        const result = missionSystem.processMissionTurn(exileId);

        if (!result || !result.turnResult) return;

        // Animate the combat rounds
        const rounds = result.turnResult.rounds;

        for (let i = 0; i < rounds.length; i++) {
            const round = rounds[i];

            // Update round indicator
            const roundIndicator = combatDisplay.querySelector('.round-indicator');
            roundIndicator.textContent = `Round ${round.round} of 5`;

            // Animate exile attacks
            for (const action of round.exileActions) {
                await this.animateAttack(combatDisplay, 'exile', action.finalDamage);
            }

            // Animate monster attacks
            for (const action of round.monsterActions) {
                await this.animateAttack(combatDisplay, 'monster', action.finalDamage);
                // Update health bar
                const healthPercent = (action.exileHealthAfter / exile.stats.life) * 100;
                row.querySelector('.health-bar .status-bar-fill').style.width = `${healthPercent}%`;
                row.querySelector('.health-bar .status-bar-text').textContent =
                    `${action.exileHealthAfter}/${exile.stats.life}`;
            }

            // Wait between rounds
            await this.wait(500);
        }

        // Handle outcome
        if (result.type === 'decision_needed') {
            // Store pending decision
            turnState.pendingDecisions.push({
                exileId: exileId,
                choices: result.choices
            });
        }
    },

    // Animate a single attack
    async animateAttack(combatDisplay, attacker, damage) {
        const attackerIcon = combatDisplay.querySelector(`.${attacker}-icon`);

        // Add attacking animation
        attackerIcon.classList.add('attacking');

        // Create damage popup
        const popup = document.createElement('div');
        popup.className = `damage-popup ${attacker}-damage`;
        popup.textContent = Math.floor(damage);
        combatDisplay.appendChild(popup);

        // Remove after animation
        setTimeout(() => {
            attackerIcon.classList.remove('attacking');
            popup.remove();
        }, 1000);

        await this.wait(300);
    },

    // Utility wait function
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Handle player decision
    handleDecision(exileId, decision) {
        // Process the decision
        const result = missionSystem.processDecision(exileId, decision);

        // Remove from pending decisions
        turnState.pendingDecisions = turnState.pendingDecisions.filter(d => d.exileId !== exileId);

        // Refresh this exile's row
        const rowId = this.getRowForExile(exileId);
        if (rowId) {
            const exile = gameState.exiles.find(e => e.id === exileId);
            this.updateRow(rowId, exile);
        }
    }

};