TO DO:

# Ideas
- Partial loot on fial, run out of portals
- sim life recovery for building around attrition deaths
    - design content that rewards this build by being dangerous for attritiion but not one shotty
- in addition to morale xp penalty for low level zones

# Bugs
- Capital on classname
- supposed to be 1 decimal for damage taken (death maybe isnt doing it?)
- "in the warden"
- passive allocation generating two of the same passive
- Can close out of passive alloction (want it to be commitment)
- Allocated a keystone at level 7 (supposed to be every 10)
    // Filter out already allocated passives
    const available = pool.filter(passive => 
        !gameState.exile.passives.allocated.includes(passive.id)
    ); 
    // running out of passives to allocate so are we allocating the remaining keystones early? We should add that Normal passives can be repeated and ensure ensure enough Notables for 50 levels? YEP CONFIRMED RUNNING OUT OF PASSIVES LOL
- Lost remaining health report on max hit taken calc 

https://medium.com/@EclecticCoder/manage-todo-list-in-vscode-beb53774d776


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



# Ideas
- Auction house with simulated non-responding traders
- last epoch crafting combo
    - break down items for an affix shard
    - unique modifiers via shards?

TIPS FORM CHAT

f u want to "auto indent" u can ctrl shift P and search for format, u can use a extension called prettier. and later on u can also auto format on save 

BOW https://i.imgur.com/Y81WrBY.png


you can use css variables to use colors (ask claude about naming colors)