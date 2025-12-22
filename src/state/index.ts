// Пример полной структуры состояния
interface GameState {
  isTypewriting: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  inventory: string[];
  currentQuest?: string;
  // ... другие поля по мере необходимости
}

// Создайте начальное состояние
export const state: GameState = {
  isTypewriting: false,
  playerHealth: 100,
  playerMaxHealth: 100,
  inventory: [],
  currentQuest: undefined,
};