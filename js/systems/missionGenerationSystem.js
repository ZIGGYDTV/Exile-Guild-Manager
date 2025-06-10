// js/systems/missionGenerationSystem.js
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
            exploration: { min: 2, max: 4 },
            scavenging: { min: 1, max: 3 },
            hunting: { min: 2, max: 3 },
            raid: { min: 3, max: 5 },
            boss: { min: 1, max: 1 }
        };
        
        const range = counts[missionType] || { min: 2, max: 4 };
        return game.randomBetween(range.min, range.max);
    }
    
    generateEncounter(area, mission, encounterNum, totalEncounters) {
        // For now, just use hardcoded monster IDs since the tag system isn't set up
        const monsterOptions = ['corpsecrab', 'cannibal_scout'];
        const monsterId = monsterOptions[Math.floor(Math.random() * monsterOptions.length)];
        
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
            monsterId: monsterId,
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