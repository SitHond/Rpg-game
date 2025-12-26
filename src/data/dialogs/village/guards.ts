// src/data/dialogs/village/guards.ts
import { DialogData } from '../../../types/dialog';

// Экспортируем guard, а не guards
export const guard: DialogData = {
  id: 'guard',
  name: 'Стражник Борис',
  portrait: 'guard',
  repeatable: true,
  lines: {
    start: {
      id: 'start',
      speaker: 'Борис',
      text: '* Стой!',
      next: 'line2'
    },
    line2: {
      id: 'line2',
      speaker: 'Борис',
      text: '* Пропуск нужен для входа в деревню.',
      next: 'line3'
    },
    line3: {
      id: 'line3',
      speaker: 'Борис',
      text: '* Предъяви документы.',
      next: 'line4'
    },
    line4: {
      id: 'line4',
      speaker: 'Борис',
      text: '* Без пропуска не пущу.',
      next: 'close'
    }
  },
  start: 'start'
};