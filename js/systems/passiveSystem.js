// Passive System
// Handles passive skill selection, allocation, and UI management

const passiveSystem = {
    // Current passive choices state
    currentPassiveChoices: null,

    // === CORE PASSIVE METHODS ===
    
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
            rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
        };

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
        const passive = passiveDefinitions[passiveId];
        if (!passive) return false;

        // Add to allocated passives
        gameState.exile.passives.allocated.push(passiveId);
        gameState.exile.passives.pendingPoints--;
        gameState.exile.passives.rerollsUsed = 0; // Reset for next level

        uiSystem.log(`🎯 Allocated ${passive.name}: ${passive.description}`, "legendary");

        // Recalculate stats with new passive
        exileSystem.recalculateStats();
        uiSystem.updateDisplay();
        game.saveGame();

        return true;
    },

    // === PASSIVE UI METHODS ===
    
    openPassiveSelection() {
        // Make sure we have pending points and choices ready
        if (gameState.exile.passives.pendingPoints <= 0) {
            uiSystem.log("No passive points to spend!", "failure");
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
            characterScreenSystem.updateCharacterScreenIfOpen();

            uiSystem.log(`Selected ${selectedPassive.name}!`, "legendary");
        }
    },

    rerollPassiveChoices() {
        if (!this.currentPassiveChoices) return;

        const { tier, rerollCost } = this.currentPassiveChoices;

        // Check if player can afford reroll
        if (gameState.resources.gold < rerollCost) {
            uiSystem.log("Not enough gold to reroll!", "failure");
            return;
        }

        // Spend gold
        gameState.resources.gold -= rerollCost;
        gameState.exile.passives.rerollsUsed++;

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
            rerollCost: this.getRerollCost(tier, gameState.exile.passives.rerollsUsed)
        };

        // Update display
        this.updatePassiveSelectionDisplay();
        uiSystem.updateDisplay(); // Update gold

        uiSystem.log(`Rerolled passive choices! (-${rerollCost} gold)`, "info");
    }
};

// Make available globally
window.passiveSystem = passiveSystem;

// Export for module use
export { passiveSystem };
