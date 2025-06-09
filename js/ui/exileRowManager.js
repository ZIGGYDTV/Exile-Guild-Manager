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

    // Update a specific row's display
    updateRow(rowId, exile = null) {
        const row = document.querySelector(`[data-exile-id="${rowId}"]`);
        if (!row) return;

        if (!exile) {
            // Empty row
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

        // Build the row content based on exile state
        let mainAreaContent = '';
        let actionButtons = '';

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

            // Add more states as needed
        }

        row.innerHTML = `
            <div class="exile-status">
                <div class="exile-name">${exile.name}</div>
                <div class="exile-vitals">
                    <span>HP: ${exile.currentHp}/${exile.stats.life}</span>
                    <span>Morale: ${exile.morale}</span>
                </div>
            </div>
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
    }
};