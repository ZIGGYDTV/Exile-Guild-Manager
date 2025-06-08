// Core game object (The games verbs, "doing things" aka macros/widgets)
const game = {
    init() {
        // Load saved game first
        this.loadGame();

        // Initialize exile with class system and passives
        exileSystem.initializeExile();
        inventorySystem.initializeItemTooltips();
        this.updateDisplay();
        inventorySystem.updateInventoryDisplay();
        this.updateCommandCenterDisplay();
        this.log("Send exiles on missions. Make them more powerful. Each area has dangers and rewards to discover.", "info");
    },

 




    checkLevelUp() {
        while (gameState.exile.experience >= gameState.exile.experienceNeeded) {
            gameState.exile.level++;
            gameState.exile.experience -= gameState.exile.experienceNeeded;
            gameState.exile.experienceNeeded = gameState.exile.level * 100;

            // Only give life on level up (no more damage/defense)
            gameState.exile.baseStats.life += 20;

            // Give passive point
            gameState.exile.passives.pendingPoints++;

            this.log(`🎉 LEVEL UP! ${gameState.exile.name} is now level ${gameState.exile.level}! (+1 Passive Point)`, "legendary");

            // Immediately offer passive selection
            this.startPassiveSelection();

            // ...inside checkLevelUp, after level up is processed...
            const summaryEl = document.getElementById('exile-summary-card');
            if (summaryEl) {
                summaryEl.classList.remove('levelup-animate'); // Reset if already animating
                void summaryEl.offsetWidth; // Force reflow to restart animation
                summaryEl.classList.add('levelup-animate');
            }
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




    // GEAR GEAR GEAR GEAR =====================>>>>>>>>>>>>

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },


    getAvailableStats(item) {
        const allStats = getAllStatTypes(); // Referneces Master List
        const currentStats = Object.keys(item.stats);
        return allStats.filter(stat => !currentStats.includes(stat));
    },
    // END OF GEAR ====================>>>>


    
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
        this.applyMoraleEffects(gameState.exile);

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

    // Exile Summary Button to Exile Screen ========    
    openCharacterScreen() {
        // Show the character screen modal
        const modal = document.getElementById('character-screen-modal');
        modal.style.display = 'flex';
        this.updateCharacterScreen();

        // Add escape key listener
        document.addEventListener('keydown', this.handleModalKeydown.bind(this));
    },

    closeCharacterScreen() {
        const modal = document.getElementById('character-screen-modal');
        modal.style.display = 'none';

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
    },




    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            this.closeCharacterScreen();
        }
    },

    handleModalClick(event) {
        // Only close if clicking the overlay (not the content)
        if (event.target.classList.contains('modal-overlay')) {
            this.closeCharacterScreen();
        }
    },





    updateCharacterScreen() {
        // Update character info
        document.getElementById('char-name').textContent = gameState.exile.name;
        document.getElementById('char-class').textContent = classDefinitions[gameState.exile.class].name;
        document.getElementById('char-level').textContent = gameState.exile.level;
        document.getElementById('char-exp').textContent = gameState.exile.experience;
        document.getElementById('char-exp-needed').textContent = gameState.exile.experienceNeeded;
        document.getElementById('char-morale').textContent = gameState.exile.morale;
        document.getElementById('char-morale-status').textContent = exileSystem.getMoraleStatus(gameState.exile.morale);

        // Update morale tooltip
        const moraleElement = document.querySelector('.morale-value-with-tooltip');
        if (moraleElement) {
            moraleElement.setAttribute('data-tooltip', exileSystem.createMoraleTooltip(gameState.exile.morale));
        }

        // Combined resistances display
        const resists = [
            { key: 'fireResist', color: '#ff7043', label: 'Fire' },
            { key: 'coldResist', color: '#42a5f5', label: 'Cold' },
            { key: 'lightningResist', color: '#ffd600', label: 'Lightning' },
            { key: 'chaosResist', color: '#ab47bc', label: 'Chaos' }
        ];
        const resistsHtml = resists.map(r =>
            `<span style="color:${r.color};font-weight:bold;cursor:help;" title="${r.label} Resist">${gameState.exile.stats[r.key] || 0}%</span>`
        ).join(' / ');
        document.getElementById('final-resists-line').innerHTML = resistsHtml;

        document.getElementById('final-gold-find').textContent = gameState.exile.stats.goldFindBonus + "%";
        document.getElementById('final-morale-gain').textContent = gameState.exile.stats.moraleGain;
        document.getElementById('final-morale-resist').textContent = gameState.exile.stats.moraleResistance + "%";
        // Convert scoutingBonus (1.0 = 100%) to percentage display
        const explorationBonusPercent = Math.round((gameState.exile.stats.scoutingBonus - 1.0) * 100);
        document.getElementById('final-exploration-bonus').textContent = explorationBonusPercent + "%";

        // Calculate all the breakdown components
        const gearBonuses = this.calculateGearBonuses();
        const passiveBonuses = this.calculatePassiveBonusesForDisplay();
        const moraleBonuses = this.calculateMoraleBonuses();

        // Create formatted tooltips with aligned numbers
        const lifeTooltip = this.createStatTooltip(
            gameState.exile.baseStats.life,
            gearBonuses.life,
            passiveBonuses.life,
            moraleBonuses.life,
            gameState.exile.stats.life
        );

        const damageTooltip = this.createStatTooltip(
            gameState.exile.baseStats.damage,
            gearBonuses.damage,
            passiveBonuses.damage,
            moraleBonuses.damage,
            gameState.exile.stats.damage
        );

        // Format attack speed display (show to 2 decimal places)
        const formattedAttackSpeed = gameState.exile.stats.attackSpeed.toFixed(2);

        const defenseTooltip = this.createStatTooltip(
            gameState.exile.baseStats.defense,
            gearBonuses.defense,
            passiveBonuses.defense,
            moraleBonuses.defense,
            gameState.exile.stats.defense
        );

        // Set the values and tooltips
        document.getElementById('final-life').textContent = gameState.exile.stats.life;
        document.getElementById('final-damage').textContent = gameState.exile.stats.damage;

        // Update attack speed display (we'll add the HTML element next)
        const attackSpeedElement = document.getElementById('final-attack-speed');
        if (attackSpeedElement) {
            attackSpeedElement.textContent = formattedAttackSpeed;
        }

        document.getElementById('final-defense').textContent = gameState.exile.stats.defense;
        document.getElementById('power-rating-calc').textContent = combatSystem.calculatePowerRating();

        // Find and update tooltips
        const tooltipElements = document.querySelectorAll('.stat-value-with-tooltip');
        if (tooltipElements[0]) tooltipElements[0].title = lifeTooltip;
        if (tooltipElements[1]) tooltipElements[1].title = damageTooltip;
        if (tooltipElements[2]) tooltipElements[2].title = defenseTooltip;

        // Update allocated passives
        this.updateAllocatedPassives();

        // Update passive allocation button
        this.updatePassiveButton();

        // Update equipment and inventory
        this.updateCharacterEquipment();

    },

    createStatTooltip(base, gear, passives, morale, final) {
        // Create formatted tooltip with aligned columns
        return `Base (${base}) + Gear (${gear}) + Passives (${passives}) + Morale (${morale})
―――――――――――――――――――――――――――
Final: ${final}`;
    },

    calculatePassiveBonusesForDisplay() {
        // Calculate the total passive contribution to final stats
        const baseStats = gameState.exile.baseStats;
        const gearBonuses = this.calculateGearBonuses();
        const passiveEffects = exileSystem.calculatePassiveEffects();

        // Add flat passives BEFORE scaling
        const flatBase = {
            life: baseStats.life + gearBonuses.life + (passiveEffects.flatLife || 0),
            damage: baseStats.damage + gearBonuses.damage + (passiveEffects.flatDamage || 0),
            defense: baseStats.defense + gearBonuses.defense + (passiveEffects.flatDefense || 0)
        };

        // Apply passive scaling
        const passiveContribution = {
            life: Math.floor(flatBase.life * ((passiveEffects.increasedLife || 0) / 100) +
                flatBase.life * ((passiveEffects.moreLife || 0) / 100)),
            damage: Math.floor(flatBase.damage * ((passiveEffects.increasedDamage || 0) / 100) +
                flatBase.damage * ((passiveEffects.moreDamage || 0) / 100)),
            defense: Math.floor(flatBase.defense * ((passiveEffects.increasedDefense || 0) / 100) +
                flatBase.defense * ((passiveEffects.moreDefense || 0) / 100))
        };

        return passiveContribution;
    },

    updateAllocatedPassives() {
        const container = document.getElementById('allocated-passives-list');

        if (gameState.exile.passives.allocated.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center;">No passives allocated</div>';
            return;
        }

        container.innerHTML = gameState.exile.passives.allocated.map(passiveId => {
            const passive = passiveDefinitions[passiveId];
            if (!passive) return '';

            return `
            <div class="passive-item">
                <div class="passive-name ${passive.tier}">${passive.name}</div>
                <div class="passive-description">${passive.description}</div>
            </div>
        `;
        }).join('');
    },

    updatePassiveButton() {
        const button = document.getElementById('allocate-passive-btn');
        if (gameState.exile.passives.pendingPoints > 0) {
            button.style.display = 'block';
            button.textContent = `Allocate Passive Skill (${gameState.exile.passives.pendingPoints})`;
        } else {
            button.style.display = 'none';
        }
    },

    updateCharacterEquipment() {
        // Update character screen equipment display for all slots
        const slots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring1', 'ring2', 'amulet', 'belt'];

        slots.forEach(slot => {
            const slotElement = document.getElementById(`char-${slot}-slot`);
            if (!slotElement) {
                console.warn(`Slot element not found: char-${slot}-slot`);
                return;
            }

            const slotContent = slotElement.querySelector('.slot-content');
            if (!slotContent) {
                console.warn(`Slot content not found for: ${slot}`);
                return;
            }

            const equipped = gameState.inventory.equipped[slot];

            if (equipped) {
                const displayName = equipped.getDisplayName ? equipped.getDisplayName() : equipped.name;
                const displayColor = equipped.getDisplayColor ? equipped.getDisplayColor() :
                    rarityDB.getRarity(equipped.rarity)?.color || '#888';

                slotContent.innerHTML = `
                    <div class="item-equipped">
                        <div class="item-name" style="color: ${displayColor}">
                            ${displayName}
                            ${equipped.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                        </div>
                        <div class="item-stats">
                            ${inventorySystem.formatItemStats(equipped)}
                        </div>
                    </div>
                `;
            } else {
                // Check if items are available for this slot
                const availableItems = inventorySystem.getItemsForSlot(slot);
                const hasItems = availableItems.length > 0;

                console.log(`Slot ${slot}: ${availableItems.length} items available`); // DEBUG

                slotContent.innerHTML = `
                    <div class="empty-slot">
                        Empty${hasItems ? '<span class="slot-has-items">+</span>' : ''}
                    </div>
                `;
            }
        });
    },

    openPassiveSelection() {
        // Make sure we have pending points and choices ready
        if (gameState.exile.passives.pendingPoints <= 0) {
            this.log("No passive points to spend!", "failure");
            return;
        }

        // Generate choices if we don't have them
        if (!this.currentPassiveChoices) {
            this.startPassiveSelection();
        }

        // Show the passive selection modal
        document.getElementById('passive-selection-modal').style.display = 'flex';
        this.updatePassiveSelectionDisplay();

        // Add escape key listener
        document.addEventListener('keydown', this.handlePassiveModalKeydown.bind(this));
    },

    closePassiveSelection() {
        document.getElementById('passive-selection-modal').style.display = 'none';

        // Remove escape key listener
        document.removeEventListener('keydown', this.handlePassiveModalKeydown.bind(this));
    },

    handlePassiveModalKeydown(event) {
        if (event.key === 'Escape') {
            this.closePassiveSelection();
        }
    },

    handlePassiveModalClick(event) {
        // Only close if clicking the overlay (not the content)
        if (event.target.classList.contains('modal-overlay')) {
            this.closePassiveSelection();
        }
    },

    // PASSIVE SCREEN
    updatePassiveSelectionDisplay() {
        if (!this.currentPassiveChoices) return;

        const { tier, choice1, choice2, rerollCost } = this.currentPassiveChoices;

        // Update modal title
        document.getElementById('passive-modal-title').textContent = `Choose Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} Passive`;

        // Update choice 1
        const choice1Element = document.getElementById('passive-choice-1');
        choice1Element.querySelector('.passive-choice-name').textContent = choice1.name;
        choice1Element.querySelector('.passive-choice-tier').textContent = choice1.tier;
        choice1Element.querySelector('.passive-choice-tier').className = `passive-choice-tier ${choice1.tier}`;
        choice1Element.querySelector('.passive-choice-description').textContent = choice1.description;

        // Update choice 2
        const choice2Element = document.getElementById('passive-choice-2');
        choice2Element.querySelector('.passive-choice-name').textContent = choice2.name;
        choice2Element.querySelector('.passive-choice-tier').textContent = choice2.tier;
        choice2Element.querySelector('.passive-choice-tier').className = `passive-choice-tier ${choice2.tier}`;
        choice2Element.querySelector('.passive-choice-description').textContent = choice2.description;

        // Update reroll button
        const rerollBtn = document.getElementById('reroll-passive-btn');
        rerollBtn.textContent = `Reroll (${rerollCost} gold)`;
        rerollBtn.disabled = gameState.resources.gold < rerollCost;
    },

    selectPassive(choiceNumber) {
        if (!this.currentPassiveChoices) return;

        const selectedPassive = choiceNumber === 1 ? this.currentPassiveChoices.choice1 : this.currentPassiveChoices.choice2;

        // Allocate the passive
        const success = this.allocatePassive(selectedPassive.id);

        if (success) {
            // Clear current choices
            this.currentPassiveChoices = null;

            // Close the modal
            this.closePassiveSelection();

            // Update character screen if open
            this.updateCharacterScreenIfOpen();

            this.log(`Selected ${selectedPassive.name}!`, "legendary");
        }
    },

    rerollPassiveChoices() {
        if (!this.currentPassiveChoices) return;

        const { tier, rerollCost } = this.currentPassiveChoices;

        // Check if player can afford reroll
        if (gameState.resources.gold < rerollCost) {
            this.log("Not enough gold to reroll!", "failure");
            return;
        }

        // Spend gold
        gameState.resources.gold -= rerollCost;
        gameState.exile.passives.rerollsUsed++;

        // Generate new choices
        const choice1 = this.selectPassiveForLevelUp(tier);
        const choice2 = this.selectPassiveForLevelUp(tier);

        if (!choice1 || !choice2) {
            this.log("No more passives available for reroll!", "failure");
            return;
        }

        // Update choices
        this.currentPassiveChoices = {
            tier: tier,
            choice1: choice1,
            choice2: choice2,
            rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
        };

        // Update display
        this.updatePassiveSelectionDisplay();
        this.updateDisplay(); // Update gold

        this.log(`Rerolled passive choices! (-${rerollCost} gold)`, "info");
    },
    // End of Passive Screen
    // End of Exile Screen from Exile Button


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

    calculateGearBonuses() {
        let life = 0, damage = 0, defense = 0;
        Object.values(gameState.inventory.equipped).forEach(item => {
            if (item) {
                life += item.stats.life || 0;
                damage += item.stats.damage || 0;
                defense += item.stats.defense || 0;
            }
        });
        return { life, damage, defense };
    },

    calculateMoraleBonuses() {
        // Calculate what morale is contributing to current stats
        const morale = gameState.exile.morale;
        let damageBonus = 0;
        let defenseBonus = 0;

        // We need to get the pre-morale stats to calculate the bonus
        const baseStats = gameState.exile.baseStats;
        const gearBonuses = this.calculateGearBonuses();
        const passiveBonuses = this.calculatePassiveBonusesForDisplay();

        const premoraleStats = {
            damage: baseStats.damage + gearBonuses.damage + passiveBonuses.damage,
            defense: baseStats.defense + gearBonuses.defense + passiveBonuses.defense
        };

        if (morale >= 85) {
            // Confident: +10% damage, +5% defense
            damageBonus = Math.floor(premoraleStats.damage * 0.1);
            defenseBonus = Math.floor(premoraleStats.defense * 0.05);
        } else if (morale <= 49) {
            // Demoralized: -10% damage, -5% defense
            damageBonus = -Math.floor(premoraleStats.damage * 0.1);
            defenseBonus = -Math.floor(premoraleStats.defense * 0.05);
        } else if (morale <= 69) {
            // Discouraged: -5% damage
            damageBonus = -Math.floor(premoraleStats.damage * 0.05);
        }

        return { life: 0, damage: damageBonus, defense: defenseBonus };
    },

    updateCharacterEquipment() {
        // Update character screen equipment display for all slots
        const slots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring1', 'ring2', 'amulet', 'belt'];

        slots.forEach(slot => {
            const slotElement = document.getElementById(`char-${slot}-slot`);
            if (!slotElement) {
                console.warn(`Slot element not found: char-${slot}-slot`);
                return; // Skip if element doesn't exist
            }

            const slotContent = slotElement.querySelector('.slot-content');
            if (!slotContent) {
                console.warn(`Slot content not found for: ${slot}`);
                return;
            }

            const equipped = gameState.inventory.equipped[slot];

            if (equipped) {
                const displayName = equipped.getDisplayName ? equipped.getDisplayName() : equipped.name;
                const displayColor = equipped.getDisplayColor ? equipped.getDisplayColor() :
                    rarityDB.getRarity(equipped.rarity)?.color || '#888';

                slotContent.innerHTML = `
                    <div class="item-equipped">
                        <div class="item-name" style="color: ${displayColor}">
                        ${displayName}
                        ${equipped.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                        </div>
                        <div class="item-stats">
                            ${inventorySystem.formatItemStats(equipped)}
                        </div>
                    </div>
                `;
            } else {
                // Check if items are available for this slot
                const checkSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;
                const availableItems = gameState.inventory.backpack.filter(item => item.slot === checkSlot);
                const hasItems = availableItems.length > 0;

                slotContent.innerHTML = `
                    <div class="empty-slot">
                        Empty${hasItems ? '<span class="slot-has-items">+</span>' : ''}
                    </div>
                `;
            }
        });
    },

    // Helpers for Exile Screen
    isCharacterScreenOpen() {
        const modal = document.getElementById('character-screen-modal');
        return modal && modal.style.display === 'flex';
    },

    updateCharacterScreenIfOpen() {
        if (this.isCharacterScreenOpen()) {
            this.updateCharacterScreen();
        }
    },

    // End of Character Stat Calcs for Exile Screen
    // End of Exile Summary Button to Exile Screen ========    

    // Additional Helper Functions
    // Helper to check if a mission caused a level up
    didThisMissionCauseLevelUp(startingExp, expGained, currentLevel) {
        if (expGained <= 0) return false;

        // Calculate what level we started at
        const startingLevel = Math.floor(startingExp / 100) + 1;

        // Calculate what level we should be at after gaining EXP
        const finalExp = startingExp + expGained;
        const finalLevel = Math.floor(finalExp / 100) + 1;

        // Did we actually level up from this mission?
        return finalLevel > startingLevel;
    },


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
    },

    // Helper to Update Resources Display Effects
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


    saveGame() {
        if (gameState.settings.autoSave) {
            const saveData = {
                gameState: gameState,
                timeState: timeState  // ADD: Include time state in saves
            };
            localStorage.setItem('exileManagerSave', JSON.stringify(saveData));
        }
    },

    loadGame() {
        const savedGame = localStorage.getItem('exileManagerSave');
        if (savedGame) {
            const loadedData = JSON.parse(savedGame);

            // Handle both old saves (just gameState) and new saves (with timeState)
            if (loadedData.gameState) {
                Object.assign(gameState, loadedData.gameState);
                if (loadedData.timeState) {
                    Object.assign(timeState, loadedData.timeState);
                }
            } else {
                // Old save format - just gameState
                Object.assign(gameState, loadedData);
            }

            this.log("Game loaded!", "info");
            this.updateDisplay();
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


    // PASSIVE SYSTEM METHODS

    selectPassiveForLevelUp(tier) {
        // Get weighted passive pool for this class and tier
        const pool = passiveHelpers.getWeightedPassivePool(gameState.exile.class, tier);

        // Filter out already allocated passives
        const available = pool.filter(passive =>
            !gameState.exile.passives.allocated.includes(passive.id)
        );

        if (available.length === 0) {
            // Fallback to any tier if this tier is exhausted
            const fallbackPool = Object.keys(passiveDefinitions)
                .filter(id => !gameState.exile.passives.allocated.includes(id))
                .map(id => ({ id, ...passiveDefinitions[id], weight: 1 }));

            if (fallbackPool.length === 0) return null;
            return this.weightedRandomSelect(fallbackPool);
        }

        return this.weightedRandomSelect(available);
    },

    weightedRandomSelect(weightedArray) {
        const totalWeight = weightedArray.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of weightedArray) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }

        return weightedArray[weightedArray.length - 1]; // Fallback
    },

    getPassiveTierForLevel(level) {
        if (level % 10 === 0) return 'keystone';  // 10, 20, 30...
        if (level % 4 === 0) return 'notable';    // 5, 15, 25...
        return 'normal';                          // All other levels
    },

    startPassiveSelection() {
        if (gameState.exile.passives.pendingPoints <= 0) return;

        const currentLevel = gameState.exile.level;
        const tier = this.getPassiveTierForLevel(currentLevel);

        // Get available passives for this tier
        let pool = passiveHelpers.getWeightedPassivePool(gameState.exile.class, tier);

        // For normal passives, include already allocated ones (for stacking)
        // For notable/keystone, exclude already allocated
        if (tier !== 'normal') {
            pool = pool.filter(passive => !gameState.exile.passives.allocated[passive.id]);
        }

        if (pool.length === 0) {
            this.log("No more passives available!", "failure");
            return;
        }

        const choice1 = this.weightedRandomSelect(pool);
        let choice2 = null;

        if (pool.length > 1) {
            // Remove choice1 from pool for choice2 to prevent duplicates
            const poolWithoutChoice1 = pool.filter(p => p.id !== choice1.id);
            if (poolWithoutChoice1.length > 0) {
                choice2 = this.weightedRandomSelect(poolWithoutChoice1);
            } else {
                // If only one passive left in pool, use it again
                choice2 = choice1;
            }
        } else {
            // Only one passive in pool
            choice2 = choice1;
        }

        this.currentPassiveChoices = {
            tier: tier,
            choice1: choice1,
            choice2: choice2,
            rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
        };

        this.log(
            pool.length === 1
                ? `Only one passive left to choose!`
                : `Choose your ${tier} passive! (Reroll cost: ${this.currentPassiveChoices.rerollCost} gold)`,
            "legendary"
        );
    },

    getRerollCost(tier, rerollsUsed) {
        const baseCosts = {
            'normal': 50,
            'notable': 100,
            'keystone': 200
        };

        return baseCosts[tier] * Math.pow(2, rerollsUsed);
    },

    allocatePassive(passiveId) {
        const passive = passiveDefinitions[passiveId];
        if (!passive) return false;

        // Add to allocated passives
        gameState.exile.passives.allocated.push(passiveId);
        gameState.exile.passives.pendingPoints--;
        gameState.exile.passives.rerollsUsed = 0; // Reset for next level

        this.log(`🎯 Allocated ${passive.name}: ${passive.description}`, "legendary");

        // Recalculate stats with new passive
        exileSystem.recalculateStats();
        this.updateDisplay();
        this.saveGame();

        return true;
    },




    // === DAY REPORT MODAL METHODS ===
    openDayReport() {
        // Show the modal
        document.getElementById('day-report-modal').style.display = 'flex';

        // Update day number
        document.getElementById('day-report-day').textContent = timeState.currentDay;

        // Clear previous content
        this.clearDayReportContent();

        //DEBUG for Assignment Data
        this.clearDayReportContent();
        // TEMP: Debug - log collected data
        console.log("Day Report Data:", this.dayReportData);
        // DEBUG END

        // Start the animation sequence
        this.animateDayReport();

        // Add escape key listener
        document.addEventListener('keydown', this.handleDayReportKeydown.bind(this));
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









    // Update command center display on main screen
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
