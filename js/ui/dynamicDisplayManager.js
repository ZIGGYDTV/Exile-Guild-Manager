// Helper Functions for Dynamic Display
// Format stat names for display
function formatStatName(stat) {
    const statNames = {
        life: 'Life',
        damage: 'Damage',
        defense: 'Defense',
        attackSpeed: 'Attack Speed',
        fireResist: 'Fire Resistance',
        coldResist: 'Cold Resistance',
        lightningResist: 'Lightning Resistance',
        chaosResist: 'Chaos Resistance',
        moveSpeed: 'Movement Speed',
        goldFindBonus: 'Gold Find',
        escapeChance: 'Escape Chance',
        moraleResistance: 'Morale Resistance',
        moraleGain: 'Morale Gain',
        scoutingBonus: 'Scouting Bonus',
        lightRadius: 'Light Radius'
    };
    return statNames[stat] || stat;
}

// Helper function to normalize stat keys to camelCase for consistent aggregation
function normalizeStatKey(statKey) {
    const keyMap = {
        'movespeed': 'moveSpeed',
        'lightradius': 'lightRadius',
        'fireresist': 'fireResist',
        'coldresist': 'coldResist',
        'lightningresist': 'lightningResist',
        'chaosresist': 'chaosResist',
        'attackspeed': 'attackSpeed'
    };
    return keyMap[statKey] || statKey;
}

// Calculate total bonuses from all equipment
function calculateEquipmentTotals(exile) {
    const totals = {};

    // Sum up all stats from equipment
    Object.values(exile.equipment).forEach(item => {
        if (item) {
            // Add implicit stats
            if (item.implicitStats) {
                Object.entries(item.implicitStats).forEach(([stat, value]) => {
                    const normalizedStat = normalizeStatKey(stat);
                    const oldValue = totals[normalizedStat] || 0;
                    totals[normalizedStat] = oldValue + value;
                });
            }

            // Add rolled stats
            if (item.stats) {
                Object.entries(item.stats).forEach(([stat, value]) => {
                    const normalizedStat = normalizeStatKey(stat);
                    const oldValue = totals[normalizedStat] || 0;
                    totals[normalizedStat] = oldValue + value;
                });
            }
        }
    });

    // Format totals for display
    let html = '<div class="totals-grid">';

    // Combat stats
    if (totals.life || totals.damage || totals.defense) {
        html += '<div class="total-category"><strong>Combat:</strong>';
        if (totals.life) html += `<div>+${totals.life} Life</div>`;
        if (totals.damage) html += `<div>+${totals.damage} Damage</div>`;
        if (totals.defense) html += `<div>+${totals.defense} Defense</div>`;
        html += '</div>';
    }

    // Resistances
    const resists = ['fireResist', 'coldResist', 'lightningResist', 'chaosResist'];
    const hasResists = resists.some(r => totals[r]);
    if (hasResists) {
        html += '<div class="total-category"><strong>Resistances:</strong>';
        resists.forEach(resist => {
            if (totals[resist]) {
                // Use the same formatting helper as inventory grid manager
                const formattedStat = (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue)
                    ? inventoryGridManager.formatStatValue(resist, totals[resist])
                    : `+${totals[resist]}% ${formatStatName(resist)}`;
                html += `<div class="element-${resist.replace('Resist', '')}">${formattedStat}</div>`;
            }
        });
        html += '</div>';
    }

    // Utility stats
    if (totals.moveSpeed || totals.lightRadius || totals.attackSpeed) {
        html += '<div class="total-category"><strong>Utility:</strong>';
        if (totals.moveSpeed) {
            const formattedStat = (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue)
                ? inventoryGridManager.formatStatValue('moveSpeed', totals.moveSpeed)
                : `+${totals.moveSpeed}% Movement Speed`;
            html += `<div>${formattedStat}</div>`;
        }
        if (totals.lightRadius) {
            const formattedStat = (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue)
                ? inventoryGridManager.formatStatValue('lightRadius', totals.lightRadius)
                : `+${totals.lightRadius}% Light Radius`;
            html += `<div>${formattedStat}</div>`;
        }
        if (totals.attackSpeed) {
            const formattedStat = (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue)
                ? inventoryGridManager.formatStatValue('attackSpeed', totals.attackSpeed)
                : `${totals.attackSpeed}% Increased Attack Speed`;
            html += `<div>${formattedStat}</div>`;
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// Get the currently selected exile
function getCurrentExileForDisplay() {
    if (!gameState.selectedExileId) return null;
    return gameState.exiles.find(e => e.id === gameState.selectedExileId);
}

const dynamicDisplayManager = {
    currentTab: 'overview',

    init() {
        // Add click handlers to tabs
        document.querySelectorAll('.dynamic-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.dynamic-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content areas
        document.querySelectorAll('.dynamic-content-area').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        this.currentTab = tabName;

        // Refresh the content for the new tab
        this.refreshCurrentTab();
    },

    // Refresh the current tab's content based on selected exile
    refreshCurrentTab() {
        const selectedExileId = gameState.selectedExileId;

        switch (this.currentTab) {
            case 'overview':
                this.showOverview();
                break;
            case 'exile':
                this.showExileDetails(selectedExileId);
                break;
            case 'equipment':
                this.showEquipment(selectedExileId);
                break;
            case 'passives':
                this.showPassives(selectedExileId);
                break;
            case 'world':
                this.showWorldMap();
                break;
            case 'log':
                // Log doesn't need refresh
                break;
        }
    },

    showOverview() {
        const content = document.getElementById('tab-overview');
        content.innerHTML = `
            <h2>Guild Overview</h2>
            <p>Total Exiles: ${gameState.exiles.length}</p>
            <p>Available for missions: ${gameState.exiles.filter(e => e.status === 'idle').length}</p>
            <p>Current Turn: ${gameState.turnNumber || 1}</p>
        `;
    },

    showExileDetails(exileId) {
        const content = document.getElementById('tab-exile');

        const exile = getCurrentExileForDisplay();
        if (!exile) {
            content.innerHTML = '<h2>No Exile Selected</h2><p>Select an exile from the left panel</p>';
            return;
        }

        // Calculate derived values
        const healthPercent = Math.round((exile.currentHp / exile.maxHp) * 100);
        const expPercent = Math.round((exile.experience / exile.experienceNeeded) * 100);

        content.innerHTML = `
            <h2>${exile.name} - Level ${exile.level} ${classDefinitions[exile.class].name}</h2>
            
            <div class="exile-details-grid">                            
                <!-- Combat Stats -->
                <div class="detail-section">
                    <h3>Combat Statistics</h3>
                    <div class="stat-row">
                        <span class="stat-label">Life:</span>
                        <span class="stat-value">${exile.stats.life}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Damage:</span>
                        <span class="stat-value">${exile.stats.damage}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Defense:</span>
                        <span class="stat-value">${exile.stats.defense}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Attack Speed:</span>
                        <span class="stat-value">${exile.stats.attackSpeed.toFixed(2)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Power Rating:</span>
                        <span class="stat-value">${Math.floor(exile.stats.damage * exile.stats.attackSpeed)}</span>
                    </div>
                </div>
                
                <!-- Resistances -->
                <div class="detail-section">
                    <h3>Resistances</h3>
                    <div class="stat-row">
                        <span class="stat-label element-fire">Fire Resist:</span>
                        <span class="stat-value">${exile.stats.fireResist}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label element-cold">Cold Resist:</span>
                        <span class="stat-value">${exile.stats.coldResist}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label element-lightning">Lightning Resist:</span>
                        <span class="stat-value">${exile.stats.lightningResist}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label element-chaos">Chaos Resist:</span>
                        <span class="stat-value">${exile.stats.chaosResist}%</span>
                    </div>
                </div>
                
                <!-- Utility Stats -->
                <div class="detail-section">
                    <h3>Utility Statistics</h3>
                    <div class="stat-row">
                        <span class="stat-label">Move Speed:</span>
                        <span class="stat-value">${exile.stats.moveSpeed >= 0 ? '+' : ''}${exile.stats.moveSpeed}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Gold Find:</span>
                        <span class="stat-value">+${exile.stats.goldFindBonus}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Escape Chance:</span>
                        <span class="stat-value">${exile.stats.escapeChance}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Scouting:</span>
                        <span class="stat-value">${(exile.stats.scoutingBonus * 100).toFixed(0)}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Light Radius:</span>
                        <span class="stat-value">${exile.stats.lightRadius >= 0 ? '+' : ''}${exile.stats.lightRadius}%</span>
                    </div>
                </div>
            <!-- Progression -->
                <div class="detail-section">
                    <h3>Progression</h3>
                    <div class="stat-row">
                        <span class="stat-label">Experience:</span>
                        <span class="stat-value">${exile.experience}/${exile.experienceNeeded} (${expPercent}%)</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Passive Points:</span>
                        <span class="stat-value">${exile.passives.pendingPoints} available</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Allocated Passives:</span>
                        <span class="stat-value">${exile.passives.allocated.length}</span>
                    </div>
                </div>

                <!-- Mission History -->
                <div class="detail-section">
                    <h3>Mission History</h3>
                    <div class="stat-row">
                        <span class="stat-label">Missions Completed:</span>
                        <span class="stat-value">${exile.history?.missionsCompleted || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Missions Retreated:</span>
                        <span class="stat-value">${exile.history?.missionsRetreated || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total Kills:</span>
                        <span class="stat-value">${exile.history?.kills || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Gold Earned:</span>
                        <span class="stat-value">${exile.history?.goldEarned || 0}</span>
                    </div>
                </div>
            </div>
        `;
    },

    showEquipment(exileId) {
        const content = document.getElementById('tab-equipment');

        const exile = getCurrentExileForDisplay();
        if (!exile) {
            content.innerHTML = '<h2>No Exile Selected</h2><p>Select an exile to view equipment</p>';
            return;
        }

        // Create equipment slots display (no main title)
        let equipmentHTML = `
            <div class="equipment-container">
                <div class="equipment-grid-wrapper">
                    <div class="equipment-grid-compact">
        `;

        // Define equipment slots in display order
        const equipmentSlots = [
            { slot: 'helmet', display: 'Helmet' },
            { slot: 'amulet', display: 'Amulet' },
            { slot: 'weapon', display: 'Weapon' },
            { slot: 'chest', display: 'Chest' },
            { slot: 'shield', display: 'Shield' },
            { slot: 'gloves', display: 'Gloves' },
            { slot: 'ring1', display: 'Ring 1' },
            { slot: 'ring2', display: 'Ring 2' },
            { slot: 'boots', display: 'Boots' },
            { slot: 'belt', display: 'Belt' }
        ];

        // Check if there's an item selected for click-to-equip
        const selectedForEquipping = (typeof inventoryGridManager !== 'undefined') ?
            inventoryGridManager.selectedItemForEquipping : null;
        const validSlots = selectedForEquipping ?
            inventoryGridManager.getValidSlotsForSelectedItem() : [];

        // Check if a 2H weapon is equipped
        const weapon = exile.equipment.weapon;
        const has2HWeapon = weapon && weapon.slot === 'weapon2h';

        // Generate each equipment slot
        equipmentSlots.forEach(({ slot, display }) => {
            const item = exile.equipment[slot];
            const isValidSlot = validSlots.includes(slot);
            const slotClasses = ['equipment-slot'];

            if (item) {
                slotClasses.push('occupied');
            } else {
                slotClasses.push('empty');
            }

            if (isValidSlot) {
                slotClasses.push('valid-drop-slot');
            }

            // Add cross-out class for offhand if 2H weapon is equipped
            let crossOutHTML = '';
            if ((slot === 'shield' || slot === 'offhand') && has2HWeapon) {
                slotClasses.push('crossed-out');
                crossOutHTML = '<div class="slot-crossout"></div>';
            }

            if (item) {
                // Slot has an item - compact display
                const rarity = item.rarity || 'common';
                const rarityColors = {
                    'common': '#808080',
                    'magic': '#4169E1',
                    'rare': '#FFD700',
                    'unique': '#FF4500'
                };
                const backgroundColor = rarityColors[rarity] || '#808080';

                const clickHandler = isValidSlot ? `onclick="inventoryGridManager.equipItemToSlot('${slot}')"` :
                    `onclick="dynamicDisplayManager.selectEquippedItem('${slot}', ${exile.id})"`;

                equipmentHTML += `
                    <div class="${slotClasses.join(' ')} compact-slot" data-slot="${slot}" ${clickHandler}
                         onmouseenter="dynamicDisplayManager.showEquippedItemTooltip(event, '${slot}', ${exile.id})"
                         onmouseleave="dynamicDisplayManager.hideEquippedItemTooltip()">
                        <div class="slot-label-compact">${display}</div>
                        <div class="item-box-compact" style="background-color: ${backgroundColor};">
                            <div class="item-name-compact">${item.name || 'Unknown Item'}</div>
                        </div>
                        ${crossOutHTML}
                    </div>
                `;
            } else {
                // Empty slot - compact display
                const clickHandler = isValidSlot ? `onclick="inventoryGridManager.equipItemToSlot('${slot}')"` : '';
                const emptyText = isValidSlot ? 'Click to equip' : 'Empty';

                equipmentHTML += `
                    <div class="${slotClasses.join(' ')} compact-slot" data-slot="${slot}" ${clickHandler}>
                        <div class="slot-label-compact">${display}</div>
                        <div class="empty-slot-compact">
                            <span class="empty-text-compact">${emptyText}</span>
                        </div>
                        ${crossOutHTML}
                    </div>
                `;
            }
        });

        equipmentHTML += `
                    </div>
                </div>
                
                <div class="equipment-stats-summary">
                    <h2>${exile.name}</h2>
                    <h4>Current Equipment Bonuses</h4>
                    <div class="equipment-bonuses-content">
                        ${calculateEquipmentTotals(exile)}
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = equipmentHTML;
    },

    showPassives(exileId) {
        const content = document.getElementById('tab-passives');

        const exile = getCurrentExileForDisplay();
        if (!exile) {
            content.innerHTML = '<h2>No Exile Selected</h2><p>Select an exile to view passives</p>';
            return;
        }

        let passivesHTML = `
            <h2>${exile.name}'s Passives</h2>
            <div class="passives-header">
                <div class="passive-points">Available Points: <span class="points-value">${exile.passives.pendingPoints}</span></div>
                ${exile.passives.pendingPoints > 0 ? '<button class="allocate-btn" onclick="passiveSystem.openPassiveSelection()">Choose Passive</button>' : ''}
            </div>
            
            <div class="allocated-passives">
                <h3>Allocated Passives (${exile.passives.allocated.length})</h3>
                <div class="passive-list compact">
        `;

        // Group passives by ID to count stacks
        const passiveStacks = {};
        exile.passives.allocated.forEach(passiveId => {
            if (!passiveStacks[passiveId]) {
                passiveStacks[passiveId] = { count: 0, passive: passiveDefinitions[passiveId] };
            }
            passiveStacks[passiveId].count++;
        });

        // Display each unique passive with stack count - COMPACT VIEW
        Object.entries(passiveStacks).forEach(([passiveId, data]) => {
            const passive = data.passive;
            if (!passive) return;

            const stackDisplay = data.count > 1 ? ` (${data.count}x)` : '';

            passivesHTML += `
                <div class="passive-item compact" data-passive-id="${passiveId}">
                    <div class="passive-header" onclick="dynamicDisplayManager.togglePassiveDetails('${passiveId}')">
                        <span class="passive-name ${passive.tier}">${passive.name}${stackDisplay}</span>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="passive-details" id="details-${passiveId}" style="display: none;">
                        <div class="passive-description">${passive.description || ''}</div>
                    </div>
                </div>
            `;
        });

        passivesHTML += `
                </div>
            </div>
        `;

        content.innerHTML = passivesHTML;
    },

    // Toggle passive details visibility
    togglePassiveDetails(passiveId) {
        const details = document.getElementById(`details-${passiveId}`);
        const icon = details.parentElement.querySelector('.expand-icon');

        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.textContent = '▲';
        } else {
            details.style.display = 'none';
            icon.textContent = '▼';
        }
    },

    // Show tooltip for equipped item on hover
    showEquippedItemTooltip(event, slot, exileId) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile || !exile.equipment[slot]) return;

        const item = exile.equipment[slot];

        // Use the same tooltip system as inventory
        if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.showTooltip) {
            inventoryGridManager.showTooltip(item);
        }
    },

    // Hide equipped item tooltip
    hideEquippedItemTooltip() {
        if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.hideTooltip) {
            inventoryGridManager.hideTooltip();
        }
    },

    // Handle clicking on equipped items to show in detail panel
    selectEquippedItem(slot, exileId) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile || !exile.equipment[slot]) return;

        const item = exile.equipment[slot];

        // Show in inventory detail panel with unequip button
        this.updateItemDetailPanelForEquipped(item, slot, exileId);

        // Clear any selected inventory item
        if (typeof inventoryGridManager !== 'undefined') {
            inventoryGridManager.selectedItem = null;
            inventoryGridManager.clearSelectedItemForEquipping();
            inventoryGridManager.updateDisplay();
        }
    },

    // Update item detail panel for equipped items
    updateItemDetailPanelForEquipped(item, slot, exileId) {
        const detailContent = document.getElementById('item-detail-content');
        if (!detailContent) return;

        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) return;

        // Get item properties with fallbacks
        const itemName = item.name || 'Unknown Item';
        const itemType = item.type || (item.slot ? item.slot.charAt(0).toUpperCase() + item.slot.slice(1) : 'Unknown');
        const itemRarity = item.rarity || 'common';
        const itemLevel = item.ilvl || item.level || 1;

        // Get rarity color
        const rarityColors = {
            'common': '#808080',
            'magic': '#4169E1',
            'rare': '#FFD700',
            'unique': '#FF4500'
        };
        const color = rarityColors[itemRarity.toLowerCase()] || '#808080';

        let html = `
            <div class="item-detail-header">
                <div class="item-name" style="color: ${color}; font-weight: bold; margin-bottom: 2px;">
                    ${itemName} (Equipped)
                </div>
                <div class="item-level" style="color: #666; font-size: 0.75em; margin-bottom: 8px;">
                    Item Level: ${itemLevel}
                </div>
            </div>
        `;

        // Combined weapon stats and implicits section
        // TODO: (ALSO HERE 3/3) This is where crit chance and other base item properties would need to go in the future
        let hasWeaponStats = (typeof item.attackSpeed === 'number' || typeof item.damageMultiplier === 'number');
        let hasImplicits = item.implicitStats && Object.keys(item.implicitStats).length > 0;

        if (hasWeaponStats || hasImplicits) {
            html += '<div class="weapon-implicit-section" style="margin-bottom: 5px; padding: 6px; background:rgb(32, 32, 36); border-radius: 3px; border-bottom: 2px solid #444;">';

            // Weapon stats
            if (hasWeaponStats) {
                html += `<div style="color: #888; font-size: 0.85em; font-style: italic; margin-bottom: 3px;">Attack Speed: ${item.attackSpeed.toFixed(2)}</div>`;
                if (item.damageMultiplier) {
                    html += `<div style="color: #888; font-size: 0.85em; font-style: italic; margin-bottom: 3px;">Damage Multiplier: ${item.damageMultiplier.toFixed(2)}</div>`;
                }
            }

            // Implicit stats
            if (hasImplicits) {
                for (const [stat, value] of Object.entries(item.implicitStats)) {
                    if (value !== 0) {
                        // Use the same formatting helper as inventory grid manager
                        if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                            html += `<div style="color: #9a9aaa; font-size: 0.85em; font-style: italic;">${inventoryGridManager.formatStatValue(stat, value)}</div>`;
                        } else {
                            html += `<div style="color: #9a9aaa; font-size: 0.85em; font-style: italic;">+${value} ${game.getStatDisplayName(stat)}</div>`;
                        }
                    }
                }
            }

            html += '</div>';
        }

        // Show rolled stats
        if (item.stats && Object.keys(item.stats).length > 0) {
            html += '<div class="rolled-stats" style="margin-bottom: 8px; padding: 6px; background: #252525; border-radius: 3px;">';
            html += '<div style="color: #aaa; font-size: 0.9em; margin-bottom: 5px;">Rolled Stats:</div>';
            for (const [stat, value] of Object.entries(item.stats)) {
                if (value !== 0) {
                    // Use the same formatting helper as inventory grid manager
                    if (typeof inventoryGridManager !== 'undefined' && inventoryGridManager.formatStatValue) {
                        html += `<div style="color: #ddd;">${inventoryGridManager.formatStatValue(stat, value)}</div>`;
                    } else {
                        html += `<div style="color: #ddd;">+${value} ${game.getStatDisplayName(stat)}</div>`;
                    }
                }
            }
            html += '</div>';
        }

        detailContent.innerHTML = html;

        // Update item actions for equipped items
        const actionsContainer = document.getElementById('item-actions');
        if (actionsContainer) {
            actionsContainer.style.display = 'flex';
            actionsContainer.innerHTML = `
                <button onclick="inventorySystem.unequipItem('${slot}', ${exileId})" 
                        title="Unequip from ${exile.name}" 
                        class="square-action-btn unequip-btn">
                    ⤢
                </button>
                                 <div style="display: flex; gap: 3px;">
                     <button onclick="inventorySystem.useChaosOrb(${item.id})" 
                             title="Use Chaos Orb" 
                             class="square-action-btn craft-btn"
                             ${!gameState.resources.chaosOrbs || gameState.resources.chaosOrbs < 1 ? 'disabled' : ''}>
                         🌀
                     </button>
                     <button onclick="inventorySystem.useExaltedOrb(${item.id})" 
                             title="Use Exalted Orb" 
                             class="square-action-btn craft-btn"
                             ${!gameState.resources.exaltedOrbs || gameState.resources.exaltedOrbs < 1 ? 'disabled' : ''}>
                         ✦
                     </button>
                 </div>
            `;
        }
    },

    showWorldMap() {
        const content = document.getElementById('tab-world');

        // Get all discovered areas from the actual game state
        const discoveredAreas = [];

        // Check worldState for discovered areas
        Object.entries(worldState.areas).forEach(([areaId, areaState]) => {
            if (areaState.discovered) {
                const areaData = getAreaData(areaId);
                if (areaData) {
                    discoveredAreas.push({
                        id: areaId,
                        name: areaData.name,
                        level: areaData.level || 1,
                        discovered: true
                    });
                }
            }
        });

        // Create a simple grid layout for now (3x3)
        let worldMapHTML = `
            <div class="world-map-container">
                <div class="world-map-grid">
        `;

        // Map areas to grid positions based on actual area IDs
        const gridPositions = {
            'beach': { row: 2, col: 1 }, // Starting area, bottom left
            'theSpits': { row: 2, col: 2 },
            'coastalCliffs': { row: 1, col: 2 },
            'cannibalCamp': { row: 1, col: 3 }
        };

        // Create grid cells
        for (let row = 1; row <= 3; row++) {
            for (let col = 1; col <= 3; col++) {
                // Find area for this position
                const area = discoveredAreas.find(a =>
                    gridPositions[a.id]?.row === row &&
                    gridPositions[a.id]?.col === col
                );

                if (area) {
                    worldMapHTML += `
                        <div class="world-map-cell discovered" 
                             data-area-id="${area.id}"
                             onclick="dynamicDisplayManager.selectArea('${area.id}')">
                            <div class="area-name">${area.name}</div>
                            <div class="area-level">Level ${area.level}</div>
                        </div>
                    `;
                } else {
                    worldMapHTML += `<div class="world-map-cell undiscovered">?</div>`;
                }
            }
        }

        worldMapHTML += `
                </div>
                <div class="area-missions-panel" id="area-missions-panel" style="display: none;">
                    <!-- Mission list will appear here -->
                </div>
            </div>
        `;

        content.innerHTML = worldMapHTML;
    },

    // Add this new method to handle area selection
    selectArea(areaId) {
        // Remove previous selections
        document.querySelectorAll('.world-map-cell').forEach(cell => {
            cell.classList.remove('selected');
        });

        // Select this area
        const selectedCell = document.querySelector(`[data-area-id="${areaId}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
        }

        // Show missions for this area
        this.showAreaMissions(areaId);
    },

    // Add method to show missions for selected area
    showAreaMissions(areaId) {
        const panel = document.getElementById('area-missions-panel');
        const areaData = getAreaData(areaId);
        const areaState = worldState.areas[areaId];

        if (!areaData || !areaState) {
            panel.style.display = 'none';
            return;
        }

        // Get discovered missions
        const missions = Object.entries(areaData.missions)
            .filter(([missionId]) => areaState.missions[missionId]?.discovered)
            .map(([missionId, mission]) => ({
                ...mission,
                missionId,
                areaId,
                available: isMissionAvailable(areaId, missionId),
                daysUntilAvailable: getDaysUntilAvailable(areaId, missionId),
                assigned: turnState.assignments?.find(a =>
                    a.areaId === areaId && a.missionId === missionId
                )
            }));

        let missionsHTML = `
            <h3>${areaData.name} - Missions</h3>
            <div class="mission-list">
        `;

        if (missions.length === 0) {
            missionsHTML += `<p class="no-missions">No missions discovered yet</p>`;
        } else {
            missions.forEach(mission => {
                const selectedExile = getCurrentExileForDisplay();
                const assignedExile = mission.assigned ?
                    gameState.exiles.find(e => e.id === mission.assigned.exileId) : null;

                let statusClass = '';
                let statusText = '';

                if (!mission.available) {
                    statusClass = 'on-cooldown';
                    statusText = `Cooldown: ${mission.daysUntilAvailable} days`;
                } else if (assignedExile) {
                    statusClass = 'assigned';
                    statusText = `Assigned: ${assignedExile.name}`;
                } else if (!selectedExile) {
                    statusClass = 'no-exile';
                    statusText = 'Select an exile first';
                } else {
                    // Available and can be assigned (or reassigned)
                    statusText = selectedExile.status === 'assigned' ? 'Click to reassign' : 'Click to assign';
                }

                // Add completion count if any
                const completionText = mission.completions > 0 ?
                    ` (Completed: ${mission.completions}x)` : '';

                const canAssign = mission.available && selectedExile;

                missionsHTML += `
                    <div class="mission-item ${statusClass}" 
                         ${canAssign ? `onclick="worldMapSystem.openMissionPreview('${areaId}', '${mission.missionId}')"` : ''}
                         title="${mission.description || ''}">
                        <div class="mission-header">
                            <div class="mission-name">${mission.name}${completionText}</div>
                            <div class="mission-difficulty">Difficulty: ${mission.difficulty || '?'}</div>
                        </div>
                        <div class="mission-type">Type: ${mission.type}</div>
                        <div class="mission-status">${statusText}</div>
                    </div>
                `;
            });
        }

        missionsHTML += `</div>`;
        panel.innerHTML = missionsHTML;
        panel.style.display = 'block';
    },
};