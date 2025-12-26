// src/data/dialogs/village/index.ts
import { villager } from './villager';
import { shopkeeper } from './shopkeepes';
import { guard } from './guards';

export const villageDialogs = {
  ...villager,
  ...shopkeeper,
  ...guard
};