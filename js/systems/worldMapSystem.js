// World Map System
// Handles world map interface, area selection, and mission display

const worldMapSystem = {
    selectedAreaId: null,

    // === MODAL MANAGEMENT ===
    
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
                    <h2>🗺️ World Map - Day <span id="world-map-day">${timeState.currentDay}</span></h2>
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
        document.getElementById('world-map-day').textContent = timeState.currentDay;

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

                // Assign Mission from World Map: Check if any exile is assigned to this mission
                const isAssigned = gameState.assignments.some(a => a.areaId === areaId && a.missionId === mission.missionId);
                const assignedExile = gameState.assignments.find(a => a.areaId === areaId && a.missionId === mission.missionId);

                let buttonText = "Assign Mission";
                let buttonClass = "assign-mission-btn";
                let buttonDisabled = "";

                if (!isAvailable && daysUntil > 0) {
                    buttonText = `On Cooldown (${daysUntil} day${daysUntil > 1 ? 's' : ''})`;
                    buttonClass = "assign-mission-btn disabled";
                    buttonDisabled = "disabled";
                } else if (isAssigned) {
                    buttonText = `Assigned ✓ (${assignedExile.exileName})`;
                    buttonClass = "assign-mission-btn assigned";
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
                                        onclick="missionSystem.toggleMissionAssignment('${areaId}', '${mission.missionId}')">
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