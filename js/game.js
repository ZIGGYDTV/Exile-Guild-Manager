// Core game object (The games verbs, "doing things" aka macros/widgets)
const game = {
    init() {
        // Load saved game first
        this.loadGame();

        // If no exiles exist, create starting exile(s)
        if (gameState.exiles.length === 0) {
            this.initializeStartingExiles();
        }

        // debug logs
        console.log("Exiles after init:", gameState.exiles);

        // Initialize systems
        inventorySystem.initializeItemTooltips();

        // Select first exile by default
        if (gameState.exiles.length > 0 && !gameState.selectedExileId) {
            gameState.selectedExileId = gameState.exiles[0].id;
            console.log("Selected first exile:", gameState.selectedExileId);
        }

        // Restore passive choices if any - CRITICAL FOR PREVENTING EXPLOIT
        if (gameState.currentPassiveChoices && typeof passiveSystem !== 'undefined') {
            passiveSystem.currentPassiveChoices = gameState.currentPassiveChoices;
        }

        // Add this to refresh the UI
        if (typeof exileRowManager !== 'undefined') {
            console.log("Refreshing exile rows...");
            exileRowManager.refreshAllRows();
        }

        // Initialize world state for discovered areas if needed
        if (typeof areaDefinitions !== 'undefined') {
            Object.entries(areaDefinitions).forEach(([areaId, areaDef]) => {
                if (areaDef.discovered && !worldState.areas[areaId]) {
                    // Initialize the area in world state
                    worldState.areas[areaId] = {
                        discovered: true,
                        totalScoutingProgress: 0,
                        explorationProgress: 0,
                        missions: {}
                    };

                    // Initialize discovered missions
                    Object.entries(areaDef.missions).forEach(([missionId, missionDef]) => {
                        if (missionDef.discovered) {
                            worldState.areas[areaId].missions[missionId] = {
                                discovered: true,
                                completions: 0,
                                firstCompleted: false,
                                lastCompleted: null,
                                availableAgainOnDay: null
                            };
                        }
                    });
                }
            });
            if (typeof missionGeneration !== 'undefined') {
                // Beach starting missions
                if (worldState.areas.beach?.missions.shorelineExploration &&
                    !worldState.areas.beach.missions.shorelineExploration.currentInstance) {
                    worldState.areas.beach.missions.shorelineExploration.currentInstance =
                        missionGeneration.generateMissionInstance('beach', 'shorelineExploration');
                }

                if (worldState.areas.beach?.missions.crab_hunting &&
                    !worldState.areas.beach.missions.crab_hunting.currentInstance) {
                    worldState.areas.beach.missions.crab_hunting.currentInstance =
                        missionGeneration.generateMissionInstance('beach', 'crab_hunting');
                }
            }
        } else {
            console.log("areaDefinitions not loaded yet - skipping area initialization");
        }

        if (typeof uiSystem !== 'undefined') {
            uiSystem.log("Send exiles on missions. Make them more powerful. Each area has dangers and rewards to discover.", "info");
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Enter key to end turn
            if (e.key === 'Enter' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const endTurnBtn = document.getElementById('end-turn-btn');
                if (endTurnBtn && !endTurnBtn.disabled) {
                    endTurnBtn.click();
                }
            }
        });

        // Initialize inventory grid
        inventoryGridManager.init();

        // Since inventory is always shown, initialize it immediately
        const gridContainer = document.getElementById('inventory-grid');
        if (gridContainer && !inventoryGridManager.gridContainer) {
            inventoryGridManager.createGrid(gridContainer);
        }

        // Set up inventory tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                inventoryGridManager.switchTab(button.dataset.tab);
            });
        });

        // Initialize dynamic display manager
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.init();
        }

        if (typeof uiSystem !== 'undefined') {
            uiSystem.updateDisplay();  // This will update all UI elements including the gold display
        }

        // Add starting weapon if inventory is empty
        if (gameState.inventory.items.length === 0) {
            const startingWeapon = {
                ...itemBases.brokenShortSword,  // Copy the base item properties
                id: Date.now() + Math.random(), // Generate unique ID
                rarity: 'common',               // Set rarity
                name: "Guildmasters Old Sword",
                description: "Your old longsword, broken in half and edge long gone. A desperate enough exile could parry and club with it perhaps.",
                implicitStats: {damage: 2, defense: 1},
                stats: {},                      // Empty stats object for rolled stats
                statWeights: itemBases.brokenShortSword.statWeights,  // Copy stat weights
                baseItem: 'brokenShortSword'    // Track the base item for crafting
            };

            // Add to inventory
            gameState.inventory.items.push(startingWeapon);

            // Add to inventory grid
            if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.gridContainer) {
                inventoryGridManager.addNewItemToInventory(startingWeapon);
            }
        }
    },


    initializeStartingExiles() {
        // Safety check
        if (typeof exileFactory === 'undefined') {
            console.error("exileFactory not loaded! Make sure exileFactory.js is included before game.js");
            return;
        }

        // Create one starting exile (we can adjust this number)
        const startingExile = exileFactory.createExile({
            name: "Grimjaw" // Keep the classic name for first exile
        });

        // Give them a random starting notable
        const notables = passiveHelpers.getPassivesByTier('notable');
        if (notables.length > 0) {
            const randomNotable = notables[Math.floor(Math.random() * notables.length)];
            startingExile.passives.allocated.push(randomNotable.id);
            startingExile.passives.pendingPoints--;
        }

        // Apply the passive effects
        exileSystem.recalculateStats(startingExile);


        // Add to game state
        gameState.exiles.push(startingExile);

        if (typeof uiSystem !== 'undefined') {
            uiSystem.log(`${startingExile.name} the ${classDefinitions[startingExile.class].name} joins your guild!`, "legendary");
        }

        // Optional: Add a second test exile for development
        const ADD_TEST_EXILE = true; // Change to false for production
        if (ADD_TEST_EXILE) {
            const testExile = exileFactory.createTestExile(3);
            exileSystem.recalculateStats(startingExile);
            gameState.exiles.push(testExile);
            uiSystem.log(`${testExile.name} the ${classDefinitions[testExile.class].name} joins for testing!`, "info");
        }
    },


    checkLevelUp(exile) {
        while (exile.experience >= exile.experienceNeeded) {
            exile.level++;
            exile.experience -= exile.experienceNeeded;
            exile.experienceNeeded = exile.level * 100;

            // Only give life on level up
            exile.baseStats.life += 20;

            // Give passive point
            exile.passives.pendingPoints++;

            uiSystem.log(`🎉 LEVEL UP! ${exile.name} is now level ${exile.level}!`, "legendary");

            // Recalculate stats
            exileSystem.recalculateStats(exile);
        }
    },

    applyMoraleEffects(exile) {
        // Reset stats to base + level bonuses
        exileSystem.recalculateStats();

        // Apply morale bonuses/penalties
        const morale = exile.morale;
        let damageBonus = 0;
        let defenseBonus = 0;

        if (morale >= 90) {
            // Confident: +20% damage, +10% defense
            damageBonus = Math.floor(exile.stats.damage * 0.2);
            defenseBonus = Math.floor(exile.stats.defense * 0.1);
        } else if (morale >= 70) {
            // Content: No bonuses or penalties
            damageBonus = 0;
            defenseBonus = 0;
        } else if (morale >= 50) {
            // Discouraged: -5% damage
            damageBonus = -Math.floor(exile.stats.damage * 0.05);
        } else if (morale >= 25) {
            // Demoralized: -10% damage, -5% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.1);
            defenseBonus = -Math.floor(exile.stats.defense * 0.05);
        } else if (morale >= 10) {
            // Wavering: -20% damage, -10% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.2);
            defenseBonus = -Math.floor(exile.stats.defense * 0.1);
        } else {
            // Broken: -30% damage, -30% defense
            damageBonus = -Math.floor(exile.stats.damage * 0.3);
            defenseBonus = -Math.floor(exile.stats.defense * 0.3);
        }

        exile.stats.damage += damageBonus;
        exile.stats.defense += defenseBonus;

        // Ensure minimum values
        exile.stats.damage = Math.max(1, exile.stats.damage);
        exile.stats.defense = Math.max(1, exile.stats.defense);
    },


    gameOver() {
        // Disable mission buttons
        document.querySelectorAll('.mission-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        });

        setTimeout(() => {
            if (confirm("Your exile has died. Start with a new exile?")) {
                this.resetGame();
            }
        }, 1000);
    },


    resetGame() {
        localStorage.removeItem('exileManagerSave');
        location.reload();
    },


    saveGame() {
        if (gameState.settings.autoSave) {
            const saveData = {
                version: 2, // Increment version for new format
                gameState: gameState,
                worldState: worldState,
                turnState: turnState,
                timestamp: Date.now()
            };
            localStorage.setItem('exileManagerSave', JSON.stringify(saveData));
        }
    },

    loadGame() {
        const saveData = localStorage.getItem('exileManagerSave');
        if (saveData) {
            try {
                const parsed = JSON.parse(saveData);
                
                // Restore game state
                Object.assign(gameState, parsed.gameState);
                Object.assign(turnState, parsed.turnState);
                Object.assign(worldState, parsed.worldState);

                // If we have exiles but no selected one, select the first
                if (gameState.exiles.length > 0 && !gameState.selectedExileId) {
                    gameState.selectedExileId = gameState.exiles[0].id;
                }

                // Fix: Only use uiSystem if it's available (ES6 modules load async)
                if (typeof uiSystem !== 'undefined') {
                    uiSystem.log("Game loaded successfully.", "success");
                    // Update UI to show loaded resources, turn counter, etc.
                    uiSystem.updateDisplay();
                } else {
                    console.log("Game loaded successfully.");
                }

                // Refresh displays
                if (typeof exileRowManager !== 'undefined') {
                    exileRowManager.refreshAllRows();
                }

            } catch (error) {
                console.error("Failed to load save:", error);
                // Fix: Only use uiSystem if it's available
                if (typeof uiSystem !== 'undefined') {
                    uiSystem.log("Failed to load save. Starting fresh.", "error");
                } else {
                    console.log("Failed to load save. Starting fresh.");
                }
            }
        }
    },

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // What determines stat scaling for ilvl of gear
    calculateIlvlMultiplier(ilvl) {
        return 1 + (ilvl - 1) * 0.05; // 5% per ilvl above 1
    },

    // Helper function to get proper stat display name
    getStatDisplayName(statKey) {
        const stat = statDB.getStat(statKey);
        return stat ? stat.displayName : statKey;
    },

    // Helper function to get damage type icons
    getDamageTypeIcon(damageType) {
        const icons = {
            physical: '⚔️',
            fire: '🔥',
            cold: '❄️',
            lightning: '⚡',
            chaos: '🫧'
        };
        return icons[damageType] || '✦';
    },

    // Helper function to get stat range for specific ilvl
    getStatRangeForIlvl(statDef, ilvl) {
        const breakpoints = statDef.ilvlBreakpoints;
        if (!breakpoints) {
            // Fallback for old baseRange format
            return statDef.baseRange;
        }

        // Find highest breakpoint <= ilvl
        for (let i = breakpoints.length - 1; i >= 0; i--) {
            if (ilvl >= breakpoints[i].ilvl) {
                return { min: breakpoints[i].min, max: breakpoints[i].max };
            }
        }

        // Fallback to first breakpoint
        return { min: breakpoints[0].min, max: breakpoints[0].max };
    },

    // Helper Function for level ups on Mission Report Modal
    checkIfLeveledUp(oldExp, newExp) {
        // Simple check - did experience cross a level boundary?
        const oldLevel = Math.floor(oldExp / 100) + 1; // Simplified level calc
        const newLevel = Math.floor(newExp / 100) + 1;
        return newLevel > oldLevel;
    },

    // Breakdown toggle function
    toggleBreakdown(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const isOpen = el.style.display === 'block';
        el.style.display = isOpen ? 'none' : 'block';
        // Toggle triangle direction if present
        const parent = el.previousElementSibling || el.parentElement.querySelector('.combat-breakdown-toggle');
        if (parent) {
            const triangle = parent.querySelector('.triangle');
            if (triangle) triangle.innerHTML = isOpen ? '&#x25BC;' : '&#x25B2;';
        }
    },

    // End of Additional Helper Functions







    // === DAY REPORT MODAL METHODS ===
    openDayReport() {
        // DISABLED: Day report modal functionality disabled for now
        // Will be incorporated elsewhere in the UI
        console.log("Day report modal disabled - data available in this.dayReportData");
        return;
    },

    closeDayReport() {
        const modal = document.getElementById('day-report-modal');
        modal.style.display = 'none';

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleDayReportKeydown.bind(this));

        // Reset animation state
        this.dayReportAnimationState = { skipped: false, currentStep: 0 };

        // ADD: Check if any exile died during this day
        const hadDeath = this.dayReportData.missionResults.some(result =>
            result.combatResult.outcome === 'death'
        );

        console.log("Day report closed. Had death?", hadDeath);  // TEMPORARY DEBUG
        console.log("Mission results:", this.dayReportData.missionResults);  // TEMPORARY DEBUG

        if (hadDeath) {
            exileSystem.handleExileDeath();
        }
    },

    handleDayReportClick(event) {
        // Close if clicking the overlay (not the content)
        if (event.target.classList.contains('modal-overlay')) {
            this.closeDayReport();
        }
    },

    handleDayReportKeydown(event) {
        if (event.key === 'Escape') {
            this.closeDayReport();
        }
    },

    clearDayReportContent() {
        // Clear all content containers
        document.getElementById('mission-summary-container').innerHTML = '';
        document.getElementById('loot-container').innerHTML = '';
        document.getElementById('discovery-content').innerHTML = '';
        document.getElementById('detailed-content').innerHTML = '';

        // Hide discovery section by default
        document.getElementById('discovery-section').style.display = 'none';

        // Reset collapsible sections
        document.getElementById('discovery-content').style.display = 'none';
        document.getElementById('detailed-content').style.display = 'none';
    },

    // Animation control
    dayReportAnimationState: {
        skipped: false,
        currentStep: 0
    },

    skipAnimations() {
        this.dayReportAnimationState.skipped = true;

        // Immediately show all content without animations
        this.showAllDayReportContent();
    },

    // Collapsible section toggles
    toggleDiscoverySection() {
        const content = document.getElementById('discovery-content');
        const triangle = document.querySelector('#discovery-section .triangle');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            triangle.innerHTML = '&#x25B2;';
        } else {
            content.style.display = 'none';
            triangle.innerHTML = '&#x25BC;';
        }
    },

    toggleDetailedSection() {
        const content = document.getElementById('detailed-content');
        const triangle = document.querySelector('.detailed-section .triangle');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            triangle.innerHTML = '&#x25B2;';
        } else {
            content.style.display = 'none';
            triangle.innerHTML = '&#x25BC;';
        }
    },

    // === DAY REPORT ANIMATION SEQUENCE ===
    animateDayReport() {
        if (this.dayReportAnimationState.skipped) {
            this.showAllDayReportContent();
            return;
        }

        // Step 1: Mission Summary Panels (fade in one by one)
        this.animateMissionSummaries();
    },

    animateMissionSummaries() {
        const container = document.getElementById('mission-summary-container');

        // Create mission summary panels from collected data
        this.dayReportData.missionResults.forEach((result, index) => {
            const panel = this.createMissionSummaryPanel(result);
            container.appendChild(panel);

            // Animate in with delay
            setTimeout(() => {
                if (!this.dayReportAnimationState.skipped) {
                    panel.classList.add('animate-in');
                }
            }, index * 200); // 200ms delay between each panel
        });

        // Move to next step after all panels animate in
        const totalDelay = this.dayReportData.missionResults.length * 200 + 100;
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.animateExileStatus();
            }
        }, totalDelay);
    },

    // Create Exile Summary on Mission Report, Then Give it a Delayed Animation
    animateExileStatus() {
        // Just animate the panels in - EXP bars are already there
        const missionPairs = document.querySelectorAll('.mission-exile-pair');

        this.dayReportData.missionResults.forEach((result, index) => {
            const pair = missionPairs[index];
            if (!pair) return;

            // Animate panel in
            setTimeout(() => {
                if (!this.dayReportAnimationState.skipped) {
                    pair.classList.add('animate-in');

                    // Start EXP animation after panel appears
                    setTimeout(() => {
                        this.animateExpSequence(pair, result);
                    }, 100);
                }
            }, index * 150);
        });

        // Move to next step
        const totalDelay = this.dayReportData.missionResults.length * 150 + 500;
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.animateLootExplosion();
            }
        }, totalDelay);
    },



    animateExpSequence(missionPair, missionResult) {
        if (this.dayReportAnimationState.skipped) return;

        const expFill = missionPair.querySelector('.exile-exp-fill');
        const expLabel = missionPair.querySelector('.exile-exp-label');
        const levelDisplay = missionPair.querySelector('.exile-level');
        const exilePanel = missionPair.querySelector('.exile-info-side');

        if (!expFill) return;

        const startingExp = missionResult.exileProgression.startingExp;
        const expGained = missionResult.exileProgression.expGained;
        const leveledUp = missionResult.exileProgression.leveledUp;
        const finalLevel = missionResult.exileProgression.newLevel;
        const startingLevel = missionResult.exileProgression.startingLevel;

        // Only animate if EXP was actually gained
        if (expGained > 0) {
            setTimeout(() => {
                if (leveledUp) {
                    // Show level up immediately - no complex animation
                    exilePanel.classList.add('levelup-animate');
                    levelDisplay.textContent = `Level ${finalLevel}`;

                    // Show final EXP state after level up
                    const newExpNeeded = finalLevel * 100;
                    const remainingExp = (startingExp + expGained) % 100; // EXP left after leveling
                    const finalPercent = Math.min(100, Math.round((remainingExp / newExpNeeded) * 100));

                    expFill.style.width = `${finalPercent}%`;
                    expLabel.textContent = `${remainingExp} / ${newExpNeeded} EXP (+${expGained})`;
                } else {
                    // No level up - simple animation to final state
                    const finalExp = startingExp + expGained;
                    const expNeeded = startingLevel * 100;
                    const finalPercent = Math.min(100, Math.round((finalExp / expNeeded) * 100));

                    expFill.style.width = `${finalPercent}%`;
                    expLabel.textContent = `${finalExp} / ${expNeeded} EXP (+${expGained})`;
                }
            }, 200);
        }
    },
    // End of Exile Status Animation

    animateLootExplosion() {
        const container = document.getElementById('loot-container');

        // DEBUG: Check what's in loot data
        console.log("Loot Data Debug:", this.dayReportData.lootGained);

        const lootData = this.dayReportData.lootGained;
        let itemIndex = 0;

        // Gold
        if (lootData.gold > 0) {
            const goldItem = document.createElement('div');
            goldItem.className = 'loot-item gold';
            goldItem.innerHTML = `<span>💰</span><span>+${lootData.gold} Gold</span>`;
            container.appendChild(goldItem);
            this.animateLootPop(goldItem, itemIndex * 150);
            itemIndex++;
        }

        // Chaos Orbs
        if (lootData.chaosOrbs > 0) {
            const chaosItem = document.createElement('div');
            chaosItem.className = 'loot-item chaos';
            chaosItem.innerHTML = `<span>🌀</span><span>+${lootData.chaosOrbs} Chaotic Shard${lootData.chaosOrbs > 1 ? 's' : ''}</span>`;
            container.appendChild(chaosItem);
            this.animateLootPop(chaosItem, itemIndex * 150);
            itemIndex++;
        }

        // Exalted Orbs
        if (lootData.exaltedOrbs > 0) {
            const exaltedItem = document.createElement('div');
            exaltedItem.className = 'loot-item exalted';
            exaltedItem.innerHTML = `<span>⭐</span><span>+${lootData.exaltedOrbs} Exalted Orb${lootData.exaltedOrbs > 1 ? 's' : ''}</span>`;
            container.appendChild(exaltedItem);
            this.animateLootPop(exaltedItem, itemIndex * 150);
            itemIndex++;
        }

        // Items
        if (lootData.items && lootData.items.length > 0) {
            lootData.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'loot-item gear';

                // Get item rarity color
                const itemColor = rarityDB.getRarity(item.rarity)?.color || '#888';

                itemElement.innerHTML = `
            <span>⚔️</span>
            <span class="item-name-hover" 
                  style="color: ${itemColor}" 
                  data-item-tooltip='${JSON.stringify(item)}'>
                ${item.name}
                ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
            </span>
        `;

                container.appendChild(itemElement);
                this.animateLootPop(itemElement, itemIndex * 150);
                itemIndex++;
            });
        }

        // Show "No additional loot" if only gold
        if (lootData.chaosOrbs === 0 && lootData.exaltedOrbs === 0 && lootData.items.length === 0) {
            console.log("No currency or items found - only gold dropped");
        }

        // Move to discoveries after all loot animations
        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                this.showDiscoveries();
            }
        }, itemIndex * 150 + 600);
    },

    // Satisfying pop animation
    animateLootPop(element, delay) {
        // Start invisible and small
        element.style.opacity = '0';
        element.style.transform = 'scale(0.5)';
        element.style.transition = 'none';

        setTimeout(() => {
            if (!this.dayReportAnimationState.skipped) {
                // Phase 1: Pop in and overshoot (bounce effect)
                element.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'; // Bouncy easing
                element.style.opacity = '1';
                element.style.transform = 'scale(1.15)'; // Overshoot

                // Phase 2: Settle back to normal size
                setTimeout(() => {
                    element.style.transition = 'transform 0.2s ease-out';
                    element.style.transform = 'scale(1)';

                    // Optional: Add a subtle float effect
                    setTimeout(() => {
                        element.style.transition = 'transform 2s ease-in-out infinite alternate';
                        element.style.transform = 'translateY(-2px)';
                    }, 200);
                }, 300);
            } else {
                // Skip animation - just show immediately
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            }
        }, delay);
    },

    // Krangled Combination of Discoveries and Combat Details
    showDiscoveries() {
        let discoveryContent = '';

        // Handle mission/area discoveries
        if (this.dayReportData.discoveries.length > 0) {
            discoveryContent += this.dayReportData.discoveries.map(discovery => {
                if (discovery.type === 'mission') {
                    const missionData = getMissionData(discovery.areaId, discovery.missionId);
                    if (missionData) {
                        return `<div class="discovery-item mission-discovery">🔍 <strong>Mission Discovered:</strong> ${missionData.name}</div>`;
                    } else {
                        console.warn(`Mission data not found for ${discovery.areaId}.${discovery.missionId}`);
                        return `<div class="discovery-item mission-discovery">🔍 <strong>Mission Discovered:</strong> New mission in ${discovery.areaId}</div>`;
                    }
                } else if (discovery.type === 'connection') {
                    return `<div class="discovery-item connection-discovery">🗺️ <strong>Area Connection:</strong> Discovered passage to new area!</div>`;
                } else if (discovery.type === 'area') {
                    const areaData = getAreaData(discovery.areaId);
                    const areaName = areaData ? areaData.name : discovery.areaId;
                    return `<div class="discovery-item area-discovery">🌍 <strong>New Area Discovered:</strong> ${areaName}!</div>`;
                }
                return '';
            }).join('');
        }

        // Add scouting knowledge that was unlocked this day
        const newScoutingKnowledge = worldMapSystem.getNewScoutingKnowledgeUnlocked();
        if (newScoutingKnowledge.length > 0) {
            discoveryContent += newScoutingKnowledge.map(knowledge => `
                <div class="discovery-item scouting-knowledge ${knowledge.tag}">
                    <div class="scouting-threshold">Knowledge Unlocked (${knowledge.threshold} scouting)</div>
                    <div class="scouting-text">${knowledge.text}</div>
                </div>
            `).join('');
        }

        // Show discoveries section only if we have actual discoveries or new knowledge
        if (this.dayReportData.discoveries.length > 0 || newScoutingKnowledge.length > 0) {
            const section = document.getElementById('discovery-section');
            section.style.display = 'block';

            // Update section title and count
            section.querySelector('.section-toggle span:nth-child(2)').textContent = 'New Discoveries';

            const count = document.getElementById('discovery-count');
            const totalCount = this.dayReportData.discoveries.length + newScoutingKnowledge.length;
            count.textContent = totalCount;

            // Fill in discovery content
            const content = document.getElementById('discovery-content');
            content.innerHTML = discoveryContent;

            // Show content by default (not collapsed)
            content.style.display = 'block';
        } else {
            // Hide the section if there are no actual discoveries
            const section = document.getElementById('discovery-section');
            section.style.display = 'none';
        }

        // Populate combat details from mission results
        const detailedContent = document.getElementById('detailed-content');
        if (this.dayReportData.missionResults.length > 0) {
            detailedContent.innerHTML = this.dayReportData.missionResults.map((result, index) => {
                const combatDetails = result.combatDetails;
                const combatResult = result.combatResult;

                // Generate round-by-round damage log with breakdowns
                let roundByRoundHtml = '';
                if (combatDetails.damageLog && combatDetails.damageLog.length > 0) {
                    // Create the table header
                    roundByRoundHtml = `
                        <div class="combat-log-table">
                            <div class="combat-log-header">
                                <span class="col-round">Round</span>
                                <span class="col-damage-types">Unmitigated → Mitigated Damage</span>
                                <span class="col-total">Total Damage</span>
                                <span class="col-life">Life</span>
                            </div>
                    `;

                    // Add each round as a row
                    roundByRoundHtml += combatDetails.damageLog.map(log => {
                        // Build damage type cells
                        let damageTypeCells = '';
                        if (log.breakdown && log.breakdown.length > 0) {
                            damageTypeCells = log.breakdown.map(b => {
                                const typeClass = `element-${b.type.toLowerCase()}`;
                                const icon = this.getDamageTypeIcon(b.type);
                                return `
                                    <span class="damage-type-cell ${typeClass}">
                                        <span class="damage-icon">${icon}</span>
                                        <span class="damage-values">${Math.round(b.raw * 10) / 10} → ${Math.round(b.final * 10) / 10}</span>
                                    </span>
                                `;
                            }).join('');
                        }

                        return `
                            <div class="combat-log-row">
                                <span class="col-round">${log.round}</span>
                                <span class="col-damage-types">${damageTypeCells}</span>
                                <span class="col-total">${Math.round(log.rawDamage)} → ${Math.round(log.actualDamage * 10) / 10} total damage</span>
                                <span class="col-life">${Math.round(log.lifeRemaining)}</span>
                            </div>
                        `;
                    }).join('');

                    roundByRoundHtml += '</div>'; // Close the table
                }

                // Find the heaviest hit for summary
                let heaviestHitSummary = '';
                if (combatResult.heaviestHitBreakdown) {
                    const totalRaw = combatResult.heaviestHitBreakdown.reduce((sum, b) => sum + b.raw, 0);
                    const totalFinal = combatResult.heaviestHitBreakdown.reduce((sum, b) => sum + b.final, 0);

                    heaviestHitSummary = `
                        <div class="heaviest-hit-summary">
                            <strong>Heaviest Hit:</strong> ${Math.round(totalRaw)} → ${Math.round(totalFinal * 10) / 10} damage
                        </div>
                    `;
                }

                return `
                    <div class="combat-detail-section">
                        <h5>${result.missionContext.missionName} - Combat Analysis</h5>
                        <div class="combat-summary">
                            <div><strong>Power vs Difficulty:</strong> ${result.missionContext.powerRating} vs ${result.missionContext.difficulty}</div>
                            <div><strong>Win Chance per Round:</strong> ${Math.round(combatDetails.winChancePerRound * 100)}%</div>
                            <div><strong>Combat Duration:</strong> ${combatResult.rounds} rounds</div>
                            <div><strong>Total Damage Taken:</strong> ${Math.round(combatResult.totalDamageTaken)}</div>
                        </div>
                        
                        ${roundByRoundHtml ? `
                            <div class="round-by-round-section">
                                <h6>Round-by-Round Combat Log:</h6>
                                ${roundByRoundHtml}
                            </div>
                        ` : '<div class="no-combat-data">No detailed combat data available</div>'}
                        
                        ${heaviestHitSummary}
                    </div>
                `;
            }).join('');
        }
    },

    createMissionSummaryPanel(missionResult) {
        const container = document.createElement('div');
        container.className = `mission-exile-pair ${missionResult.combatResult.outcome}`;

        // Left side - Mission Info
        const missionPanel = document.createElement('div');
        missionPanel.className = 'mission-info-side';

        let resultIcon = '';
        let resultText = '';
        switch (missionResult.combatResult.outcome) {
            case 'victory':
                resultIcon = '✓';
                resultText = 'Success';
                break;
            case 'retreat':
                resultIcon = '↩';
                resultText = 'Retreated';
                break;
            case 'death':
                resultIcon = '☠';
                resultText = 'DIED';
                break;
        }

        missionPanel.innerHTML = `
            <div class="mission-name">${missionResult.missionContext.missionName}</div>
            <div class="mission-outcome">
                <span class="outcome-icon">${resultIcon}</span>
                <span class="outcome-text">${resultText}</span>
            </div>
            <div class="scouting-gained">+${missionResult.worldProgression.scoutingGain} scouting</div>
        `;

        // Right side - Exile Info
        const exilePanel = document.createElement('div');
        exilePanel.className = `exile-info-side ${missionResult.combatResult.outcome === 'death' ? 'dead' : ''}`;

        const exileName = gameState.exile.name;
        const startingLevel = missionResult.exileProgression.startingLevel;
        const healthPercent = missionResult.exileHealth.healthPercent;
        const remainingLife = missionResult.exileHealth.remainingLife;
        const totalLife = missionResult.exileHealth.startingLife;

        // Add these after the EXP variables:
        const startingExp = missionResult.exileProgression.startingExp;
        const startingExpNeeded = startingLevel * 100;
        const startingExpPercent = Math.min(100, Math.round((startingExp / startingExpNeeded) * 100));

        // Add morale variables:
        const moraleChange = missionResult.moraleChange;

        exilePanel.innerHTML = `
            <div class="exile-name-level">
                <span class="exile-name">${exileName}</span>
                <span class="exile-level">Level ${startingLevel}</span>
            </div>
            <div class="exile-health-container">
                <div class="health-bar">
                    <div class="health-fill" style="width: ${healthPercent}%"></div>
                    <span class="health-text">${Math.round(remainingLife)} / ${Math.round(totalLife)} Life</span>
                </div>
            </div>
            <div class="exile-exp-container">
                <div class="exile-exp-bar">
                    <div class="exile-exp-fill" style="width: ${startingExpPercent}%"></div>
                    <span class="exile-exp-label">${startingExp} / ${startingExpNeeded} EXP</span>
                </div>
            </div>
            <div class="morale-change-container">
                ${moraleChange ? `
                    <div class="morale-change ${moraleChange.change >= 0 ? 'positive' : 'negative'}">
                        <span class="morale-icon">${moraleChange.change >= 0 ? '🔥' : '😴'}</span>
                        <span class="morale-text">"${moraleChange.message}"</span>
                        <span class="morale-value">(${moraleChange.change >= 0 ? '+' : ''}${moraleChange.change} morale)</span>
                    </div>
                ` : '<div class="no-morale-change">No morale change</div>'}
            </div>
        `;

        container.appendChild(missionPanel);
        container.appendChild(exilePanel);

        return container;
    },
    // End of Day Report Modal Methods














    // === ASSIGNMENT SYSTEM METHODS ===

    isExileAssigned(exileName, areaId, missionId) {
        const assignment = exileSystem.getExileAssignment(exileName);
        return assignment && assignment.areaId === areaId && assignment.missionId === missionId;
    },


    // end of Assignment System Methods ===

    // Day report data collection
    dayReportData: {
        missionResults: [],
        exileUpdates: [],
        lootGained: { gold: 0, chaosOrbs: 0, exaltedOrbs: 0, items: [] },
        discoveries: [],
        combatDetails: []
    },







};
// END OF GAME OBJECT =====================

window.game = game;
