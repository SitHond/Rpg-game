// src/scenes/DialogScene.tsx
import Phaser from 'phaser';
import { DialogKey, DialogState } from '../constants/dialog';
import { DialogData, DialogLine } from '../types/dialog';

export class DialogScene extends Phaser.Scene {
  private dialogData!: DialogData;
  private currentLine!: DialogLine;
  private dialogState: string = DialogState.TYPING;
  private currentText: string = '';
  private typewriterSpeed: number = 30; // Быстрее для Undertale стиля
  private typewriterTimer?: Phaser.Time.TimerEvent;
  
  // UI элементы
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private portraitSprite!: Phaser.GameObjects.Sprite;
  
  // Эффекты Undertale
  private textSound!: Phaser.Sound.BaseSound;
  private blinkTimer!: Phaser.Time.TimerEvent;
  
  constructor() {
    super(DialogKey.scene);
  }

  init(data: { dialogData: DialogData }) {
    console.log('💬 DialogScene init:', data);
    
    if (!data?.dialogData) {
      console.error('Диалоговые данные не предоставлены');
      this.scene.stop();
      return;
    }
    
    this.dialogData = data.dialogData;
  }

  create() {
    console.log('💬 DialogScene create');
    
    // Затемняем фон (как в Undertale)
    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.5);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    
    // Создаем диалоговое окно в стиле Undertale
    this.createUndertaleDialogUI();
    
    // Настраиваем управление
    this.setupUndertaleControls();
    
    // Начинаем диалог
    this.startDialog();
    
    // Добавляем звук печатания текста (опционально)
    this.setupSounds();
  }

  private createUndertaleDialogUI() {
    // Фон диалогового окна (черная полоса как в Undertale)
    this.dialogBox = this.add.rectangle(0, 400, 800, 200, 0x000000, 0.95);
    this.dialogBox.setOrigin(0, 0);
    this.dialogBox.setStrokeStyle(3, 0xffffff);
    
    // Портрет персонажа (если есть)
    if (this.dialogData.portrait) {
      this.portraitSprite = this.add.sprite(50, 450, this.dialogData.portrait);
      this.portraitSprite.setScale(0.8);
      this.portraitSprite.setAlpha(0);
      
      // Плавное появление
      this.tweens.add({
        targets: this.portraitSprite,
        alpha: 1,
        duration: 500,
        ease: 'Power2'
      });
    }
    
    // Имя говорящего (желтый текст как в Undertale)
    this.speakerText = this.add.text(120, 420, '', {
      font: 'bold 22px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        stroke: true
      }
    });
    
    // Текст диалога (белый текст с черной обводкой)
    this.dialogText = this.add.text(120, 460, '', {
      font: '20px "Courier New"',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      wordWrap: { width: 650 }
    });
    
    // Подсказка управления (полупрозрачная)
    this.hintText = this.add.text(400, 550, '[Z] Продолжить • [X] Пропустить', {
      font: '16px "Courier New"',
      color: '#888888',
      backgroundColor: '#00000040',
      padding: { left: 15, right: 15, top: 8, bottom: 8 }
    });
    this.hintText.setOrigin(0.5);
    
    // Индикатор продолжения (мигающий треугольник)
    this.continueIndicator = this.add.text(750, 550, '▼', {
      font: '20px "Courier New"',
      color: '#ffff00',
      //alpha: 0
    });
    this.continueIndicator.setOrigin(1, 0.5);
    
    // Эффект появления UI
    this.tweens.add({
      targets: [this.dialogBox, this.speakerText, this.dialogText, this.hintText],
      y: '-=10',
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private setupSounds() {
    try {
      // Звук печатания текста (похожий на Undertale)
      this.textSound = this.sound.add('dialog_text', { volume: 0.1 });
    } catch {
      // Если звук не загружен, игнорируем
    }
  }

  private startDialog() {
    const startLineId = this.dialogData.start;
    this.currentLine = this.dialogData.lines[startLineId];
    
    if (!this.currentLine) {
      console.error('Начальная реплика не найдена:', startLineId);
      this.endDialog();
      return;
    }
    
    this.startTyping();
  }

  private startTyping() {
    this.dialogState = DialogState.TYPING;
    this.currentText = '';
    
    // Обновляем имя говорящего
    const speakerName = this.currentLine.speaker || this.dialogData.name;
    this.speakerText.setText(speakerName);
    
    // Скрываем индикатор продолжения
    this.hideContinueIndicator();
    
    // Обновляем подсказку
    this.hintText.setText('[Z] Продолжить • [X] Пропустить');
    
    // Очищаем предыдущий таймер
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    
    // Начинаем печатать текст
    const fullText = this.currentLine.text;
    let index = 0;
    let soundCounter = 0;
    
    this.typewriterTimer = this.time.addEvent({
      delay: this.typewriterSpeed,
      callback: () => {
        if (index < fullText.length) {
          // Добавляем символ
          this.currentText += fullText.charAt(index);
          this.dialogText.setText(this.currentText);
          
          // Проигрываем звук печатания (каждый 3-й символ для экономии)
          if (this.textSound && soundCounter % 3 === 0) {
            this.textSound.play();
          }
          
          index++;
          soundCounter++;
        } else {
          this.finishTyping();
        }
      },
      callbackScope: this,
      repeat: fullText.length
    });
  }

  private finishTyping() {
    this.dialogState = DialogState.WAITING;
    
    // Показываем мигающий индикатор продолжения
    this.showContinueIndicator();
    
    // Обновляем подсказку
    this.hintText.setText('[Z/Пробел] Продолжить • [X] Выйти');
    
    // Удаляем таймер
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = undefined;
    }
  }

  private showContinueIndicator() {
    this.continueIndicator.setAlpha(1);
    
    // Мигающая анимация
    this.blinkTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.continueIndicator.setAlpha(this.continueIndicator.alpha === 0 ? 1 : 0);
      },
      callbackScope: this,
      loop: true
    });
  }

  private hideContinueIndicator() {
    this.continueIndicator.setAlpha(0);
    if (this.blinkTimer) {
      this.blinkTimer.remove();
    }
  }

  private nextLine() {
    if (!this.currentLine.next) {
      this.endDialog();
      return;
    }
    
    let nextLineId: string;
    
    if (Array.isArray(this.currentLine.next)) {
      // Случайный выбор из массива (для разнообразия диалогов)
      nextLineId = this.currentLine.next[Math.floor(Math.random() * this.currentLine.next.length)];
    } else {
      nextLineId = this.currentLine.next;
    }
    
    if (nextLineId === 'close') {
      this.endDialog();
      return;
    }
    
    this.currentLine = this.dialogData.lines[nextLineId];
    
    if (!this.currentLine) {
      console.error('Следующая реплика не найдена:', nextLineId);
      this.endDialog();
      return;
    }
    
    this.startTyping();
  }

  private setupUndertaleControls() {
    // Основная кнопка продолжения (Z как в Undertale)
    this.input.keyboard?.on('keydown-Z', () => {
      this.handleContinue();
    });
    
    // Пробел для продолжения
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.handleContinue();
    });
    
    // Клик мышкой для продолжения
    this.input.on('pointerdown', () => {
      this.handleContinue();
    });
    
    // Кнопка пропуска (X как в Undertale)
    this.input.keyboard?.on('keydown-X', () => {
      if (this.dialogState === DialogState.TYPING) {
        this.skipTyping();
      } else {
        this.endDialog();
      }
    });
    
    // Выход из диалога
    this.input.keyboard?.on('keydown-ESC', () => {
      this.endDialog();
    });
    
    // Настройка мыши
    this.input.mouse?.disableContextMenu();
  }

  private handleContinue() {
    if (this.dialogState === DialogState.TYPING) {
      this.skipTyping();
    } else if (this.dialogState === DialogState.WAITING) {
      this.nextLine();
    }
  }

  private skipTyping() {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = undefined;
    }
    
    // Показываем весь текст сразу
    this.currentText = this.currentLine.text;
    this.dialogText.setText(this.currentText);
    
    // Проигрываем звук завершения
    if (this.textSound) {
      this.textSound.stop();
    }
    
    this.finishTyping();
  }

  private endDialog() {
    console.log('💬 Диалог завершен');
    
    // Эффект исчезновения
    this.tweens.add({
      targets: [this.dialogBox, this.speakerText, this.dialogText, this.hintText, this.continueIndicator],
      alpha: 0,
      y: '+=10',
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Убираем таймеры
        if (this.typewriterTimer) {
          this.typewriterTimer.remove();
          this.typewriterTimer = undefined;
        }
        
        if (this.blinkTimer) {
          this.blinkTimer.remove();
        }
        
        // Удаляем звук
        if (this.textSound) {
          this.textSound.stop();
        }
        
        // Возобновляем основную сцену
        this.scene.stop(DialogKey.scene);
        this.scene.resume('main');
        
        // Уведомляем основную сцену
        const mainScene = this.scene.get('main');
        if (mainScene && (mainScene as any).onDialogEnd) {
          (mainScene as any).onDialogEnd();
        }
      }
    });
  }

  update() {
    // Можем добавить дополнительные визуальные эффекты
  }
}