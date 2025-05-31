const nameGenerator = {
    // Basic name pools
    prefixes: [
        "Iron", "Storm", "Shadow", "Blood", "Frost",
        "Dawn", "Dusk", "Night", "Fire", "Soul",
        "Raven", "Wolf", "Dragon", "Star", "Moon",
        "Grim", "Dark", "Light", "Death", "Life", "Grim"
    ],
    
    names: [
        "Slayer", "Hunter", "Walker", "Seeker", "Blade",
        "Heart", "Spirit", "Fang", "Claw", "Eye",
        "Bane", "Fury", "Rage", "Peace", "Hope",
        "Dream", "Song", "Voice", "Hand", "Mind", "Jaw",
    ],

    // Generate a random name
    generateName() {
        const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        const name = this.names[Math.floor(Math.random() * this.names.length)];
        return `${prefix}${name}`;
    }
};
