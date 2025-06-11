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
                <div class="status-bar vitality-bar">
                    <div class="status-bar-fill" style="width: 100%"></div>
                    <div class="status-bar-text">100/100</div>
                </div>
                <div class="status-bar morale-bar">
                    <div class="status-bar-fill" style="width: ${exile.morale}%"></div>
                    <div class="status-bar-text">${exile.morale}/100</div>
                </div>
                <div class="status-bar exp-bar">
                    <div class="status-bar-fill" style="width: ${exile.experience}/${exile.experienceNeeded}"></div>
                    <div class="status-bar-text">${exile.experience}/${exile.experienceNeeded}</div>
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
                <div class="combat-area" data-exile-id="${exile.id}">
                    <div class="encounter-info">Ready - ${currentEncounter.getDescription()}</div>
                    <div class="combat-display">
                        <div class="combat-icon exile-icon" data-side="exile">⚔️</div>
                        <div class="vs-text">VS</div>
                        <div class="monster-icon-wrapper">
                            <div class="monster-health-ring">
                                <svg class="health-ring-svg" viewBox="0 0 40 40">
                                    <circle class="health-ring-bg" cx="20" cy="20" r="18" />
                                    <circle class="health-ring-fill" cx="20" cy="20" r="18" 
                                            stroke-dasharray="${113.1}" 
                                            stroke-dashoffset="0" />
                                </svg>
                            </div>
                            <div class="combat-icon monster-icon" data-side="monster">👹</div>
                        </div>
                    </div>
                </div>
            `;

                        // Initialize monster health bar after HTML is added
        setTimeout(() => this.initializeMonsterHealthBar(exile.id, currentEncounter.monster), 0);

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
                    // Show retreat button when combat is ready (between rounds)
                    const retreatInfo = this.getRetreatInfo(exile.id, currentEncounter);
                    if (retreatInfo.available) {
                        actionButtons = `
                            <button class="btn-small retreat-btn ${retreatInfo.type === 'risky' ? 'warning' : 'info'}" 
                                    onclick="exileRowManager.showRetreatOptions(${exile.id})"
                                    title="${retreatInfo.description}">
                                ${retreatInfo.type === 'risky' ? '⚠️ Risky Retreat' : '✓ Safe Retreat'}
                            </button>
                        `;
                    } else {
                        // No action buttons during active combat - use global End Turn button
                        actionButtons = '';
                    }
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

    // Initialize monster health bar with full health
    initializeMonsterHealthBar(exileId, monster) {
        const combatArea = document.querySelector(`[data-exile-id="${exileId}"] .combat-area`);
        const combatDisplay = combatArea ? combatArea.querySelector('.combat-display') : null;
        if (!combatDisplay || !monster) return;

        this.updateMonsterHealthBar(combatDisplay, monster.currentLife, monster.life);
    },

    // Update monster health bar
    updateMonsterHealthBar(combatDisplay, currentHealth, maxHealth) {
        const healthRingFill = combatDisplay.querySelector('.health-ring-fill');
        const healthRing = combatDisplay.querySelector('.monster-health-ring');
        if (!healthRingFill) return;

        const circumference = 113.1; // 2 * Math.PI * 18 (radius)
        const healthPercent = Math.max(0, currentHealth / maxHealth);
        const offset = circumference * (1 - healthPercent);

        healthRingFill.style.strokeDashoffset = offset;

        // If health is 0 or below, immediately hide the entire health ring
        if (currentHealth <= 0) {
            if (healthRing) {
                healthRing.style.opacity = '0';
                healthRing.style.transition = 'opacity 0.3s ease-out';
            }
            return;
        }

        // Change color based on health level
        if (healthPercent > 0.6) {
            healthRingFill.style.stroke = '#cc0000'; // Red
        } else if (healthPercent > 0.3) {
            healthRingFill.style.stroke = '#960800'; // darker red
        } else {
            healthRingFill.style.stroke = '#470400'; // very dark red (low health)
        }
    },

    // Start monster death animation (without cleanup - used for victory/culling)
    async startMonsterDeathAnimation(combatDisplay) {
        const monsterIcon = combatDisplay.querySelector('.monster-icon');
        const healthRing = combatDisplay.querySelector('.monster-health-ring');
        
        if (!monsterIcon || monsterIcon.classList.contains('dying')) return;

        // Immediately hide health ring
        if (healthRing) {
            healthRing.style.opacity = '0';
            healthRing.style.transition = 'opacity 0.3s ease-out';
        }

        // Start death animation for monster only
        monsterIcon.classList.add('dying');

        // Wait for animation to complete (1.5s as defined in CSS)
        await this.wait(1500);
    },

    // Animate monster death and disappearance (handles cleanup)
    async animateMonsterDeath(combatDisplay) {
        const monsterIcon = combatDisplay.querySelector('.monster-icon');
        const healthRing = combatDisplay.querySelector('.monster-health-ring');
        
        if (!monsterIcon) return;

        // Immediately hide health ring if not already hidden
        if (healthRing && healthRing.style.opacity !== '0') {
            healthRing.style.opacity = '0';
            healthRing.style.transition = 'opacity 0.3s ease-out';
        }

        // If not already dying, start the death animation
        if (!monsterIcon.classList.contains('dying')) {
            monsterIcon.classList.add('dying');
            // Wait for death animation to complete
            await this.wait(1500);
        } else {
            // Animation already started, just wait for it to finish if needed
            await this.wait(500); // Some buffer time for any remaining animation
        }

        // Remove dying class and hide elements
        monsterIcon.classList.remove('dying');
        
        // Set final state manually
        monsterIcon.style.opacity = '0';
        monsterIcon.style.transform = 'translateY(30px) scale(0.5)';
        
        // Ensure health ring is completely hidden
        if (healthRing) {
            healthRing.style.display = 'none';
            healthRing.style.opacity = '0';
        }
    },

    // Animate new monster spawning
    async animateMonsterSpawn(combatDisplay, newMonster) {
        const monsterIcon = combatDisplay.querySelector('.monster-icon');
        const monsterWrapper = combatDisplay.querySelector('.monster-icon-wrapper');
        const healthRing = combatDisplay.querySelector('.monster-health-ring');
        const healthRingBg = combatDisplay.querySelector('.health-ring-bg');
        const healthRingFill = combatDisplay.querySelector('.health-ring-fill');
        
        if (!monsterIcon || !monsterWrapper) return;

        // Reset monster icon position and add spawning class
        monsterIcon.style.opacity = '1';
        monsterIcon.style.transform = '';
        monsterIcon.classList.add('spawning');
        monsterWrapper.classList.add('spawning');

        // Reset and animate health ring
        if (healthRing) {
            healthRing.style.display = 'block'; // Make sure it's visible again
            healthRing.style.opacity = '1';
            healthRing.style.transform = ''; // Reset any death transform
        }
        
        // Reset individual ring elements
        if (healthRingBg) {
            healthRingBg.style.opacity = '1';
        }
        if (healthRingFill) {
            healthRingFill.style.opacity = '1';
            healthRingFill.classList.add('resetting');
            
            // Reset health bar to full
            this.updateMonsterHealthBar(combatDisplay, newMonster.currentLife, newMonster.life);
        }

        // Wait for spawn animation
        await this.wait(800);

        // Clean up animation classes
        monsterIcon.classList.remove('spawning');
        monsterWrapper.classList.remove('spawning');
        if (healthRingFill) {
            healthRingFill.classList.remove('resetting');
        }
    },

    // Check if we need to transition to next encounter
    async handleEncounterTransition(exileId, result) {
        if (result.type === 'encounter_complete' && result.hasNextEncounter) {
            const rowElement = document.querySelector(`[data-exile-id="${exileId}"]`);
            const combatArea = rowElement ? rowElement.querySelector('.combat-area') : null;
            const combatDisplay = combatArea ? combatArea.querySelector('.combat-display') : null;
            
            if (combatDisplay) {
                // Animate monster death and disappearance
                await this.animateMonsterDeath(combatDisplay);
                
                // Get the new encounter
                const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
                if (activeMission) {
                    const newEncounter = activeMission.missionState.getCurrentEncounter();
                    if (newEncounter) {
                        // Show transition message  
                        const encounterInfo = rowElement ? rowElement.querySelector('.encounter-info') : null;
                        if (encounterInfo) {
                            encounterInfo.textContent = `Transitioning to next encounter...`;
                        }
                        
                        // Small pause for dramatic effect
                        await this.wait(500);
                        
                        // Update encounter info for new encounter
                        if (encounterInfo) {
                            encounterInfo.textContent = `Next Encounter - ${newEncounter.getDescription()}`;
                        }
                        
                        // Animate new monster spawning
                        await this.animateMonsterSpawn(combatDisplay, newEncounter.monster);
                        
                        // Update encounter info to ready state
                        if (encounterInfo) {
                            encounterInfo.textContent = `Ready - ${newEncounter.getDescription()}`;
                        }
                    }
                }
            }
        }
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

    // Global End Turn handler - processes all active missions simultaneously
    // Called by primary End Turn button in resource bar and Enter key shortcut
    async handleEndTurn() {
        // Disable all end turn buttons and update text to show processing
        document.querySelectorAll('.end-turn-btn').forEach(btn => {
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.dataset.originalText = originalText;
        });

        try {
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

            // Update turn display in UI
            const turnDisplay = document.getElementById('current-turn');
            if (turnDisplay) {
                turnDisplay.textContent = turnState.currentTurn;
            }

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

        } catch (error) {
            console.error("Error during turn processing:", error);
            uiSystem.log("⚠️ An error occurred during turn processing. Please try again.", "failure");
        } finally {
            // Always re-enable buttons, even if there was an error
            document.querySelectorAll('.end-turn-btn').forEach(btn => {
                btn.disabled = false;
                const originalText = btn.dataset.originalText;
                if (originalText) {
                    btn.textContent = originalText;
                    btn.removeAttribute('data-original-text');
                }
            });
        }
    },

    async animateCombat(exileId) {
        console.log(`Starting combat animation for exile ${exileId}`);

        const exile = gameState.exiles.find(e => e.id === exileId);
        const row = document.querySelector(`[data-exile-id="${exileId}"]`);

        if (!row || !exile) return;

        const combatArea = row.querySelector('.combat-area');
        const combatDisplay = combatArea ? combatArea.querySelector('.combat-display') : null;
        if (!combatDisplay) return;

        // Get the active mission to check combat log
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        if (!activeMission) return;

        // Store monster reference at start of animation (before it potentially gets cleared)
        const currentEncounter = activeMission.missionState.getCurrentEncounter();
        const monster = currentEncounter ? currentEncounter.monster : null;

        // Process the turn - rewards will NOT be applied for mission completion
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

                // Update encounter info
                const encounterInfo = row.querySelector('.encounter-info');
                if (encounterInfo) {
                    encounterInfo.textContent = `Round ${round.round} of 5`;
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
                            
                            // Update monster health bar (use stored monster reference)
                            if (monster) {
                                this.updateMonsterHealthBar(combatDisplay, action.targetHealthAfter, monster.life);
                            }

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
            const encounterInfo = row.querySelector('.encounter-info');
            if (lastCombat.result.outcome === 'victory') {
                if (encounterInfo) {
                    encounterInfo.textContent = "Victory!";
                }
                await this.wait(500); // Brief pause to show victory message
                
                // Start unified death animation
                await this.startMonsterDeathAnimation(combatDisplay);
                
            } else if (lastCombat.result.outcome === 'culled') {
                if (encounterInfo) {
                    encounterInfo.textContent = "Executed! (Culling Strike)";
                }
                await this.wait(500); // Brief pause to show culling message
                
                // Start unified death animation
                await this.startMonsterDeathAnimation(combatDisplay);
            }
        }

        // Handle the mission result
        if (result) {
            if (result.type === 'encounter_complete' && result.hasNextEncounter) {
                // Handle encounter transition with animations
                await this.handleEncounterTransition(exileId, result);
            } else if (result.type === 'mission_complete') {
                // NOW apply the mission completion rewards after animation completes
                missionSystem.applyMissionRewards(exileId, result.rewards);
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
        timer.style.left = `${iconRect.left - displayRect.left + iconRect.width / 2}px`;
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
    },

    // Get retreat information for an exile
    getRetreatInfo(exileId, currentEncounter) {
        if (!currentEncounter || !currentEncounter.monster) {
            return { available: false };
        }

        const monster = currentEncounter.monster;
        const isMonsterAlive = monster.currentLife > 0;

        if (isMonsterAlive) {
            // Risky retreat - monster is alive (using the 90% from encounterSystem)
            const retreatChance = 90; // Match encounterSystem's 90% chance
            return {
                available: true,
                type: 'risky',
                chance: retreatChance,
                description: `${retreatChance}% chance to escape. Failure means monster gets 1 free attack!`
            };
        } else {
            // Safe retreat - monster is dead, can safely retreat
            return {
                available: true,
                type: 'safe',
                description: 'Safely retreat from the encounter with no penalties.'
            };
        }
    },

    // Show retreat confirmation dialog
    showRetreatOptions(exileId) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        
        if (!exile || !activeMission) return;

        const currentEncounter = activeMission.missionState.getCurrentEncounter();
        const retreatInfo = this.getRetreatInfo(exileId, currentEncounter);

        if (!retreatInfo.available) return;

        let message;
        let confirmText = 'Retreat';
        
        if (retreatInfo.type === 'risky') {
            message = `${exile.name} wants to retreat from combat!\n\n` +
                     `⚠️ RISKY RETREAT:\n` +
                     `• ${retreatInfo.chance}% chance of success\n` +
                     `• If failed: Monster gets 1 free attack\n` +
                     `• 50% gold loss, 50% item loss\n` +
                     `• 50% chance to lose each orb type\n` +
                     `• Experience is preserved\n\n` +
                     `Are you sure you want to risk it?`;
            confirmText = 'Risk It';
        } else {
            message = `${exile.name} can safely retreat from this encounter.\n\n` +
                     `✓ SAFE RETREAT:\n` +
                     `• No damage taken\n` +
                     `• Mission progress lost\n` +
                     `• No mission rewards\n\n` +
                     `Retreat now?`;
        }

        if (confirm(message)) {
            this.attemptRetreat(exileId, retreatInfo.type);
        }
    },

    // Attempt retreat using the existing encounterSystem
    async attemptRetreat(exileId, retreatType) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        const activeMission = turnState.activeMissions.find(m => m.exileId === exileId);
        
        if (!exile || !activeMission) return;

        // Use the existing encounterSystem's processRetreat method
        if (typeof turnBasedCombat !== 'undefined' && turnBasedCombat.processRetreat) {
            const retreatResult = turnBasedCombat.processRetreat(activeMission.missionState);
            
            if (retreatResult.success) {
                // Retreat successful
                if (retreatResult.type === 'risky') {
                    uiSystem.log(`⚠️ ${retreatResult.message}`, 'warning');
                } else {
                    uiSystem.log(`✓ ${retreatResult.message}`, 'success');
                }
                
                // Complete the mission with retreat using existing system
                this.completeMissionWithRetreat(activeMission, exile);
                
            } else {
                // Retreat failed
                uiSystem.log(`❌ ${retreatResult.message} Took ${Math.floor(retreatResult.damage)} damage!`, 'failure');
                
                // Update health display
                const rowId = this.getRowForExile(exileId);
                if (rowId) {
                    const row = document.querySelector(`[data-exile-id="${exileId}"]`);
                    this.updateHealthBar(row, exile.currentLife, exile.stats.life);
                }
                
                // Check if exile died from the failed retreat
                if (exile.currentLife <= 0) {
                    uiSystem.log(`💀 ${exile.name} was killed during the failed retreat!`, 'failure');
                    this.handleExileDeath(activeMission, exile);
                    return;
                }
                
                // Continue combat - exile is still in the encounter
                uiSystem.log(`${exile.name} remains in combat after the failed retreat.`, 'info');
            }
        }
        
        // Refresh the row display
        const rowId = this.getRowForExile(exileId);
        if (rowId) {
            this.updateRow(rowId, exile);
        }
        
        // Save game state
        game.saveGame();
    },

    // Complete mission with retreat status
    completeMissionWithRetreat(activeMission, exile) {
        // Apply retreat rewards/penalties using the mission state system
        const rewardSummary = activeMission.missionState.applyRewards();
        
        // Log the retreat outcome
        if (rewardSummary) {
            if (rewardSummary.wasRetreat && rewardSummary.retreatType === 'risky') {
                uiSystem.log(`${exile.name} retreated with penalties applied.`, 'warning');
            } else {
                uiSystem.log(`${exile.name} retreated safely.`, 'success');
            }
            
            // Log what was gained/lost
            if (rewardSummary.gold > 0) {
                uiSystem.log(`+${rewardSummary.gold} gold`, 'info');
            }
            if (rewardSummary.experience > 0) {
                uiSystem.log(`+${rewardSummary.experience} experience`, 'info');
            }
            if (rewardSummary.items > 0) {
                uiSystem.log(`+${rewardSummary.items} items`, 'info');
            }
        }

        // Remove from active missions
        const missionIndex = turnState.activeMissions.findIndex(m => m.exileId === exile.id);
        if (missionIndex !== -1) {
            turnState.activeMissions.splice(missionIndex, 1);
        }

        // Clear any pending decisions
        turnState.pendingDecisions = turnState.pendingDecisions.filter(d => d.exileId !== exile.id);

        // Update exile status
        exile.status = 'idle';
        exile.currentLife = exile.currentLife || exile.stats.life; // Ensure currentLife is set

        // Apply morale penalty for retreating
        exile.morale = Math.max(0, exile.morale - 10);
        uiSystem.log(`${exile.name}'s morale decreased by 10 due to retreating.`, 'info');

        // Refresh all rows to show updated state
        this.refreshAllRows();
    },

    // Handle exile death from failed retreat
    handleExileDeath(activeMission, exile) {
        // Mark exile as dead
        exile.status = 'dead';
        exile.currentLife = 0;

        // Remove from active missions
        const missionIndex = turnState.activeMissions.findIndex(m => m.exileId === exile.id);
        if (missionIndex !== -1) {
            turnState.activeMissions.splice(missionIndex, 1);
        }

        // Clear any pending decisions
        turnState.pendingDecisions = turnState.pendingDecisions.filter(d => d.exileId !== exile.id);

        // Add to deceased list for UI purposes
        if (!gameState.deceasedExiles) {
            gameState.deceasedExiles = [];
        }
        gameState.deceasedExiles.push({
            ...exile,
            deathCause: 'Failed retreat',
            deathDay: turnState.currentDay,
            deathTurn: turnState.currentTurn
        });

        // Remove from active exiles
        gameState.exiles = gameState.exiles.filter(e => e.id !== exile.id);

        // Refresh all rows
        this.refreshAllRows();
    }

};