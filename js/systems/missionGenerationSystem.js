// js/systems/missionGenerationSystem.js
import { monsterDB } from '../data/monsters.js';

export class MissionGenerationSystem {
    
    // Generate a mission instance with encounters
    generateMissionInstance(areaId, missionId) {
        const area = getAreaData(areaId);
        const mission = getMissionData(areaId, missionId);
        
        if (!area || !mission) {
            console.error(`Could not find area ${areaId} or mission ${missionId}`);
            return null;
        }
        
        // Determine number of encounters
        const encounterCount = this.getEncounterCount(mission.type);
        
        // Generate encounters
        const encounters = [];
        for (let i = 0; i < encounterCount; i++) {
            const encounter = this.generateEncounter(area, mission, i + 1, encounterCount);
            if (encounter) encounters.push(encounter);
        }
        
        // Generate preview info
        const previewInfo = this.generatePreviewInfo(encounters, area, mission);
        
        return {
            encounters: encounters,
            generatedOn: `day_${turnState.currentDay}`,
            previewInfo: previewInfo
        };
    }
    
    getEncounterCount(missionType) {
        const counts = {
            exploration: { min: 2, max: 3 },
            scavenging: { min: 1, max: 1 },
            hunting: { min: 2, max: 3 },
            raid: { min: 3, max: 5 },
            boss: { min: 1, max: 1 }
        };
        
        const range = counts[missionType] || { min: 2, max: 4 };
        return game.randomBetween(range.min, range.max);
    }
    
    generateEncounter(area, mission, encounterNum, totalEncounters) {
        // Get tags/themes and ilvl range
        const areaTags = mission.themes || area.themes || [];
        const ilvlRange = mission.ilvl || { min: 1, max: 100 };

        // Get valid monsters
        const validMonsters = monsterDB.getValidMonstersForArea(
            areaTags,
            ilvlRange.min,
            ilvlRange.max
        );

        // Fallback if no monsters found
        if (validMonsters.length === 0) {
            console.warn("No valid monsters found for this mission! Using default.");
            return {
                monsterId: 'corpsecrab',
                elite: null,
                isBoss: false
            };
        }

        // Pick a random monster from the filtered list
        const monster = validMonsters[Math.floor(Math.random() * validMonsters.length)];

        // Roll for elite status using area settings
        const eliteChances = area.eliteChance || { magic: 0.1, rare: 0.02 };
        const roll = Math.random();
        let eliteType = null;

        if (roll < eliteChances.rare) {
            eliteType = 'rare';
        } else if (roll < eliteChances.rare + eliteChances.magic) {
            eliteType = 'magic';
        }

        return {
            monsterId: monster.id,
            elite: eliteType,
            isBoss: false
        };
    }
    
    generatePreviewInfo(encounters, area, mission) {
        const monsterTypes = new Set();
        let hasElites = false;
        
        encounters.forEach(enc => {
            const monster = monsterDB.get(enc.monsterId);
            if (monster) {
                monsterTypes.add(monster.name);
                if (enc.elite) hasElites = true;
            }
        });
        
        const features = [];
        if (hasElites) features.push('Contains elite enemies');
        if (encounters.length >= 4) features.push('Extended mission');
        
        return {
            monsterTypes: Array.from(monsterTypes),
            encounterCount: encounters.length,
            estimatedDanger: 'Unknown',
            notableFeatures: features
        };
    }
}

export const missionGeneration = new MissionGenerationSystem();