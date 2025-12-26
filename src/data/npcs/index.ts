// // src/data/npcs/index.ts
// import { NPCConfig, DialogData } from '../../types/dialog'; // Изменено с NPCData на NPCConfig
// import { villagerDialog } from '../dialogs/villager';
// // import { shopkeeperDialog } from '../dialogs/shopkeeper';
// // import { guardDialog } from '../dialogs/guard';

// // Изменяем Record<string, NPCData> на Record<string, NPCConfig>
// export const npcDatabase: Record<string, NPCConfig> = {
//   villager_1: {
//     id: 'villager_1',
//     name: 'Деревенский житель',
//     texture: 'npc_villager',
//     frame: 'villager_idle',
//     dialogId: 'villager',
//     spawnOnMap: 'main',
//     defaultPosition: { x: 300, y: 200 },
//     wander: true,
//     wanderRadius: 50
//   },
//   shopkeeper_1: {
//     id: 'shopkeeper_1',
//     name: 'Торговец',
//     texture: 'npc_shopkeeper',
//     frame: 'shopkeeper_idle',
//     dialogId: 'shopkeeper',
//     spawnOnMap: 'main',
//     defaultPosition: { x: 500, y: 300 },
//     wander: false
//   },
//   guard_1: {
//     id: 'guard_1',
//     name: 'Стражник',
//     texture: 'npc_guard',
//     frame: 'guard_idle',
//     dialogId: 'guard',
//     spawnOnMap: 'main',
//     defaultPosition: { x: 400, y: 100 },
//     wander: true,
//     wanderRadius: 30
//   }
// };

// export const dialogsDatabase: Record<string, DialogData> = {
//   villager: villagerDialog,
//   shopkeeper: shopkeeperDialog,
//   guard: guardDialog
// };