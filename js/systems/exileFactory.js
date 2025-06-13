// Exile Factory - Creates new exile objects
const exileFactory = {
    // Create a new exile with default or specified options
    createExile(options = {}) {
        const id = gameState.nextExileId++;
        const className = options.class || this.randomClass();
        const classData = classDefinitions[className];

        if (!classData) {
            console.error(`Class ${className} not found!`);
            return null;
        }

        const exile = {
            // === IDENTITY ===
            id: id,
            name: options.name || nameGenerator.generateName(),
            class: className,

            // === PROGRESSION ===
            level: options.level || 1,
            experience: 0,
            experienceNeeded: 100,

            // === STATUS ===
            status: 'idle', // idle, resting, assigned, in_mission, dead
            morale: options.morale || 75,
            currentVitality: classData.baseStats.vitality,
            maxVitality: classData.baseStats.vitality,

            // === HEALTH ===
            currentHp: classData.baseStats.life,
            maxHp: classData.baseStats.life,

            // === ASSIGNMENT ===
            currentAssignment: null, // { areaId, missionId }

            // === STATS ===
            stats: {
                // Combat stats
                life: classData.baseStats.life,
                damage: classData.baseStats.damage,
                defense: classData.baseStats.defense,
                attackSpeed: 1.0,

                // Healing Stats
                lifeRegen: classData.baseStats.lifeRegen || 0,
                lifeGainOnHit: classData.baseStats.lifeGainOnHit || 0,
                lifeLeech: classData.baseStats.lifeLeech || 0,

                // Resistances
                fireResist: 0,
                coldResist: 0,
                lightningResist: 0,
                chaosResist: 0,

                // Utility stats
                moveSpeed: 1.0,
                goldFindBonus: 0,
                escapeChance: 0,
                moraleResistance: 0,
                moraleGain: 0,
                scoutingBonus: 1.0,
                lightRadius: 0
            },

            // Base stats from class (for recalculation)
            baseStats: {
                ...classData.baseStats,
                vitality: classData.baseStats.vitality
            },

            // === PASSIVES ===
            passives: {
                allocated: [],
                pendingPoints: options.startingPoints || 1,
                rerollsUsed: 0
            },

            // === EQUIPMENT ===
            equipment: {
                weapon: null,
                helmet: null,
                chest: null,
                gloves: null,
                boots: null,
                shield: null,
                ring1: null,
                ring2: null,
                amulet: null,
                belt: null
            },

            // === HISTORY ===
            history: {
                missionsCompleted: 0,
                missionsRetreated: 0,
                kills: 0,
                damageDealt: 0,
                damageTaken: 0,
                goldEarned: 0,
                joinedOnTurn: turnState.currentTurn
            }
        };

        // Apply any starting equipment
        if (options.equipment) {
            Object.assign(exile.equipment, options.equipment);
        }

        // Apply any starting passives
        if (options.passives) {
            exile.passives.allocated = options.passives;
            exile.passives.pendingPoints = Math.max(0, exile.passives.pendingPoints - options.passives.length);
        }

        return exile;
    },

    // Get random class
    randomClass() {
        const classes = Object.keys(classDefinitions);
        return classes[Math.floor(Math.random() * classes.length)];
    },

    // Create a test exile with some progression
    createTestExile(level = 5) {
        const exile = this.createExile({
            level: level,
            startingPoints: 0 
        });

        // Give them some passives
        const passiveCount = Math.min(level, 5);
        for (let i = 0; i < passiveCount; i++) {
            const tier = i % 4 === 0 ? 'notable' : 'normal';
            const available = passiveHelpers.getPassivesByTier(tier)
                .filter(p => !exile.passives.allocated.includes(p.id));

            if (available.length > 0) {
                const passive = available[Math.floor(Math.random() * available.length)];
                exile.passives.allocated.push(passive.id);
            }
        }

        // Set appropriate experience
        exile.experience = 0;
        exile.experienceNeeded = level * 100;

        // Update HP for level
        exile.baseStats.life += (level - 1) * 10;
        exile.baseStats.vitality += (level - 1) * 10;
        exile.stats.life = exile.baseStats.life;
        exile.currentHp = exile.stats.life;
        exile.maxHp = exile.stats.life;
        exile.currentVitality = exile.baseStats.vitality; 
        exile.maxVitality = exile.baseStats.vitality;      

        return exile;
    },

    // // Restore an exile from saved data
    // restoreExile(savedData) {
    //     // This ensures we have all properties even if save is from older version
    //     const defaultExile = this.createExile({ 
    //         name: savedData.name,
    //         class: savedData.class 
    //     });

    //     // Merge saved data over defaults
    //     return Object.assign(defaultExile, savedData);
    // }
};

// Make available globally
window.exileFactory = exileFactory;