// // Character Screen System
// // Handles character screen display, equipment visualization, and stat breakdowns

// const characterScreenSystem = {
//     // === MODAL MANAGEMENT ===
    
//     openCharacterScreen() {
//         // Show the character screen modal
//         const modal = document.getElementById('character-screen-modal');
//         modal.style.display = 'flex';
//         this.updateCharacterScreen();

//         // Add escape key listener
//         document.addEventListener('keydown', this.handleModalKeydown.bind(this));
//     },

//     closeCharacterScreen() {
//         const modal = document.getElementById('character-screen-modal');
//         modal.style.display = 'none';

//         // Remove escape key listener
//         document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
//     },

//     // === DISPLAY METHODS ===
    
//     updateCharacterScreen() {
//         // Update character info
//         document.getElementById('char-name').textContent = gameState.exile.name;
//         document.getElementById('char-class').textContent = classDefinitions[gameState.exile.class].name;
//         document.getElementById('char-level').textContent = gameState.exile.level;
//         document.getElementById('char-exp').textContent = gameState.exile.experience;
//         document.getElementById('char-exp-needed').textContent = gameState.exile.experienceNeeded;
//         document.getElementById('char-morale').textContent = gameState.exile.morale;
//         document.getElementById('char-morale-status').textContent = exileSystem.getMoraleStatus(gameState.exile.morale);

//         // Update morale tooltip
//         const moraleElement = document.querySelector('.morale-value-with-tooltip');
//         if (moraleElement) {
//             moraleElement.setAttribute('data-tooltip', exileSystem.createMoraleTooltip(gameState.exile.morale));
//         }

//         // Combined resistances display
//         const resists = [
//             { key: 'fireResist', color: '#ff7043', label: 'Fire' },
//             { key: 'coldResist', color: '#42a5f5', label: 'Cold' },
//             { key: 'lightningResist', color: '#ffd600', label: 'Lightning' },
//             { key: 'chaosResist', color: '#ab47bc', label: 'Chaos' }
//         ];
//         const resistsHtml = resists.map(r =>
//             `<span style="color:${r.color};font-weight:bold;cursor:help;" title="${r.label} Resist">${gameState.exile.stats[r.key] || 0}%</span>`
//         ).join(' / ');
//         document.getElementById('final-resists-line').innerHTML = resistsHtml;

//         document.getElementById('final-gold-find').textContent = gameState.exile.stats.goldFindBonus + "%";
//         document.getElementById('final-morale-gain').textContent = gameState.exile.stats.moraleGain;
//         document.getElementById('final-morale-resist').textContent = gameState.exile.stats.moraleResistance + "%";
//         // Convert scoutingBonus (1.0 = 100%) to percentage display
//         const explorationBonusPercent = Math.round((gameState.exile.stats.scoutingBonus - 1.0) * 100);
//         document.getElementById('final-exploration-bonus').textContent = explorationBonusPercent + "%";

//         // Calculate all the breakdown components
//         const gearBonuses = this.calculateGearBonuses();
//         const passiveBonuses = this.calculatePassiveBonusesForDisplay();
//         const moraleBonuses = this.calculateMoraleBonuses();

//         // Create formatted tooltips with aligned numbers
//         const lifeTooltip = this.createStatTooltip(
//             gameState.exile.baseStats.life,
//             gearBonuses.life,
//             passiveBonuses.life,
//             moraleBonuses.life,
//             gameState.exile.stats.life
//         );

//         const damageTooltip = this.createStatTooltip(
//             gameState.exile.baseStats.damage,
//             gearBonuses.damage,
//             passiveBonuses.damage,
//             moraleBonuses.damage,
//             gameState.exile.stats.damage
//         );

//         // Format attack speed display (show to 2 decimal places)
//         const formattedAttackSpeed = gameState.exile.stats.attackSpeed.toFixed(2);

//         const defenseTooltip = this.createStatTooltip(
//             gameState.exile.baseStats.defense,
//             gearBonuses.defense,
//             passiveBonuses.defense,
//             moraleBonuses.defense,
//             gameState.exile.stats.defense
//         );

//         // Set the values and tooltips
//         document.getElementById('final-life').textContent = gameState.exile.stats.life;
//         document.getElementById('final-damage').textContent = gameState.exile.stats.damage;

//         // Update attack speed display (we'll add the HTML element next)
//         const attackSpeedElement = document.getElementById('final-attack-speed');
//         if (attackSpeedElement) {
//             attackSpeedElement.textContent = formattedAttackSpeed;
//         }

//         document.getElementById('final-defense').textContent = gameState.exile.stats.defense;
//         document.getElementById('power-rating-calc').textContent = combatSystem.calculatePowerRating();

//         // Find and update tooltips
//         const tooltipElements = document.querySelectorAll('.stat-value-with-tooltip');
//         if (tooltipElements[0]) tooltipElements[0].title = lifeTooltip;
//         if (tooltipElements[1]) tooltipElements[1].title = damageTooltip;
//         if (tooltipElements[2]) tooltipElements[2].title = defenseTooltip;

//         // Update allocated passives
//         this.updateAllocatedPassives();

//         // Update passive allocation button
//         this.updatePassiveButton();

//         // Update equipment and inventory
//         this.updateCharacterEquipment();
//     },

//     updateCharacterScreenIfOpen() {
//         if (this.isCharacterScreenOpen()) {
//             this.updateCharacterScreen();
//         }
//     },

//     isCharacterScreenOpen() {
//         const modal = document.getElementById('character-screen-modal');
//         return modal && modal.style.display === 'flex';
//     },

//     updateCharacterEquipment() {
//         // Update character screen equipment display for all slots
//         const slots = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'shield', 'ring1', 'ring2', 'amulet', 'belt'];

//         slots.forEach(slot => {
//             const slotElement = document.getElementById(`char-${slot}-slot`);
//             if (!slotElement) {
//                 console.warn(`Slot element not found: char-${slot}-slot`);
//                 return;
//             }

//             const slotContent = slotElement.querySelector('.slot-content');
//             if (!slotContent) {
//                 console.warn(`Slot content not found for: ${slot}`);
//                 return;
//             }

//             // Get selected exile's equipment
//             const exile = gameState.exiles?.find(e => e.id === gameState.selectedExileId);
//             const equipped = exile?.equipment?.[slot];

//             if (equipped) {
//                 const displayName = equipped.getDisplayName ? equipped.getDisplayName() : equipped.name;
//                 const displayColor = equipped.getDisplayColor ? equipped.getDisplayColor() :
//                     rarityDB.getRarity(equipped.rarity)?.color || '#888';

//                 slotContent.innerHTML = `
//                     <div class="item-equipped">
//                         <div class="item-name" style="color: ${displayColor}">
//                             ${displayName}
//                             ${equipped.isOvercapped ? '<span class="overcapped-icon" title="Perfected with Exalted Orb">✦</span>' : ''}
//                         </div>
//                         <div class="item-stats">
//                             ${inventorySystem.formatItemStats(equipped)}
//                         </div>
//                     </div>
//                 `;
//             } else {
//                 // Check if items are available for this slot
//                 const availableItems = inventorySystem.getItemsForSlot(slot);
//                 const hasItems = availableItems.length > 0;

//                 slotContent.innerHTML = `
//                     <div class="empty-slot">
//                         Empty${hasItems ? '<span class="slot-has-items">+</span>' : ''}
//                     </div>
//                 `;
//             }
//         });
//     },

//     // === STAT CALCULATION HELPERS ===
    
//     createStatTooltip(base, gear, passives, morale, final) {
//         // Create formatted tooltip with aligned columns
//         return `Base (${base}) + Gear (${gear}) + Passives (${passives}) + Morale (${morale})
// ―――――――――――――――――――――――――――
// Final: ${final}`;
//     },

//     calculateGearBonuses() {
//         let life = 0, damage = 0, defense = 0;
//         // Get selected exile's equipment
//         const exile = gameState.exiles?.find(e => e.id === gameState.selectedExileId);
//         if (exile?.equipment) {
//             Object.values(exile.equipment).forEach(item => {
//                 if (item) {
//                     life += item.stats.life || 0;
//                     damage += item.stats.damage || 0;
//                     defense += item.stats.defense || 0;
//                 }
//             });
//         }
//         return { life, damage, defense };
//     },

//     calculateMoraleBonuses() {
//         // Calculate what morale is contributing to current stats
//         const morale = gameState.exile.morale;
//         let damageBonus = 0;
//         let defenseBonus = 0;

//         // We need to get the pre-morale stats to calculate the bonus
//         const baseStats = gameState.exile.baseStats;
//         const gearBonuses = this.calculateGearBonuses();
//         const passiveBonuses = this.calculatePassiveBonusesForDisplay();

//         const premoraleStats = {
//             damage: baseStats.damage + gearBonuses.damage + passiveBonuses.damage,
//             defense: baseStats.defense + gearBonuses.defense + passiveBonuses.defense
//         };

//         if (morale >= 85) {
//             // Confident: +10% damage, +5% defense
//             damageBonus = Math.floor(premoraleStats.damage * 0.1);
//             defenseBonus = Math.floor(premoraleStats.defense * 0.05);
//         } else if (morale <= 49) {
//             // Demoralized: -10% damage, -5% defense
//             damageBonus = -Math.floor(premoraleStats.damage * 0.1);
//             defenseBonus = -Math.floor(premoraleStats.defense * 0.05);
//         } else if (morale <= 69) {
//             // Discouraged: -5% damage
//             damageBonus = -Math.floor(premoraleStats.damage * 0.05);
//         }

//         return { life: 0, damage: damageBonus, defense: defenseBonus };
//     },

//     calculatePassiveBonusesForDisplay() {
//         // Calculate the total passive contribution to final stats
//         const baseStats = gameState.exile.baseStats;
//         const gearBonuses = this.calculateGearBonuses();
//         const passiveEffects = exileSystem.calculatePassiveEffects();

//         // Add flat passives BEFORE scaling
//         const flatBase = {
//             life: baseStats.life + gearBonuses.life + (passiveEffects.flatLife || 0),
//             damage: baseStats.damage + gearBonuses.damage + (passiveEffects.flatDamage || 0),
//             defense: baseStats.defense + gearBonuses.defense + (passiveEffects.flatDefense || 0)
//         };

//         // Apply passive scaling
//         const passiveContribution = {
//             life: Math.floor(flatBase.life * ((passiveEffects.increasedLife || 0) / 100) +
//                 flatBase.life * ((passiveEffects.moreLife || 0) / 100)),
//             damage: Math.floor(flatBase.damage * ((passiveEffects.increasedDamage || 0) / 100) +
//                 flatBase.damage * ((passiveEffects.moreDamage || 0) / 100)),
//             defense: Math.floor(flatBase.defense * ((passiveEffects.increasedDefense || 0) / 100) +
//                 flatBase.defense * ((passiveEffects.moreDefense || 0) / 100))
//         };

//         return passiveContribution;
//     },

//     // === PASSIVE DISPLAY ===
    
//     updateAllocatedPassives() {
//         const container = document.getElementById('allocated-passives-list');

//         if (gameState.exile.passives.allocated.length === 0) {
//             container.innerHTML = '<div style="color: #666; text-align: center;">No passives allocated</div>';
//             return;
//         }

//         container.innerHTML = gameState.exile.passives.allocated.map(passiveId => {
//             const passive = passiveDefinitions[passiveId];
//             if (!passive) return '';

//             return `
//             <div class="passive-item">
//                 <div class="passive-name ${passive.tier}">${passive.name}</div>
//                 <div class="passive-description">${passive.description}</div>
//             </div>
//         `;
//         }).join('');
//     },

//     updatePassiveButton() {
//         const button = document.getElementById('allocate-passive-btn');
//         if (gameState.exile.passives.pendingPoints > 0) {
//             button.style.display = 'block';
//             button.textContent = `Allocate Passive Skill (${gameState.exile.passives.pendingPoints})`;
//         } else {
//             button.style.display = 'none';
//         }
//     },

//     // === EVENT HANDLERS ===
    
//     handleModalClick(event) {
//         // Only close if clicking the overlay (not the content)
//         if (event.target.classList.contains('modal-overlay')) {
//             this.closeCharacterScreen();
//         }
//     },

//     handleModalKeydown(event) {
//         if (event.key === 'Escape') {
//             this.closeCharacterScreen();
//         }
//     }
// };

// // Make available globally
// window.characterScreenSystem = characterScreenSystem;

// // Export for module use
// export { characterScreenSystem };