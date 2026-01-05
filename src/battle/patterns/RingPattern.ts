import { IPattern, PatternContext } from './IPattern';

export class RingPattern implements IPattern {
  private timer?: Phaser.Time.TimerEvent;

  start(ctx: PatternContext) {
    const cx = ctx.arena.centerX;
    const cy = ctx.arena.centerY;

    this.timer = ctx.scene.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        if (!ctx.bullets.isActive()) return;

        const count = 10;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const vx = Math.cos(a) * 160;
          const vy = Math.sin(a) * 160;
          ctx.bullets.spawnBullet(cx, cy, vx, vy, 5);
        }
      },
    });
  }

  update(): void {}

  stop() {
    this.timer?.remove(false);
    this.timer = undefined;
  }
}
