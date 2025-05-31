// Difficulty and Gear Drop Chance (Change to Zone Specific in the Future?)
const difficultyConfig = {
    easy: {
        gearDropChance: 0.4, 
        name: 'Easy'
    },
    medium: {
        gearDropChance: 0.45,
        name: 'Medium'
    },
    hard: {
        gearDropChance: 0.65,
        name: 'Hard'
    },
    nightmare: {
        gearDropChance: 0.75,
        name: 'Nightmare'
    }
};

// Helper function to get difficulty config (defaults to easy if undef)
const getDifficultyConfig = (difficulty) => {
    return difficultyConfig[difficulty] || difficultyConfig.easy;
};

// End Difficulties


// Mission definitions
const missions = {
    a1: {
        name: "The Coast",
        difficulty: 150,
        ilvl: 1,
        themes: [],  
        damage: { 
            min: 10, max: 35,
            types: { physical: 1.0 }
        },
        rewards: {
            gold: { min: 5, max: 15 },
            experience: { min: 25, max: 50 },              
            chaosOrbChance: 0.05,
            exaltedOrbChance: 0.01
        }
    },
     a1b: {
        name: "The Fire Fury", 
        difficulty: 400,
        ilvl: 5,
        themes: [],  
        damage: { 
            min: 30, max: 55,
            types: { physical: 0.1, fire: 0.9 }
        },
        rewards: {
            gold: { min: 50, max: 80 },
            experience: { min: 40, max: 75 },                
            chaosOrbChance: 0.25,
            exaltedOrbChance: 0.16
        }
    },
    a2: {
        name: "The Mud Flats", 
        difficulty: 300,
        ilvl: 7,
        themes: [],  
        damage: { 
            min: 40, max: 75,
            types: { physical: 0.8, chaos: 0.2 }
        },
        rewards: {
            gold: { min: 20, max: 40 },
            experience: { min: 35, max: 65 },               
            chaosOrbChance: 0.15,
            exaltedOrbChance: 0.03
        }
    },
    a3: {
        name: "The Climb",
        difficulty: 500,
        ilvl: 10,
        themes: [],  
        damage: { 
            min: 80, max: 140,
            types: { physical: 0.6, lightning: 0.4 }
        },
        rewards: {
            gold: { min: 50, max: 100 },
            experience: { min: 90, max: 160 },               
            chaosOrbChance: 0.30,
            exaltedOrbChance: 0.08
        }
    },
    a4: {
        name: "The Prison",
        difficulty: 800,
        ilvl: 13,
        themes: [], 
        damage: { 
            min: 150, max: 250,
            types: { physical: 0.6, cold: 0.4 }
        },
        rewards: {
            gold: { min: 100, max: 200 },
            experience: { min: 180, max: 280 },
            chaosOrbChance: 0.50,
            exaltedOrbChance: 0.15
        }
    },
    a4b: {
        name: "The Warden",
        difficulty: 1000,
        ilvl: 15,
        themes: [], 
        damage: { 
            min: 150, max: 400,
            types: { physical: 1.0 }
        },
        rewards: {
            gold: { min: 150, max: 999 },
            experience: { min: 250, max: 400 },
            chaosOrbChance: 2.5,
            exaltedOrbChance: 0.50
        }
    }        
};

