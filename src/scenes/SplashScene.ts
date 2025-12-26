// src/scenes/SplashScene.ts
import Phaser from 'phaser';
import { key } from '../constants';

export class SplashScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Sprite;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super('splash');
  }

  preload() {
    // Загрузка логотипа компании/студии
    this.load.image('studio_logo', 'assets/splash/studio_logo.png');
    
    // Прогресс бар
    this.createProgressBar();
    
    // Загрузка основных ассетов для меню
    this.loadAssets();
  }

  create() {
    // Показываем логотип студии
    this.showLogo();
    
    // После показа логотипа запускаем меню
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(key.scene.menu);
      });
    });
  }

  private createProgressBar() {
    const width = 400;
    const height = 50;
    const x = this.cameras.main.centerX - width / 2;
    const y = this.cameras.main.centerY - height / 2;

    // Фон прогресс-бара
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(x, y, width, height);

    // Текст "Загрузка..."
    this.loadingText = this.make.text({
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY - 50,
      text: 'Загрузка...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // Процент загрузки
    this.percentText = this.make.text({
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY + 25,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    });
    this.percentText.setOrigin(0.5, 0.5);

    // Сам прогресс-бар
    this.progressBar = this.add.graphics();

    // Обработчик прогресса
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffff00, 1);
      this.progressBar.fillRect(x + 10, y + 10, (width - 20) * value, height - 20);
      
      const percent = Math.floor(value * 100);
      this.percentText.setText(`${percent}%`);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
    });
  }

  private loadAssets() {
    // Основные ассеты для меню
    this.load.image('menu_background', 'assets/menu/background.png');
    this.load.image('menu_logo', 'assets/menu/logo.png');
    this.load.audio('menu_music', 'assets/music/menu.mp3');
    
    // Критические ассеты для игры
    this.load.image('player', 'assets/player.png');
    this.load.image('tiles', 'assets/tiles.png');
    this.load.tilemapTiledJSON('main_map', 'assets/maps/main.json');
  }

  private showLogo() {
    this.logo = this.add.sprite(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'studio_logo'
    );
    
    this.logo.setAlpha(0);
    
    // Анимация появления логотипа
    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Задержка перед исчезновением
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.logo,
            alpha: 0,
            duration: 1000,
            ease: 'Power2'
          });
        });
      }
    });
  }
}