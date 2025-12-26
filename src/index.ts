// src/index.ts (исправленная версия)
import Phaser from 'phaser';
import * as scenes from './scenes';

/**
 * https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/
 */
const game = new Phaser.Game({
  width: 800,
  height: 600,
  title: 'Phaser RPG',
  url: import.meta.env.VITE_APP_HOMEPAGE,
  version: import.meta.env.VITE_APP_VERSION,
  scene: [
    scenes.Boot,
    scenes.Main,
    scenes.Menu,
    scenes.BattleScene,
    scenes.DialogScene,
  ],
  physics: {
    default: 'arcade',
    arcade: {
      debug: import.meta.env.DEV,
    },
  },
  disableContextMenu: import.meta.env.PROD,
  backgroundColor: '#000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
});

// Экспортируем игру глобально для отладки
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__PHASER_RPG_GAME = game;
  console.log('🎮 Phaser RPG: Игра доступна через window.__PHASER_RPG_GAME');
  console.log('Для теста битвы в консоли выполните: testBattle()');
}