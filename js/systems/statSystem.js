// Stat definition and management system
class StatDefinition {
    constructor(name, displayName = null) {
        this.name = name;
        this.displayName = displayName || name; 
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

    requireThemes(...themes) {      // ? THIS IS CALLED A SETTER (as opposed to a getter)
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
            new StatDefinition('life', 'Life')
                .addBreakpoint(1, 9, 18)
                .addBreakpoint(3, 12, 22)
                .addBreakpoint(5, 15, 26)
                .addBreakpoint(7, 18, 30)
                .addBreakpoint(9, 22, 34)
                .addBreakpoint(11, 26, 38)
                .addBreakpoint(13, 30, 42)
                .addBreakpoint(15, 34, 46)
                .addBreakpoint(17, 38, 50)
                .addBreakpoint(19, 42, 54)
                .addBreakpoint(21, 46, 58)
                
        );

        this.registerStat(
            new StatDefinition('damage', 'Damage')
                .addBreakpoint(1, 3, 5)
                .addBreakpoint(3, 5, 7)
                .addBreakpoint(5, 6, 12)
                .addBreakpoint(7, 8, 14)
                .addBreakpoint(9, 10, 16)
                .addBreakpoint(11, 12, 18)
                .addBreakpoint(13, 14, 20)
                .addBreakpoint(15, 15, 22)
                .addBreakpoint(17, 16, 24)
                .addBreakpoint(19, 18, 26)
                .addBreakpoint(21, 20, 28)
                
        );
        
        this.registerStat(
            new StatDefinition('attackSpeed', 'Increased Attack Speed')
                .addBreakpoint(1, 5, 9)
                .addBreakpoint(3, 7, 12)
                .addBreakpoint(5, 9, 17)
                .addBreakpoint(7, 11, 21)
                .addBreakpoint(9, 13, 25)
                .addBreakpoint(11, 15, 29)
                .addBreakpoint(13, 17, 33)
                .addBreakpoint(15, 19, 37)
                .addBreakpoint(17, 21, 41)
                .addBreakpoint(19, 23, 45)
                .addBreakpoint(21, 25, 49)
                .restrictToSlots('weapon', 'gloves')
        );

        this.registerStat(
            new StatDefinition('defense', 'Defense')
                .addBreakpoint(1, 3, 10)
                .addBreakpoint(3, 5, 12)
                .addBreakpoint(5, 4, 15)
                .addBreakpoint(7, 6, 18)
                .addBreakpoint(9, 8, 20)
                .addBreakpoint(11, 10, 22)
                .addBreakpoint(13, 12, 24)
                .addBreakpoint(15, 14, 26)
                .addBreakpoint(17, 16, 28)
                .addBreakpoint(19, 18, 30)
                .addBreakpoint(21, 20, 32)
        );

        // Utility Stats
        this.registerStat(
            new StatDefinition('lightRadius', 'Light Radius')
                .addBreakpoint(1, 20, 30)
                .addBreakpoint(3, 22, 35)
                .addBreakpoint(5, 24, 40)
                .addBreakpoint(7, 26, 45)
                .addBreakpoint(9, 28, 50)
                .addBreakpoint(11, 30, 55)
                .addBreakpoint(13, 32, 60)
                .addBreakpoint(15, 34, 65)
                .addBreakpoint(17, 36, 70)
                .addBreakpoint(19, 38, 75)
                .addBreakpoint(21, 40, 80)
                .restrictToSlots('helmet')
        );

        this.registerStat(
            new StatDefinition('moveSpeed', 'Movement Speed')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(3, 7, 12)
                .addBreakpoint(5, 9, 14)
                .addBreakpoint(7, 11, 16)
                .addBreakpoint(9, 13, 18)
                .addBreakpoint(11, 15, 20)
                .addBreakpoint(13, 17, 22)
                .addBreakpoint(15, 19, 24)
                .addBreakpoint(17, 21, 26)
                .addBreakpoint(19, 23, 28)
                .addBreakpoint(21, 25, 30)
                .restrictToSlots('boots')

        );

        this.registerStat(
            new StatDefinition('fireResist', 'Fire Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(3, 7, 12)
                .addBreakpoint(5, 9, 14)
                .addBreakpoint(7, 11, 16)
                .addBreakpoint(9, 13, 18)
                .addBreakpoint(11, 15, 20)
                .addBreakpoint(13, 17, 22)
                .addBreakpoint(15, 19, 24)
                .addBreakpoint(17, 21, 26)
                .addBreakpoint(19, 23, 28)
                .addBreakpoint(21, 25, 30)
        );

        this.registerStat(
            new StatDefinition('coldResist', 'Cold Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(3, 7, 12)
                .addBreakpoint(5, 9, 14)
                .addBreakpoint(7, 11, 16)
                .addBreakpoint(9, 13, 18)
                .addBreakpoint(11, 15, 20)
                .addBreakpoint(13, 17, 22)
                .addBreakpoint(15, 19, 24)
                .addBreakpoint(17, 21, 26)
                .addBreakpoint(19, 23, 28)
                .addBreakpoint(21, 25, 30)
        );

        this.registerStat(
            new StatDefinition('lightningResist', 'Lightning Resistance')
                .addBreakpoint(1, 5, 10)
                .addBreakpoint(3, 7, 12)
                .addBreakpoint(5, 9, 14)
                .addBreakpoint(7, 11, 16)
                .addBreakpoint(9, 13, 18)
                .addBreakpoint(11, 15, 20)
                .addBreakpoint(13, 17, 22)
                .addBreakpoint(15, 19, 24)
                .addBreakpoint(17, 21, 26)
                .addBreakpoint(19, 23, 28)
                .addBreakpoint(21, 25, 30)
        );

        this.registerStat(
            new StatDefinition('chaosResist', 'Chaos Resistance')
                .addBreakpoint(5, 8, 15)
                .addBreakpoint(7, 10, 17)
                .addBreakpoint(9, 12, 19)
                .addBreakpoint(11, 14, 21)
                .addBreakpoint(13, 16, 23)
                .addBreakpoint(15, 18, 25)
                .addBreakpoint(17, 20, 27)
                .addBreakpoint(19, 22, 29)
                .addBreakpoint(21, 24, 31)
                .restrictToSlots('ring', 'amulet')
        );

        // Theme-specific stats
        this.registerStat(
            new StatDefinition('crabArmor', 'Crab Armor')
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