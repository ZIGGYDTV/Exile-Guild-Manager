// Passive System
// Handles passive skill selection, allocation, and UI management

const passiveSystem = {
    // Current passive choices state
    currentPassiveChoices: null,

    // === CORE PASSIVE METHODS ===

    selectPassiveForLevelUp(tier) {
        const exile = getCurrentExile();
        if (!exile) return null;

        // Get weighted passive pool for this class and tier
        const pool = passiveHelpers.getWeightedPassivePool(exile.class, tier);

        // Filter out already allocated passives
        const available = pool.filter(passive =>
            !exile.passives.allocated.includes(passive.id)
        );

        if (available.length === 0) {
            // Fallback to any tier if this tier is exhausted
            const fallbackPool = Object.keys(passiveDefinitions)
                .filter(id => !exile.passives.allocated.includes(id))
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
        const exile = getCurrentExile();
        if (!exile || exile.passives.pendingPoints <= 0) return;

        // CRITICAL FIX: Always check gameState first - this prevents the exploit
        if (gameState.currentPassiveChoices) {
            if (!this.currentPassiveChoices) {
                this.currentPassiveChoices = gameState.currentPassiveChoices;
                console.log("Restored choices from gameState in startPassiveSelection");
            }
            console.log("Choices already exist, not generating new ones");
            return;
        }
        
        // Double-check local state
        if (this.currentPassiveChoices) {
            console.log("Already have local passive choices, not generating new ones");
            return;
        }

        const currentLevel = exile.level;
        const tier = this.getPassiveTierForLevel(currentLevel);

        // Get available passives for this tier
        let pool = passiveHelpers.getWeightedPassivePool(exile.class, tier);

        // For normal passives, include already allocated ones (for stacking)
        // For notable/keystone, exclude already allocated
        if (tier !== 'normal') {
            pool = pool.filter(passive => !exile.passives.allocated.includes(passive.id));
        }

        if (pool.length === 0) {
            uiSystem.log("No more passives available!", "failure");
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
            rerollCost: this.getRerollCost(tier, exile.passives.rerollsUsed)
        };

        // Save to both places
        gameState.currentPassiveChoices = this.currentPassiveChoices;
        game.saveGame();

        uiSystem.log(
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
        const exile = getCurrentExile();
        if (!exile) return false;

        const passive = passiveDefinitions[passiveId];
        if (!passive) return false;

        // Add to allocated passives
        exile.passives.allocated.push(passiveId);
        exile.passives.pendingPoints--;
        exile.passives.rerollsUsed = 0; // Reset for next level

        uiSystem.log(`🎯 Allocated ${passive.name}: ${passive.description}`, "legendary");

        // Clear saved choices from BOTH places
        this.currentPassiveChoices = null;
        gameState.currentPassiveChoices = null;

        // Recalculate stats with new passive - PASS THE EXILE
        exileSystem.recalculateStats(exile);

        // Update displays
        uiSystem.updateDisplay();

        // IMPORTANT: Refresh the dynamic display if we're on the passives tab
        if (typeof dynamicDisplayManager !== 'undefined' && dynamicDisplayManager.currentTab === 'passives') {
            dynamicDisplayManager.refreshCurrentTab();
        }

        game.saveGame();

        return true;
    },

    // === PASSIVE UI METHODS ===

    openPassiveSelection() {
        const exile = getCurrentExile();
        if (!exile) {
            uiSystem.log("No exile selected!", "failure");
            return;
        }

        if (exile.passives.pendingPoints <= 0) {
            uiSystem.log("No passive points available!", "failure");
            return;
        }

        // CRITICAL: Always prioritize gameState over local state
        if (gameState.currentPassiveChoices) {
            this.currentPassiveChoices = gameState.currentPassiveChoices;
        }

        // Only generate new choices if we don't have any at all
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


            uiSystem.log(`Selected ${selectedPassive.name}!`, "legendary");
        }
    },

    // Add property to track selection
    selectedChoice: null,

    // New method for selection
    selectChoice(choiceNumber) {
        // Visual feedback
        document.querySelectorAll('.passive-choice').forEach(el => el.classList.remove('selected'));
        document.getElementById(`passive-choice-${choiceNumber}`).classList.add('selected');

        // Store selection
        this.selectedChoice = choiceNumber;

        // Enable confirm button
        document.getElementById('confirm-passive-btn').disabled = false;
    },

    // New confirm method
    confirmPassive() {
        if (!this.selectedChoice || !this.currentPassiveChoices) return;

        this.selectPassive(this.selectedChoice);
        this.selectedChoice = null;
    },

    // Update closePassiveSelection to reset
    closePassiveSelection() {
        document.getElementById('passive-selection-modal').style.display = 'none';

        // Reset selection
        this.selectedChoice = null;
        document.querySelectorAll('.passive-choice').forEach(el => el.classList.remove('selected'));
        if (document.getElementById('confirm-passive-btn')) {
            document.getElementById('confirm-passive-btn').disabled = true;
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.handlePassiveModalKeydown.bind(this));
    },

    rerollPassiveChoices() {
        if (!this.currentPassiveChoices) return;

        const exile = getCurrentExile();
        if (!exile) return;

        const { tier, rerollCost } = this.currentPassiveChoices;

        // Check if player can afford reroll
        if (gameState.resources.gold < rerollCost) {
            uiSystem.log("Not enough gold to reroll!", "failure");
            return;
        }

        // Spend gold
        gameState.resources.gold -= rerollCost;
        exile.passives.rerollsUsed++;

        // Generate new choices
        const choice1 = this.selectPassiveForLevelUp(tier);
        const choice2 = this.selectPassiveForLevelUp(tier);

        if (!choice1 || !choice2) {
            uiSystem.log("No more passives available for reroll!", "failure");
            return;
        }

        // Update choices
        this.currentPassiveChoices = {
            tier: tier,
            choice1: choice1,
            choice2: choice2,
            rerollCost: this.getRerollCost(tier, exile.passives.rerollsUsed)
        };

        // Save to gameState and force save
        gameState.currentPassiveChoices = this.currentPassiveChoices;
        game.saveGame(); // Save after reroll

        // Update display
        this.updatePassiveSelectionDisplay();
        uiSystem.updateDisplay(); // Update gold

        uiSystem.log(`Rerolled passive choices! (-${rerollCost} gold)`, "info");
    }
};

// Export for module use
export { passiveSystem };
