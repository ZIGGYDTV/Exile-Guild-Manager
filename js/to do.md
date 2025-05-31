TO DO:

# Critical
- Missions are not currently mapped to difficulties, but drop chance is (defaults to easy right now), rip it out and replace with zone specific reward factors for more fun control over what missions can do.

# Ideas
- Partial loot on fial, run out of portals
- sim life recovery for building around attrition deaths
    - design content that rewards this build by being dangerous for attritiion but not one shotty
- in addition to morale xp penalty for low level zones

# Bugs
- "in the warden"
- Lost remaining health report on max hit taken calc 

https://medium.com/@EclecticCoder/manage-todo-list-in-vscode-beb53774d776


# code cleanup
Removing Old Format Support from checkForDiscoveries in worldSystem.js
Remove the string format compatibility if you're converting everything to the new chance-based format:

// REMOVE this entire block:
if (typeof unlockEntry === 'string') {
    target = unlockEntry;
    chance = 1.0;
} else {
    target = unlockEntry.target;
    chance = unlockEntry.chance;
}

// REPLACE with just:
const target = unlockEntry.target;
const chance = unlockEntry.chance;

But make sure to convert any remaining string-format unlocks first! (I think its done but double check)


# Improvements
- Log entries should be combined for single map actions
- drop rates for gear isnt based on mission type?
- Random starting passive for each character with biasing based on class
- Reroll button needs current gold near it.
- xp display on exile summary
- Player damage is just "Damage", get it using same system as missions?
- Add permanent tracking of scouting info for missions  
    - Add more scouting info options
    - Add Scouting stat / skills / class
    - !IMPORTANT add scouting info to log on fail, very limited atm
- Crafting popup for items (lil craft button for window)
    - needs to show current currency not vis in exile screen
- Gear type drop weightings and gear drop quant per mission
    - can only be 1 item per mission right now? Weighting adds to 1 can't just apply multipliers (fine for 1 item max?)


# Ideas
- Auction house with simulated non-responding traders
- last epoch crafting combo
    - break down items for an affix shard
    - unique modifiers via shards?


# Systems Documentation
## Combat Power / Mission Win Chance
const powerAdvantage = this.calculatePowerRating(exile) / missionData.difficulty;   
    // Exile's power ratio, pure damage. Defenses determine survival to apply that power. Kinda works?
    // exile power much higher than mission? Big number.
const winChancePerRound = Math.min(0.4, powerAdvantage * 0.15);
    // Foruma for win chance %, capped at 40% per round. 
    // if you have 3x the mission power chance of death ~0.006. Win in 10 rounds 99.4%.

const maxRounds = 10;       
    // retreat if dont win in 10 rounds 
    // (requires being pretty tanky to survive that long, tuning lower = less attrition deaths) 



TIPS FORM CHAT

f u want to "auto indent" u can ctrl shift P and search for format, u can use a extension called prettier. and later on u can also auto format on save 

BOW https://i.imgur.com/Y81WrBY.png


you can use css variables to use colors (ask claude about naming colors)


HodgeBoi: you should really ask the AI to explain "variable scope", a really important thing to understand