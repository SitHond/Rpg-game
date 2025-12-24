// Расширенное состояние игры
interface GameState {
  isTypewriting: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  playerAttack: number;
  playerDefense: number;
  playerLevel: number;
  playerExperience: number;
  playerRequiredExp: number;
  inventory: string[];
  currentQuest?: string;
  battleHistory: Array<{
    enemy: string;
    result: 'victory' | 'defeat' | 'flee';
    timestamp: number;
  }>;
  // Добавляем состояния для текущей битвы
  battle?: {
    isActive: boolean;
    enemyType: string;
    enemyHealth: number;
    enemyMaxHealth: number;
    turn: 'player' | 'enemy';
  };
}

export const state: GameState = {
  isTypewriting: false,
  playerHealth: 100,
  playerMaxHealth: 100,
  playerAttack: 15,
  playerDefense: 10,
  playerLevel: 1,
  playerExperience: 0,
  playerRequiredExp: 100,
  inventory: [],
  currentQuest: undefined,
  battleHistory: [],
};

// Вспомогательные функции для боя
export const battleActions = {
  startBattle(enemyType: string) {
    state.battle = {
      isActive: true,
      enemyType,
      enemyHealth: 50,
      enemyMaxHealth: 50,
      turn: 'player'
    };
  },
  
  playerAttack() {
    if (!state.battle) return;
    
    const damage = state.playerAttack;
    state.battle.enemyHealth = Math.max(0, state.battle.enemyHealth - damage);
    state.battle.turn = 'enemy';
    
    return damage;
  },
  
  enemyAttack() {
    if (!state.battle) return;
    
    // Простая логика урона врага
    const enemyDamage = 10;
    state.playerHealth = Math.max(0, state.playerHealth - enemyDamage);
    state.battle.turn = 'player';
    
    return enemyDamage;
  },
  
  endBattle(result: 'victory' | 'defeat' | 'flee') {
    if (!state.battle) return;
    
    state.battleHistory.push({
      enemy: state.battle.enemyType,
      result,
      timestamp: Date.now()
    });
    
    if (result === 'victory') {
      // Награда за победу
      state.playerExperience += 25;
      if (state.playerExperience >= state.playerRequiredExp) {
        state.playerLevel++;
        state.playerExperience -= state.playerRequiredExp;
        state.playerRequiredExp = Math.floor(state.playerRequiredExp * 1.5);
        state.playerMaxHealth += 20;
        state.playerHealth = state.playerMaxHealth;
        state.playerAttack += 5;
        state.playerDefense += 3;
      }
    }
    
    state.battle = undefined;
  }
};