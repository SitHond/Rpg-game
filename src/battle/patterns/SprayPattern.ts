import { IPattern, PatternContext } from './IPattern';

export class SprayPattern implements IPattern {
  private timer?: Phaser.Time.TimerEvent;

  start(ctx: PatternContext) {
    this.timer = ctx.scene.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        if (!ctx.bullets.isActive()) return;

        const x = Phaser.Math.Between(ctx.arena.left, ctx.arena.right);
        const y = ctx.arena.top - 10;
        const vx = Phaser.Math.Between(-40, 40);
        const vy = Phaser.Math.Between(140, 220);
        ctx.bullets.spawnBullet(x, y, vx, vy, 5);
      },
    });
  }

  update(): void {}

  stop() {
    this.timer?.remove(false);
    this.timer = undefined;
  }
}
