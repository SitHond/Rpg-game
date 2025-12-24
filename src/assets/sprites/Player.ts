// src/sprites/Player.ts
import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number = 175;
  private lastDirection: string = 'front';
  
  // Добавляем свойства для боевой системы
  public health: number = 100;
  public maxHealth: number = 100;
  public attack: number = 15;
  public defense: number = 10;
  public level: number = 1;
  public experience: number = 0;
  public requiredExp: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'atlas', 'misa-front');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setCollideWorldBounds(true);
    this.body!.setSize(20, 32);
    this.setScale(1.5);
    
    this.createAnimations();
  }

  private createAnimations() {
    const anims = this.scene.anims;
    
    const directions = ['left', 'right', 'front', 'back'];
    directions.forEach(dir => {
      anims.create({
        key: `walk-${dir}`,
        frames: anims.generateFrameNames('atlas', {
          prefix: `misa-${dir}-walk.`,
          start: 0,
          end: 3,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
      
      anims.create({
        key: `idle-${dir}`,
        frames: [{ key: 'atlas', frame: `misa-${dir}` }],
        frameRate: 10
      });
    });
  }

  update() {
    const cursors = this.scene.input.keyboard?.createCursorKeys();
    const wasd = this.scene.input.keyboard?.addKeys('W,A,S,D') as any;
    
    if (!cursors || !wasd) return;

    const left = cursors.left.isDown || wasd.A.isDown;
    const right = cursors.right.isDown || wasd.D.isDown;
    const up = cursors.up.isDown || wasd.W.isDown;
    const down = cursors.down.isDown || wasd.S.isDown;

    // Движение
    if (left) {
      this.setVelocityX(-this.moveSpeed);
      this.anims.play('walk-left', true);
      this.lastDirection = 'left';
    } else if (right) {
      this.setVelocityX(this.moveSpeed);
      this.anims.play('walk-right', true);
      this.lastDirection = 'right';
    } else {
      this.setVelocityX(0);
    }

    if (up) {
      this.setVelocityY(-this.moveSpeed);
      this.anims.play('walk-back', true);
      this.lastDirection = 'back';
    } else if (down) {
      this.setVelocityY(this.moveSpeed);
      this.anims.play('walk-front', true);
      this.lastDirection = 'front';
    } else {
      this.setVelocityY(0);
    }

    // Сброс анимации при отсутствии движения
    if (!left && !right && !up && !down) {
      this.anims.play(`idle-${this.lastDirection}`, true);
    }
  }
  
  // Методы для боя
  public takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.defense);
    this.health = Math.max(0, this.health - actualDamage);
    return actualDamage;
  }
  
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}