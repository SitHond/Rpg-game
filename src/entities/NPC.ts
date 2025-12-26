import Phaser from 'phaser';

export interface NPCSettings {
  npcId: string;
  displayName: string;
  spriteKey: string;
  spriteFrame?: string;
  dialogueId: string;
  mapId?: string;
  spawnPosition?: { x: number; y: number };
  canWander?: boolean;
  wanderDistance?: number;
}

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public npcSettings: NPCSettings;
  public dialogue: any;
  public canInteract: boolean = false;
  public alreadySpoken: boolean = false;
  
  private indicator!: Phaser.GameObjects.Graphics;
  private wanderEvent?: Phaser.Time.TimerEvent;
  private wanderGoal?: { x: number; y: number };
  private basePosition: { x: number; y: number };

  constructor(
    scene: Phaser.Scene, 
    settings: NPCSettings, 
    dialogue: any,
    position?: { x: number; y: number }
  ) {
    const spawnPos = position || settings.spawnPosition || { x: 100, y: 100 };
    
    // Проверяем наличие текстуры
    if (!scene.textures.exists(settings.spriteKey)) {
      console.warn(`Текстура не найдена: ${settings.spriteKey}`);
    }
    
    super(scene, spawnPos.x, spawnPos.y, settings.spriteKey);
    
    this.npcSettings = settings;
    this.dialogue = dialogue;
    this.basePosition = { x: spawnPos.x, y: spawnPos.y };
    
    // Добавляем спрайт в сцену
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setImmovable(true);
    this.setDepth(50);
    this.setOrigin(0.5, 1);
    
    // Устанавливаем размер для коллизии
    this.setSize(16, 16);
    this.setOffset(8, 16);
    
    // Создаем индикатор
    this.createIndicator();
    
    // Начинаем блуждание если нужно
    if (this.npcSettings.canWander) {
      this.startWandering();
    }
  }

  private createIndicator() {
    this.indicator = this.scene.add.graphics();
    this.refreshIndicator();
  }

  private refreshIndicator() {
    if (!this.indicator) return;
    
    this.indicator.clear();
    
    if (this.canInteract) {
      // Рисуем желтый круг над головой
      this.indicator.fillStyle(0xffff00, 0.8);
      this.indicator.fillCircle(0, -60, 8);
      
      // Контур
      this.indicator.lineStyle(2, 0x000000, 0.5);
      this.indicator.strokeCircle(0, -60, 8);
    }
  }

  private startWandering() {
    if (!this.npcSettings.canWander || !this.npcSettings.wanderDistance) return;
    
    this.wanderEvent = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000),
      callback: () => {
        if (this.canInteract || !this.scene) return;
        
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(10, this.npcSettings.wanderDistance!);
        
        this.wanderGoal = {
          x: this.basePosition.x + Math.cos(angle) * distance,
          y: this.basePosition.y + Math.sin(angle) * distance
        };
        
        this.scene.tweens.add({
          targets: this,
          x: this.wanderGoal.x,
          y: this.wanderGoal.y,
          duration: 1000,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.wanderGoal = undefined;
          }
        });
      },
      callbackScope: this,
      loop: true
    });
  }

  public setCanInteract(state: boolean) {
    if (this.canInteract === state) return;
    
    this.canInteract = state;
    this.refreshIndicator();
    
    // Паузим блуждание при взаимодействии
    if (this.wanderEvent) {
      this.wanderEvent.paused = state;
    }
  }

  public lookAt(playerX: number, playerY: number) {
    if (playerX < this.x) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }
  }

  public updateNPC() {
    // Обновляем позицию индикатора
    if (this.indicator) {
      this.indicator.x = this.x;
      this.indicator.y = this.y;
    }
  }

  public cleanup() {
    if (this.wanderEvent) {
      this.wanderEvent.destroy();
    }
    if (this.indicator) {
      this.indicator.destroy();
    }
    this.destroy();
  }
}