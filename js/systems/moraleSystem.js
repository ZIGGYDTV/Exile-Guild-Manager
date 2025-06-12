class MoraleSystem {
    // Get morale status text
    getMoraleStatus(morale) {
        if (morale >= 90) return "Confident";
        if (morale >= 70) return "Content";
        if (morale >= 50) return "Discouraged";
        if (morale >= 25) return "Demoralized";
        if (morale >= 10) return "Wavering";
        return "Broken";
    }

    // Create morale tooltip text
    createMoraleTooltip(morale) {
        let tooltip = `Morale: ${morale}/100\n`;
        tooltip += `―――――――――――――――\n`;

        if (morale >= 90) {
            tooltip += "Confident:\n";
            tooltip += "+10% Damage\n";
            tooltip += "+5% Defense";
        } else if (morale >= 70) {
            tooltip += "Content:\n";
            tooltip += "No bonuses or penalties";
        } else if (morale >= 50) {
            tooltip += "Discouraged:\n";
            tooltip += "-5% Damage";
        } else if (morale >= 25) {
            tooltip += "Demoralized:\n";
            tooltip += "-10% Damage\n";
            tooltip += "-5% Defense";
        } else {
            tooltip += "Broken:\n";
            tooltip += "-20% Damage\n";
            tooltip += "-10% Defense";
        }

        return tooltip;
    }

    // Calculate morale change from combat results
    calculateMoraleChange(combatResult, exile) {
        // Get morale resistance (can be negative)
        const moraleResist = (exile.stats.moraleResistance || 0) / 100;
        const moraleGain = exile.stats.moraleGain || 0;

        let result;
        if (combatResult.outcome === 'victory') {
            const lifePercent = (exile.stats.life - combatResult.totalDamageTaken) / exile.stats.life;
            if (lifePercent <= 0.05) {
                result = { change: -4, message: "Nah... that was too bloody close it aint fun no more." };
            } else if (lifePercent <= 0.15) {
                result = { change: +6, message: "My heart races, I feel... ALIVE!" };
            } else if (lifePercent <= 0.3) {
                result = { change: +4, message: "Hah! A good challenge!" };
            } else if (lifePercent >= 0.95 && combatResult.winChancePerRound >= 0.30) {
                result = { change: -4, message: "This is beneath me..." };
            } else if (lifePercent >= 0.90) {
                result = { change: -2, message: "This is too easy, I need a real challenge!" };
            } else {
                result = { change: +1, message: "A fair and reasonable fight." };
            }
        } else if (combatResult.outcome === 'retreat') {
            if (combatResult.rounds >= 8) {
                result = { change: +3, message: "Phew that was a close one, but I did it!" };
            } else if (combatResult.rounds >= 5) {
                result = { change: -2, message: "Ah, I'm not on my game today..." };
            } else {
                result = { change: -4, message: "This is just embarrassing..." };
            }
        } else {
            // Death - no morale change since exile is dead
            return { change: 0, message: "" };
        }

        // Apply morale resistance scaling (works both positive and negative)
        let adjustedChange = result.change;
        if (adjustedChange !== 0 && moraleResist !== 0) {
            adjustedChange = Math.round(adjustedChange * (1 + moraleResist));
            if (adjustedChange === 0 && result.change !== 0) {
                adjustedChange = result.change > 0 ? 1 : -1;
            }
        }

        // Apply flat morale gain/penalty
        adjustedChange += moraleGain;

        return { change: adjustedChange, message: result.message };
    }
}

// Create singleton instance
const moraleSystem = new MoraleSystem();

// Export for module use
export { moraleSystem };
