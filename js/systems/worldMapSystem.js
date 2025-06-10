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
        this.closeWorldMap();

        // Refresh UI
        exileRowManager.refreshAllRows();

        // Log deployment
        const mission = getMissionData(areaId, missionId);
        uiSystem.log(`${selectedExile.name} deployed on ${mission.name}!`, "info");
    },




    // !=== OLD MODAL MANAGEMENT ===

    openWorldMap() {
        // Create world map modal if it doesn't exist
        if (!document.getElementById('world-map-modal')) {
            this.createWorldMapModal();
        }

        // Show the modal
        document.getElementById('world-map-modal').style.display = 'flex';

        // Populate with current world state
        this.updateWorldMapDisplay();

        // Add escape key listener
        document.addEventListener('keydown', this.handleWorldMapKeydown.bind(this));
    },

    closeWorldMap() {
        const modal = document.getElementById('world-map-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleWorldMapKeydown.bind(this));
    },

    handleWorldMapKeydown(event) {
        if (event.key === 'Escape') {
            this.closeWorldMap();
        }
    },

    handleWorldMapClick(event) {
        // Close if clicking the overlay (not the content)
        if (event.target.classList.contains('world-map-overlay')) {
            this.closeWorldMap();
        }
    },

    // === MODAL CREATION ===

    createWorldMapModal() {
        const modalHTML = `
        <div id="world-map-modal" class="world-map-overlay" style="display: none;" onclick="worldMapSystem.handleWorldMapClick(event)">
            <div class="world-map-content" onclick="event.stopPropagation()">
                <div class="world-map-header">
                    <h2>🗺️ World Map - Day <span id="world-map-day">${turnState.currentTurn}</span></h2>
                    <button class="close-btn" onclick="worldMapSystem.closeWorldMap()">&times;</button>
                </div>
                
                <div class="world-map-body">
                    <!-- Areas Panel -->
                    <div class="world-areas-panel">
                        <h3 style="color: #c9aa71; margin-bottom: 15px;">Discovered Areas</h3>
                        <div id="world-areas-list">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                    
                    <!-- Mission Panel -->
                    <div class="world-mission-panel">
                        <div id="world-mission-content">
                            <div style="text-align: center; color: #666; margin-top: 50px;">
                                <h3>Select an area to view missions</h3>
                                <p>Choose an area from the left panel to see available missions and plan your expedition.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // === DISPLAY METHODS ===

    updateWorldMapDisplay() {
        // Update day display
        document.getElementById('world-map-day').textContent = turnState.currentTurn;

        // Update areas list
        this.updateWorldAreasDisplay();
        // AUTO-SELECT FIRST AREA: Automatically select the first discovered area
        const discoveredAreas = getDiscoveredAreas();
        if (discoveredAreas.length > 0) {
            // Select the first area automatically
            setTimeout(() => {
                this.selectArea(discoveredAreas[0].id);
            }, 50); // Small delay to ensure DOM is updated
        } else {
            // Clear mission panel
            document.getElementById('world-mission-content').innerHTML = `
        <div style="text-align: center; color: #666; margin-top: 50px;">
            <h3>Select an area to view missions</h3>
            <p>Choose an area from the left panel to see available missions and plan your expedition.</p>
        </div>
    `;
        }
    },

    updateWorldAreasDisplay() {
        const areasContainer = document.getElementById('world-areas-list');
        const discoveredAreas = getDiscoveredAreas();

        areasContainer.innerHTML = discoveredAreas.map(area => {
            const areaState = gameState.worldState.areas[area.id];
            const availableMissions = getAvailableMissions(area.id);

            return `
            <div class="area-card" onclick="worldMapSystem.selectArea('${area.id}')">
                <div class="area-name">${area.name}</div>
                <div class="area-progress">Exploration: ${areaState.explorationProgress}%</div>
                <div class="area-missions-count">${availableMissions.length} missions available</div>
            </div>
        `;
        }).join('');
    },

    selectArea(areaId) {
        // Update selected area visual state
        document.querySelectorAll('.area-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Find and select the correct area card by areaId
        // This works for both click events and programmatic calls
        const areaCards = document.querySelectorAll('.area-card');
        areaCards.forEach(card => {
            // Check if this card's onclick contains the areaId we want
            const onclickAttr = card.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${areaId}'`)) {
                card.classList.add('selected');
            }
        });

        // Show missions for this area
        this.showAreaMissions(areaId);
    },

    showAreaMissions(areaId) {
        const areaData = getAreaData(areaId);
        const areaState = gameState.worldState.areas[areaId];

        if (!areaData || !areaState) return;

        // Get scouting info
        const unlockedScouting = getUnlockedScoutingInfo(areaId);
        const totalScoutingProgress = areaState.totalScoutingProgress || 0;

        // Get discovered missions
        const discoveredMissions = Object.entries(areaData.missions)
            .filter(([missionId, mission]) => {
                const missionState = areaState.missions[missionId];
                return missionState && missionState.discovered;
            })
            .map(([missionId, mission]) => ({
                ...mission,
                missionId: missionId,
                areaId: areaId
            }));

        const missionContent = document.getElementById('world-mission-content');

        if (discoveredMissions.length === 0) {
            missionContent.innerHTML = `
            <div style="text-align: center; color: #666; margin-top: 50px;">
                <h3>No missions discovered in ${areaData.name}</h3>
                <p>Complete missions to discover new opportunities in this area.</p>
            </div>
        `;
            return;
        }

        missionContent.innerHTML = `
        <div class="area-mission-layout">
            <!-- Left side: Area info and scouting -->
            <div class="area-info-panel">
                <h3 style="color: #c9aa71; margin-bottom: 15px;">${areaData.name}</h3>
                
                <div class="area-progress-section">
                    <h4>Area Progress</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${areaState.explorationProgress}%"></div>
                        <span class="progress-text">${areaState.explorationProgress}% Explored</span>
                    </div>
                    <div class="scouting-progress">
                        Scouting Knowledge: ${totalScoutingProgress}
                    </div>
                </div>

                <div class="scouting-info-section">
                    <h4>Area Knowledge</h4>
                    ${unlockedScouting.length === 0 ?
                '<div class="no-scouting">No detailed knowledge yet. Complete missions to learn more.</div>' :
                unlockedScouting.map(info => `
                            <div class="scouting-info-item ${info.tag}">
                                <div class="scouting-threshold">Learned at ${info.threshold} scouting</div>
                                <div class="scouting-text">${info.text}</div>
                            </div>
                        `).join('')
            }
                </div>
            </div>

            <!-- Right side: Missions -->
            <div class="missions-panel">
                <h4>Available Missions</h4>
                <div class="missions-grid">
                ${discoveredMissions.map(mission => {
                const isAvailable = isMissionAvailable(areaId, mission.missionId);
                const daysUntil = getDaysUntilAvailable(areaId, mission.missionId);

                let buttonText = "View Mission";
                let buttonClass = "assign-mission-btn";
                let buttonDisabled = "";

                if (!isAvailable && daysUntil > 0) {
                    buttonText = `On Cooldown (${daysUntil} days)`;
                    buttonClass = "assign-mission-btn disabled";
                    buttonDisabled = "disabled";
                }

                // Check if any exile is currently on this mission
                const isActive = turnState.activeMissions?.some(m =>
                    m.areaId === areaId && m.missionId === mission.missionId
                );

                if (isActive) {
                    buttonText = "Mission in Progress";
                    buttonClass = "assign-mission-btn active";
                    buttonDisabled = "disabled";
                }

                return `
                        <div class="world-mission-card ${!isAvailable ? 'mission-on-cooldown' : ''}">
                            <div class="mission-header">
                                <div class="mission-name">${mission.name}</div>
                                <div class="mission-type ${mission.type}">${getMissionTypeData(mission.type).name}</div>
                            </div>
                            <div class="mission-description">${mission.description}</div>
                            <div class="mission-stats">
                                <div class="stat">
                                    <strong>Difficulty:</strong><br>${mission.difficulty}
                                </div>
                                <div class="stat">
                                    <strong>Item Level:</strong><br>${mission.ilvl.min} - ${mission.ilvl.max}
                                </div>
                                <div class="stat">
                                    <strong>Gear Drop:</strong><br>${Math.round((mission.gearDrop?.baseChance || 0) * 100)}%
                                </div>
                            </div>
                            <button class="${buttonClass}" ${buttonDisabled} 
                                    onclick="worldMapSystem.openMissionPreview('${areaId}', '${mission.missionId}')">
                                ${buttonText}
                            </button>
                        </div>
                    `;
            }).join('')}
                </div>
            </div>
        </div>
    `;
    },

    // === SCOUTING KNOWLEDGE DETECTION ===

    getNewScoutingKnowledgeUnlocked() {
        const newKnowledge = [];

        // Check each mission result for scouting gains
        game.dayReportData.missionResults.forEach(result => {
            const areaId = result.missionContext.areaId;
            const scoutingGained = result.worldProgression.scoutingGain;

            if (scoutingGained > 0) {
                const areaData = getAreaData(areaId);
                const areaState = gameState.worldState.areas[areaId];

                if (areaData && areaState) {
                    const currentScouting = areaState.totalScoutingProgress || 0;
                    const previousScouting = currentScouting - scoutingGained;

                    // Check which scouting info thresholds we crossed today
                    areaData.scoutingInfo.forEach((info, index) => {
                        if (previousScouting < info.threshold && currentScouting >= info.threshold) {
                            newKnowledge.push({
                                text: info.text,
                                tag: info.tag,
                                threshold: info.threshold,
                                areaId: areaId
                            });
                        }
                    });
                }
            }
        });

        return newKnowledge;
    }

};

// Export for module use
export { worldMapSystem };