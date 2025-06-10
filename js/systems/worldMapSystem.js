// World Map System
// Handles world map interface, area selection, and mission display

const worldMapSystem = {
    selectedAreaId: null,

    // Open mission preview modal
    openMissionPreview(areaId, missionId) {
        const mission = getMissionData(areaId, missionId);
        const area = getAreaData(areaId);

        if (!mission || !area) {
            console.error("Mission or area not found!");
            return;
        }

        // Get the mission instance
        const missionInstance = worldState.areas[areaId].missions[missionId].currentInstance;
        if (!missionInstance) {
            console.error("Mission instance not found!");
            return;
        }

        // Create modal if it doesn't exist
        if (!document.getElementById('mission-preview-modal')) {
            this.createMissionPreviewModal();
        }

        // Populate modal with mission data
        this.updateMissionPreviewModal(areaId, missionId, mission, missionInstance);

        // Show modal
        document.getElementById('mission-preview-modal').style.display = 'flex';
    },

    // Create the mission preview modal
    createMissionPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'mission-preview-modal';
        modal.className = 'modal-overlay mission-preview-modal';
        modal.style.display = 'none';

        modal.innerHTML = `
        <div class="modal-content">
            <div class="mission-preview-header">
                <h2>
                    <span id="preview-mission-name">Mission Name</span>
                    <span id="preview-mission-type" class="mission-type-badge">Type</span>
                </h2>
                <button class="close-btn" onclick="worldMapSystem.closeMissionPreview()">&times;</button>
            </div>
            
            <div class="mission-preview-body">
                <p class="mission-description" id="preview-mission-description"></p>
                
                <div class="mission-info-grid">
                    <div class="info-box">
                        <h4>Estimated Danger</h4>
                        <p id="preview-danger-level">Unknown</p>
                    </div>
                    <div class="info-box">
                        <h4>Item Level Range</h4>
                        <p id="preview-ilvl-range">1-3</p>
                    </div>
                </div>
                
                <div class="encounters-preview">
                    <h3>Encounters (<span id="preview-encounter-count">0</span>)</h3>
                    <div class="encounter-list" id="preview-encounter-list"></div>
                </div>
                
                <div class="mission-deploy-section">
                    <div class="selected-exile-info">
                        Deploy <span class="selected-exile-name" id="preview-exile-name">No Exile Selected</span>
                    </div>
                    <button class="deploy-btn" id="deploy-mission-btn" onclick="worldMapSystem.deployOnMission()">
                        Deploy on Mission
                    </button>
                    <div class="mission-warnings" id="preview-warnings" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;

        // Add click handler to close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeMissionPreview();
            }
        });

        document.body.appendChild(modal);
    },

    // Update mission preview modal with data
    updateMissionPreviewModal(areaId, missionId, mission, missionInstance) {
        // Store current mission for deployment
        this.selectedMission = { areaId, missionId };

        // Update header
        document.getElementById('preview-mission-name').textContent = mission.name;
        const typeElement = document.getElementById('preview-mission-type');
        typeElement.textContent = mission.type;
        typeElement.className = `mission-type-badge ${mission.type}`;

        // Update description
        document.getElementById('preview-mission-description').textContent = mission.description;

        // Update danger level
        const dangerLevel = missionInstance.previewInfo?.estimatedDanger || 'Unknown';
        document.getElementById('preview-danger-level').textContent = dangerLevel;

        // Update ilvl range
        const ilvlRange = mission.ilvl ? `${mission.ilvl.min} - ${mission.ilvl.max}` : 'Unknown';
        document.getElementById('preview-ilvl-range').textContent = ilvlRange;

        // Update encounters
        document.getElementById('preview-encounter-count').textContent = missionInstance.encounters.length;
        const encounterList = document.getElementById('preview-encounter-list');

        encounterList.innerHTML = missionInstance.encounters.map((enc, index) => {
            const monster = monsterDB.get(enc.monsterId) || bossDB?.get(enc.monsterId);
            if (!monster) return '';

            let eliteBadge = '';
            if (enc.elite === 'magic') {
                eliteBadge = '<span class="elite-badge magic">Magic</span>';
            } else if (enc.elite === 'rare') {
                eliteBadge = '<span class="elite-badge rare">Rare</span>';
            }

            return `
            <div class="encounter-preview-item">
                <span class="encounter-number">Encounter ${index + 1}:</span>
                <div class="encounter-monster">
                    <span class="monster-icon">👹</span>
                    <span>${monster.name}</span>
                    ${eliteBadge}
                </div>
            </div>
        `;
        }).join('');

        // Update selected exile
        const selectedExile = getCurrentExile();
        if (selectedExile) {
            document.getElementById('preview-exile-name').textContent = selectedExile.name;
            document.getElementById('deploy-mission-btn').disabled = false;

            // Check for warnings (low health, etc)
            const warnings = [];
            if (selectedExile.currentLife < selectedExile.stats.life * 0.5) {
                warnings.push("⚠️ Exile is below 50% health");
            }

            const warningsElement = document.getElementById('preview-warnings');
            if (warnings.length > 0) {
                warningsElement.innerHTML = warnings.join('<br>');
                warningsElement.style.display = 'block';
            } else {
                warningsElement.style.display = 'none';
            }
        } else {
            document.getElementById('preview-exile-name').textContent = 'No Exile Selected';
            document.getElementById('deploy-mission-btn').disabled = true;
        }
    },

    // Close mission preview modal
    closeMissionPreview() {
        const modal = document.getElementById('mission-preview-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Deploy the selected exile on the selected mission
    deployOnMission() {
        const selectedExile = getCurrentExile();
        if (!selectedExile || !this.selectedMission) return;

        const { areaId, missionId } = this.selectedMission;

        // Use the mission system to deploy
        missionSystem.deployExileOnMission(selectedExile.id, areaId, missionId);

        // Close modals
        this.closeMissionPreview();

        // Refresh UI
        exileRowManager.refreshAllRows();

        // Log deployment
        const mission = getMissionData(areaId, missionId);
        uiSystem.log(`${selectedExile.name} deployed on ${mission.name}!`, "info");
    },
};

// Export for module use
export { worldMapSystem };