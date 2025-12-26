// src/data/dialogs/village/shopkeepers.ts
import { DialogData } from '../../../types/dialog';

// Экспортируем shopkeeper, а не shopkeepers
export const shopkeeper: DialogData = {
  id: 'shopkeeper',
  name: 'Торговец Гарольд',
  portrait: 'shopkeeper',
  repeatable: true,
  lines: {
    start: {
      id: 'start',
      speaker: 'Гарольд',
      text: '* Добро пожаловать в мою лавку!',
      next: 'line2'
    },
    line2: {
      id: 'line2',
      speaker: 'Гарольд',
      text: '* Я Гарольд, лучший торговец во всей округе.',
      next: 'line3'
    },
    line3: {
      id: 'line3',
      speaker: 'Гарольд',
      text: '* У меня есть всё для выживания в диких землях.',
      next: 'line4'
    },
    line4: {
      id: 'line4',
      speaker: 'Гарольд',
      text: '* Что интересует?',
      action: {
        type: 'shop',
        data: { shopId: 'general_store' }
      },
      next: 'close'
    }
  },
  start: 'start'
};