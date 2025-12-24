import Phaser from 'phaser';
import { render } from 'phaser-jsx';

import { BattleUI } from '../components/BattleUI';
import { BattleKey, BattleState, EnemyType } from '../constants/battle';
import { Depth } from '../constants';
import { Enemy, EnemyStats } from '../entities/Enemy';

export class BattleScene extends Phaser.Scene {
  private battleState: string = BattleState.PLAYER_TURN;
  private enemyInstance!: Enemy; // Явно указываем тип
  private playerData: {
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
  };
  private enemyType: string = EnemyType.SLIME;
  
  constructor() {
    super(BattleKey.scene);
    
    // Инициализация playerData в конструкторе
    this.playerData = {
      health: 100,
      maxHealth: 100,
      attack: 15,
      defense: 10
    };
  }

  init(data: { enemyType?: string; playerData?: any }) {
    console.log('🎭 BattleScene init:', data);
    
    this.enemyType = data.enemyType || EnemyType.SLIME;
    
    if (data.playerData) {
      this.playerData = {
        health: Number(data.playerData.health) || 100,
        maxHealth: Number(data.playerData.maxHealth) || 100,
        attack: Number(data.playerData.attack) || 15,
        defense: Number(data.playerData.defense) || 10
      };
    }
  }

  create() {
    console.log('🎭 BattleScene create');
    
    // Фон битвы
    this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
    
    // Создаем врага через класс Enemy
    try {
      this.enemyInstance = new Enemy(this, this.enemyType, 1);
      this.enemyInstance.setPosition(600, 200);
      console.log('✅ Враг создан:', this.enemyInstance.stats);
    } catch (error) {
      console.error('❌ Не удалось создать врага:', error);
      
      // Создаем простой враг как fallback
      const enemySprite = this.add.sprite(600, 200, '__DEFAULT');
      enemySprite.setScale(3);
      enemySprite.setTint(0xff0000);
      
      // Создаем минимальный экземпляр Enemy с дефолтными значениями
      this.enemyInstance = {
        stats: {
          type: this.enemyType,
          name: 'Враг',
          maxHealth: 100,
          health: 100,
          attack: 10,
          defense: 5,
          speed: 5,
          experience: 20,
          gold: 10
        },
        getAt: () => enemySprite,
        setPosition: (x: number, y: number) => enemySprite.setPosition(x, y),
        takeDamage: (damage: number) => {
          const actualDamage = Math.max(1, damage - this.enemyInstance.stats.defense);
          this.enemyInstance.stats.health = Math.max(0, this.enemyInstance.stats.health - actualDamage);
          return actualDamage;
        },
        attack: () => ({ damage: 10, isCritical: false })
      } as any;
    }
    
    // Создаем игрока (слева)
    let playerSprite: Phaser.GameObjects.Sprite;
    try {
      playerSprite = this.add.sprite(200, 200, 'atlas', 'misa-front');
      playerSprite.setScale(3);
      playerSprite.setTint(0x00ff00);
    } catch (error) {
      console.warn('Не удалось создать спрайт игрока:', error);
      playerSprite = this.add.sprite(200, 200, '__DEFAULT');
    }
    
    // Рендерим UI
    this.renderBattleUI();
    
    // Добавляем обработку клавиш
    this.setupControls();
    
    console.log('✅ Битва начата!');
  }

  private getEnemyHealth(): number {
    return this.enemyInstance?.stats?.health || 100;
  }

  private getEnemyMaxHealth(): number {
    return this.enemyInstance?.stats?.maxHealth || 100;
  }

  private renderBattleUI() {
    // Рендерим BattleUI через JSX
    render(
      <BattleUI
        battleState={this.battleState}
        enemyHealth={this.getEnemyHealth()}
        enemyMaxHealth={this.getEnemyMaxHealth()}
        playerHealth={this.playerData.health}
        playerMaxHealth={this.playerData.maxHealth}
      />,
      this
    );
    
    this.createActionButtons();
  }

  private createActionButtons() {
    const buttonStyle = {
      font: '20px monospace',
      color: '#fff',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 }
    };
    
    const createButton = (x: number, y: number, text: string, callback: () => void, color: string = '#fff') => {
      const btn = this.add.text(x, y, text, { ...buttonStyle, color });
      btn.setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => btn.setStyle({ fill: '#ffff55' }))
        .on('pointerout', () => btn.setStyle({ fill: color }));
      btn.setDepth(Depth.AboveWorld);
      return btn;
    };
    
    createButton(400, 450, '[A] Атака', () => this.handlePlayerAttack());
    createButton(550, 450, '[D] Защита', () => this.handlePlayerDefend());
    createButton(400, 500, '[I] Предмет', () => this.handlePlayerItem());
    createButton(550, 500, '[F] Бегство', () => this.handlePlayerFlee(), '#ff5555');
  }

  private setupControls() {
    this.input.keyboard?.on('keydown-A', () => {
      if (this.battleState === BattleState.PLAYER_TURN) this.handlePlayerAttack();
    });
    
    this.input.keyboard?.on('keydown-D', () => {
      if (this.battleState === BattleState.PLAYER_TURN) this.handlePlayerDefend();
    });
    
    this.input.keyboard?.on('keydown-I', () => {
      if (this.battleState === BattleState.PLAYER_TURN) this.handlePlayerItem();
    });
    
    this.input.keyboard?.on('keydown-F', () => {
      if (this.battleState === BattleState.PLAYER_TURN) this.handlePlayerFlee();
    });
    
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.battleState === BattleState.PLAYER_TURN) this.handlePlayerAttack();
    });
  }

  private handlePlayerAttack() {
    if (this.battleState !== BattleState.PLAYER_TURN) return;
    
    console.log('⚔️ Игрок атакует!');
    
    // Используем атаку из playerData
    const playerDamage = this.playerData.attack;
    
    // Применяем урон через метод врага
    const actualDamage = this.enemyInstance.takeDamage(playerDamage);
    console.log(`Враг получил ${actualDamage} урона. Осталось HP: ${this.enemyInstance.stats.health}`);
    
    // Анимация атаки
    const enemySprite = this.enemyInstance.getAt?.(0) as Phaser.GameObjects.Sprite;
    if (enemySprite && enemySprite.x !== undefined) {
      this.tweens.add({
        targets: enemySprite,
        x: enemySprite.x + 30,
        yoyo: true,
        duration: 200,
        onComplete: () => {
          if (this.enemyInstance.stats.health <= 0) {
            this.endBattle(BattleState.VICTORY);
          } else {
            this.battleState = BattleState.ENEMY_TURN;
            this.handleEnemyTurn();
          }
          this.updateBattleUI();
        }
      });
    } else {
      if (this.enemyInstance.stats.health <= 0) {
        this.endBattle(BattleState.VICTORY);
      } else {
        this.battleState = BattleState.ENEMY_TURN;
        this.handleEnemyTurn();
      }
      this.updateBattleUI();
    }
  }

  private handlePlayerDefend() {
    if (this.battleState !== BattleState.PLAYER_TURN) return;
    
    console.log('🛡️ Игрок защищается');
    
    // Увеличиваем защиту на следующий ход
    this.playerData.defense += 5;
    
    this.battleState = BattleState.ENEMY_TURN;
    this.handleEnemyTurn();
  }

  private handlePlayerItem() {
    if (this.battleState !== BattleState.PLAYER_TURN) return;
    
    console.log('💊 Игрок использует предмет');
    
    // Простое лечение
    const healAmount = 30;
    this.playerData.health = Math.min(this.playerData.maxHealth, this.playerData.health + healAmount);
    console.log(`Игрок вылечил ${healAmount} HP. Теперь HP: ${this.playerData.health}`);
    
    this.battleState = BattleState.ENEMY_TURN;
    this.handleEnemyTurn();
    this.updateBattleUI();
  }

  private handlePlayerFlee() {
    if (this.battleState !== BattleState.PLAYER_TURN) return;
    
    console.log('🏃 Игрок пытается сбежать');
    
    const fleeChance = 0.7; // 70% шанс
    if (Math.random() < fleeChance) {
      console.log('✅ Успешное бегство!');
      this.endBattle(BattleState.FLEE);
    } else {
      console.log('❌ Не удалось сбежать!');
      this.battleState = BattleState.ENEMY_TURN;
      this.handleEnemyTurn();
    }
  }

  private handleEnemyTurn() {
    console.log('🎭 Ход врага');
    
    this.time.delayedCall(1000, () => {
      // Атака врага через класс Enemy
      let enemyDamage = 10;
      
      const attackResult = this.enemyInstance.attack?.();
      if (attackResult) {
        enemyDamage = attackResult.damage;
        if (attackResult.isCritical) {
          console.log('💥 Критический удар врага!');
        }
      }
      
      // Учитываем защиту игрока
      const actualDamage = Math.max(1, enemyDamage - this.playerData.defense);
      
      this.playerData.health = Math.max(0, this.playerData.health - actualDamage);
      console.log(`Враг атаковал! Игрок получил ${actualDamage} урона. Осталось HP: ${this.playerData.health}`);
      
      // Анимация атаки врага
      const enemySprite = this.enemyInstance.getAt?.(0) as Phaser.GameObjects.Sprite;
      if (enemySprite && enemySprite.x !== undefined) {
        this.tweens.add({
          targets: enemySprite,
          x: enemySprite.x - 30,
          yoyo: true,
          duration: 200,
          onComplete: () => {
            if (this.playerData.health <= 0) {
              this.endBattle(BattleState.DEFEAT);
            } else {
              this.battleState = BattleState.PLAYER_TURN;
            }
            this.updateBattleUI();
          }
        });
      } else {
        if (this.playerData.health <= 0) {
          this.endBattle(BattleState.DEFEAT);
        } else {
          this.battleState = BattleState.PLAYER_TURN;
        }
        this.updateBattleUI();
      }
    });
  }

  private updateBattleUI() {
    // Удаляем старый UI
    this.children.each((child) => {
      if (child instanceof Phaser.GameObjects.Text && 
          (child.style?.color === '#ff5555' || child.style?.color === '#55ff55' || 
           child.text === 'Ваш ход' || child.text === 'Ход врага')) {
        child.destroy();
      }
    });
    
    // Рендерим новый UI
    this.renderBattleUI();
  }

  private endBattle(result: string) {
    console.log(`🎉 Битва окончена: ${result}`);
    
    // Обновляем глобальное состояние
    const mainScene = this.scene.get('main');
    if (mainScene && (mainScene as any).onBattleEnd) {
      (mainScene as any).onBattleEnd(result, {
        playerHealth: this.playerData.health,
        playerDefense: this.playerData.defense, // Сбрасываем временную защиту
        enemyType: this.enemyType
      });
    }
    
    // Эффекты завершения
    let flashColor: number;
    switch(result) {
      case BattleState.VICTORY: flashColor = 0x00ff00; break;
      case BattleState.DEFEAT: flashColor = 0xff0000; break;
      default: flashColor = 0xffff00;
    }
    
    this.cameras.main.flash(1000, flashColor);
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('battle');
      this.scene.resume('main');
    });
  }
}

// Интерфейс для fallback врага (если не загрузился класс Enemy)
interface FallbackEnemy {
  stats: EnemyStats;
  getAt?: (index: number) => any;
  setPosition?: (x: number, y: number) => void;
  takeDamage?: (damage: number) => number;
  attack?: () => { damage: number; isCritical: boolean };
}