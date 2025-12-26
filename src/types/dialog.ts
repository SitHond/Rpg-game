// src/types/dialog.ts
export interface DialogLine {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  emotion?: 'normal' | 'happy' | 'sad' | 'angry' | 'surprised';
  choices?: DialogChoice[];
  next?: string | string[];
  action?: DialogAction;
  condition?: DialogCondition;
}

export interface DialogChoice {
  id: string;
  text: string;
  next: string;
  requirements?: DialogRequirement[];
  action?: DialogAction;
}

export interface DialogAction {
  type: 'quest' | 'shop' | 'battle' | 'teleport' | 'item' | 'gold' | 'flag';
  data?: any;
}

export interface DialogCondition {
  type: 'quest' | 'item' | 'level' | 'flag' | 'reputation';
  id: string;
  value?: any;
  operator?: 'eq' | 'gt' | 'lt' | 'has' | 'not';
}

export interface DialogRequirement {
  type: 'quest' | 'item' | 'reputation' | 'flag';
  id: string;
  value?: any;
}

export interface DialogData {
  id: string;                    // Уникальный идентификатор диалога
  name: string;                  // Имя NPC для отображения
  lines: Record<string, DialogLine>;  // Все реплики диалога (словарь)
  start: string;                 // ID начальной реплики
  portrait?: string;             // Опционально: текстура портрета
  repeatable?: boolean;          // Опционально: можно ли повторять диалог
}
// Изменим NPCData на NPCConfig чтобы избежать конфликта с Phaser
export interface NPCConfig {
  id: string;
  name: string;
  texture: string;
  frame?: string;
  dialogId: string;
  spawnOnMap?: string;
  defaultPosition?: { x: number; y: number };
  wander?: boolean;
  wanderRadius?: number;
}