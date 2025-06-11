// js/data/items.js
export const itemBases = {
    // === ONE-HANDED WEAPONS ===
    brokenShortSword: {
        name: "Broken Short Sword",
        description: "A rusted blade that has seen better days. Its edge is chipped but still serviceable.",
        slot: "weapon1h",
        category: "sword",
        weaponType: "sword",
        icon: "🗡",
        ilvl: 1,

        // Weapon properties
        attackSpeed: 1.2,
        damageMultiplier: 0.9,

        // Implicit stats
        implicitStats: {
            damage: 8
        },

        // Stat weights for affix generation
        statWeights: {
            damage: 3,
            life: 0.2,
            defense: 1.5,
            attackSpeed: 2
        },

        // Tags for drop system
        tags: ["weapon", "melee", "sword", "1h", "starter"],

        // Visual
        shape: [[1], [1], [1]]  // 1x3 weapon
    },

    jaggedCannibalMachete: {
        name: "Jagged Cannibal Machete",
        description: "A crude but vicious blade, its serrated edge designed to tear rather than slice.",
        slot: "weapon1h",
        category: "sword",
        weaponType: "sword",
        icon: "🗡",
        ilvl: 5,
        requirements: { level: 5 },

        attackSpeed: 1.0,
        damageMultiplier: 1.1,

        implicitStats: {
            damage: 12
        },

        statWeights: {
            damage: 4
        },

        tags: ["weapon", "melee", "sword", "1h", "brutal"],
        shape: [[1], [1], [1]]
    },

    stoneHatchet: {
        name: "Stone Hatchet",
        description: "A primitive tool fashioned from flint and wood, equally suited for chopping wood or bone.",
        slot: "weapon1h",
        category: "axe",
        weaponType: "axe",
        icon: "⛏",
        ilvl: 1,

        attackSpeed: 0.9,
        damageMultiplier: 1.2,

        implicitStats: {
            damage: 12
        },

        statWeights: {
            damage: 4,
            life: 1.2
        },

        tags: ["weapon", "melee", "axe", "1h", "primitive"],
        shape: [[1], [1], [1]]
    },

    ironBar: {
        name: "Iron Bar",
        description: "A heavy rod of cold iron. Simple, brutal, and effective.",
        slot: "weapon1h",
        category: "mace",
        weaponType: "mace",
        icon: "⚒",
        ilvl: 1,

        attackSpeed: 0.75,
        damageMultiplier: 1.1,

        implicitStats: {
            damage: 10,
            defense: 4
        },

        statWeights: {
            damage: 3,
            defense: 2
        },

        tags: ["weapon", "melee", "mace", "1h", "metal", "defensive"],
        shape: [[1], [1], [1]]
    },

    femurClub: {
        name: "Femur Club",
        description: "The thighbone of some great beast, still stained with old blood.",
        slot: "weapon1h",
        category: "mace",
        weaponType: "mace",
        icon: "🦴",
        ilvl: 1,

        attackSpeed: 0.8,
        damageMultiplier: 1.15,

        implicitStats: {
            damage: 11
        },

        statWeights: {
            damage: 3.5,
            life: 1
        },

        tags: ["weapon", "melee", "mace", "1h", "bone", "primitive"],
        shape: [[1], [1], [1]]
    },

    // === TWO-HANDED WEAPONS ===
    gnarledBranch: {
        name: "Gnarled Branch",
        description: "A length of sturdy wood, balanced for both offense and defense.",
        slot: "weapon2h",
        category: "staff",
        weaponType: "staff",
        icon: "|",
        ilvl: 1,

        attackSpeed: 1.0,
        damageMultiplier: 1.1,

        implicitStats: {
            damage: 14
        },

        statWeights: {
            damage: 2,
            defense: 2
        },

        tags: ["weapon", "melee", "staff", "2h", "wooden"],
        shape: [[1], [1], [1], [1]]  // 1x4 for 2H
    },

    boatHook: {
        name: "Boat Hook",
        description: "A long, sharp hook used to pull boats ashore.",
        slot: "weapon2h",
        category: "mace",
        weaponType: "mace",
        icon: "🔨",
        ilvl: 1,

        attackSpeed: 0.8,
        damageMultiplier: 1.2,

        implicitStats: {
            damage: 12,
        },

        statWeights: {
            damage: 3.5,
        },

        tags: ["weapon", "melee", "mace", "2h", "wooden", "primitive"],
        shape: [[1], [1], [1], [1]]
    },


    // === ARMOR ===
    ragTunic: {
        name: "Rag Tunic",
        description: "Threadbare cloth held together by hope and crude stitching.",
        slot: "chest",
        category: "armor",
        armorType: "chest",
        subCategory: "cloth",
        icon: "🎽",
        ilvl: 1,

        defenseMultiplier: 1.0,

        implicitStats: {
            defense: 8
        },

        statWeights: {
            defense: 3,
            life: 2
        },

        tags: ["armor", "defensive", "cloth", "chest", "starter"],
        shape: [[1, 1], [1, 1], [1, 1]]  // 2x3 chest
    },

    patchleatherCap: {
        name: "Patchleather Cap",
        description: "Scraps of leather sewn into a makeshift helm. Better than nothing.",
        slot: "helm",
        category: "armor",
        armorType: "helm",
        subCategory: "leather",
        icon: "🎩",
        ilvl: 1,

        defenseMultiplier: 1.0,

        implicitStats: {
            defense: 6
        },

        statWeights: {
            defense: 2.5,
            life: 1.5
        },

        tags: ["armor", "defensive", "leather", "helm"],
        shape: [[1, 1], [1, 1]]  // 2x2 helm
    },

    ragAndChainCowl: {
        name: "Rag and Chain Cowl",
        description: "Cloth reinforced with rusted chain links. The weight is oddly comforting.",
        slot: "helm",
        category: "armor",
        armorType: "helm",
        subCategory: "hybrid",
        icon: "👑",
        ilvl: 3,

        defenseMultiplier: 1.1,

        implicitStats: {
            defense: 9
        },

        statWeights: {
            defense: 3,
            life: 1
        },

        tags: ["armor", "defensive", "hybrid", "helm"],
        shape: [[1, 1], [1, 1]]
    },

    // === GLOVES ===
    rawhideMittens: {
        name: "Rawhide Mittens",
        description: "Thick hide mittens that restrict dexterity but protect from the cold.",
        slot: "gloves",
        category: "armor",
        armorType: "gloves",
        subCategory: "leather",
        icon: "🧤",
        ilvl: 1,

        defenseMultiplier: 1.0,

        implicitStats: {
            defense: 5
        },

        statWeights: {
            defense: 2,
            attackSpeed: 0.5
        },

        tags: ["armor", "defensive", "leather", "gloves"],
        shape: [[1, 1], [1, 1]]
    },

    // === BOOTS ===
    patchLeatherFootwraps: {
        name: "PatchLeather Footwraps",
        description: "Strips of leather wrapped around the feet. Silent but offering little protection.",
        slot: "boots",
        category: "armor",
        armorType: "boots",
        subCategory: "leather",
        icon: "🥾",
        ilvl: 1,

        defenseMultiplier: 1.0,

        implicitStats: {
            defense: 5,
            moveSpeed: 5
        },

        statWeights: {
            defense: 2,
            moveSpeed: 2
        },

        tags: ["armor", "defensive", "leather", "boots", "swift"],
        shape: [[1, 1], [1, 1]]
    },

    // === ACCESSORIES ===
    stoneRing: {
        name: "Stone Ring",
        description: "A crude ring carved from river stone. Heavy and uncomfortable.",
        slot: "ring",
        category: "accessory",
        jewelryType: "ring",
        icon: "💍",
        ilvl: 1,

        statBonusMultiplier: 1.0,

        implicitStats: {
            life: 5
        },

        statWeights: {
            damage: 1,
            life: 2,
            defense: 1
        },

        tags: ["accessory", "jewelry", "ring", "stone"],
        shape: [[1]]  // 1x1 ring
    },

    woodenRing: {
        name: "Wooden Ring",
        description: "A simple band carved from oak. It smells faintly of the forest.",
        slot: "ring",
        category: "accessory",
        jewelryType: "ring",
        icon: "💍",
        ilvl: 1,

        statBonusMultiplier: 1.0,

        implicitStats: {
            life: 3,
            lightRadius: 5
        },

        statWeights: {
            life: 3,
            lightRadius: 1
        },

        tags: ["accessory", "jewelry", "ring", "wooden", "natural"],
        shape: [[1]]
    },

    bonecharmAmulet: {
        name: "Bonecharm Amulet",
        description: "Small bones and teeth strung on sinew. It rattles softly when you move.",
        slot: "amulet",
        category: "accessory",
        jewelryType: "amulet",
        icon: "📿",
        ilvl: 1,

        statBonusMultiplier: 1.0,

        implicitStats: {
            damage: 2,
            defense: 2
        },

        statWeights: {
            damage: 1.5,
            defense: 1.5,
            life: 1
        },

        tags: ["accessory", "jewelry", "amulet", "bone", "primitive"],
        shape: [[1]]  // 1x1 amulet
    },

    // === BELTS ===
    cordBelt: {
        name: "Cord Belt",
        description: "Rough rope tied around the waist. It chafes, but holds your gear.",
        slot: "belt",
        category: "accessory",
        icon: "▬",
        ilvl: 1,

        implicitStats: {
            life: 8
        },

        statWeights: {
            life: 3,
            defense: 1
        },

        tags: ["accessory", "belt", "cloth"],
        shape: [[1, 1]]  // 2x1 horizontal
    },

    // === SHIELDS ===
    barrelLid: {
        name: "Barrel Lid",
        description: "A discarded barrel top, still smelling of ale. Surprisingly sturdy.",
        slot: "shield",
        category: "shield",
        icon: "🛡",
        ilvl: 1,

        defenseMultiplier: 1.0,

        implicitStats: {
            defense: 10
        },

        statWeights: {
            defense: 4,
            life: 1
        },

        tags: ["shield", "defensive", "wooden", "makeshift"],
        shape: [[1, 1], [1, 1]]  // 2x2 shield
    },

    plankAndRopeArmguard: {
        name: "Plank and Rope Armguard",
        description: "Wooden planks lashed to the forearm. Crude but effective against glancing blows.",
        slot: "shield",
        category: "shield",
        icon: "🛡",
        ilvl: 2,

        defenseMultiplier: 0.8,  // Less effective than proper shield

        implicitStats: {
            defense: 7,
            attackSpeed: 5  // Small shield allows faster attacks
        },

        statWeights: {
            defense: 3,
            attackSpeed: 2
        },

        tags: ["shield", "defensive", "wooden", "makeshift", "light"],
        shape: [[1, 1], [1, 1]]
    }
};