// src/scenes/DialogScene.tsx
import Phaser from 'phaser';
import { DialogKey, DialogState } from '../constants/dialog';
import { DialogData, DialogLine } from '../types/dialog';

export class DialogScene extends Phaser.Scene {
  private dialogData!: DialogData;
  private currentLine!: DialogLine;
  private dialogState: string = DialogState.TYPING;
  private currentText: string = '';
  private typewriterSpeed: number = 50;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private selectedChoice: number = 0;
  
  // UI элементы
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private hintText!: Phaser.GameObjects.Text;
  
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
    
    // Затемняем фон
    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.7);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    
    // Создаем диалоговое окно
    this.createDialogUI();
    
    // Настраиваем управление
    this.setupControls();
    
    // Начинаем диалог
    this.startDialog();
  }

  private createDialogUI() {
    // Фон диалогового окна
    this.dialogBox = this.add.rectangle(400, 450, 700, 200, 0x000000, 0.9);
    this.dialogBox.setStrokeStyle(2, 0xffff00);
    
    // Имя говорящего
    this.speakerText = this.add.text(100, 380, '', {
      font: 'bold 20px monospace',
      color: '#ffff00',
      backgroundColor: '#00000080',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    });
    
    // Текст диалога
    this.dialogText = this.add.text(100, 420, '', {
      font: '18px monospace',
      color: '#ffffff',
      backgroundColor: '#000000c0',
      padding: { left: 15, right: 15, top: 10, bottom: 10 },
      wordWrap: { width: 600 }
    });
    
    // Подсказка управления
    this.hintText = this.add.text(400, 530, '', {
      font: '14px monospace',
      color: '#888888',
      backgroundColor: '#00000080',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    });
    this.hintText.setOrigin(0.5);
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
    
    // Очищаем выборы
    this.clearChoices();
    
    // Обновляем подсказку
    this.hintText.setText('SPACE - Пропустить');
    
    let index = 0;
    const text = this.currentLine.text;
    
    // Очищаем предыдущий таймер
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    
    // Обновляем имя говорящего
    this.speakerText.setText(this.currentLine.speaker || this.dialogData.name);
    
    this.typewriterTimer = this.time.addEvent({
      delay: this.typewriterSpeed,
      callback: () => {
        if (index < text.length) {
          this.currentText += text.charAt(index);
          this.dialogText.setText(this.currentText);
          index++;
        } else {
          this.finishTyping();
        }
      },
      callbackScope: this,
      repeat: text.length
    });
  }

  private finishTyping() {
    this.dialogState = DialogState.WAITING;
    
    if (this.currentLine.choices && this.currentLine.choices.length > 0) {
      this.dialogState = DialogState.CHOICE;
      this.selectedChoice = 0;
      this.showChoices();
      this.hintText.setText('W/S - Выбор, ENTER - Подтвердить, ESC - Выйти');
    } else {
      this.hintText.setText('SPACE/ENTER - Продолжить, ESC - Выйти');
    }
  }

  private showChoices() {
    this.clearChoices();
    
    if (!this.currentLine.choices) return;
    
    this.currentLine.choices.forEach((choice, index) => {
      const isSelected = index === this.selectedChoice;
      const choiceText = this.add.text(
        120,
        460 + index * 35,
        `${isSelected ? '> ' : '  '}${choice.text}`,
        {
          font: '18px monospace',
          color: isSelected ? '#ffff00' : '#cccccc',
          backgroundColor: isSelected ? '#33330080' : '#00000080',
          padding: { left: 15, right: 15, top: 8, bottom: 8 }
        }
      );
      
      // Добавляем интерактивность
      choiceText.setInteractive({ useHandCursor: true });
      choiceText.on('pointerdown', () => {
        this.selectChoice(index);
      });
      
      this.choiceTexts.push(choiceText);
    });
  }

  private clearChoices() {
    this.choiceTexts.forEach(choice => choice.destroy());
    this.choiceTexts = [];
  }

  private nextLine() {
    if (!this.currentLine.next) {
      this.endDialog();
      return;
    }
    
    let nextLineId: string;
    
    if (Array.isArray(this.currentLine.next)) {
      // Случайный выбор из массива
      nextLineId = this.currentLine.next[Math.floor(Math.random() * this.currentLine.next.length)];
    } else {
      nextLineId = this.currentLine.next;
    }
    
    this.currentLine = this.dialogData.lines[nextLineId];
    
    if (!this.currentLine) {
      console.error('Следующая реплика не найдена:', nextLineId);
      this.endDialog();
      return;
    }
    
    this.startTyping();
  }

  private selectChoice(index: number) {
    if (!this.currentLine.choices || index >= this.currentLine.choices.length) {
      return;
    }
    
    const choice = this.currentLine.choices[index];
    this.currentLine = this.dialogData.lines[choice.next];
    
    if (!this.currentLine) {
      console.error('Реплика выбора не найдена:', choice.next);
      this.endDialog();
      return;
    }
    
    this.startTyping();
  }

  private setupControls() {
    // Пропускаем текст
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.dialogState === DialogState.TYPING) {
        this.skipTyping();
      } else if (this.dialogState === DialogState.WAITING) {
        this.nextLine();
      }
    });
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.dialogState === DialogState.TYPING) {
        this.skipTyping();
      } else if (this.dialogState === DialogState.WAITING) {
        this.nextLine();
      } else if (this.dialogState === DialogState.CHOICE) {
        this.selectChoice(this.selectedChoice);
      }
    });
    
    // Выбор вариантов
    this.input.keyboard?.on('keydown-W', () => {
      if (this.dialogState === DialogState.CHOICE) {
        this.selectedChoice = Math.max(0, this.selectedChoice - 1);
        this.updateChoicesSelection();
      }
    });
    
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.dialogState === DialogState.CHOICE) {
        this.selectedChoice = Math.max(0, this.selectedChoice - 1);
        this.updateChoicesSelection();
      }
    });
    
    this.input.keyboard?.on('keydown-S', () => {
      if (this.dialogState === DialogState.CHOICE) {
        this.selectedChoice = Math.min(
          (this.currentLine.choices?.length || 1) - 1,
          this.selectedChoice + 1
        );
        this.updateChoicesSelection();
      }
    });
    
    this.input.keyboard?.on('keydown-DOWN', () => {
      if (this.dialogState === DialogState.CHOICE) {
        this.selectedChoice = Math.min(
          (this.currentLine.choices?.length || 1) - 1,
          this.selectedChoice + 1
        );
        this.updateChoicesSelection();
      }
    });
    
    // Выход из диалога
    this.input.keyboard?.on('keydown-ESC', () => {
      this.endDialog();
    });
    
    this.input.keyboard?.on('keydown-Q', () => {
      this.endDialog();
    });
  }

  private skipTyping() {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = undefined;
    }
    this.currentText = this.currentLine.text;
    this.dialogText.setText(this.currentText);
    this.finishTyping();
  }

  private updateChoicesSelection() {
    if (!this.currentLine.choices) return;
    
    this.currentLine.choices.forEach((choice, index) => {
      const choiceText = this.choiceTexts[index];
      if (choiceText) {
        const isSelected = index === this.selectedChoice;
        choiceText.setText(`${isSelected ? '> ' : '  '}${choice.text}`);
        choiceText.setStyle({
          color: isSelected ? '#ffff00' : '#cccccc',
          backgroundColor: isSelected ? '#33330080' : '#00000080'
        });
      }
    });
  }

  private endDialog() {
    console.log('💬 Диалог завершен');
    
    // Убираем таймер если есть
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = undefined;
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

  update() {
    // Можно добавить мигающий курсор или другие эффекты
  }
}