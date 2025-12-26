// src/data/dialogs/index.ts
export { villageDialogs } from './village';
// export { forestDialogs } from './forest';
// export { dungeonDialogs } from './dungeon';
// export { specialDialogs } from './special';

// Комбинированная коллекция всех диалогов
import { villageDialogs } from './village';
// import { forestDialogs } from './forest';
// import { dungeonDialogs } from './dungeon';
// import { specialDialogs } from './special';

export const allDialogs = {
  ...villageDialogs,
//   ...forestDialogs,
//   ...dungeonDialogs,
//   ...specialDialogs
};