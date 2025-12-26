// src/components/MenuComponents.tsx
import Phaser from 'phaser';

// Фон меню с параллаксом
export class MenuBackground extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Слои для параллакса
    const bg1 = scene.add.image(0, 0, 'menu_bg_1')
      .setDisplaySize(800, 600);
    const bg2 = scene.add.image(0, 0, 'menu_bg_2')
      .setDisplaySize(800, 600)
      .setAlpha(0.8);
    
    this.add([bg1, bg2]);
    scene.add.existing(this);
  }
}

// Анимированный логотип
export class Logo extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'menu_logo');
    
    scene.add.existing(this);
    this.setOrigin(0.5);
    
    // Анимация мерцания
    scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}

// Кнопка меню с эффектами
export class MenuButton extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ) {
    super(scene, x, y, text, {
      font: 'bold 32px Arial',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { left: 30, right: 30, top: 15, bottom: 15 },
      stroke: '#000000',
      strokeThickness: 3
    });
    
    this.setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    
    // Анимация появления
    scene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y - 20,
      duration: 600,
      ease: 'Power2'
    });
    
    // Эффекты наведения
    this.on('pointerover', () => {
      this.setStyle({ color: '#ffff00', backgroundColor: '#333300c0' });
      scene.tweens.add({
        targets: this,
        scale: 1.1,
        duration: 150
      });
    });
    
    this.on('pointerout', () => {
      this.setStyle({ color: '#ffffff', backgroundColor: '#00000080' });
      scene.tweens.add({
        targets: this,
        scale: 1,
        duration: 150
      });
    });
    
    this.on('pointerdown', () => {
      onClick();
      scene.tweens.add({
        targets: this,
        scale: 0.9,
        duration: 100,
        yoyo: true
      });
    });
    
    scene.add.existing(this);
  }
}