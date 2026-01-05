// src/battle/StrikeMinigame.ts
import Phaser from 'phaser';

export type StrikeGrade = 'MISS' | 'OK' | 'GOOD' | 'PERFECT';

export interface StrikeResult {
  grade: StrikeGrade;
  multiplier: number;
  effectChance: number;
}

export class StrikeMinigame {
  private container?: Phaser.GameObjects.Container;
  private zones: Phaser.GameObjects.Rectangle[] = [];
  private cursor?: Phaser.GameObjects.Rectangle;
  private clickZone?: Phaser.GameObjects.Zone;

  private tween?: Phaser.Tweens.Tween;
  private running = false;
  private resolveFn?: (r: StrikeResult) => void;

  private keySpace?: Phaser.Input.Keyboard.Key;
  private keyEnter?: Phaser.Input.Keyboard.Key;
  private onKeyBound?: () => void;

  constructor(private scene: Phaser.Scene) {}

  isRunning() {
    return this.running;
  }

  start(): Promise<StrikeResult> {
    this.destroy();
    this.running = true;

    const cam = this.scene.cameras.main;
    const cx = cam.centerX;

    // ВАЖНО: позицию лучше держать чуть выше нижней UI-панели
    // (у тебя UI снизу; поэтому ставим мини-игру ближе к арене)
    const cy = cam.centerY + 140;

    // UI у тебя рисуется очень высоко по depth.
    // Делаем мини-игру ещё выше, чтобы она гарантированно была видна.
    const DEPTH_PANEL = 90_000;
    const DEPTH_INPUT = 95_000;

    this.container = this.scene.add.container(0, 0).setDepth(DEPTH_PANEL);
    this.container.setScrollFactor(0);

    // фон мини-игры
    const panel = this.scene.add.rectangle(cx, cy, 520, 80, 0x000000).setOrigin(0.5);
    panel.setStrokeStyle(3, 0xffffff, 1);
    this.container.add(panel);

    // зоны уязвимости
    const zoneCenters = [-140, 0, 140];
    this.zones = zoneCenters.map((dx) => {
      const r = this.scene.add.rectangle(cx + dx, cy, 86, 20, 0x111111).setOrigin(0.5);
      r.setStrokeStyle(2, 0xffffff, 1);
      this.container!.add(r);
      return r;
    });

    // курсор-линия
    this.cursor = this.scene.add.rectangle(cx - 240, cy, 8, 34, 0xffffff).setOrigin(0.5);
    this.container.add(this.cursor);

    // кликабельная зона над всей полосой
    this.clickZone = this.scene.add.zone(cx - 260, cy - 40, 520, 80).setOrigin(0, 0);
    this.clickZone.setScrollFactor(0);
    this.clickZone.setDepth(DEPTH_INPUT);
    this.clickZone.setInteractive({ useHandCursor: true });
    this.clickZone.on('pointerdown', () => this.finishFromInput());

    // клавиши SPACE/ENTER
    this.keySpace = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    const onKey = () => this.finishFromInput();
    this.onKeyBound = onKey;

    this.keySpace?.on('down', onKey);
    this.keyEnter?.on('down', onKey);

    // движение курсора: слева направо
    this.tween = this.scene.tweens.add({
      targets: this.cursor,
      x: cx + 240,
      duration: 1500,
      ease: 'Linear',
      onComplete: () => {
        if (this.running) this.finish({ grade: 'MISS', multiplier: 0, effectChance: 0 });
      },
    });

    // общий таймаут (страховка)
    this.scene.time.delayedCall(2200, () => {
      if (this.running) this.finish({ grade: 'MISS', multiplier: 0, effectChance: 0 });
    });

    return new Promise<StrikeResult>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  private finishFromInput() {
    if (!this.running) return;

    this.tween?.stop();

    const res = this.evaluate();
    this.finish(res);
  }

  private evaluate(): StrikeResult {
    if (!this.cursor) return { grade: 'MISS', multiplier: 0, effectChance: 0 };

    const x = this.cursor.x;

    let bestDist = Infinity;
    for (const z of this.zones) {
      const d = Math.abs(x - z.x);
      if (d < bestDist) bestDist = d;
    }

    // пороги под ширину зон
    if (bestDist > 55) return { grade: 'MISS', multiplier: 0, effectChance: 0 };
    if (bestDist > 32) return { grade: 'OK', multiplier: 0.8, effectChance: 0.05 };
    if (bestDist > 14) return { grade: 'GOOD', multiplier: 1.0, effectChance: 0.15 };
    return { grade: 'PERFECT', multiplier: 1.25, effectChance: 0.30 };
  }

  private finish(result: StrikeResult) {
    if (!this.running) return;

    this.running = false;

    const resolve = this.resolveFn;
    this.resolveFn = undefined;

    this.destroy();
    resolve?.(result);
  }

  destroy() {
    this.tween?.stop();
    this.tween = undefined;

    if (this.keySpace && this.onKeyBound) this.keySpace.off('down', this.onKeyBound);
    if (this.keyEnter && this.onKeyBound) this.keyEnter.off('down', this.onKeyBound);

    this.keySpace = undefined;
    this.keyEnter = undefined;
    this.onKeyBound = undefined;

    this.clickZone?.removeAllListeners();
    this.clickZone?.destroy();
    this.clickZone = undefined;

    this.container?.destroy(true);
    this.container = undefined;

    this.zones = [];
    this.cursor = undefined;

    this.running = false;
    this.resolveFn = undefined;
  }
}
