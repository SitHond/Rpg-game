// src/data/dialogs/test-npc.ts
import { DialogData } from '../../types/dialog';

export const testDialog: DialogData = {
  id: 'test_npc',
  name: 'Деревенский житель',
  portrait: 'npc_villager',
  start: 'greeting',
  lines: {
    greeting: {
      id: 'greeting',
      speaker: 'Деревенский житель',
      text: 'Приветствую, путник! Как дела в этих краях?',
      choices: [
        {
          id: 'choice_good',
          text: 'Всё прекрасно, спасибо!',
          next: 'response_good'
        },
        {
          id: 'choice_bad',
          text: 'Не очень, проблемы с монстрами...',
          next: 'response_bad'
        },
        {
          id: 'choice_quest',
          text: 'Есть ли у тебя задания?',
          next: 'quest_offer'
        }
      ]
    },
    response_good: {
      id: 'response_good',
      speaker: 'Деревенский житель',
      text: 'Рад это слышать! Удачи в путешествии!',
      next: 'end'
    },
    response_bad: {
      id: 'response_bad',
      speaker: 'Деревенский житель',
      text: 'Ох, понимаю... Будь осторожен в лесу!',
      next: 'end'
    },
    quest_offer: {
      id: 'quest_offer',
      speaker: 'Деревенский житель',
      text: 'Да, как раз ищу смельчака, который очистит лес от слаймов. Заплачу 50 золотых!',
      choices: [
        {
          id: 'accept_quest',
          text: 'Согласен помочь!',
          next: 'quest_accepted'
        },
        {
          id: 'decline_quest',
          text: 'Извини, сейчас не могу.',
          next: 'quest_declined'
        }
      ]
    },
    quest_accepted: {
      id: 'quest_accepted',
      speaker: 'Деревенский житель',
      text: 'Отлично! Уничтожь 5 слаймов и возвращайся за наградой.',
      action: {
        type: 'quest',
        data: { questId: 'slime_hunter', target: 5 }
      },
      next: 'end'
    },
    quest_declined: {
      id: 'quest_declined',
      speaker: 'Деревенский житель',
      text: 'Жаль. Если передумаешь - возвращайся!',
      next: 'end'
    },
    end: {
      id: 'end',
      speaker: 'Деревенский житель',
      text: 'До скорой встречи!'
    }
  }
};