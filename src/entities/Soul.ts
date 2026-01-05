import Phaser from 'phaser';
import { SoulForm } from '../battle/types';
import { BattleTuning } from '../battle/constants';

export interface SoulConfig {
  startX: number;
  startY: number;
  bounds: Phaser.Geom.Rectangle;
}

export class Soul {
  public readonly sprite: Phaser.GameObjects.Rectangle;

  private form: SoulForm = SoulForm.RED_BALANCE;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyShift: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;

  private speed = 220;
  private invulnUntil = 0;

  private shielding = false;
  private dashCooldownUntil = 0;

  private frozen = false;

  constructor(private scene: Phaser.Scene, private cfg: SoulConfig) {
    this.sprite = scene.add.rectangle(cfg.startX, cfg.startY, 12, 12, 0xff0000).setOrigin(0.5);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyShift = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keySpace = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  freeze() {
    this.frozen = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  unfreeze() {
    this.frozen = false;
  }

  setForm(form: SoulForm) {
    this.form = form;

    switch (form) {
      case SoulForm.RED_BALANCE:
        this.sprite.fillColor = 0xff0000;
        this.speed = 220;
        break;
      case SoulForm.BLUE_GRAVITY:
        this.sprite.fillColor = 0x3b82f6;
        this.speed = 210;
        break;
      case SoulForm.GREEN_SHIELD:
        this.sprite.fillColor = 0x22c55e;
        this.speed = 170;
        break;
      case SoulForm.YELLOW_IMPULSE:
        this.sprite.fillColor = 0xfacc15;
        this.speed = 220;
        break;
    }
  }

  getForm() {
    return this.form;
  }

  setInvulnerable(ms: number) {
    this.invulnUntil = this.scene.time.now + ms;
  }

  isInvulnerable() {
    return this.scene.time.now < this.invulnUntil;
  }

  isShielding() {
    return this.form === SoulForm.GREEN_SHIELD && this.shielding;
  }

  update(dtMs: number) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // default
    body.setVelocity(0, 0);

    if (!this.frozen) {
      this.shielding = (this.form === SoulForm.GREEN_SHIELD) && this.keySpace.isDown;

      // Dash (YELLOW): SHIFT + dir
      if (this.form === SoulForm.YELLOW_IMPULSE && this.keyShift.isDown && this.scene.time.now >= this.dashCooldownUntil) {
        const dir = new Phaser.Math.Vector2(
          (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0),
          (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0),
        );
        if (dir.lengthSq() > 0) {
          dir.normalize();
          body.setVelocity(dir.x * 650, dir.y * 650);
          this.dashCooldownUntil = this.scene.time.now + 600;
        }
      } else {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left?.isDown) vx -= 1;
        if (this.cursors.right?.isDown) vx += 1;

        // BLUE: нельзя вверх
        if (this.form === SoulForm.BLUE_GRAVITY) {
          if (this.cursors.down?.isDown) vy += 1;
        } else {
          if (this.cursors.up?.isDown) vy -= 1;
          if (this.cursors.down?.isDown) vy += 1;
        }

        const v = new Phaser.Math.Vector2(vx, vy);
        if (v.lengthSq() > 0) v.normalize();

        const slow = this.shielding ? 0.55 : 1.0;
        body.setVelocity(v.x * this.speed * slow, v.y * this.speed * slow);
      }
    } else {
      this.shielding = false;
    }

    // Clamp ALWAYS (фикс “уезжает за границы”)
    const b = this.cfg.bounds;
    const x = Phaser.Math.Clamp(this.sprite.x, b.left, b.right);
    const y = Phaser.Math.Clamp(this.sprite.y, b.top, b.bottom);
    this.sprite.setPosition(x, y);

    // invuln flicker
    if (this.isInvulnerable()) {
      this.sprite.alpha = (Math.floor(this.scene.time.now / 60) % 2) ? 0.35 : 1.0;
    } else {
      this.sprite.alpha = 1.0;
    }
  }
}
