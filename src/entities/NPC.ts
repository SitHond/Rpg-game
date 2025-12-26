// src/entities/NPC.ts
import Phaser from 'phaser';
import { DialogData } from '../../src/types/dialog';

export interface NPCConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  frame?: string;
  dialogId: string;
  facing?: 'left' | 'right' | 'front' | 'back';
  interactRange?: number;
}

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public config: NPCConfig;
  public dialogData?: DialogData;
  public isInteractable: boolean = false;
  private interactIndicator?: Phaser.GameObjects.Graphics;
  private interactionZone?: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    super(scene, config.x, config.y, config.texture, config.frame);
    
    this.config = config;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setImmovable(true);
    this.setDepth(10);
    
    // Создаем зону взаимодействия
    this.createInteractionZone();
    
    // Создаем индикатор взаимодействия
    this.createInteractIndicator();
  }

  private createInteractionZone() {
    const range = this.config.interactRange || 50;
    this.interactionZone = this.scene.physics.add.staticBody(
      this.x,
      this.y,
      range * 2,
      range * 2
    );
    
    (this.interactionZone as any).npc = this;
  }

  private createInteractIndicator() {
    this.interactIndicator = this.scene.add.graphics();
    this.updateInteractIndicator();
  }

  public updateInteractIndicator() {
    if (!this.interactIndicator) return;
    
    this.interactIndicator.clear();
    
    if (this.isInteractable) {
      // Рисуем индикатор (например, восклицательный знак или круг)
      this.interactIndicator.fillStyle(0xffff00, 0.8);
      this.interactIndicator.fillCircle(this.x, this.y - 60, 10);
      
      // Текст подсказки
      const text = this.scene.add.text(
        this.x,
        this.y - 80,
        '[E] Поговорить',
        {
          fontSize: '14px',
          color: '#ffff00',
          backgroundColor: '#00000080',
          padding: { x: 5, y: 3 }
        }
      );
      text.setOrigin(0.5);
      text.setDepth(1000);
      
      // Автоудаление через время
      this.scene.time.delayedCall(3000, () => text.destroy());
    }
  }

  public setInteractable(state: boolean) {
    this.isInteractable = state;
    this.updateInteractIndicator();
  }

  public setDialogData(data: DialogData) {
    this.dialogData = data;
  }

  public interact() {
    if (!this.dialogData) {
      console.warn(`NPC ${this.config.name} не имеет данных диалога`);
      return;
    }
    
    console.log(`Взаимодействие с NPC: ${this.config.name}`);
    return this.dialogData;
  }

  public update() {
    // Можно добавить анимации или поведение NPC
  }

  public destroy() {
    if (this.interactIndicator) {
      this.interactIndicator.destroy();
    }
    super.destroy();
  }
}