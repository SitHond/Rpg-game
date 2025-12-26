// src/scenes/Boot.ts
import { Scene } from 'phaser';
import * as assets from '../assets';
import { key } from '../constants';

export class Boot extends Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;

  constructor() {
    super(key.scene.boot);
  }

  preload() {
    // Создаем прогресс-бар
    this.createProgressBar();
    
    // Начинаем загрузку
    this.loadAssets();
    
    // Настройка событий загрузки
    this.setupLoadEvents();
  }

  private createProgressBar() {
    const width = 400;
    const height = 30;
    const x = this.cameras.main.centerX - width / 2;
    const y = this.cameras.main.centerY - height / 2;

    // Фон прогресс-бара
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(x, y, width, height);
    this.progressBox.setDepth(100);

    // Текст "Загрузка..."
    this.loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'Загрузка игры...',
      {
        font: '20px "Courier New"',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.loadingText.setOrigin(0.5);
    this.loadingText.setDepth(100);

    // Процент загрузки
    this.percentText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      '0%',
      {
        font: '18px "Courier New"',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    this.percentText.setOrigin(0.5);
    this.percentText.setDepth(100);

    // Название загружаемого файла
    this.assetText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 80,
      '',
      {
        font: '16px "Courier New"',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.assetText.setOrigin(0.5);
    this.assetText.setDepth(100);

    // Сам прогресс-бар
    this.progressBar = this.add.graphics();
    this.progressBar.setDepth(100);
  }

  private loadAssets() {
    // Критические ассеты для игры (должны быть загружены до старта)
    console.log('🚀 Загрузка критических ассетов...');
    
    // Игрок
    this.load.spritesheet(key.image.spaceman, assets.sprites.spaceman, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.atlas(key.atlas.player, assets.atlas.image, assets.atlas.data);
    
    // Карта
    this.load.image(key.image.tuxemon, assets.tilesets.tuxemon);
    this.load.tilemapTiledJSON(key.tilemap.tuxemon, assets.tilemaps.tuxemon);
    
    // NPC текстуры
    this.load.image('npc_villager', 'assets/npcs/villager.png');
    this.load.image('npc_shopkeeper', 'assets/npcs/shopkeeper.png');
    this.load.image('npc_guard', 'assets/npcs/guard.png');
    
    // UI элементы
    this.load.image('ui_heart', 'assets/ui/heart.png');
    this.load.image('ui_sword', 'assets/ui/sword.png');
    this.load.image('ui_shield', 'assets/ui/shield.png');
    
    // Звуки
    this.load.audio('menu_music', 'assets/music/menu.mp3');
    this.load.audio('menu_select', 'assets/sounds/menu_select.wav');
    this.load.audio('menu_confirm', 'assets/sounds/menu_confirm.wav');
    this.load.audio('dialog_text', 'assets/sounds/dialog_text.wav');
  }

  private setupLoadEvents() {
    // Прогресс загрузки
    this.load.on('progress', (value: number) => {
      const width = 400;
      const height = 30;
      const x = this.cameras.main.centerX - width / 2;
      const y = this.cameras.main.centerY - height / 2;
      
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffff00, 1);
      this.progressBar.fillRect(
        x + 5, 
        y + 5, 
        (width - 10) * value, 
        height - 10
      );
      
      const percent = Math.floor(value * 100);
      this.percentText.setText(`${percent}%`);
    });

    // При загрузке файла
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText(`Загрузка: ${file.key}`);
    });

    // При завершении загрузки
    this.load.on('complete', () => {
      console.log('✅ Все ассеты загружены');
      
      // Эффект завершения
      this.tweens.add({
        targets: [this.progressBar, this.progressBox, this.percentText, this.assetText],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          // Запускаем главное меню
          this.scene.start(key.scene.menu);
        }
      });
      
      // Оставляем только текст загрузки
      this.loadingText.setText('Готово!');
      this.tweens.add({
        targets: this.loadingText,
        scale: 1.2,
        color: '#00ff00',
        duration: 300,
        yoyo: true,
        repeat: 1
      });
    });
  }

  create() {
    // Создаем placeholder текстуры если их нет
    if (!this.textures.exists('bg_stars')) {
      const graphics = this.add.graphics();
      // Простой звездный фон
      for (let i = 0; i < 200; i++) {
        const x = Phaser.Math.Between(0, 800);
        const y = Phaser.Math.Between(0, 600);
        const size = Phaser.Math.FloatBetween(0.5, 1.5);
        graphics.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 0.8));
        graphics.fillCircle(x, y, size);
      }
      graphics.generateTexture('bg_stars', 800, 600);
      graphics.destroy();
    }
    // Резервный запуск если что-то пошло не так
    this.time.delayedCall(10000, () => {
      console.warn('⚠️ Загрузка превысила таймаут, запускаем игру...');
      this.scene.start(key.scene.menu);
    });
  }
}