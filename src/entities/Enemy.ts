import Phaser from 'phaser';

export interface EnemyStats {
  type: string;
  name: string;
  maxHealth: number;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  experience: number;
  gold: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  public stats: EnemyStats;
  
  constructor(scene: Phaser.Scene, type: string, level: number = 1) {
    super(scene, 0, 0);
    
    // Базовые параметры в зависимости от типа
    const baseStats = this.getBaseStats(type);
    
    this.stats = {
      type,
      name: baseStats.name,
      maxHealth: baseStats.maxHealth * level,
      health: baseStats.maxHealth * level,
      attack: baseStats.attack * level,
      defense: baseStats.defense * level,
      speed: baseStats.speed,
      experience: baseStats.experience * level,
      gold: baseStats.gold * level,
    };
    
    // Создаем спрайт врага
    const sprite = scene.add.sprite(0, 0, 'enemies', `${type}_idle`);
    sprite.setScale(2);
    this.add(sprite);
    
    // Health bar
    const healthBar = scene.add.graphics();
    this.add(healthBar);
    this.updateHealthBar(healthBar);
    
    scene.add.existing(this);
  }
  
  private getBaseStats(type: string) {
    const stats = {
      slime: {
        name: 'Слайм',
        maxHealth: 30,
        attack: 5,
        defense: 2,
        speed: 3,
        experience: 15,
        gold: 5,
      },
      goblin: {
        name: 'Гоблин',
        maxHealth: 50,
        attack: 10,
        defense: 5,
        speed: 6,
        experience: 25,
        gold: 10,
      },
      orc: {
        name: 'Орк',
        maxHealth: 80,
        attack: 15,
        defense: 8,
        speed: 4,
        experience: 40,
        gold: 20,
      },
    };
    
    return stats[type as keyof typeof stats] || stats.slime;
  }
  
  public takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.stats.defense);
    this.stats.health = Math.max(0, this.stats.health - actualDamage);
    return actualDamage;
  }
  
  private updateHealthBar(graphics: Phaser.GameObjects.Graphics) {
    graphics.clear();
    
    // Фон health bar
    graphics.fillStyle(0x000000, 0.5);
    graphics.fillRect(-30, -40, 60, 8);
    
    // Сам health bar
    const healthPercent = this.stats.health / this.stats.maxHealth;
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(-30, -40, 60 * healthPercent, 8);
  }
  
  public attack(): { damage: number; isCritical: boolean } {
    const baseDamage = this.stats.attack;
    const critChance = 0.1; // 10% шанс крита
    const isCritical = Math.random() < critChance;
    const damage = isCritical ? baseDamage * 1.5 : baseDamage;
    
    return { damage: Math.floor(damage), isCritical };
  }
}