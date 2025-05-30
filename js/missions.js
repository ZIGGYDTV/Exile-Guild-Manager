// Mission definitions
const missions = {
    a1: {
        name: "The Coast",
        difficulty: 150,
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
        damage: { 
            min: 30, max: 55,
            types: { physical: 0.5, fire: 0.5 }
        },
        rewards: {
            gold: { min: 60, max: 90 },
            experience: { min: 40, max: 75 },                
            chaosOrbChance: 0.25,
            exaltedOrbChance: 0.13
        }
    },
    a2: {
        name: "The Mud Flats", 
        difficulty: 300,
        damage: { 
            min: 40, max: 75,
            types: { physical: 1.0 }
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
        damage: { 
            min: 80, max: 140,
            types: { physical: 1.0 }
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
        damage: { 
            min: 150, max: 250,
            types: { physical: 1.0 }
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

