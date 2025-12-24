export const BattleKey = {
  scene: 'battle',
} as const;

export const EnemyType = {
  SLIME: 'slime',
  GOBLIN: 'goblin',
  ORC: 'orc',
  DRAGON: 'dragon',
} as const;

export const BattleAction = {
  ATTACK: 'attack',
  DEFEND: 'defend',
  ITEM: 'item',
  FLEE: 'flee',
} as const;

export const BattleState = {
  PLAYER_TURN: 'player_turn',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  FLEE: 'flee',
} as const;

export const EncounterRates = {
  FOREST: 0.08,     // 8% шанс встречи в лесу
  GRASSLAND: 0.05,  // 5% на равнине
  MOUNTAIN: 0.12,   // 12% в горах
  DUNGEON: 0.15,    // 15% в подземелье
} as const;