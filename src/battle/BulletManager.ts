import Phaser from 'phaser';
import { BattleTuning } from './constants';
import { Soul } from '../entities/Soul';

type Bullet = Phaser.GameObjects.Arc;

export interface ReactPhaseResult {
  durationMs: number;
  grazes: number;
  hits: number;
}

export class BulletManager {
  private bullets: Bullet[] = [];
  private grazed = new Set<Bullet>();
  private hits = 0;
  private grazes = 0;

  private reactStart = 0;
  private reactEnd = 0;
  private active = false;

  constructor(
    private scene: Phaser.Scene,
    private soul: Soul,
    private arenaBounds: Phaser.Geom.Rectangle,
    private onGraze: () => void,
    private onHit: () => void
  ) {}

  start(durationMs: number) {
    this.clear();
    this.reactStart = this.scene.time.now;
    this.reactEnd = this.reactStart + durationMs;
    this.active = true;
  }

  stop() {
    this.active = false;
    this.reactEnd = this.scene.time.now;
  }

  isActive() {
    return this.active && this.scene.time.now < this.reactEnd;
  }

  clear() {
    for (const b of this.bullets) b.destroy();
    this.bullets = [];
    this.grazed.clear();
    this.hits = 0;
    this.grazes = 0;
    this.active = false;
  }

  getResult(): ReactPhaseResult {
    return {
      durationMs: Math.max(0, this.scene.time.now - this.reactStart),
      grazes: this.grazes,
      hits: this.hits,
    };
  }

  spawnBullet(x: number, y: number, vx: number, vy: number, radius = 5) {
    if (!this.isActive()) return null;

    const b = this.scene.add.circle(x, y, radius, 0xffffff) as Bullet;
    this.scene.physics.add.existing(b);

    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(vx, vy);
    body.setAllowGravity(false);

    this.bullets.push(b);
    return b;
  }

  update() {
    if (!this.active) return;

    // cleanup (вне арены с запасом)
    const m = BattleTuning.BULLET_CLEAN_MARGIN_PX;

    for (const b of this.bullets) {
      if (!b.active) continue;

      if (
        b.x < this.arenaBounds.left - m ||
        b.x > this.arenaBounds.right + m ||
        b.y < this.arenaBounds.top - m ||
        b.y > this.arenaBounds.bottom + m
      ) {
        b.destroy();
      }
    }

    this.bullets = this.bullets.filter(b => b.active);

    if (this.isActive()) {
      this.checkCollisionsAndGraze();
    }
  }

  private checkCollisionsAndGraze() {
    const sx = this.soul.sprite.x;
    const sy = this.soul.sprite.y;

    for (const b of this.bullets) {
      if (!b.active) continue;

      const dx = b.x - sx;
      const dy = b.y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const bulletR = (b.radius ?? 5);
      const hitRadius = bulletR + 6;
      const grazeRadius = hitRadius + BattleTuning.GRAZE_RADIUS_PX;

      // HIT
      if (dist <= hitRadius) {
        if (this.soul.isInvulnerable()) continue;

        // shield blocks
        if (this.soul.isShielding()) {
          b.destroy();
          continue;
        }

        this.hits += 1;
        this.soul.setInvulnerable(BattleTuning.HIT_INVULN_MS);
        b.destroy();
        this.onHit();
        continue;
      }

      // GRAZE once per bullet
      if (dist <= grazeRadius && !this.grazed.has(b)) {
        this.grazed.add(b);
        this.grazes += 1;
        this.onGraze();
      }
    }
  }
}
