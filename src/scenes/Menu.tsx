// src/scenes/Menu.ts
import { Scene } from 'phaser';
import { key } from '../constants';

export class Menu extends Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedButtonIndex: number = 0;
  private menuMusic!: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private title!: Phaser.GameObjects.Text;
  private background!: Phaser.GameObjects.TileSprite;
  private stars: Phaser.GameObjects.Star[] = [];
  private escListener: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super(key.scene.menu);
  }

  init(data: any) {
    console.log('🎮 Меню запущено, данные:', data);
  }

  create() {
    console.log('🎮 Создание главного меню');
    
    // Создание космического фона
    //this.createBackground();
    
    // Создание заголовка
    this.createTitle();
    
    // Создание кнопок меню
    this.createMenuButtons();
    
    // Настройка звуков
    this.setupAudio();
    
    // Настройка управления
    this.setupControls();
    
    // Запускаем анимации
    this.startAnimations();
    
    // Эффект появления
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createBackground() {
    // Космический фон
    if (this.textures.exists('bg_stars')) {
      this.background = this.add.tileSprite(400, 300, 800, 600, 'bg_stars')
        .setAlpha(0);
    } else {
      // Создаем градиентный фон программно если нет текстуры
      const graphics = this.add.graphics();
      
      // Ручной градиент (вертикальный от темно-синего к черному)
      graphics.fillStyle(0x000428, 1);
      graphics.fillRect(0, 0, 800, 300);
      graphics.fillStyle(0x004e92, 1);
      graphics.fillRect(0, 300, 800, 300);
      
      graphics.setAlpha(0);
      this.background = this.add.tileSprite(400, 300, 800, 600, '__WHITE');
      this.background.setTexture('__WHITE');
      this.background.setAlpha(0);
    }
    
    // Создаем звезды на заднем плане
    this.createStars();
    
    // Анимация появления
    this.tweens.add({
      targets: this.background,
      alpha: 1,
      duration: 1500,
      ease: 'Power2'
    });
  }

  private createStars() {
    // Создаем 50 случайных звезд
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(0, 600);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      
      // Создаем звезду или круг если нет звезды
      let star: Phaser.GameObjects.Shape;
      
      try {
        star = this.add.star(x, y, 5, 10, 20, 0xffffff);
      } catch {
        // Если метод star не доступен, используем круг
        star = this.add.circle(x, y, size * 5, 0xffffff);
      }
      
      star.setScale(size);
      star.setAlpha(0);
      this.stars.push(star as any);
      
      // Анимация появления с задержкой
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
        duration: 1000,
        delay: i * 20,
        ease: 'Power2'
      });
    }
    
    // Мерцание звезд
    this.time.addEvent({
      delay: 100,
      callback: () => {
        this.stars.forEach(star => {
          if (Math.random() > 0.7) {
            this.tweens.add({
              targets: star,
              alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.3, 1) },
              duration: 300,
              ease: 'Sine.easeInOut'
            });
          }
        });
      },
      callbackScope: this,
      loop: true
    });
  }

  private createTitle() {
    // Заголовок игры с эффектом
    this.title = this.add.text(400, 150, 'SitHond Game Studios', {
      font: 'bold 48px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#000000',
        blur: 0,
        stroke: true
      }
    })
    .setOrigin(0.5)
    .setScale(0)
    .setAlpha(0);
    
    // Анимация появления заголовка
    this.tweens.add({
      targets: this.title,
      scale: 1,
      alpha: 1,
      duration: 1200,
      ease: 'Back.easeOut',
      delay: 500
    });
    
    // Эффект мерцания заголовка
    this.tweens.add({
      targets: this.title,
      alpha: 0.9,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createMenuButtons() {
    const { centerX, centerY } = this.cameras.main;
    
    // Массив пунктов меню
    const menuItems = [
      { text: '▶ НАЧАТЬ ИГРУ', action: () => this.startGame() },
      { text: '🎮 УПРАВЛЕНИЕ', action: () => this.showControls() },
      { text: '⚙ НАСТРОЙКИ', action: () => this.openSettings() },
      { text: '🏆 ОБ АВТОРЕ', action: () => this.showCredits() },
      { text: '❌ ВЫЙТИ', action: () => this.exitGame() }
    ];
    
    // Создаем кнопки
    menuItems.forEach((item, index) => {
      const button = this.add.text(centerX, centerY + (index * 70), item.text, {
        font: 'bold 28px "Courier New"',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { left: 30, right: 30, top: 12, bottom: 12 },
        stroke: '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 0,
          stroke: true
        }
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
      
      // Анимация появления
      this.tweens.add({
        targets: button,
        alpha: 1,
        y: button.y - 20,
        duration: 600,
        ease: 'Power2',
        delay: 800 + (index * 100)
      });
      
      // Эффекты при наведении
      button.on('pointerover', () => {
        this.selectButton(index);
        this.playSound('menu_select');
        button.setStyle({ 
          color: '#ffff00', 
          backgroundColor: '#333300c0',
          stroke: '#ffff00'
        });
      });
      
      button.on('pointerout', () => {
        button.setStyle({ 
          color: '#ffffff', 
          backgroundColor: '#00000080',
          stroke: '#000000'
        });
      });
      
      button.on('pointerdown', () => {
        this.playSound('menu_confirm');
        // Анимация нажатия
        this.tweens.add({
          targets: button,
          scale: 0.95,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            item.action();
          }
        });
      });
      
      this.buttons.push(button);
    });
    
    // Выделяем первую кнопку
    this.selectButton(0);
  }

  private setupAudio() {
    try {
      // Фоновая музыка
      const music = this.sound.add('menu_music', {
        volume: 0,
        loop: true
      }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
      
      this.menuMusic = music;
      music.play();
      
      // Плавное увеличение громкости
      this.tweens.add({
        targets: music,
        volume: 0.4,
        duration: 2000,
        ease: 'Power2'
      });
    } catch (error) {
      console.log('Музыка меню не загружена, продолжаем без неё');
    }
  }

  private setupControls() {
    // Навигация по меню с клавиатуры
    const navigate = (direction: number) => {
      this.playSound('menu_select');
      const newIndex = this.selectedButtonIndex + direction;
      
      if (newIndex >= 0 && newIndex < this.buttons.length) {
        this.selectButton(newIndex);
      } else if (newIndex < 0) {
        this.selectButton(this.buttons.length - 1);
      } else {
        this.selectButton(0);
      }
    };
    
    // Создаем слушатели клавиш
    this.input.keyboard?.on('keydown-UP', () => navigate(-1));
    this.input.keyboard?.on('keydown-W', () => navigate(-1));
    this.input.keyboard?.on('keydown-DOWN', () => navigate(1));
    this.input.keyboard?.on('keydown-S', () => navigate(1));
    
    // Активация выбранной кнопки
    this.input.keyboard?.on('keydown-ENTER', () => this.activateSelectedButton());
    this.input.keyboard?.on('keydown-SPACE', () => this.activateSelectedButton());
    
    // Выход из игры (сохраняем ссылку на слушатель)
    this.escListener = this.input.keyboard?.addKey('ESC') || null;
    if (this.escListener) {
      this.escListener.on('down', () => this.exitGame());
    }
  }

  private selectButton(index: number) {
  // Проверяем что кнопки существуют
  if (!this.buttons || this.buttons.length === 0) return;
  
  // Сбрасываем все кнопки
  this.buttons.forEach((button, i) => {
    if (button && !button.active) return; // Пропускаем уничтоженные кнопки
    
    if (i === index) {
      button.setStyle({ 
        color: '#ffff00', 
        backgroundColor: '#333300c0',
        stroke: '#ffff00',
        strokeThickness: 4
      });
      
      // Эффект пульсации для выбранной кнопки
      this.tweens.add({
        targets: button,
        scale: 1.05,
        duration: 200,
        ease: 'Power2'
      });
    } else {
      button.setStyle({ 
        color: '#ffffff', 
        backgroundColor: '#00000080',
        stroke: '#000000',
        strokeThickness: 3
      });
      button.setScale(1);
    }
  });
  
  this.selectedButtonIndex = index;
}

  private activateSelectedButton() {
    this.playSound('menu_confirm');
    
    const actions = [
      () => this.startGame(),
      () => this.showControls(),
      () => this.openSettings(),
      () => this.showCredits(),
      () => this.exitGame()
    ];
    
    if (actions[this.selectedButtonIndex]) {
      actions[this.selectedButtonIndex]();
    }
  }

  private startAnimations() {
    // Параллакс эффект для фона
    this.time.addEvent({
      delay: 50,
      callback: () => {
        if (this.background && this.background instanceof Phaser.GameObjects.TileSprite) {
          this.background.tilePositionX += 0.1;
          this.background.tilePositionY += 0.05;
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  private startGame() {
    console.log('🚀 Запуск игры...');
    
    // Эффект перехода
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    // Плавное затухание музыки
    if (this.menuMusic) {
      this.tweens.add({
        targets: this.menuMusic,
        volume: 0,
        duration: 800,
        onComplete: () => {
          this.menuMusic.stop();
        }
      });
    }
    
    // Запуск основной игры
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key.scene.main);
    });
  }

  private showControls() {
    const controlsText = `
УПРАВЛЕНИЕ:

W/A/S/D или стрелки - Движение
E - Взаимодействие с NPC
Пробел/Z - Продолжить диалог
ESC - Меню/Выход
B - Тест битвы (отладка)
F1 - Информация (отладка)
    `;
    
    this.showMessage('Управление', controlsText);
  }

  private openSettings() {
    // Пока временное сообщение
    this.showMessage('Настройки', 'Раздел настроек в разработке!');
  }

  private showCredits() {
    const credits = `
SitHond Game Studios

Разработчик: SitHond
Дизайн уровней: SitHond
Арты и анимации: SitHond
Графика: Phaser Assets
Музыка: Creative Commons

Специальная благодарность:
- Phaser 3 Team
- Сообществу разработчиков
- Всем тестерам!
    `;
    
    this.showMessage('Об авторe', credits);
  }

  private exitGame() {
    const message = this.add.text(400, 300, 'Спасибо за игру!', {
      font: '36px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 6
    })
    .setOrigin(0.5)
    .setAlpha(0);
    
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // В веб-версии можно показать сообщение
        this.time.delayedCall(2000, () => {
          // Если игра в браузере
          if (typeof window !== 'undefined') {
            // Можно показать алерт
            alert('Спасибо за игру! Обновляем страницу...');
            // location.reload();
            // Или просто скрыть сообщение
            message.destroy();
          } else {
            message.destroy();
          }
        });
      }
    });
  }

  private showMessage(title: string, text: string) {
    // Создаем затемненный фон
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8)
      .setInteractive()
      .setDepth(9999);
    
    // Окно сообщения
    const window = this.add.rectangle(400, 300, 600, 400, 0x1a1a2e)
      .setStrokeStyle(4, 0xffff00)
      .setDepth(10000);
    
    // Заголовок
    const titleText = this.add.text(400, 180, title, {
      font: 'bold 32px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(10000);
    
    // Текст
    const contentText = this.add.text(400, 300, text, {
      font: '20px "Courier New"',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: 500 }
    }).setOrigin(0.5).setDepth(10000);
    
    // Кнопка закрытия
    const closeButton = this.add.text(400, 420, 'ЗАКРЫТЬ (ESC)', {
      font: 'bold 24px "Courier New"',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      stroke: '#000000',
      strokeThickness: 3
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(10000);
    
    closeButton.on('pointerover', () => {
      closeButton.setStyle({ color: '#ffff00', backgroundColor: '#333300c0' });
      this.playSound('menu_select');
    });
    
    closeButton.on('pointerout', () => {
      closeButton.setStyle({ color: '#ffffff', backgroundColor: '#00000080' });
    });
    
    const closeAll = () => {
      this.playSound('menu_confirm');
      [overlay, window, titleText, contentText, closeButton].forEach(obj => obj.destroy());
      // Удаляем ESC слушатель если он создан
      if (this.escListener) {
        this.escListener.off('down');
      }
    };
    
    closeButton.on('pointerdown', closeAll);
    
    // Закрытие по ESC
    const tempEscListener = this.input.keyboard?.addKey('ESC');
    if (tempEscListener) {
      tempEscListener.once('down', closeAll);
    }
  }

  private playSound(soundName: string) {
    try {
      this.sound.play(soundName, { volume: 0.5 });
    } catch {
      // Игнорируем если звук не загружен
    }
  }

  update() {
    // Обновление анимаций
    if (this.title) {
      if (this.time.now % 100 < 50) {
        this.title.setStroke('#ff8800', 6);
      } else {
        this.title.setStroke('#ffff00', 6);
      }
    }
  }

  shutdown() {
    // Очистка при закрытии сцены
    if (this.menuMusic) {
      this.menuMusic.stop();
    }
    
    // Удаляем слушатель ESC
    if (this.escListener) {
      this.escListener.destroy();
    }
    
    // Очищаем массив звезд
    this.stars = [];
    
    console.log('🎮 Меню закрыто');
  }
}