// Game Data Configuration

const GAME_CONSTANTS = {
  STARTING_HEALTH: 20,
  STARTING_TOKENS: 2,
  MAX_ROLLS: 3,
  PASA_COUNT: 6,
  MIN_SCREEN_WIDTH: 1280,
  MIN_SCREEN_HEIGHT: 720
};

// Pasa (Dice) Configuration - 6 dice with 6 faces each
const PASA_SET = [
  {
    id: 1,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "bhala", yagya: true }
    ]
  },
  {
    id: 2,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "teer", yagya: true }
    ]
  },
  {
    id: 3,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "kavach", yagya: true }
    ]
  },
  {
    id: 4,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "dhal", yagya: true }
    ]
  },
  {
    id: 5,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "kapat", yagya: true }
    ]
  },
  {
    id: 6,
    faces: [
      { id: 1, type: "bhala", yagya: false },
      { id: 2, type: "teer", yagya: false },
      { id: 3, type: "kavach", yagya: false },
      { id: 4, type: "dhal", yagya: false },
      { id: 5, type: "kapat", yagya: false },
      { id: 6, type: "bhala", yagya: true }
    ]
  }
];

// Devta Cards Configuration
const DEVTA_CARDS = [
  {
    id: 1,
    name: "Bali",
    description: "The Gada Bearer. Known for his brutal damaging skills. This Devta can introduce fear in the heart of the fearless.",
    tokensRequired: 4,
    actionTime: "beginning",
    priority: 2,
    type: "attacker",
    damage: 5
  },
  {
    id: 2,
    name: "Arjun",
    description: "The Master of Arrows. Dhal can't stop him. All Teer will hit the target. Opponent's Dhal will be removed. A combination of power and precision.",
    tokensRequired: 6,
    actionTime: "beginning",
    priority: 3,
    type: "supporter",
    effectType: "remove",
    affectedMove: "dhal"
  },
  {
    id: 3,
    name: "Kahna",
    description: "The Master Mind. Moves first and removes the amount of Vardan Tokens the opponent decided to use in the next turn making them unable to use Devik Vardan.",
    additionalNote: "After the effect, if the opponent still have enough Vardan Tokens left, opponent's Devik Vardan will still take action.",
    tokensRequired: 6,
    actionTime: "beginning",
    priority: 1,
    type: "supporter",
    effectType: "remove",
    affectedMove: "vardanTokens"
  },
  {
    id: 4,
    name: "Prithvi",
    description: "Earth Goddess. Heals by adding Arogya Mani at the end of the Yudh. She is the ultimate nourisher.",
    additionalNote: "If the Arogya Mani is max during time of execution of this Vardan, it will have no effect.",
    tokensRequired: 5,
    actionTime: "end",
    priority: 1,
    type: "healer",
    heal: 3
  }
];

// Face type descriptions
const FACE_DESCRIPTIONS = {
  bhala: "A traditional hand-held weapon. Does one damage to the opponent.",
  teer: "A ranged weapon. Does one damage to the opponent.",
  kavach: "A wearable defensive gear. Blocks opponent's one Bhala attack.",
  dhal: "A hand-held defensive gear. Blocks opponent's one Teer attack.",
  kapat: "A trickery that can steal opponent's one Vardan Token.",
  yagya: "An additional effect that adds one Vardan Token at the start of resolution phase."
};

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_CONSTANTS,
    PASA_SET,
    DEVTA_CARDS,
    FACE_DESCRIPTIONS
  };
}
