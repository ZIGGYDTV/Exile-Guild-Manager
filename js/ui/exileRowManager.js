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
            const currentEncounter = activeMission.missionState && typeof activeMission.missionState.getCurrentEncounter === 'function'
                ? activeMission.missionState.getCurrentEncounter()
                : null;
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

    // Update handleEndTurn to properly process missions
    async handleEndTurn() {
        // Disable all end turn buttons
        document.querySelectorAll('.end-turn-btn').forEach(btn => btn.disabled = true);

        // Get all active missions without pending decisions
        const activeMissions = turnState.activeMissions.filter(m =>
            !turnState.pendingDecisions.find(d => d.exileId === m.exileId)
        );

        console.log("Processing turns for missions:", activeMissions);

        // Process all missions simultaneously
        const combatPromises = activeMissions.map(mission =>
            this.animateCombat(mission.exileId)
        );

        await Promise.all(combatPromises);

        // Increment turn counter
        turnState.currentTurn++;
        turnState.turnsToday++;

        // Check if day ended
        if (turnState.turnsToday > turnState.turnsPerDay) {
            turnState.currentDay++;
            turnState.turnsToday = 1;
            console.log(`New day: ${turnState.currentDay}`);
        }

        // Save game state
        game.saveGame();

        // Refresh all rows to show new states
        this.refreshAllRows();
    },

    async animateCombat(exileId) {
        console.log(`Starting combat animation for exile ${exileId}`);

        const exile = gameState.exiles.find(e => e.id === exileId);
        const row = document.querySelector(`[data-exile-id="${exileId}"]`);

        if (!row || !exile) return;

        const combatDisplay = row.querySelector('.combat-display');
        if (!combatDisplay) return;

        // Get the active mission to check combat log
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) return;

        // Process the turn
        const result = missionSystem.processMissionTurn(exileId);
        console.log("Turn result:", result);

        // Get the combat log from the last turn
        const combatLog = activeMission.missionState.combatLog;
        const lastCombat = combatLog[combatLog.length - 1];

        if (lastCombat && lastCombat.result && lastCombat.result.rounds) {
            const rounds = lastCombat.result.rounds;
            const finalOutcome = lastCombat.result.outcome;
            console.log(`Animating ${rounds.length} rounds of combat`);

            // Animate each round sequentially
            for (let i = 0; i < rounds.length; i++) {
                const round = rounds[i];
                const isLastRound = i === rounds.length - 1;
                console.log(`Round ${round.round}:`, round);

                // Update round indicator
                const roundIndicator = combatDisplay.querySelector('.round-indicator');
                if (roundIndicator) {
                    roundIndicator.textContent = `Round ${round.round} of 5`;
                }

                // Animate exile actions
                if (round.exileActions && round.exileActions.length > 0) {
                    for (const action of round.exileActions) {
                        if (action.type === 'no_attack') {
                            // Show timer indicator for no attack
                            await this.showNoAttackIndicator(combatDisplay, 'exile');
                        } else {
                            // Regular attack
                            const monsterDies = isLastRound && 
                                (finalOutcome === 'victory' || finalOutcome === 'culled') &&
                                action.targetHealthAfter <= 0;
                            
                            console.log("Exile attacks for", action.finalDamage, monsterDies ? "(KILLING BLOW)" : "");
                            await this.animateAttack(combatDisplay, 'exile', action.finalDamage, monsterDies);
                            
                            // Small delay between multiple attacks
                            if (round.exileActions.length > 1) {
                                await this.wait(100);
                            }
                        }
                    }
                }

                // Animate monster actions
                if (round.monsterActions && round.monsterActions.length > 0) {
                    for (const action of round.monsterActions) {
                        if (action.type === 'no_attack') {
                            // Show timer indicator for no attack
                            await this.showNoAttackIndicator(combatDisplay, 'monster');
                        } else {
                            // Regular attack
                            const exileDies = isLastRound && 
                                finalOutcome === 'death' &&
                                action.exileHealthAfter <= 0;
                            
                            console.log("Monster attacks for", action.finalDamage, exileDies ? "(KILLING BLOW)" : "");
                            await this.animateAttack(combatDisplay, 'monster', action.finalDamage, exileDies);
                            this.updateHealthBar(row, action.exileHealthAfter, exile.stats.life);
                            
                            // Small delay between multiple attacks
                            if (round.monsterActions.length > 1) {
                                await this.wait(100);
                            }
                        }
                    }
                }

                // If nothing happened this round (no attacks), still show the round
                if ((!round.exileActions || round.exileActions.length === 0) &&
                    (!round.monsterActions || round.monsterActions.length === 0)) {
                    await this.wait(1000); // Just wait to show the round happened
                }

                // Wait before next round
                await this.wait(1000);
            }

            // Show final outcome
            const roundIndicator = combatDisplay.querySelector('.round-indicator');
            if (lastCombat.result.outcome === 'victory') {
                roundIndicator.textContent = "Victory!";
                await this.wait(1000);
            } else if (lastCombat.result.outcome === 'culled') {
                roundIndicator.textContent = "Executed! (Culling Strike)";
                await this.wait(1000);
            }
        }

        // Handle the mission result
        if (result) {
            if (result.type === 'encounter_complete' && result.hasNextEncounter) {
                const roundIndicator = combatDisplay.querySelector('.round-indicator');
                roundIndicator.textContent = result.nextEncounter;
            } else if (result.type === 'decision_needed') {
                turnState.pendingDecisions.push({
                    exileId: exileId,
                    choices: result.choices
                });
            }
        }
    },

    // Add new method to show no-attack indicator
    async showNoAttackIndicator(combatDisplay, attacker) {
        const icon = combatDisplay.querySelector(`.${attacker}-icon`);
        if (!icon) return;
        
        // Create timer indicator
        const timer = document.createElement('div');
        timer.className = 'no-attack-indicator';
        timer.textContent = '⏳';
        timer.style.position = 'absolute';
        
        // Position relative to icon
        const iconRect = icon.getBoundingClientRect();
        const displayRect = combatDisplay.getBoundingClientRect();
        timer.style.left = `${iconRect.left - displayRect.left + iconRect.width/2}px`;
        timer.style.top = `${iconRect.top - displayRect.top - 10}px`;
        
        combatDisplay.appendChild(timer);
        
        // Remove after animation
        await this.wait(1000);
        timer.remove();
    },

    // Update animateAttack to handle multiple popups better
    async animateAttack(combatDisplay, attacker, damage, targetDies = false) {
        console.log(`Animating ${attacker} attack for ${damage} damage`);

        const attackerIcon = combatDisplay.querySelector(`.${attacker}-icon`);
        const targetIcon = combatDisplay.querySelector(`.${attacker === 'exile' ? 'monster' : 'exile'}-icon`);
        
        if (!attackerIcon || !targetIcon) return;
        
        // Add attacking animation
        attackerIcon.classList.add('attacking');
        
        // Create damage popup with slight position variation for multiple hits
        const existingPopups = combatDisplay.querySelectorAll('.damage-popup').length;
        const popup = document.createElement('div');
        popup.className = `damage-popup ${attacker}-damage`;
        popup.textContent = Math.floor(damage);
        
        // Offset position slightly for each additional popup
        if (existingPopups > 0) {
            popup.style.transform = `translateY(${-50 - (existingPopups * 15)}%)`;
        }
        
        combatDisplay.appendChild(popup);
        
        // Force animation start
        void popup.offsetWidth;
        
        // Death animation timing
        if (targetDies) {
            await this.wait(400);
            this.createBloodSplatter(combatDisplay, targetIcon);
            targetIcon.classList.add('dying');
            await this.wait(600);
        } else {
            await this.wait(600);
        }
        
        // Clean up
        attackerIcon.classList.remove('attacking');
        popup.remove();
    },

    // Create blood splatter effect
    createBloodSplatter(container, targetIcon) {
        const splatter = document.createElement('div');
        splatter.className = 'blood-splatter';

        // Position at target icon
        const targetRect = targetIcon.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        splatter.style.left = `${targetRect.left - containerRect.left}px`;
        splatter.style.top = `${targetRect.top - containerRect.top}px`;

        // Create multiple blood drops
        for (let i = 0; i < 6; i++) {
            const drop = document.createElement('div');
            drop.className = 'blood-drop';

            // Random size
            const size = Math.random() * 15 + 5;
            drop.style.width = `${size}px`;
            drop.style.height = `${size}px`;

            // Random direction
            const angle = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5);
            const distance = Math.random() * 30 + 20;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            drop.style.setProperty('--x', `${x}px`);
            drop.style.setProperty('--y', `${y}px`);
            drop.style.left = '40px'; // Center on icon
            drop.style.top = '40px';

            splatter.appendChild(drop);
        }

        container.appendChild(splatter);

        // Remove after animation
        setTimeout(() => splatter.remove(), 1000);
    },

    // Add helper method for health bar updates
    updateHealthBar(row, currentLife, maxLife) {
        const healthBar = row.querySelector('.health-bar .status-bar-fill');
        const healthText = row.querySelector('.health-bar .status-bar-text');

        if (healthBar && healthText) {
            const percentage = Math.max(0, (currentLife / maxLife) * 100);
            healthBar.style.width = `${percentage}%`;
            healthText.textContent = `${Math.max(0, currentLife)}/${maxLife}`;
        }
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