// src/systems/RandomEncounterSystem.ts
// @ts-nocheck
import Phaser from 'phaser';
import { BattleState } from '../constants/battle';

export class RandomEncounterSystem {
  private scene: Phaser.Scene;
  private player: any;
  private getCoins: () => number;

  private walkSteps = 0;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

  private encounterChance = 0.05;
  private isInBattle = false;

  private onEnd: (result: string, data?: any) => void;

  constructor(scene: Phaser.Scene, deps: { player: any; getCoins: () => number; onEnd: (result: string, data?: any) => void }) {
    this.scene = scene;
    this.player = deps.player;
    this.getCoins = deps.getCoins;
    this.onEnd = deps.onEnd;
  }

  create() {
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    this.scene.game.events.on('battle:ended', (payload: any) => {
      // payload: { outcome: 'killed'|'spared'|'dead', ... }
      this.isInBattle = false;

      const outcome = payload?.outcome;
      const result =
        outcome === 'killed' ? BattleState.VICTORY : outcome === 'spared' ? BattleState.VICTORY : BattleState.DEFEAT;

      // Данные игрока можно сюда прокинуть из BattleScene (если добавишь)
      this.onEnd(result, payload?.data);

      // Возобновление Main делает BattleScene через resume(returnSceneKey),
      // но мы дополнительно фиксируем позиции для трекинга.
      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
      this.walkSteps = 0;
    });
  }

  update() {
    if (this.isInBattle) return;

    const moved = this.player.x !== this.lastPlayerX || this.player.y !== this.lastPlayerY;
    if (!moved) return;

    this.walkSteps++;
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    if (this.walkSteps % 20 === 0) {
      const roll = Math.random();
      if (roll < this.encounterChance && !this.isInBattle) {
        this.triggerBattle();
      }
    }
  }

  triggerBattle(enemyType?: string) {
    if (this.isInBattle) return;

    this.isInBattle = true;

    this.player.setVelocity?.(0, 0);

    this.scene.cameras.main.flash(300, 255, 0, 0);
    this.scene.cameras.main.shake(300, 0.01);

    this.scene.time.delayedCall(500, () => {
      // важное: паузим Main, чтобы мир не жил под боем
      this.scene.scene.pause(this.scene.scene.key);

      const enemyTypes = ['slime', 'goblin', 'orc'];
      const randomEnemy = enemyType || enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

      if (this.scene.scene.get('BattleScene')) {
        this.scene.scene.launch('BattleScene', {
          enemyType: randomEnemy,
          returnSceneKey: this.scene.scene.key,
          playerData: {
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            attack: this.player.attack,
            defense: this.player.defense,
            coins: this.getCoins(),
          },
        });
      } else {
        this.isInBattle = false;
        this.scene.scene.resume(this.scene.scene.key);
      }

      this.walkSteps = 0;
    });
  }

  get inBattle() {
    return this.isInBattle;
  }

  destroy() {
    this.scene.game.events.removeAllListeners('battle:ended');
  }
}
