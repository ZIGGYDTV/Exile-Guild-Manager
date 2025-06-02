// Stat definition and management system
export class StatDefinition {
    constructor(name) {
        this.name = name;
        this.ilvlBreakpoints = [];
        this.restrictedToSlots = null;
        this.requiredThemes = null;
    }

    addBreakpoint(ilvl, min, max) {
        this.ilvlBreakpoints.push({ ilvl, min, max });
        // Sort breakpoints by ilvl for efficient lookup
        this.ilvlBreakpoints.sort((a, b) => a.ilvl - b.ilvl);
        return this;
    }

    restrictToSlots(...slots) {
        this.restrictedToSlots = slots;
        return this;
    }

    requireThemes(...themes) {
        this.requiredThemes = themes;
        return this;
    }

    getValueRange(ilvl) {
        // Find highest breakpoint <= ilvl
        for (let i = this.ilvlBreakpoints.length - 1; i >= 0; i--) {
            if (ilvl >= this.ilvlBreakpoints[i].ilvl) {
                return {
                    min: this.ilvlBreakpoints[i].min,
                    max: this.ilvlBreakpoints[i].max
                };
            }
        }
        return this.ilvlBreakpoints[0] || { min: 0, max: 0 };
    }
}

// Central stat management
class StatDatabase {
    constructor() {
        this.stats = new Map();
        this.initializeStats();
    }

    initializeStats() {
        // Core Stats
        this.registerStat(
            new StatDefinition('Life')
                .addBreakpoint(1, 10, 20)
                .addBreakpoint(5, 12, 25)
                .addBreakpoint(10, 15, 30)
                .addBreakpoint(15, 18, 36)
                .addBreakpoint(20, 22, 44)
        );

        this.registerStat(
            new StatDefinition('Damage')
                .addBreakpoint(1, 3, 7)
                .addBreakpoint(5, 6, 12)
                .addBreakpoint(10, 11, 19)
                .addBreakpoint(15, 15, 24)
                .addBreakpoint(20, 20, 36)
        );

        this.registerStat(
            new StatDefinition('Defense')
                .addBreakpoint(1, 3, 12)
                .addBreakpoint(5, 4, 15)
                .addBreakpoint(10, 5, 20)
                .addBreakpoint(15, 6, 24)
                .addBreakpoint(20, 8, 32)
        );

        // Utility Stats
        this.registerStat(
            new StatDefinition('Light Radius')
                .addBreakpoint(1, 10, 50)
                .addBreakpoint(5, 12, 60)
                .addBreakpoint(10, 15, 65)
                .addBreakpoint(15, 18, 70)
                .addBreakpoint(20, 22, 75)
                .restrictToSlots('helmet')
        );

        this.registerStat(
            new StatDefinition('Movement Speed')
                .addBreakpoint(1, 10, 30)
                .addBreakpoint(5, 12, 35)
                .addBreakpoint(10, 15, 40)
                .addBreakpoint(15, 18, 50)
                .addBreakpoint(20, 22, 60)
                .restrictToSlots('boots')

        );

        // Resistances (adjusted values)
        this.registerStat(
            new StatDefinition('Fire Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(5, 8, 15)
                .addBreakpoint(10, 10, 20)
                .addBreakpoint(15, 12, 25)
                .addBreakpoint(20, 15, 30)
        );

        this.registerStat(
            new StatDefinition('Cold Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(5, 8, 15)
                .addBreakpoint(10, 10, 20)
                .addBreakpoint(15, 12, 25)
                .addBreakpoint(20, 15, 30)
        );

        this.registerStat(
            new StatDefinition('Lightning Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(5, 8, 15)
                .addBreakpoint(10, 10, 20)
                .addBreakpoint(15, 12, 25)
                .addBreakpoint(20, 15, 30)
        );

        this.registerStat(
            new StatDefinition('Chaos Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(5, 8, 15)
                .addBreakpoint(10, 10, 20)
                .addBreakpoint(15, 12, 25)
                .addBreakpoint(20, 15, 30)
        );

        // Theme-specific stats
        this.registerStat(
            new StatDefinition('Crab Armor')
                .addBreakpoint(5, 12, 35)
                .addBreakpoint(10, 15, 40)
                .addBreakpoint(15, 18, 45)
                .addBreakpoint(20, 22, 50)
                .requireThemes('crab')
                .restrictToSlots('helmet', 'chest', 'gloves', 'boots', 'shield')
        );
    }

    registerStat(statDefinition) {
        this.stats.set(statDefinition.name.toLowerCase(), statDefinition);
        return this;
    }

    getStat(statName) {
        return this.stats.get(statName.toLowerCase());
    }

    getAllStats() {
        return Array.from(this.stats.values());
    }

    // Get stats available for a specific slot
    getStatsForSlot(slot) {
        return this.getAllStats().filter(stat => 
            !stat.restrictedToSlots || stat.restrictedToSlots.includes(slot)
        );
    }

    // Get stats available for specific themes
    getStatsForThemes(themes) {
        return this.getAllStats().filter(stat =>
            !stat.requiredThemes || stat.requiredThemes.some(theme => themes.includes(theme))
        );
    }

    // Calculate stat scaling multiplier based on item level
    calculateIlvlMultiplier(ilvl) {
        return 1 + (ilvl - 1) * 0.05; // 5% per ilvl above 1
    }

    // Get stat range for a specific stat at a given item level
    getStatRangeForIlvl(statDef, ilvl) {
        const breakpoints = statDef.ilvlBreakpoints;
        if (!breakpoints) {
            // Fallback for old baseRange format
            return statDef.baseRange;
        }

        // Find highest breakpoint <= ilvl
        for (let i = breakpoints.length - 1; i >= 0; i--) {
            if (ilvl >= breakpoints[i].ilvl) {
                return { min: breakpoints[i].min, max: breakpoints[i].max };
            }
        }

        // Fallback to first breakpoint
        return { min: breakpoints[0].min, max: breakpoints[0].max };
    }
}

// Export a singleton instance
export const statDB = new StatDatabase(); 