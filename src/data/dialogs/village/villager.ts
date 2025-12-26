import { DialogData } from '../../../types/dialog';

// Обратите внимание: экспортируем ОБЪЕКТ villager, а не villagers
export const villager: DialogData = {
  id: 'villager',
  name: 'Деревенский житель',
  portrait: 'villager',
  repeatable: true,
  lines: {
    start: {
      id: 'start',
      speaker: 'Житель',
      text: '* Добро пожаловать в нашу деревню, странник!',
      next: 'line2'
    },
    line2: {
      id: 'line2',
      speaker: 'Житель',
      text: '* Хорошо, что ты пришел в мирное время.',
      next: 'line3'
    },
    line3: {
      id: 'line3',
      speaker: 'Житель',
      text: '* Наша деревня существует уже три поколения.',
      next: 'line4'
    },
    line4: {
      id: 'line4',
      speaker: 'Житель',
      text: '* Живем земледелием и рыболовством.',
      next: 'close'
    },
    
    // Для повторного разговора
    second_talk: {
      id: 'second_talk',
      speaker: 'Житель',
      text: '* О, снова ты!',
      next: 'second_talk2'
    },
    second_talk2: {
      id: 'second_talk2',
      speaker: 'Житель',
      text: '* Как продвигается твое путешествие?',
      next: 'second_talk3'
    },
    second_talk3: {
      id: 'second_talk3',
      speaker: 'Житель',
      text: '* Не забудь заглянуть в таверну.',
      next: 'close'
    }
  },
  start: 'start'
};