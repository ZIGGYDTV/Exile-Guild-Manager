const inventoryGridManager = {
    // Grid Constants
    GRID_WIDTH: 16,
    GRID_HEIGHT: 8,

    // Item Dimensions
    ITEM_DIMENSIONS: {
        // 1x1 items
        'Ring': { width: 1, height: 1 },
        'Amulet': { width: 1, height: 1 },

        // Accessories
        'Belt': { width: 2, height: 1 },
        'Gloves': { width: 2, height: 2 },
        'Boots': { width: 2, height: 2 },

        // One-handed weapons
        'Sword': { width: 1, height: 3 },
        'Axe': { width: 3, height: 3, shape: 'T' },
        'Mace': { width: 2, height: 3 },
        'Dagger': { width: 1, height: 2 },
        'Wand': { width: 1, height: 2 },

        // Two-handed weapons
        'Staff': { width: 2, height: 4 },
        'Bow': { width: 2, height: 3 },
        'Two-Handed Sword': { width: 2, height: 4 },
        'Two-Handed Axe': { width: 2, height: 4 },
        'Two-Handed Mace': { width: 2, height: 4 },

        // Armor
        'Chest': { width: 2, height: 3 },
        'Helmet': { width: 2, height: 2 },
        'Shield': { width: 2, height: 2 }
    },

    // Special Shapes
    SPECIAL_SHAPES: {
        'T': [
            [1, 1, 1],
            [0, 1, 0],
            [0, 1, 0]
        ]
    },

    // State Management
    tabs: new Map(),
    activeTab: 'tab1',
    selectedItem: null,
    selectedItemForEquipping: null, // Track item selected for click-to-equip
    draggedItem: null,
    tooltipElement: null,
    gridContainer: null,

    // Initialization
    init() {
        console.log('Initializing inventory grid manager...');

        // Initialize tab data structures
        const tabTypes = ['tab1', 'tab2', 'tab3', 'tab4'];
        tabTypes.forEach(tabId => {
            this.tabs.set(tabId, {
                grid: Array(this.GRID_HEIGHT).fill(null).map(() => Array(this.GRID_WIDTH).fill(null)),
                items: new Map()
            });
        });

        // Create tooltip element
        this.createTooltipElement();

        // Set up event listeners
        this.setupEventListeners();

        // Load existing inventory items
        this.loadInventoryItems();

        console.log('Inventory grid manager initialized');
    },

    // Create tooltip element
    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'item-tooltip';
        this.tooltipElement.style.display = 'none';
        document.body.appendChild(this.tooltipElement);
    },

    // Set up event listeners
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Ctrl key state tracking for visual feedback
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && this.gridContainer) {
                this.gridContainer.classList.add('ctrl-held');
            }
        });

        document.addEventListener('keyup', (e) => {
            if (!e.ctrlKey && this.gridContainer) {
                this.gridContainer.classList.remove('ctrl-held');
            }
        });

        // Clear Ctrl state when window loses focus
        window.addEventListener('blur', () => {
            if (this.gridContainer) {
                this.gridContainer.classList.remove('ctrl-held');
            }
        });

        // Mouse move for tooltip positioning
        document.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
    },

    // Create grid HTML structure
    createGrid(container) {
        this.gridContainer = container;
        container.innerHTML = '';
        container.className = 'inventory-grid';

        // Create grid cells
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', (e) => this.handleCellClick(x, y, e));
                cell.addEventListener('mouseenter', (e) => this.handleCellHover(e, x, y));
                cell.addEventListener('mouseleave', () => this.hideTooltip());
                container.appendChild(cell);
            }
        }

        // Update display with current items
        this.updateDisplay();
    },

    // Load items from game inventory sequentially
    loadInventoryItems() {
        // Check for the correct inventory location
        if (!gameState || !gameState.inventory || !gameState.inventory.items) {
            console.log('No inventory found to load');
            return;
        }

        // Clear existing items first
        this.tabs.forEach(tab => {
            tab.grid = Array(this.GRID_HEIGHT).fill(null).map(() => Array(this.GRID_WIDTH).fill(null));
            tab.items.clear();
        });

        // Try to load from saved grid state first
        if (this.loadGridState()) {
            // Successfully loaded from saved state
            return;
        }

        // Fall back to sequential placement if no saved state
        console.log('Using sequential placement for items');

        // Place items sequentially from top-left to bottom-right
        let currentTab = 'tab1';
        const tabOrder = ['tab1', 'tab2', 'tab3', 'tab4'];
        let tabIndex = 0;
        let itemsPlaced = 0;

        gameState.inventory.items.forEach((item, index) => {
            let placed = false;

            // Try to place in current tab
            while (!placed && tabIndex < tabOrder.length) {
                currentTab = tabOrder[tabIndex];
                const position = this.findNextAvailablePosition(item, currentTab);

                if (position) {
                    this.addItemToGrid(item, currentTab, position.x, position.y);
                    placed = true;
                    itemsPlaced++;
                } else {
                    // Current tab is full, try next tab
                    tabIndex++;
                }
            }

            if (!placed) {
                console.warn(`Could not place item ${item.name} - all tabs full`);
            }
        });

        console.log(`Loaded ${itemsPlaced}/${gameState.inventory.items.length} items into inventory grid`);
    },

    // Find next available position scanning left to right, top to bottom
    findNextAvailablePosition(item, tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return null;

        const dims = this.getItemDimensions(item);

        // Scan from top-left to bottom-right
        for (let y = 0; y <= this.GRID_HEIGHT - dims.height; y++) {
            for (let x = 0; x <= this.GRID_WIDTH - dims.width; x++) {
                if (this.canPlaceItem(item, x, y, 0, tabId)) {
                    return { x, y };
                }
            }
        }
        return null;
    },

    // Add item to grid
    addItemToGrid(item, tabId, x, y, rotation = 0) {
        const tab = this.tabs.get(tabId);
        if (!tab || !this.canPlaceItem(item, x, y, rotation, tabId)) {
            return false;
        }

        // Mark grid cells as occupied
        const dims = this.getItemDimensions(item, rotation);
        const shape = this.getItemShape(item, rotation);

        for (let dy = 0; dy < dims.height; dy++) {
            for (let dx = 0; dx < dims.width; dx++) {
                if (shape[dy][dx] === 1) {
                    tab.grid[y + dy][x + dx] = item.id;
                }
            }
        }

        // Store item data
        tab.items.set(item.id, {
            item: item,
            x: x,
            y: y,
            rotation: rotation,
            locked: false
        });

        return true;
    },

    // Remove item from grid
    removeItemFromGrid(itemId, tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        const itemData = tab.items.get(itemId);
        if (!itemData) return false;

        // Clear grid cells
        const dims = this.getItemDimensions(itemData.item, itemData.rotation);
        const shape = this.getItemShape(itemData.item, itemData.rotation);

        for (let dy = 0; dy < dims.height; dy++) {
            for (let dx = 0; dx < dims.width; dx++) {
                if (shape[dy][dx] === 1) {
                    tab.grid[itemData.y + dy][itemData.x + dx] = null;
                }
            }
        }

        // Remove from items map
        tab.items.delete(itemId);
        return true;
    },

    // Check if item can be placed
    canPlaceItem(item, x, y, rotation, tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        const dims = this.getItemDimensions(item, rotation);
        const shape = this.getItemShape(item, rotation);

        // Check bounds
        if (x < 0 || y < 0 || x + dims.width > this.GRID_WIDTH || y + dims.height > this.GRID_HEIGHT) {
            return false;
        }

        // Check collision
        for (let dy = 0; dy < dims.height; dy++) {
            for (let dx = 0; dx < dims.width; dx++) {
                if (shape[dy][dx] === 1) {
                    const cell = tab.grid[y + dy][x + dx];
                    if (cell !== null && cell !== item.id) {
                        return false;
                    }
                }
            }
        }

        return true;
    },

    // Get item dimensions considering rotation
    getItemDimensions(item, rotation = 0) {
        // Refactored: Always get the shape first, then return its dimensions
        const shape = this.getItemShape(item, rotation);
        return {
            width: shape[0].length,
            height: shape.length
        };
    },

    // Get item shape array
    getItemShape(item, rotation = 0) {
        // First, try to use the item's shape property if it exists
        if (item.shape && Array.isArray(item.shape)) {
            return this.rotateShape(item.shape, rotation);
        }
        
        // Use the same logic as before to get base dimensions
        let baseDims = this.ITEM_DIMENSIONS[item.type];

        if (!baseDims && item.slot) {
            const slotToTypeMap = {
                'weapon1h': { width: 1, height: 3 },
                'weapon2h': { width: 1, height: 4 },
                'weapon': { width: 1, height: 3 },
                'helm': { width: 2, height: 2 },
                'helmet': { width: 2, height: 2 },
                'chest': { width: 2, height: 3 },
                'gloves': { width: 2, height: 2 },
                'boots': { width: 2, height: 2 },
                'shield': { width: 2, height: 2 },
                'ring': { width: 1, height: 1 },
                'amulet': { width: 1, height: 1 },
                'belt': { width: 2, height: 1 }
            };
            baseDims = slotToTypeMap[item.slot] || { width: 1, height: 1 };
        }

        if (!baseDims) {
            baseDims = { width: 1, height: 1 };
        }

        // Special shapes
        if (baseDims.shape === 'T') {
            return this.rotateShape(this.SPECIAL_SHAPES.T, rotation);
        }

        // Regular rectangle
        let width, height;
        if (rotation % 2 === 0) {
            width = baseDims.width;
            height = baseDims.height;
        } else {
            width = baseDims.height;
            height = baseDims.width;
        }
        return Array(height).fill(null).map(() => Array(width).fill(1));
    },

    // Rotate a shape array
    rotateShape(shape, rotation) {
        let rotated = shape;
        for (let i = 0; i < (rotation % 4); i++) {
            rotated = this.rotate90(rotated);
        }
        return rotated;
    },

    // Rotate array 90 degrees clockwise
    rotate90(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                rotated[x][rows - 1 - y] = matrix[y][x];
            }
        }

        return rotated;
    },

    // Move item to new position
    moveItem(itemId, newX, newY, newTabId) {
        // Find current location
        let currentTab = null;
        let itemData = null;

        for (const [tabId, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                currentTab = tabId;
                itemData = tab.items.get(itemId);
                break;
            }
        }

        if (!itemData) return false;

        // Remove from current position
        this.removeItemFromGrid(itemId, currentTab);

        // Try to place at new position
        if (this.addItemToGrid(itemData.item, newTabId, newX, newY, itemData.rotation)) {
            // Restore lock status
            this.tabs.get(newTabId).items.get(itemId).locked = itemData.locked;

            // Save the new grid state and persist to disk
            this.saveGridState();
            game.saveGame();
            return true;
        } else {
            // Restore to original position if placement failed
            this.addItemToGrid(itemData.item, currentTab, itemData.x, itemData.y, itemData.rotation);
            this.tabs.get(currentTab).items.get(itemId).locked = itemData.locked;
            return false;
        }
    },

    // Rotate selected item
    rotateItem(itemId) {
        // Find item
        let tabId = null;
        let itemData = null;

        for (const [tid, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                tabId = tid;
                itemData = tab.items.get(itemId);
                break;
            }
        }

        if (!itemData) return false;

        const newRotation = (itemData.rotation + 1) % 4;

        // Check if rotation is valid
        if (this.canPlaceItem(itemData.item, itemData.x, itemData.y, newRotation, tabId)) {
            // Remove and re-add with new rotation
            this.removeItemFromGrid(itemId, tabId);
            this.addItemToGrid(itemData.item, tabId, itemData.x, itemData.y, newRotation);
            this.tabs.get(tabId).items.get(itemId).locked = itemData.locked;

            // Save the new grid state and persist to disk
            this.saveGridState();
            game.saveGame();
            this.updateDisplay();
            return true;
        }

        return false;
    },

    // Select item
    selectItem(itemId) {
        this.selectedItem = itemId;

        // Update item detail panel
        let item = null;
        for (const [_, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                item = tab.items.get(itemId).item;
                break;
            }
        }

        if (item) {
            // Update the item detail panel
            this.updateItemDetailPanel(item);

            // Auto-enter click-to-equip mode for equipable items
            if (item.slot && gameState.selectedExileId && this.canExileEquipItem(gameState.selectedExileId)) {
                this.selectItemForEquipping(itemId);
            } else {
                // Clear click-to-equip selection if item is not equipable
                this.clearSelectedItemForEquipping();
            }
        } else {
            // Clear item detail panel
            this.clearItemDetailPanel();
            this.clearSelectedItemForEquipping();
        }

        // Update inventory display first, then refresh any active equipment display
        this.updateDisplay();

        // Extra refresh to ensure equipment display updates
        if (typeof dynamicDisplayManager !== 'undefined') {
            // Small delay to ensure inventory update completes first
            setTimeout(() => {
                dynamicDisplayManager.refreshCurrentTab();
            }, 50);
        }
    },

    // Handle cell click
    handleCellClick(x, y, event) {
        const tab = this.tabs.get(this.activeTab);
        if (!tab) return;

        const clickedItemId = tab.grid[y][x];

        // Check for Ctrl+Click quick equip
        if (event && event.ctrlKey && clickedItemId) {
            // Find the item
            let item = null;
            for (const [_, tabData] of this.tabs) {
                if (tabData.items.has(clickedItemId)) {
                    item = tabData.items.get(clickedItemId).item;
                    break;
                }
            }

            if (item && item.slot) {
                // Try to equip directly
                const success = this.equipItem(clickedItemId);
                if (success) {
                    uiSystem.log(`⚡ Quick-equipped ${item.name}`, 'success');
                } else {
                    // Fall back to normal selection if equipping failed
                    this.selectItem(clickedItemId);
                }
                this.updateDisplay();
                return;
            }
        }

        // Normal click behavior
        if (clickedItemId) {
            // Always select the clicked item (single-click selection)
            this.selectItem(clickedItemId);
        } else if (this.selectedItem) {
            // Try to move selected item to empty space
            this.moveItem(this.selectedItem, x, y, this.activeTab);
            this.selectedItem = null;
            this.clearItemDetailPanel();
            this.clearSelectedItemForEquipping();
        } else {
            // Clear selection when clicking empty space
            this.selectedItem = null;
            this.clearItemDetailPanel();
            this.clearSelectedItemForEquipping();
        }

        this.updateDisplay();
    },

    // Handle cell hover
    handleCellHover(e, x, y) {
        const tab = this.tabs.get(this.activeTab);
        if (!tab) return;

        const itemId = tab.grid[y][x];
        if (itemId && tab.items.has(itemId)) {
            const itemData = tab.items.get(itemId);
            this.showTooltip(itemData.item);
        } else {
            this.hideTooltip();
        }
    },

    // Helper function to format stat display
    formatStatValue(statKey, value) {
        const displayName = game.getStatDisplayName(statKey);

        // Define stats that should display as percentages (additive)
        const percentageStats = [
            'fireResist', 'coldResist', 'lightningResist', 'chaosResist',
            'fireresist', 'coldresist', 'lightningresist', 'chaosresist',
            'moveSpeed', 'movespeed', 'lightRadius', 'lightradius'
        ];

        // Handle "increased" stats (multiplicative scaling) - these already have "Increased" in their display name
        if (statKey === 'attackSpeed') {
            return `${value}% ${displayName}`;
        }

        // Handle percentage stats (additive)
        if (percentageStats.includes(statKey)) {
            if (value < 0) {
                return `${value}% ${displayName}`;
            } else {
                return `+${value}% ${displayName}`;
            }
        }

        // Handle regular stats (non-percentage)
        if (value < 0) {
            return `${value} ${displayName}`;
        } else {
            return `+${value} ${displayName}`;
        }
    },

    // Show tooltip
    showTooltip(item) {
        if (!this.tooltipElement) return;

        // Build tooltip content - just the item name, no redundant type info
        const itemRarity = item.rarity || 'common';
        const rarityColors = {
            'common': '#808080',
            'magic': '#4169E1',
            'rare': '#FFD700',
            'unique': '#FF4500'
        };
        const color = rarityColors[itemRarity] || '#808080';

        let html = `<div class="tooltip-header" style="color: ${color};">${item.name || 'Unknown Item'}</div>`;

        // Combined weapon stats and implicits section (like item detail panel)
        let hasWeaponStats = item.slot === 'weapon' && (item.attackSpeed || item.damageMultiplier);
        let hasImplicits = item.implicitStats && Object.keys(item.implicitStats).length > 0;

        if (hasWeaponStats || hasImplicits) {
            html += '<div class="tooltip-implicit-section" style="margin: 5px 0; padding: 4px; background: rgba(32, 32, 36, 0.8); border-radius: 3px; border-bottom: 1px solid #666;">';

            // Weapon stats (in smaller text)
            if (hasWeaponStats) {
                if (item.attackSpeed) {
                    html += `<div style="color: #888; font-size: 0.8em; font-style: italic;">Attack Speed: ${item.attackSpeed.toFixed(2)}</div>`;
                }
                if (item.damageMultiplier) {
                    html += `<div style="color: #888; font-size: 0.8em; font-style: italic;">Damage Multiplier: ${item.damageMultiplier.toFixed(2)}</div>`;
                }
            }

            // Implicit stats
            if (hasImplicits) {
                for (const [stat, value] of Object.entries(item.implicitStats)) {
                    if (value !== 0) {
                        html += `<div style="color: #9a9aaa; font-size: 0.85em; font-style: italic;">${this.formatStatValue(stat, value)}</div>`;
                    }
                }
            }

            html += '</div>';
        }

        // Show rolled stats (magic/rare stats)
        if (item.stats && Object.keys(item.stats).length > 0) {
            html += '<div class="tooltip-stats" style="margin: 5px 0;">';
            for (const [stat, value] of Object.entries(item.stats)) {
                if (value !== 0) {
                    html += `<div style="color: #ddd;">${this.formatStatValue(stat, value)}</div>`;
                }
            }
            html += '</div>';
        }

        // Show item level (smaller text at bottom)
        const itemLevel = item.ilvl || item.level || 1;
        html += `<div class="tooltip-level" style="color: #666; font-size: 0.75em; margin-top: 5px;">Item Level: ${itemLevel}</div>`;

        this.tooltipElement.innerHTML = html;
        this.tooltipElement.style.display = 'block';
    },

    // Hide tooltip
    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
    },

    // Update tooltip position
    updateTooltipPosition(e) {
        if (!this.tooltipElement || this.tooltipElement.style.display === 'none') return;

        const offsetX = 15;
        const offsetY = 15;

        this.tooltipElement.style.left = (e.clientX + offsetX) + 'px';
        this.tooltipElement.style.top = (e.clientY + offsetY) + 'px';
    },

    // Handle keyboard input
    handleKeyPress(e) {
        if (e.key.toLowerCase() === 'r' && this.selectedItem) {
            this.rotateItem(this.selectedItem);
        }

        // Cancel click-to-equip mode with Escape
        if (e.key === 'Escape' && this.selectedItemForEquipping) {
            this.clearSelectedItemForEquipping();
            uiSystem.log('Click-to-equip cancelled', 'info');
        }

        // Show help for keyboard shortcuts (F1 is universal help key)
        if (e.key === 'F1') {
            e.preventDefault(); // Prevent browser's F1 help
            uiSystem.log('💡 Shortcuts: R=Rotate, Escape=Cancel, Ctrl+Click=Quick Equip, F1=Help', 'info');
        }
    },

    // Switch tab
    switchTab(tabId) {
        if (this.tabs.has(tabId)) {
            this.activeTab = tabId;
            this.selectedItem = null;
            // Clear click-to-equip selection when switching inventory tabs (but keep it when switching to equipment)
            this.clearSelectedItemForEquipping();

            // Save the active tab change and persist to disk
            this.saveGridState();
            game.saveGame();
            this.updateDisplay();
        }
    },

    // Update visual display
    updateDisplay() {
        if (!this.gridContainer) return;

        const tab = this.tabs.get(this.activeTab);
        if (!tab) return;

        // Clear all cells completely
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'grid-cell';
            // Reset ALL inline styles to ensure clean state
            cell.style.backgroundColor = '';
            cell.style.border = '';
            cell.style.borderTop = '';
            cell.style.borderRight = '';
            cell.style.borderBottom = '';
            cell.style.borderLeft = '';
            cell.style.outline = '';
            cell.style.boxShadow = '';
            cell.style.padding = '';
            cell.style.margin = '';
        });

        // Render items
        tab.items.forEach((itemData, itemId) => {
            const isSelected = itemId === this.selectedItem;
            const isSelectedForEquipping = this.selectedItemForEquipping &&
                this.selectedItemForEquipping.itemId === itemId;
            this.renderItem(itemData, isSelected, isSelectedForEquipping);
        });
    },

    // Render individual item
    renderItem(itemData, isSelected, isSelectedForEquipping = false) {
        const { item, x, y, rotation, locked } = itemData;
        const dims = this.getItemDimensions(item, rotation);
        const shape = this.getItemShape(item, rotation);

        // Get rarity color
        const rarityColors = {
            'common': '#808080',
            'magic': '#4169E1',
            'rare': '#FFD700',
            'unique': '#FF4500'
        };
        const color = rarityColors[item.rarity] || '#808080';
        const borderColor = this.getDarkerColor(color);

        // Style each cell that the item occupies
        for (let dy = 0; dy < dims.height; dy++) {
            for (let dx = 0; dx < dims.width; dx++) {
                if (shape[dy][dx] === 1) {
                    const cellIndex = (y + dy) * this.GRID_WIDTH + (x + dx);
                    const cell = this.gridContainer.children[cellIndex];
                    if (cell) {
                        // Set background color based on rarity (using !important to override CSS)
                        cell.style.setProperty('background-color', color, 'important');
                        cell.classList.add('occupied');

                        // Calculate which borders this cell should have based on item perimeter
                        const borders = this.calculateCellBorders(shape, dx, dy, dims);

                        // Completely remove all visual artifacts that could create lines
                        cell.style.setProperty('border', 'none', 'important');
                        cell.style.setProperty('border-top', 'none', 'important');
                        cell.style.setProperty('border-right', 'none', 'important');
                        cell.style.setProperty('border-bottom', 'none', 'important');
                        cell.style.setProperty('border-left', 'none', 'important');
                        cell.style.setProperty('outline', 'none', 'important');
                        cell.style.setProperty('box-shadow', 'none', 'important');

                        // Apply only perimeter borders
                        if (borders.top) cell.style.setProperty('border-top', `2px solid ${borderColor}`, 'important');
                        if (borders.right) cell.style.setProperty('border-right', `2px solid ${borderColor}`, 'important');
                        if (borders.bottom) cell.style.setProperty('border-bottom', `2px solid ${borderColor}`, 'important');
                        if (borders.left) cell.style.setProperty('border-left', `2px solid ${borderColor}`, 'important');

                        // Add icon to first cell (top-left of item)
                        if (dx === 0 && dy === 0) {
                            cell.innerHTML = this.getItemIcon(item);
                        }

                        // Highlight if selected (override with selection border)
                        if (isSelected) {
                            cell.classList.add('selected');
                            if (borders.top) cell.style.setProperty('border-top', '3px solid #c9aa71', 'important');
                            if (borders.right) cell.style.setProperty('border-right', '3px solid #c9aa71', 'important');
                            if (borders.bottom) cell.style.setProperty('border-bottom', '3px solid #c9aa71', 'important');
                            if (borders.left) cell.style.setProperty('border-left', '3px solid #c9aa71', 'important');
                        }

                        // Highlight if selected for equipping
                        if (isSelectedForEquipping) {
                            cell.classList.add('selected-for-equipping');
                            if (borders.top) cell.style.setProperty('border-top', '3px solid #FF9800', 'important');
                            if (borders.right) cell.style.setProperty('border-right', '3px solid #FF9800', 'important');
                            if (borders.bottom) cell.style.setProperty('border-bottom', '3px solid #FF9800', 'important');
                            if (borders.left) cell.style.setProperty('border-left', '3px solid #FF9800', 'important');
                        }
                    }
                }
            }
        }
    },

    // Calculate which borders a cell should have based on item shape
    calculateCellBorders(shape, x, y, dims) {
        const borders = {
            top: false,
            right: false,
            bottom: false,
            left: false
        };

        // Check if this cell is on the perimeter of the item shape
        // Top border: if cell above is not part of item or is out of bounds
        if (y === 0 || shape[y - 1][x] === 0) {
            borders.top = true;
        }

        // Bottom border: if cell below is not part of item or is out of bounds
        if (y === dims.height - 1 || shape[y + 1][x] === 0) {
            borders.bottom = true;
        }

        // Left border: if cell to left is not part of item or is out of bounds
        if (x === 0 || shape[y][x - 1] === 0) {
            borders.left = true;
        }

        // Right border: if cell to right is not part of item or is out of bounds
        if (x === dims.width - 1 || shape[y][x + 1] === 0) {
            borders.right = true;
        }

        return borders;
    },

    // Helper function to get darker color for borders
    getDarkerColor(color) {
        // Convert hex color to darker version for border
        const colorMap = {
            '#808080': '#505050', // Common - darker gray
            '#4169E1': '#1e3a8a', // Magic - darker blue  
            '#FFD700': '#d4af37', // Rare - darker gold
            '#FF4500': '#cc3300'  // Unique - darker red
        };
        return colorMap[color] || '#333333';
    },

    // Get simple icon for item type
    getItemIcon(item) {
        if (item.icon) {
            return `<span class="item-icon">${item.icon}</span>`;
        }
        console.warn(`Item "${item.name}" missing icon property`);
        return `<span class="item-icon">⚙</span>`;
    },

    // Sell item
    sellItem(itemId) {
        // Find and get item
        let item = null;
        let tabId = null;

        for (const [tid, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                const itemData = tab.items.get(itemId);
                if (itemData.locked) {
                    console.log('Cannot sell locked item');
                    return false;
                }
                item = itemData.item;
                tabId = tid;
                break;
            }
        }

        if (!item) return false;

        // Remove from grid
        this.removeItemFromGrid(itemId, tabId);

        // Sell through inventory system
        const sellValue = inventorySystem.calculateItemSellValue(item);

        // Remove item from inventory
        gameState.inventory.items = gameState.inventory.items.filter(i => i.id !== itemId);

        // Add gold
        gameState.resources.gold += sellValue;

        // Log the sale
        uiSystem.log(`💰 Sold ${item.name} for ${sellValue} gold`, "success");

        // Save grid state after item removal
        this.saveGridState();

        // Update displays
        uiSystem.updateDisplay();
        game.saveGame();

        // Clear selection if we sold the selected item
        if (this.selectedItem === itemId) {
            this.selectedItem = null;
            this.clearItemDetailPanel();
            this.clearSelectedItemForEquipping();
        }

        // Update display
        this.updateDisplay();
        return true;
    },

    // Sell all items by rarity
    sellAllByRarity(rarity) {
        const itemsToSell = [];
        const rarityLower = rarity.toLowerCase(); // Convert to lowercase for comparison

        // Collect all matching items
        for (const [_, tab] of this.tabs) {
            tab.items.forEach((itemData, itemId) => {
                if (itemData.item.rarity === rarityLower && !itemData.locked) {
                    itemsToSell.push({ itemId, item: itemData.item });
                }
            });
        }

        // Sell them
        let totalGold = 0;
        itemsToSell.forEach(({ itemId, item }) => {
            const sellValue = inventorySystem.calculateItemSellValue(item);
            totalGold += sellValue;
            this.sellItem(itemId);
        });

        // Enhanced logging
        if (itemsToSell.length > 0) {
            uiSystem.log(`💰 Sold ${itemsToSell.length} ${rarityLower} items for ${totalGold} gold`, 'success');
        } else {
            uiSystem.log(`No ${rarityLower} items to sell`, 'info');
        }

        console.log(`Sold ${itemsToSell.length} ${rarityLower} items for ${totalGold} gold`);
    },

    // Check if exile can equip items (must be "in town")
    canExileEquipItem(exileId) {
        const exile = gameState.exiles.find(e => e.id === exileId);
        if (!exile) return false;

        // Exile must be idle, resting, or assigned (but not in_mission)
        const allowedStatuses = ['idle', 'resting', 'assigned'];
        return allowedStatuses.includes(exile.status);
    },

    // Equip item to currently selected exile
    equipItem(itemId) {
        // Check if there's a selected exile
        if (!gameState.selectedExileId) {
            uiSystem.log('No exile selected', 'error');
            return false;
        }

        const exile = gameState.exiles.find(e => e.id === gameState.selectedExileId);
        if (!exile) {
            uiSystem.log('Selected exile not found', 'error');
            return false;
        }

        // Check if exile can equip items (must be in town)
        if (!this.canExileEquipItem(gameState.selectedExileId)) {
            uiSystem.log(`${exile.name} cannot equip items while ${exile.status}`, 'error');
            return false;
        }

        // Find the item in the grid
        let item = null;
        let tabId = null;
        for (const [tid, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                item = tab.items.get(itemId).item;
                tabId = tid;
                break;
            }
        }

        if (!item) {
            uiSystem.log('Item not found', 'error');
            return false;
        }

        // Check if item has a valid slot
        if (!item.slot) {
            uiSystem.log('Item cannot be equipped', 'error');
            return false;
        }

        // Remove item from grid first
        this.removeItemFromGrid(itemId, tabId);

        // Use the existing equipment system to handle the equipping
        const success = inventorySystem.equipItem(itemId, gameState.selectedExileId);

        if (success) {
            // Clear selection after successful equip
            this.selectedItem = null;
            this.clearSelectedItemForEquipping();
            this.clearItemDetailPanel();

            // Switch to equipment tab to show the player
            if (typeof dynamicDisplayManager !== 'undefined') {
                dynamicDisplayManager.switchTab('equipment');
            }

            // Update displays
            this.updateDisplay();
            uiSystem.log(`Equipped ${item.name} to ${exile.name}`, 'success');
            return true;
        } else {
            // If equipping failed, add the item back to inventory grid
            this.addNewItemToInventory(item);
            uiSystem.log('Failed to equip item', 'error');
            return false;
        }
    },

    // Select item for click-to-equip mode
    selectItemForEquipping(itemId) {
        // Find the item
        let item = null;
        for (const [_, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                item = tab.items.get(itemId).item;
                break;
            }
        }

        if (!item || !item.slot) {
            uiSystem.log('Item cannot be equipped', 'error');
            return;
        }

        // Check if we can equip to selected exile
        if (!gameState.selectedExileId || !this.canExileEquipItem(gameState.selectedExileId)) {
            const exile = gameState.exiles.find(e => e.id === gameState.selectedExileId);
            const statusMsg = exile ? `${exile.name} cannot equip (${exile.status})` : 'No exile selected';
            uiSystem.log(statusMsg, 'error');
            return;
        }

        // Set the item for equipping
        this.selectedItemForEquipping = { itemId, item };

        // Refresh the equipment display if it's currently active
        if (typeof dynamicDisplayManager !== 'undefined') {
            dynamicDisplayManager.refreshCurrentTab();
        }

        // Show feedback (but don't auto-switch tabs)
        const exile = gameState.exiles.find(e => e.id === gameState.selectedExileId);
        uiSystem.log(`${item.name} ready to equip - check Equipment tab for glowing slots`, 'info');
    },

    // Clear the selected item for equipping
    clearSelectedItemForEquipping() {
        if (this.selectedItemForEquipping) {
            this.selectedItemForEquipping = null;
            // Refresh equipment display to remove glow effects
            if (typeof dynamicDisplayManager !== 'undefined') {
                dynamicDisplayManager.refreshCurrentTab();
            }
        }
    },

    // Get valid slots for the currently selected item
    getValidSlotsForSelectedItem() {
        if (!this.selectedItemForEquipping) return [];

        const item = this.selectedItemForEquipping.item;
        if (!item.slot) return [];

        // Handle ring slots (can go in ring1 or ring2)
        if (item.slot === 'ring') {
            return ['ring1', 'ring2'];
        }

        // All other items have a single slot
        return [item.slot];
    },

    // Equip item to specific slot (called from equipment slot click)
    equipItemToSlot(targetSlot) {
        if (!this.selectedItemForEquipping) return false;

        const { itemId, item } = this.selectedItemForEquipping;

        // Validate the slot
        const validSlots = this.getValidSlotsForSelectedItem();
        if (!validSlots.includes(targetSlot)) {
            uiSystem.log('Invalid slot for this item', 'error');
            return false;
        }

        // Clear the click-to-equip selection first
        this.clearSelectedItemForEquipping();

        // Use the existing equip logic but with specific target slot
        return this.equipItemToSpecificSlot(itemId, targetSlot);
    },

    // Modified version of equipItem that allows specifying target slot
    equipItemToSpecificSlot(itemId, targetSlot) {
        // Check if there's a selected exile
        if (!gameState.selectedExileId) {
            uiSystem.log('No exile selected', 'error');
            return false;
        }

        const exile = gameState.exiles.find(e => e.id === gameState.selectedExileId);
        if (!exile) {
            uiSystem.log('Selected exile not found', 'error');
            return false;
        }

        // Check if exile can equip items (must be in town)
        if (!this.canExileEquipItem(gameState.selectedExileId)) {
            uiSystem.log(`${exile.name} cannot equip items while ${exile.status}`, 'error');
            return false;
        }

        // Find the item in the grid
        let item = null;
        let tabId = null;
        for (const [tid, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                item = tab.items.get(itemId).item;
                tabId = tid;
                break;
            }
        }

        if (!item) {
            uiSystem.log('Item not found', 'error');
            return false;
        }

        // Remove item from grid first
        this.removeItemFromGrid(itemId, tabId);

        // Use the existing equipment system with specific target slot
        const success = inventorySystem.equipItem(itemId, gameState.selectedExileId, targetSlot);

        if (success) {
            // Clear selection after successful equip
            this.selectedItem = null;
            this.clearItemDetailPanel();

            // Update displays
            this.updateDisplay();

            // Force refresh equipment display if currently viewing it
            if (typeof dynamicDisplayManager !== 'undefined') {
                dynamicDisplayManager.refreshCurrentTab();
            }

            uiSystem.log(`Equipped ${item.name} to ${exile.name}'s ${targetSlot}`, 'success');
            return true;
        } else {
            // If equipping failed, add the item back to inventory grid
            this.addNewItemToInventory(item);
            uiSystem.log('Failed to equip item', 'error');
            return false;
        }
    },

    // Toggle item lock
    toggleItemLock(itemId) {
        for (const [_, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                const itemData = tab.items.get(itemId);
                itemData.locked = !itemData.locked;

                // Save the new grid state and persist to disk
                this.saveGridState();
                game.saveGame();

                // Refresh the item detail panel to update the lock button
                if (this.selectedItem === itemId) {
                    this.updateItemDetailPanel(itemData.item);
                }

                this.updateDisplay();
                return itemData.locked;
            }
        }
        return false;
    },

    // Add item to main inventory system (for external use)
    addItemToInventory(item) {
        // Add to main inventory
        if (!gameState.inventory.items) {
            gameState.inventory.items = [];
        }
        gameState.inventory.items.push(item);

        // Update the inventory grid if it exists
        this.addNewItemToInventory(item);

        // Update any open modals
        if (typeof inventorySystem !== 'undefined' && inventorySystem.updateInventoryModalDisplay) {
            inventorySystem.updateInventoryModalDisplay();
        }

        // Save game
        if (typeof game !== 'undefined' && game.saveGame) {
            game.saveGame();
        }
    },

    // Add new item (from missions or unequipping)
    addNewItemToInventory(item) {
        // Try to place in active tab first
        let position = this.findNextAvailablePosition(item, this.activeTab);
        if (position) {
            this.addItemToGrid(item, this.activeTab, position.x, position.y);
            this.saveGridState();
            game.saveGame();
            this.updateDisplay();
            return;
        }

        // If active tab is full, try other tabs in order
        const tabOrder = ['tab1', 'tab2', 'tab3', 'tab4'];
        for (const tabId of tabOrder) {
            position = this.findNextAvailablePosition(item, tabId);
            if (position) {
                this.addItemToGrid(item, tabId, position.x, position.y);
                this.saveGridState();
                game.saveGame();
                this.updateDisplay();
                return;
            }
        }

        console.warn(`No space for item ${item.name} - inventory full!`);
        // Could trigger a "inventory full" notification here
    },

    // Update item detail panel with selected item info
    updateItemDetailPanel(item) {
        const detailContent = document.getElementById('item-detail-content');
        if (!detailContent) return;

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
                ${itemName}
            </div>
            <div class="item-level" style="color: #666; font-size: 0.75em; margin-bottom: 8px;">
                Item Level: ${itemLevel}
            </div>
        </div>
    `;

        // Add item description if available
        if (item.description) {
            html += `
            <div class="item-description">
                ${item.description}
            </div>
        `;
        }

        // Combined weapon stats and implicits section
        let hasWeaponStats = item.slot === 'weapon' && (item.attackSpeed || item.damageMultiplier);
        let hasImplicits = item.implicitStats && Object.keys(item.implicitStats).length > 0;

        if (hasWeaponStats || hasImplicits) {
            html += '<div class="weapon-implicit-section" style="margin-bottom: 5px; padding: 6px; background:rgb(32, 32, 36); border-radius: 3px; border-bottom: 2px solid #444;">';

            // Weapon stats
            if (hasWeaponStats) {
                if (item.attackSpeed) {
                    html += `<div style="color: #888; font-size: 0.85em; font-style: italic; margin-bottom: 3px;">Attack Speed: ${item.attackSpeed.toFixed(2)}</div>`;
                }
                if (item.damageMultiplier) {
                    html += `<div style="color: #888; font-size: 0.85em; font-style: italic; margin-bottom: 3px;">Damage Multiplier: ${item.damageMultiplier.toFixed(2)}</div>`;
                }
            }

            // Implicit stats
            if (hasImplicits) {
                for (const [stat, value] of Object.entries(item.implicitStats)) {
                    if (value !== 0) {
                        html += `<div style="color: #9a9aaa; font-size: 0.85em; font-style: italic;">${this.formatStatValue(stat, value)}</div>`;
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
                    html += `<div style="color: #ddd;">${this.formatStatValue(stat, value)}</div>`;
                }
            }
            html += '</div>';
        }

        detailContent.innerHTML = html;

        // Update item actions
        const actionsContainer = document.getElementById('item-actions');
        if (actionsContainer) {
            actionsContainer.style.display = 'flex';

            // Update lock button based on current lock state
            const itemData = this.getItemData(item.id);
            const isLocked = itemData ? itemData.locked : false;

            actionsContainer.innerHTML = `
            <button id="lock-item-button"
                onclick="inventoryGridManager.toggleItemLock(${item.id})">
                ${isLocked ? '🔓' : '🔒'}
            </button>
            <button id="sell-item-button"
                onclick="inventoryGridManager.sellItem(${item.id})"
                ${isLocked ? 'disabled' : ''}>
                💰
            </button>
            <button id="craft-item-button" 
                onclick="game.craftItem(${item.id})"
                style="display: none;">
                🔨 Craft Item
            </button>
        `;
        }
    },

    // Clear item detail panel
    clearItemDetailPanel() {
        const detailContent = document.getElementById('item-detail-content');
        if (detailContent) {
            detailContent.innerHTML = '<p class="no-item-selected">Select an item to view details</p>';
        }

        const actionsContainer = document.getElementById('item-actions');
        if (actionsContainer) {
            actionsContainer.style.display = 'none';
            actionsContainer.innerHTML = '';
        }
    },

    // Reload inventory from gameState (called after loading save)
    reloadInventory() {
        console.log('Reloading inventory from save data...');

        // Clear all existing items from grid
        this.tabs.forEach(tab => {
            tab.grid = Array(this.GRID_HEIGHT).fill(null).map(() => Array(this.GRID_WIDTH).fill(null));
            tab.items.clear();
        });

        // Reload items from gameState (will use saved positions if available)
        this.loadInventoryItems();

        // Update tab buttons to reflect active tab
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === this.activeTab);
        });

        // Update display
        this.updateDisplay();

        console.log(`Reloaded ${gameState.inventory.items?.length || 0} items into grid`);
    },

    // Save current grid state to gameState
    saveGridState() {
        if (!gameState.inventoryGridData) {
            gameState.inventoryGridData = {
                itemPositions: {},
                activeTab: 'tab1'
            };
        }

        // Clear existing positions
        gameState.inventoryGridData.itemPositions = {};

        // Save current positions and states
        for (const [tabId, tab] of this.tabs) {
            tab.items.forEach((itemData, itemId) => {
                gameState.inventoryGridData.itemPositions[itemId] = {
                    tabId: tabId,
                    x: itemData.x,
                    y: itemData.y,
                    rotation: itemData.rotation,
                    locked: itemData.locked
                };
            });
        }

        // Save active tab
        gameState.inventoryGridData.activeTab = this.activeTab;

        console.log('Grid state saved - Items:', Object.keys(gameState.inventoryGridData.itemPositions).length, 'Active tab:', this.activeTab);
    },

    // Load grid state from gameState and apply it
    loadGridState() {
        // Initialize grid data structure if it doesn't exist (for older saves)
        if (!gameState.inventoryGridData) {
            gameState.inventoryGridData = {
                itemPositions: {},
                activeTab: 'tab1'
            };
        }

        if (!gameState.inventoryGridData.itemPositions || Object.keys(gameState.inventoryGridData.itemPositions).length === 0) {
            console.log('No saved grid state found, using sequential placement');
            return false;
        }

        console.log('Loading saved grid state - Items to restore:', Object.keys(gameState.inventoryGridData.itemPositions).length);

        // Restore active tab
        if (gameState.inventoryGridData.activeTab) {
            this.activeTab = gameState.inventoryGridData.activeTab;
            console.log('Restored active tab:', this.activeTab);
        }

        let itemsPlaced = 0;
        const savedPositions = gameState.inventoryGridData.itemPositions;

        // Try to place items in their saved positions
        gameState.inventory.items.forEach(item => {
            const savedPos = savedPositions[item.id];
            if (savedPos) {
                // Try to place at saved position
                if (this.addItemToGrid(item, savedPos.tabId, savedPos.x, savedPos.y, savedPos.rotation)) {
                    // Restore lock state
                    const itemData = this.tabs.get(savedPos.tabId).items.get(item.id);
                    if (itemData) {
                        itemData.locked = savedPos.locked || false;
                    }
                    itemsPlaced++;
                } else {
                    console.warn(`Could not place ${item.name} at saved position, finding new spot`);
                    // Fall back to sequential placement for this item
                    const position = this.findNextAvailablePosition(item, this.activeTab);
                    if (position) {
                        this.addItemToGrid(item, this.activeTab, position.x, position.y);
                        itemsPlaced++;
                    }
                }
            } else {
                console.warn(`No saved position for ${item.name}, placing sequentially`);
                // Fall back to sequential placement
                const position = this.findNextAvailablePosition(item, this.activeTab);
                if (position) {
                    this.addItemToGrid(item, this.activeTab, position.x, position.y);
                    itemsPlaced++;
                }
            }
        });

        console.log(`Restored ${itemsPlaced}/${gameState.inventory.items.length} items from saved positions`);
        return true;
    },

    // Add this method after the selectItem method
    getItemData(itemId) {
        // Search through all tabs to find the item
        for (const [_, tab] of this.tabs) {
            if (tab.items.has(itemId)) {
                return tab.items.get(itemId);
            }
        }
        return null;
    }
};