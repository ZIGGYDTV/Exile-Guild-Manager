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
        
        switch(this.currentTab) {
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
        
        content.innerHTML = `
            <h2>${exile.name}</h2>
            <p>Class: ${classDefinitions[exile.class].name}</p>
            <p>Level: ${exile.level}</p>
            <p>Experience: ${exile.experience}/${exile.experienceNeeded}</p>
            <p>Morale: ${exile.morale}</p>
        `;
    },

    showEquipment(exileId) {
        const content = document.getElementById('tab-equipment');
        
        const exile = getCurrentExileForDisplay();
        if (!exile) {
            content.innerHTML = '<h2>No Exile Selected</h2><p>Select an exile to view equipment</p>';
            return;
        }
        
        content.innerHTML = `
            <h2>Equipment - ${exile.name}</h2>
            <p>Equipment interface coming soon...</p>
        `;
    },
    
    showPassives(exileId) {
        const content = document.getElementById('tab-passives');
        
        const exile = getCurrentExileForDisplay();
        if (!exile) {
            content.innerHTML = '<h2>No Exile Selected</h2><p>Select an exile to view passives</p>';
            return;
        }
        
        content.innerHTML = `
            <h2>Passives - ${exile.name}</h2>
            <p>Allocated: ${exile.passives.allocated.length}</p>
            <p>Available Points: ${exile.passives.pendingPoints}</p>
        `;
    },

    showWorldMap() {
        const content = document.getElementById('tab-world');
        content.innerHTML = `
            <h2>World Map</h2>
            <p>Available missions will appear here</p>
        `;
    }
};