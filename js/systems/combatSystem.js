// Combat System - Handles all combat calculations and simulation
class CombatSystem {
    constructor() {
        // Combat system initialization if needed
    }

    // Combat Simulation For Missions
    simulateCombat(exile, missionData) {
        const combatData = {
            exile: exile,
            mission: missionData,
            rounds: 0,
            damageLog: [],
            heaviestHit: 0,
            totalDamageTaken: 0,
            outcome: null, // 'victory', 'death', 'retreat'
            deathType: null // 'oneshot', 'outclassed_barely', etc.
        };

        // Calculate win chance per round using new format
        const powerAdvantage = this.calculatePowerRating(exile) / missionData.difficulty;

        // New formula with gentler curve and 5% floor
        let winChancePerRound;
        if (powerAdvantage <= 0) {
            winChancePerRound = 0.05; // 5% floor
        } else if (powerAdvantage < 1) {
            // For underpowered: linear scale from 5% to 15%
            // At 0.5x power = 10%, at 0.667x power = 11.7%, at 1x power = 15%
            winChancePerRound = 0.05 + (powerAdvantage * 0.10);
        } else {
            // For overpowered: logarithmic curve from 15% to 90% cap
            // This maintains the feeling of diminishing returns when overpowered
            const scaledAdvantage = Math.log(powerAdvantage) / Math.log(3); // 0 at 1x, 1 at 3x
            winChancePerRound = Math.min(0.9, 0.15 + (scaledAdvantage * 0.75));
        }

        // Ensure minimum 5% chance
        winChancePerRound = Math.max(0.05, winChancePerRound);

        let currentLife = exile.stats.life;
        const maxRounds = 10;

        while (currentLife > 0 && combatData.rounds < maxRounds) {
            combatData.rounds++;

            // Mission attacks using new damage format
            const damageRoll = game.randomBetween(missionData.damage.min, missionData.damage.max);
            const damageResult = this.calculateDamageReduction(damageRoll, exile, missionData);
            const damageTaken = damageResult.damage;

            currentLife -= damageTaken;
            combatData.totalDamageTaken += damageTaken;
            if (damageTaken > combatData.heaviestHit) {
                combatData.heaviestHit = damageTaken;
                combatData.heaviestHitBreakdown = damageResult.breakdown;
            }

            combatData.damageLog.push({
                round: combatData.rounds,
                rawDamage: damageRoll,
                actualDamage: damageTaken,
                breakdown: damageResult.breakdown,
                lifeRemaining: Math.max(0, currentLife)
            });

            // Check for death
            if (currentLife <= 0) {
                console.log("EXILE DEATH DETECTED in combat!");  // DEBUG
                combatData.outcome = 'death';
                combatData.deathType = this.classifyDeath(combatData, winChancePerRound);
                game.lastDeathMission = missionData.name;
                break;
            }

            // Check for early retreat
            if (currentLife > 0 && currentLife < exile.stats.life * 0.2 && Math.random() < 0.65) {
                combatData.outcome = 'retreat';
                break;
            }

            // Check for victory
            if (Math.random() < winChancePerRound) {
                combatData.outcome = 'victory';
                break;
            }
        }

        // Handle timeout
        if (combatData.rounds >= maxRounds && combatData.outcome === null) {
            combatData.outcome = 'retreat';
        }

        // Add winChancePerRound to the combatData object before returning
        combatData.winChancePerRound = winChancePerRound;
        return combatData;
    }

    //  Damage Calcs for Mission + Log
    calculateDamageReduction(rawDamage, exile, missionData) {
        // New world system always has damage.types
        const damageTypes = missionData.damage.types;

        let totalDamageAfterReduction = 0;
        const breakdown = [];

        Object.entries(damageTypes).forEach(([damageType, percentage]) => {
            const typeDamage = rawDamage * percentage;
            let reducedDamage = typeDamage;
            let reductionMethod = '';

            if (damageType === 'physical') {
                reducedDamage = Math.max(1, typeDamage * (1 - exile.stats.defense / 200) - exile.stats.defense / 4);
                const reductionPercent = Math.round((1 - reducedDamage / typeDamage) * 100);
                reductionMethod = `${reductionPercent}% reduced`;
            } else {
                const resistance = exile.stats[damageType + 'Resist'] || 0;
                reducedDamage = typeDamage * (1 - resistance / 100);
                reductionMethod = `${resistance}% resisted`;
            }

            breakdown.push({
                type: damageType,
                raw: typeDamage,
                final: reducedDamage,
                method: reductionMethod
            });

            totalDamageAfterReduction += reducedDamage;
        });

        return {
            damage: Math.max(1, totalDamageAfterReduction),
            breakdown: breakdown
        };
    }

    calculatePowerRating(exile = null) {
        // Default to current exile if not provided
        if (!exile) {
            exile = getCurrentExile();
            if (!exile) return 0;
        }
        
        const stats = exile.stats;
    
        // Calculate DPS: Damage × Attack Speed
        const dps = stats.damage * stats.attackSpeed;
    
        // 1:1 conversion: 1 DPS = 1 Power Rating
        return Math.floor(dps);
    }

    classifyDeath(combatData, winChancePerRound) {
        const { rounds, heaviestHit, exile } = combatData;

        // Check for one-shot
        if (rounds === 1 && heaviestHit >= exile.stats.life) {
            return 'oneshot';
        }

        // Classify by how outclassed they were
        if (winChancePerRound >= 0.15) {
            return 'outclassed_barely';
        } else if (winChancePerRound >= 0.05) {
            return 'outclassed_significantly';
        } else if (winChancePerRound > 0) {
            return 'outclassed_completely';
        } else {
            return 'suicide';
        }
    }

    generateDeathMessage(combatData) {
        const { exile, mission, rounds, heaviestHit, deathType } = combatData;
        const name = exile.name;
        const missionName = mission.name;

        switch (deathType) {
            case 'oneshot':
                return `☠ ${name} was obliterated in ${missionName}! (${heaviestHit} damage in one hit)`;
            case 'outclassed_barely':
                return `☠ ${name} fell after a hard-fought battle in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
            case 'outclassed_significantly':
                return `☠ ${name} was overwhelmed in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
            case 'outclassed_completely':
                return `☠ ${name} was brutally destroyed in ${missionName} (${rounds} rounds, ${heaviestHit} heaviest hit)`;
            case 'suicide':
                return `☠ ${name} had no chance in ${missionName} and was swiftly executed (${rounds} round${rounds > 1 ? 's' : ''})`;
            default:
                return `☠ ${name} has died in ${missionName}!`;
        }
    }
}

// Create the global combat system instance
const combatSystem = new CombatSystem();
export { combatSystem };