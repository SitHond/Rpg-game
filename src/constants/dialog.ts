// src/constants/dialog.ts
export const DialogKey = {
  scene: 'dialog',
} as const;

export const DialogState = {
  IDLE: 'idle',
  TYPING: 'typing',
  CHOICE: 'choice',
  WAITING: 'waiting',
  COMPLETE: 'complete',
} as const;

export const DialogAction = {
  NEXT: 'next',
  PREV: 'prev',
  SELECT: 'select',
  CLOSE: 'close',
} as const;

export const DialogNPC = {
  VILLAGER: 'villager',
  SHOPKEEPER: 'shopkeeper',
  GUARD: 'guard',
  WIZARD: 'wizard',
} as const;

// Клавиши управления диалогом
export const DialogControls = {
  NEXT: ['SPACE', 'ENTER', 'E'],
  CLOSE: ['ESC', 'Q'],
  CHOICE_UP: ['W', 'UP'],
  CHOICE_DOWN: ['S', 'DOWN'],
  SELECT: ['SPACE', 'ENTER'],
} as const;

// src/types/dialog.ts
export interface DialogLine {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  emotion?: 'normal' | 'happy' | 'sad' | 'angry' | 'surprised';
  choices?: DialogChoice[];
  next?: string | string[]; // Следующая реплика или массив возможных (рандом)
  action?: DialogAction;
  condition?: DialogCondition;
}

export interface DialogChoice {
  id: string;
  text: string;
  next: string;
  requirements?: DialogRequirement[];
}

export interface DialogAction {
  type: 'quest' | 'shop' | 'battle' | 'teleport' | 'item';
  data?: any;
}

export interface DialogCondition {
  type: 'quest' | 'item' | 'level' | 'flag';
  id: string;
  value?: any;
  operator?: 'eq' | 'gt' | 'lt' | 'has' | 'not';
}

export interface DialogRequirement {
  type: 'quest' | 'item' | 'reputation';
  id: string;
  value?: any;
}

export interface DialogData {
  id: string;
  name: string;
  lines: Record<string, DialogLine>;
  start: string;
  portrait?: string;
}