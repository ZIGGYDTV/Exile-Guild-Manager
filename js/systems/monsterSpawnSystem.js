// Monster Spawn System
// Handles spawning monsters with appropriate elite status based on area/mission

export class MonsterSpawnSystem {
    constructor() {
        console.log("Monster spawn system initialized");
    }

    // Calculate final elite chances based on area and mission
    calculateEliteChances(areaId, missionId) {
        const area = getAreaData(areaId);
        const mission = getMissionData(areaId, missionId);
        
        // Start with area base chances
        let chances = area?.eliteChance || { magic: 0.05, rare: 0.01 };
        
        // If mission has explicit elite chances, use those instead
        if (mission?.eliteChance) {
            chances = { ...mission.eliteChance };
        }
        // Otherwise just use area defaults (no need for mission type modifiers)
        
        // Cap chances at reasonable maximum
        chances.magic = Math.min(chances.magic, 0.8);
        chances.rare = Math.min(chances.rare, 0.5);
        
        return chances;
    }

    // Rest of the class remains the same...
    rollEliteStatus(chances) {
        const roll = Math.random();
        
        // Check rare first (rarer = priority)
        if (roll < chances.rare) {
            return 'rare';
        } else if (roll < chances.rare + chances.magic) {
            return 'magic';
        }
        
        return null; // Normal monster
    }

    spawnMonster(monsterId, areaId, missionId, forceElite = null) {
        // Get base monster
        const baseMonster = monsterDB.get(monsterId);
        if (!baseMonster) {
            console.error(`Monster ${monsterId} not found!`);
            return null;
        }
        
        // Determine elite status
        let eliteType = forceElite; // Allow forcing for special encounters
        
        if (!eliteType && areaId && missionId) {
            const chances = this.calculateEliteChances(areaId, missionId);
            eliteType = this.rollEliteStatus(chances);
        }
        
        // Spawn the monster
        const spawnOptions = {
            elite: eliteType
        };
        
        return monsterDB.spawn(monsterId, spawnOptions);
    }

    spawnEncounter(monsterIds, areaId, missionId) {
        const encounter = [];
        
        for (const monsterId of monsterIds) {
            const monster = this.spawnMonster(monsterId, areaId, missionId);
            if (monster) {
                encounter.push(monster);
            }
        }
        
        return encounter;
    }
}

// Export singleton instance
export const monsterSpawnSystem = new MonsterSpawnSystem();