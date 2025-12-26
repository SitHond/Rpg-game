// src/constants/dialog.ts
export enum DialogKey {
  scene = 'dialog'
}

export enum DialogState {
  TYPING = 'typing',
  WAITING = 'waiting',
  CHOICE = 'choice' // Оставляем на случай, если где-то будут варианты
}

// Настройки для Undertale стиля
export const DIALOG_CONFIG = {
  typewriterSpeed: 30, // мс на символ
  soundFrequency: 3,   // каждый N-й символ со звуком
  boxColor: 0x000000,
  textColor: '#ffffff',
  speakerColor: '#ffff00',
  hintColor: '#888888'
};