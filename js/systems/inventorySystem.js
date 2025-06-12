// Inventory Management System
// Handles all inventory operations, equipment, crafting, and item manipulation

const inventorySystem = {
    currentEquipmentSlot: null, // For equipment selector modal

    // === EQUIPMENT MANAGEMENT ===
    // Equipment management for multi-exile system
    equipItem(itemId, exileId = null, targetSlot = null) {
        // Default to selected exile if not specified
        if (!exileId) {
            exileId = gameState.selectedExileId;
        }

        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) {
            console.error(`Exile ${exileId} not found!`);
            return false;
        }

        // Find item in inventory
        const itemIndex = gameState.inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            console.error(`Item ${itemId} not found in inventory!`);
            return false;
        }

        const item = gameState.inventory.items[itemIndex];

        // --- Weapon slot standardization ---
        let slot = targetSlot || item.slot;
        // Map weapon1h and weapon2h to 'weapon' for equipment
        if (item.slot === 'weapon1h' || item.slot === 'weapon2h') {
            slot = 'weapon';
        }
        // Handle ring slots
        if (item.slot === 'ring' && !targetSlot) {
            if (!exile.equipment.ring1) {
                slot = 'ring1';
            } else if (!exile.equipment.ring2) {
                slot = 'ring2';
            } else {
                slot = 'ring1'; // Default to replacing ring1
            }
        }

        // --- 2H weapon logic: unequip offhand if equipping a 2H weapon ---
        if ((item.slot === 'weapon2h' || slot === 'weapon') && item.slot === 'weapon2h') {
            if (exile.equipment.shield) {
                this.unequipItem('shield', exileId);
            }
        }

        // Unequip current item if any
        if (exile.equipment[slot]) {
            this.unequipItem(slot, exileId);
        }

        // Remove from inventory
        gameState.inventory.items.splice(itemIndex, 1);

        // Equip to exile
        exile.equipment[slot] = item;

        // Recalculate stats
        exileSystem.recalculateStats(exile);

        // Update displays
        if (typeof exileRowManager !== 'undefined') {
            exileRowManager.updateRow(exileRowManager.getRowForExile(exileId), exile);
        }

        console.log(`Equipped ${item.name} to ${exile.name}'s ${slot}`);
        game.saveGame();
        return true;
    },

    unequipItem(slot, exileId = null) {
        // Default to selected exile
        if (!exileId) {
            exileId = gameState.selectedExileId;
        }

        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) {
            console.error(`Exile ${exileId} not found!`);
            return false;
        }

        const item = exile.equipment[slot];
        if (!item) {
            console.log(`No item in ${slot} for ${exile.name}`);
            return false;
        }

        // Remove from exile
        exile.equipment[slot] = null;

        // Add back to inventory
        gameState.inventory.items.push(item);
        
        // Update inventory grid if it exists
        if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.gridContainer) {
            inventoryGridManager.addNewItemToInventory(item);
        }

        // Recalculate stats
        exileSystem.recalculateStats(exile);

        // Update displays
        if (typeof exileRowManager !== 'undefined') {
            exileRowManager.updateRow(exileRowManager.getRowForExile(exileId), exile);
        }

        // Update dynamic display if it's showing equipment
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.refreshCurrentTab();
        }

        console.log(`Unequipped ${item.name} from ${exile.name}`);
        game.saveGame();
        return true;
    },


    // DUPE PROTECTION
    // Check for item duplication across all exiles and inventory
    checkForDuplicateItems() {
        const seenIds = new Set();
        const duplicates = [];

        // Check inventory
        gameState.inventory.items.forEach(item => {
            if (item.id) {
                if (seenIds.has(item.id)) {
                    duplicates.push({ location: 'inventory', item });
                }
                seenIds.add(item.id);
            }
        });

        // Check all exiles' equipment
        gameState.exiles.forEach(exile => {
            Object.entries(exile.equipment).forEach(([slot, item]) => {
                if (item && item.id) {
                    if (seenIds.has(item.id)) {
                        duplicates.push({
                            location: `${exile.name}'s ${slot}`,
                            item
                        });
                    }
                    seenIds.add(item.id);
                }
            });
        });

        if (duplicates.length > 0) {
            console.error('DUPLICATE ITEMS FOUND:', duplicates);
            return duplicates;
        }

        return null;
    },

    // Clean up any duplicates by assigning new IDs
    fixDuplicateItems() {
        const duplicates = this.checkForDuplicateItems();
        if (!duplicates) return;

        duplicates.forEach(({ location, item }) => {
            const oldId = item.id;
            item.id = Date.now() + Math.random();
            console.log(`Fixed duplicate: ${item.name} at ${location}, changed ID from ${oldId} to ${item.id}`);
        });
    },

    // === INVENTORY MANAGEMENT ===

    calculateItemSellValue(item) {
        // Base values per rarity
        const rarityMultipliers = {
            common: { min: 5, max: 10 },
            magic: { min: 15, max: 25 },
            rare: { min: 40, max: 60 }
        };

        const rarity = item.rarity || 'common';
        const ilvl = item.ilvl || 1;
        const multipliers = rarityMultipliers[rarity] || rarityMultipliers.common;

        // Calculate base value with some randomness
        const baseValue = game.randomBetween(multipliers.min, multipliers.max);
        const sellValue = Math.floor(baseValue * ilvl);

        // Minimum sell value of 10 gold
        return Math.max(10, sellValue);
    },

    equipItemFromModal(itemId) {
        const item = gameState.inventory.items.find(i => i.id === itemId);
        if (!item) return;

        // Determine the correct slot
        let targetSlot = item.slot;

        // For rings, find an empty ring slot
        if (item.slot === 'ring') {
            if (!gameState.inventory.equipped.ring1) {
                targetSlot = 'ring1';
            } else if (!gameState.inventory.equipped.ring2) {
                targetSlot = 'ring2';
            } else {
                targetSlot = 'ring1'; // Default to ring1 if both equipped
            }
        }

        this.equipItemToSlot(itemId, targetSlot);
        this.updateInventoryModalDisplay();
        // characterScreenSystem.updateCharacterScreenIfOpen();
    },

    deleteItem(itemId) {
        if (confirm("Are you sure you want to delete this item?")) {
            gameState.inventory.items = gameState.inventory.items.filter(i => i.id !== itemId);
            this.updateInventoryModalDisplay();
            game.saveGame();

            // Update counts
            const count = gameState.inventory.items.length;
            document.getElementById('modal-inventory-count').textContent = `${count}`;
            document.getElementById('inventory-count-main').textContent = `${count}`;
        }
    },

    sellItem(itemId) {
        const item = gameState.inventory.items.find(i => i.id === itemId);
        if (!item) return;

        const sellValue = this.calculateItemSellValue(item);

        // Find the item element in the DOM
        const itemElements = document.querySelectorAll('.inventory-item');
        let itemElement = null;

        // Find the specific item element by checking if it contains the sell button with this itemId
        itemElements.forEach(el => {
            const sellBtn = el.querySelector(`button[onclick="inventorySystem.sellItem(${itemId})"]`);
            if (sellBtn) {
                itemElement = el;
            }
        });

        if (itemElement) {
            // Add dissolving class for the main animation
            itemElement.classList.add('dissolving');

            // Create gold particles
            this.createGoldParticles(itemElement);

            // Wait for animation to complete before removing
            setTimeout(() => {
                this.completeSellItem(itemId, item, sellValue);
            }, 300);
        } else {
            // Fallback if element not found
            this.completeSellItem(itemId, item, sellValue);
        }
    },

    completeSellItem(itemId, item, sellValue) {
        // Remove item from inventory
        gameState.inventory.items = gameState.inventory.items.filter(i => i.id !== itemId);

        // Add gold
        gameState.resources.gold += sellValue;

        // Log the sale
        uiSystem.log(`💰 Sold ${item.name} for ${sellValue} gold`, "success");

        // Update displays
        this.updateInventoryModalDisplay();
        uiSystem.updateDisplay();

        // Update modal gold with pulse effect
        const modalGoldElement = document.getElementById('modal-gold');
        if (modalGoldElement) {
            modalGoldElement.textContent = gameState.resources.gold;

            // Add pulse effect
            modalGoldElement.classList.remove('resource-glow-pulse');
            void modalGoldElement.offsetWidth; // Force reflow to restart animation
            modalGoldElement.classList.add('resource-glow-pulse');

            // Remove class after animation
            setTimeout(() => {
                modalGoldElement.classList.remove('resource-glow-pulse');
            }, 700);
        }

        game.saveGame();

        // Update counts
        const count = gameState.inventory.items.length;
        document.getElementById('modal-inventory-count').textContent = `${count}`;
        document.getElementById('inventory-count-main').textContent = `${count}`;
    },

    createGoldParticles(element) {
        const rect = element.getBoundingClientRect();
        const particleCount = 8;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'gold-particle';

            // Random starting position within the item
            const startX = rect.left + Math.random() * rect.width;
            const startY = rect.top + Math.random() * rect.height;

            // Random horizontal drift
            const dx = (Math.random() - 0.5) * 60;

            particle.style.left = startX + 'px';
            particle.style.top = startY + 'px';
            particle.style.setProperty('--dx', dx + 'px');

            // Random animation duration for variety
            const duration = 0.6 + Math.random() * 0.3;
            particle.style.animation = `floatUp ${duration}s ease-out forwards`;

            // Random delay for staggered effect
            particle.style.animationDelay = `${Math.random() * 0.1}s`;

            document.body.appendChild(particle);

            // Remove particle after animation
            setTimeout(() => {
                particle.remove();
            }, (duration + 0.1) * 1000);
        }
    },

    // === CRAFTING METHODS ===

    // Helper function to find item anywhere (inventory or equipped)
    findItemAnywhere(itemId) {
        // First check inventory
        let item = gameState.inventory.items.find(i => i.id === itemId);
        if (item) return { item, location: 'inventory' };
        
        // Then check all exiles' equipment
        for (const exile of gameState.exiles) {
            for (const [slot, equippedItem] of Object.entries(exile.equipment)) {
                if (equippedItem && equippedItem.id === itemId) {
                    return { item: equippedItem, location: 'equipped', exile, slot };
                }
            }
        }
        
        return null;
    },

    // USE CHAOS ORB
    useChaosOrb(itemId) {
        const itemResult = this.findItemAnywhere(itemId);
        if (!itemResult || gameState.resources.chaosOrbs < 1) return false;
        
        const { item, location, exile } = itemResult;

        // Get only non-implicit stats
        const currentStatKeys = Object.keys(item.stats);
        if (currentStatKeys.length === 0) {
            uiSystem.log("No stats to reroll!", "failure");
            return false;
        }

        // Pick random stat to remove
        const statToRemove = currentStatKeys[Math.floor(Math.random() * currentStatKeys.length)];
        const oldValue = item.stats[statToRemove];

        // Find base item with fallback
        let itemBase = null;
        for (const equipment of itemDB.equipment.values()) {
            if (equipment.slot === item.slot && item.name.includes(equipment.name)) {
                itemBase = equipment;
                break;
            }
        }

        // If not found by name, try to find by baseItem property
        if (!itemBase && item.baseItem) {
            itemBase = itemDB.getEquipment(itemBases[item.baseItem].name);
        }

        if (!itemBase) {
            uiSystem.log("Cannot determine item base type!", "failure");
            return false;
        }

        // Get all possible stats for this slot from statDB
        const allPossibleStats = statDB.getStatsForSlot(item.slot);
        const craftableStats = allPossibleStats.filter(statDef =>
            !statDef.requiredThemes &&
            (!statDef.restrictedToSlots || statDef.restrictedToSlots.includes(item.slot))
        );
        const availableStats = craftableStats
            .map(statDef => statDef.name)
            .filter(stat => !currentStatKeys.includes(stat) && stat !== statToRemove);

        if (availableStats.length === 0) {
            uiSystem.log("No available stats to add!", "failure");
            return false;
        }

        // Pick a random stat from available stats
        let statWeights = {};
        if (itemBase && itemBase.statWeights) {
            for (const stat of availableStats) {
                statWeights[stat] = itemBase.statWeights[stat] || 1;
            }
        } else {
            for (const stat of availableStats) {
                statWeights[stat] = 1;
            }
        }
        const totalWeight = availableStats.reduce((sum, stat) => sum + (statWeights[stat] || 1), 0);
        let rand = Math.random() * totalWeight;
        let newStat = availableStats[0];
        for (const stat of availableStats) {
            rand -= (statWeights[stat] || 1);
            if (rand <= 0) {
                newStat = stat;
                break;
            }
        }

        // Apply the change
        delete item.stats[statToRemove];
        item.stats[newStat] = oldValue;

        // Consume orb
        gameState.resources.chaosOrbs--;

        uiSystem.log(`🌀 Chaotic Shard used! ${game.getStatDisplayName(statToRemove)} (${oldValue}) → ${game.getStatDisplayName(newStat)} (${oldValue})`, "legendary");

        // Update main resource display
        uiSystem.updateResourceDisplay();

        // Update displays
        if (location === 'equipped') {
            exileSystem.recalculateStats(exile);
            uiSystem.updateDisplay();
        }
        this.updateInventoryDisplay();
        
        // Update inventory grid manager if it exists
        if (typeof inventoryGridManager !== 'undefined') {
            // If this is the selected item, refresh the detail panel
            if (inventoryGridManager.selectedItem === itemId) {
                inventoryGridManager.updateItemDetailPanel(item);
            }
            inventoryGridManager.updateDisplay();
        }
        
        // Update equipment display and detail panel for equipped items
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.refreshCurrentTab();
            
            // If this was an equipped item, refresh the detail panel too
            if (location === 'equipped') {
                dynamicDisplayManager.updateItemDetailPanelForEquipped(item, itemResult.slot, exile.id);
            }
        }
        
        game.saveGame();
        // characterScreenSystem.updateCharacterScreenIfOpen();

        return true;
    },

    // USE Exalt
    useExaltedOrb(itemId) {
        const itemResult = this.findItemAnywhere(itemId);
        if (!itemResult || gameState.resources.exaltedOrbs < 1) return false;
        
        const { item, location, exile } = itemResult;

        // Get current stat count (excluding implicits)
        const currentStatCount = Object.keys(item.stats).length;

        // Get current rarity info
        const currentRarity = rarityDB.getRarity(item.rarity);
        if (!currentRarity) {
            uiSystem.log("Unknown item rarity!", "failure");
            return false;
        }

        // Check if item is already overcapped
        if (item.isOvercapped) {
            uiSystem.log("This item has already been perfected with an Exalted Shard!", "failure");
            return false;
        }

        // Check if we need to upgrade rarity or if it's a rare at max
        let targetRarity = currentRarity;
        let canAddStat = currentStatCount < currentRarity.maxStats;

        if (!canAddStat) {
            if (item.rarity === 'common') {
                targetRarity = rarityDB.getRarity('magic');
                item.rarity = 'magic';
                canAddStat = true;
                uiSystem.log(`⚡ Item upgraded to Magic rarity!`, "legendary");
            } else if (item.rarity === 'magic') {
                targetRarity = rarityDB.getRarity('rare');
                item.rarity = 'rare';
                canAddStat = true;
                uiSystem.log(`⚡ Item upgraded to Rare rarity!`, "legendary");
            } else if (item.rarity === 'rare' && currentStatCount >= currentRarity.maxStats) {
                // Only allow overcapping if the rare item is ALREADY at max stats (4)
                canAddStat = true;
                item.isOvercapped = true;
                uiSystem.log(`✨ Pushing beyond normal limits!`, "legendary");
            }

            // Update item name with new rarity (except for overcapped)
            if (!item.isOvercapped) {
                const baseName = item.name.replace(/^(Common|Magic|Rare)\s+/, '');
                item.name = `${targetRarity.name} ${baseName}`;
            }
        }

        // Find base item with fallback
        let itemBase = null;
        for (const equipment of itemDB.equipment.values()) {
            if (equipment.slot === item.slot && item.name.includes(equipment.name)) {
                itemBase = equipment;
                break;
            }
        }

        // If not found by name, try to find by baseItem property
        if (!itemBase && item.baseItem) {
            itemBase = itemDB.getEquipment(itemBases[item.baseItem].name);
        }

        if (!itemBase) {
            uiSystem.log("Cannot determine item base type!", "failure");
            return false;
        }

        // Get all possible stats for this slot from statDB
        const allPossibleStats = statDB.getStatsForSlot(item.slot).filter(statDef =>
            !statDef.requiredThemes &&
            (!statDef.restrictedToSlots || statDef.restrictedToSlots.includes(item.slot))
        );

        // Build list of stats that aren't already on the item
        const currentStats = Object.keys(item.stats);
        const availableStats = [];

        for (const statDef of allPossibleStats) {
            const statName = statDef.name;

            // Skip if already on the item (either as implicit or regular stat)
            if (currentStats.includes(statName) || (item.implicitStats && item.implicitStats[statName])) {
                continue;
            }

            // Add to available stats (we don't need weights for exalts, just possibilities)
            availableStats.push(statName);
        }

        if (availableStats.length === 0) {
            uiSystem.log("No available stats to add!", "failure");
            return false;
        }

        // Pick a random stat from available stats
        let statWeightsEx = {};
        if (itemBase && itemBase.statWeights) {
            for (const stat of availableStats) {
                statWeightsEx[stat] = itemBase.statWeights[stat] || 1;
            }
        } else {
            for (const stat of availableStats) {
                statWeightsEx[stat] = 1;
            }
        }
        const totalWeightEx = availableStats.reduce((sum, stat) => sum + (statWeightsEx[stat] || 1), 0);
        let randEx = Math.random() * totalWeightEx;
        let newStatEx = availableStats[0];
        for (const stat of availableStats) {
            randEx -= (statWeightsEx[stat] || 1);
            if (randEx <= 0) {
                newStatEx = stat;
                break;
            }
        }
        const statDef = statDB.getStat(newStatEx);
        const range = statDef.getValueRange(item.ilvl);
        const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

        // Add the stat
        item.stats[newStatEx] = value;

        // Consume orb
        gameState.resources.exaltedOrbs--;

        uiSystem.log(`⭐ Exalted Shard used! Added ${game.getStatDisplayName(newStatEx)} (${value})`, "legendary");

        // Update main resource display
        uiSystem.updateResourceDisplay();

        // Update displays
        if (location === 'equipped') {
            exileSystem.recalculateStats(exile);
            uiSystem.updateDisplay();
        }
        this.updateInventoryDisplay();
        
        // Update inventory grid manager if it exists
        if (typeof inventoryGridManager !== 'undefined') {
            // If this is the selected item, refresh the detail panel
            if (inventoryGridManager.selectedItem === itemId) {
                inventoryGridManager.updateItemDetailPanel(item);
            }
            inventoryGridManager.updateDisplay();
        }
        
        // Update equipment display and detail panel for equipped items
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.refreshCurrentTab();
            
            // If this was an equipped item, refresh the detail panel too
            if (location === 'equipped') {
                dynamicDisplayManager.updateItemDetailPanelForEquipped(item, itemResult.slot, exile.id);
            }
        }
        
        game.saveGame();
        // characterScreenSystem.updateCharacterScreenIfOpen();

        return true;
    },

    // === MODAL CRAFTING METHODS ===

    useChaosOrbModal(itemId) {
        const result = this.useChaosOrb(itemId);

        // Update modal currency displays
        document.getElementById('modal-chaos-orbs').textContent = gameState.resources.chaosOrbs;

        this.updateInventoryModalDisplay();
    },

    useExaltedOrbModal(itemId) {
        this.useExaltedOrb(itemId);
        this.updateInventoryModalDisplay();
        // characterScreenSystem.updateCharacterScreenIfOpen();
    },

    // === DISPLAY AND FORMATTING METHODS ===

    updateInventoryDisplay() {
        // Update equipped items (only if elements exist - old main screen)
        ['weapon', 'armor', 'jewelry'].forEach(slot => {
            const slotElement = document.getElementById(`${slot}-slot`);
            if (slotElement) {
                const slotContent = slotElement.querySelector('.slot-content');
                if (slotContent) {
                    const equipped = gameState.inventory.equipped[slot];

                    if (equipped) {
                        slotContent.innerHTML = `
                        <div class="item-equipped">
                            <div class="item-name ${equipped.rarity}">${equipped.name}</div>
                                                        <div class="item-stats">
                                ${Object.entries(equipped.stats).map(([stat, value]) => {
                                    // Use the same formatting helper as inventory grid manager
                                    if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                                        return `<div class="item-stat">${inventoryGridManager.formatStatValue(stat, value)}</div>`;
                                    } else {
                                        return `<div class="item-stat">+${value} ${game.getStatDisplayName(stat)}</div>`;
                                    }
                                }).join('')}
                            </div>
                        </div>
                    `;
                    } else {
                        slotContent.innerHTML = '<div class="empty-slot">Empty</div>';
                    }
                }
            }
        });

        // Update inventory (only if elements exist - old main screen)
        const inventoryElement = document.getElementById('inventory');
        const inventoryCount = document.getElementById('inventory-count');

        if (inventoryCount) {
            inventoryCount.textContent = `(${gameState.inventory.items.length})`;
        }

        if (inventoryElement) {
            if (gameState.inventory.items.length === 0) {
                inventoryElement.innerHTML = '<div style="color: #666; text-align: center;">No items in inventory</div>';
            } else {
                inventoryElement.innerHTML = gameState.inventory.items.map(item => `
        <div class="inventory-item ${item.rarity}">
            <div class="item-name ${item.rarity}">${item.name}</div>
            <div class="item-type">${item.slot}</div>
            <div class="item-ilvl" style="font-size: 0.7em; color: #666; font-style: italic;">ilvl ${item.ilvl}</div>
            <div class="item-stats">
                ${Object.entries(item.stats).map(([stat, value]) =>
                    `<div class="item-stat">+${value} ${game.getStatDisplayName(stat)}</div>`
                ).join('')}
            </div>
            <div class="item-actions">
                <button class="action-btn equip" onclick="inventorySystem.equipItem(${item.id})">Equip</button>
                <button class="action-btn chaos" onclick="inventorySystem.useChaosOrb(${item.id})" 
                    ${gameState.resources.chaosOrbs < 1 ? 'disabled' : ''}>
                    Chaos (${gameState.resources.chaosOrbs})
                </button>
                <button class="action-btn exalted" onclick="inventorySystem.useExaltedOrb(${item.id})" 
                    ${gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}>
                    Exalted (${gameState.resources.exaltedOrbs})
                </button>
            </div>
        </div>
    `).join('');
            }
        }
    },

    updateInventoryModalDisplay() {
        const container = document.getElementById('inventory-items-grid');

        if (gameState.inventory.items.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center; grid-column: 1/-1;">No items in inventory</div>';
            return;
        }

        container.innerHTML = gameState.inventory.items.map(item => {
            const displayName = item.name;
            const displayColor = rarityDB.getRarity(item.rarity)?.color || '#888';
            const sellValue = this.calculateItemSellValue(item);

            return `
                <div class="inventory-item ${item.rarity}">
                    <div class="item-details">
                        <div class="item-header">
                            <div class="item-name" style="color: ${displayColor}">
                                ${displayName}
                                ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                            </div>
                            <div class="item-type">${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</div>
                        </div>
                        <div class="item-ilvl">Item Level: ${item.ilvl}</div>
                        <div class="item-stats">
                            ${this.formatItemStats(item)}
                        </div>
                        <div class="item-sell-value">Sell: ${sellValue}g</div>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn chaos" onclick="inventorySystem.useChaosOrbModal(${item.id})" 
                            ${gameState.resources.chaosOrbs < 1 ? 'disabled' : ''} 
                            title="Chaotic Orb (${gameState.resources.chaosOrbs})">
                            🌀
                        </button>
                        <button class="action-btn exalted" onclick="inventorySystem.useExaltedOrbModal(${item.id})" 
                            ${gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}
                            title="Exalted Orb (${gameState.resources.exaltedOrbs})">
                            ⭐
                        </button>
                        <button class="action-btn sell" onclick="inventorySystem.sellItem(${item.id})" title="Sell ${sellValue}g">
                            💰
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    formatItemStats(item) {
        let html = '';

        if (item.slot === 'weapon' && item.attackSpeed) {
            html += '<div class="weapon-attack-speed">';
            html += `<span class="item-stat-line">Attack Speed: ${item.attackSpeed.toFixed(2)}</span>`;
            html += '</div>';
        }

        // Get effective damage values for weapons
        const effectiveDamage = this.getEffectiveDamageValues(item);

        // Display implicit stats first with special styling
        if (item.implicitStats && Object.keys(item.implicitStats).length > 0) {
            const implicitStats = Object.entries(item.implicitStats);
            html += '<div class="implicit-stats">';
            html += implicitStats.map(([stat, value]) => {
                const statName = game.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.implicitDamage;
                    if (effectiveValue !== value) {
                        return `<span class="item-stat-line">+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span></span>`;
                    }
                }

                // Use the same formatting helper as inventory grid manager
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                    return `<span class="item-stat-line">${inventoryGridManager.formatStatValue(stat, value)}</span>`;
                } else {
                    return `<span class="item-stat-line">+${value} ${statName}</span>`;
                }
            }).join('');
            html += '</div>';
        }

        // Display regular stats
        const stats = item.stats instanceof Map ?
            Array.from(item.stats.entries()) :
            Object.entries(item.stats || {});

        if (stats.length > 0) {
            html += '<div class="regular-stats">';
            html += stats.map(([stat, value]) => {
                const statName = game.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.rolledDamage;
                    if (effectiveValue !== value) {
                        return `<span class="item-stat-line">+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span></span>`;
                    }
                }

                // Use the same formatting helper as inventory grid manager
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                    return `<span class="item-stat-line">${inventoryGridManager.formatStatValue(stat, value)}</span>`;
                } else {
                    return `<span class="item-stat-line">+${value} ${statName}</span>`;
                }
            }).join('');
            html += '</div>';
        }

        return html;
    },

    formatItemStatsForTooltip(item) {
        let html = '';

        if (item.slot === 'weapon' && item.attackSpeed) {
            html += '<div class="tooltip-weapon-stats">';
            html += `Attack Speed: ${item.attackSpeed.toFixed(2)}`;
            html += '</div>';
            html += '<div class="stat-divider"></div>'; // Visual separator
        }

        // Get effective damage values for weapons
        const effectiveDamage = this.getEffectiveDamageValues(item);

        // Display implicit stats first with special styling
        if (item.implicitStats && Object.keys(item.implicitStats).length > 0) {
            const implicitStats = Object.entries(item.implicitStats);
            html += '<div class="tooltip-implicit-stats">';
            html += implicitStats.map(([stat, value]) => {
                const statName = game.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.implicitDamage;
                    if (effectiveValue !== value) {
                        return `+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span>`;
                    }
                }

                // Use the same formatting helper as inventory grid manager
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                    return inventoryGridManager.formatStatValue(stat, value);
                } else {
                    return `+${value} ${statName}`;
                }
            }).join('<br>');
            html += '</div>';
            html += '<div class="stat-divider"></div>'; // Visual separator
        }

        // Display regular stats
        const stats = Object.entries(item.stats || {});
        if (stats.length > 0) {
            html += '<div class="tooltip-regular-stats">';
            html += stats.map(([stat, value]) => {
                const statName = game.getStatDisplayName(stat);

                // Show effective damage for weapons
                if (stat === 'damage' && effectiveDamage) {
                    const effectiveValue = effectiveDamage.rolledDamage;
                    if (effectiveValue !== value) {
                        return `+${effectiveValue} ${statName} <span class="damage-multiplier">(${value} × ${effectiveDamage.multiplier})</span>`;
                    }
                }

                // Use the same formatting helper as inventory grid manager
                if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                    return inventoryGridManager.formatStatValue(stat, value);
                } else {
                    return `+${value} ${statName}`;
                }
            }).join('<br>');
            html += '</div>';
        }

        return html;
    },

    getItemsForSlot(slot) {
        // Handle ring slots
        const itemSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;

        return gameState.inventory.items.filter(item => {
            return item.slot === itemSlot;
        });
    },

    getEffectiveDamageValues(item) {
        if (item.slot !== 'weapon' || !item.damageMultiplier) {
            return null; // Not a weapon or no multiplier
        }

        const implicitDamage = (item.implicitStats?.damage || 0);
        const rolledDamage = (item.stats?.damage || 0);

        return {
            implicitDamage: Math.floor(implicitDamage * item.damageMultiplier),
            rolledDamage: Math.floor(rolledDamage * item.damageMultiplier),
            originalImplicitDamage: implicitDamage,
            originalRolledDamage: rolledDamage,
            multiplier: item.damageMultiplier
        };
    },

    // === INVENTORY MODAL MANAGEMENT ===

    openInventoryModal() {
        console.log("openInventoryModal called!");

        // Check if modal exists
        const modal = document.getElementById('inventory-modal');
        console.log("Modal element:", modal);

        if (!modal) {
            console.error("Inventory modal not found!");
            return;
        }

        // Update inventory count
        const count = gameState.inventory.items.length;
        document.getElementById('modal-inventory-count').textContent = `${count}`;
        document.getElementById('inventory-count-main').textContent = `${count}`;

        // Update currency display
        document.getElementById('modal-gold').textContent = gameState.resources.gold;
        document.getElementById('modal-chaos-orbs').textContent = gameState.resources.chaosOrbs;
        document.getElementById('modal-exalted-orbs').textContent = gameState.resources.exaltedOrbs;

        // Populate inventory items
        this.updateInventoryModalDisplay();

        // Show modal
        console.log("Setting modal display to flex");
        modal.style.display = 'flex';
        console.log("Modal display is now:", modal.style.display);
    },

    closeInventoryModal() {
        document.getElementById('inventory-modal').style.display = 'none';
    },

    handleInventoryModalClick(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.closeInventoryModal();
        }
    },

    // === EQUIPMENT SELECTOR MODAL ===

    openEquipmentSelector(slot) {
        this.currentEquipmentSlot = slot;

        // Update modal title
        const slotName = slot === 'ring1' || slot === 'ring2' ? 'Ring' :
            slot.charAt(0).toUpperCase() + slot.slice(1);
        document.getElementById('equipment-selector-title').textContent = `Select ${slotName}`;

        // Show current equipped item
        const currentItem = gameState.inventory.equipped[slot];
        const currentSection = document.getElementById('current-equipped-item');

        if (currentItem) {
            const displayName = currentItem.getDisplayName ? currentItem.getDisplayName() : currentItem.name;
            const displayColor = currentItem.getDisplayColor ? currentItem.getDisplayColor() :
                (currentItem.rarity ? rarityDB.getRarity(currentItem.rarity)?.color : null) || '#888';

            currentSection.innerHTML = `
                <div class="equipment-option current">
                    <div class="item-name" style="color: ${displayColor}">
                    ${displayName}
${currentItem.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                    </div>
                    <div class="item-stats">
                        ${this.formatItemStats(currentItem)}
                    </div>
                </div>
            `;
        } else {
            currentSection.innerHTML = '<div class="empty-slot">Nothing equipped</div>';
        }

        // Show available items for this slot
        const availableSection = document.getElementById('available-items-list');
        const validItems = this.getItemsForSlot(slot);

        if (validItems.length === 0) {
            availableSection.innerHTML = '<div class="empty-slot">No items available for this slot</div>';
        } else {
            availableSection.innerHTML = validItems
                .filter(item => item != null)  // Remove any null/undefined items
                .map(item => {
                    const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
                    // Get color from rarity system
                    const displayColor = item.getDisplayColor ? item.getDisplayColor() :
                        (item.rarity ? rarityDB.getRarity(item.rarity)?.color : null) || '#888';

                    return `
                        <div class="equipment-option" onclick="inventorySystem.selectEquipment(${item.id})">
                            <div class="item-name" style="color: ${displayColor}">
                            ${displayName}
                             ${item.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
                            </div>
                            <div class="item-stats">
                                ${this.formatItemStats(item)}
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Add unequip option at the end if something is equipped
        if (currentItem) {
            availableSection.innerHTML += `
                <div class="equipment-option unequip-option" onclick="inventorySystem.selectEquipment(null)">
                    <div>Unequip</div>
                </div>
            `;
        }

        // Show modal
        document.getElementById('equipment-selector-modal').style.display = 'flex';
    },

    closeEquipmentSelector() {
        document.getElementById('equipment-selector-modal').style.display = 'none';
        this.currentEquipmentSlot = null;
    },

    handleEquipmentSelectorClick(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.closeEquipmentSelector();
        }
    },

    selectEquipment(itemId) {
        const slot = this.currentEquipmentSlot;

        console.log("Selecting equipment:", itemId, "for slot:", slot);

        if (itemId === null) {
            // Unequip
            this.unequipItem(slot);
        } else {
            // Equip new item
            this.equipItemToSlot(itemId, slot);
        }

        this.closeEquipmentSelector();
        // characterScreenSystem.updateCharacterScreen();
    },

    // === ITEM TOOLTIP SYSTEM ===

    initializeItemTooltips() {
        // Add event listeners for item tooltips
        document.addEventListener('mouseover', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.showItemTooltip(event.target, event);
            }
        });

        document.addEventListener('mouseout', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.hideItemTooltip();
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (event.target.hasAttribute('data-item-tooltip')) {
                this.updateTooltipPosition(event);
            }
        });
    },

    showItemTooltip(element, event) {
        // Remove any existing tooltip
        this.hideItemTooltip();

        try {
            const item = JSON.parse(element.getAttribute('data-item-tooltip'));

            const tooltip = document.createElement('div');
            tooltip.id = 'item-tooltip';
            tooltip.className = 'item-tooltip';

            // Get item color
            const itemColor = rarityDB.getRarity(item.rarity)?.color || '#888';

            tooltip.innerHTML = `
            <div class="tooltip-item-name" style="color: ${itemColor}">
                ${item.name}
                ${item.isOvercapped ? '<span class="overcapped-icon">✦</span>' : ''}
            </div>
            <div class="tooltip-item-type">${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</div>
            <div class="tooltip-item-ilvl">Item Level: ${item.ilvl}</div>
            <div class="tooltip-item-stats">
                ${this.formatItemStatsForTooltip(item)}
            </div>
        `;

            document.body.appendChild(tooltip);
            this.updateTooltipPosition(event);
        } catch (e) {
            console.error('Error showing item tooltip:', e);
        }
    },

    hideItemTooltip() {
        const existingTooltip = document.getElementById('item-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    },

    updateTooltipPosition(event) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;

        const x = event.clientX + 10;
        const y = event.clientY + 10;

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
};

// Export for module use
export { inventorySystem };