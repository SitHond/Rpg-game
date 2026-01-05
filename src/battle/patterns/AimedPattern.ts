import { IPattern, PatternContext } from './IPattern';

export class AimedPattern implements IPattern {
  private timer?: Phaser.Time.TimerEvent;

  start(ctx: PatternContext) {
    this.timer = ctx.scene.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        if (!ctx.bullets.isActive()) return;

        const startX = Phaser.Math.Between(ctx.arena.left, ctx.arena.right);
        const startY = ctx.arena.top - 12;

        const dir = new Phaser.Math.Vector2(
          ctx.soul.sprite.x - startX,
          ctx.soul.sprite.y - startY
        ).normalize();

        ctx.bullets.spawnBullet(startX, startY, dir.x * 260, dir.y * 260, 6);
      },
    });
  }

  update(): void {}

  stop() {
    this.timer?.remove(false);
    this.timer = undefined;
  }
}
