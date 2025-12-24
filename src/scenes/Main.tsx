// @ts-nocheck
// src/scenes/Main.tsx (исправленная версия)
import Phaser from 'phaser';
import { render } from 'phaser-jsx';

import {TilemapDebug, Typewriter } from '../components';
import {
  Depth,
  key,
  TilemapLayer,
  TilemapObject,
  TILESET_NAME,
} from '../constants';
import { Player } from '../sprites';
import { state } from '../state';
import { BattleState } from '../constants/battle'; // Добавляем импорт

interface Sign extends Phaser.Physics.Arcade.StaticBody {
  text?: string;
  exitData?: {  
    targetScene: string;
    spawnPoint: string;
    fadeDuration: number;
  };
}

export class Main extends Phaser.Scene {
  private player!: Player;
  private sign!: Sign;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  
  // Добавляем свойства для системы случайных встреч
  private walkSteps: number = 0;
  private encounterChance: number = 0.05; // 5% шанс встречи
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;
  private isInBattle: boolean = false;
  private battleResultText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(key.scene.main);
  }

  create() {
    console.log('=== TRANSITION START ===');
    console.log('Current scene key:', this.scene.key);
    console.log('All scenes:', Object.keys(this.game.scene.keys));
    
    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });

    const tileset = this.tilemap.addTilesetImage(
      TILESET_NAME,
      key.image.tuxemon,
    )!;

    this.tilemap.createLayer(TilemapLayer.BelowPlayer, tileset, 0, 0);
    this.worldLayer = this.tilemap.createLayer(
      TilemapLayer.World,
      tileset,
      0,
      0,
    )!;
    const aboveLayer = this.tilemap.createLayer(
      TilemapLayer.AbovePlayer,
      tileset,
      0,
      0,
    )!;

    this.worldLayer.setCollisionByProperty({ collides: true });
    this.physics.world.bounds.width = this.worldLayer.width;
    this.physics.world.bounds.height = this.worldLayer.height;

    aboveLayer.setDepth(Depth.AbovePlayer);

    this.addPlayer();

    // Установите границы камеры
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels,
    );

    render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);

    state.isTypewriting = true;
    render(
      <Typewriter
        text="WASD or arrow keys to move."
        onEnd={() => (state.isTypewriting = false)}
      />,
      this,
    );

    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.pause(key.scene.main);
      this.scene.launch(key.scene.menu);
    });
    
    // Добавляем обработку клавиш для тестирования
    this.input.keyboard!.on('keydown-B', () => {
      console.log('Битва запущена по клавише B');
      this.triggerBattle();
    });
  }

  private addPlayer() {
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      ({ name }) => name === TilemapObject.SpawnPoint,
    )!;

    // Используем наш класс Player
    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);
    
    // Запоминаем начальную позицию для отслеживания движения
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;
    
    // Добавляем в физику
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    
    // Добавляем коллизии
    this.physics.add.collider(this.player, this.worldLayer);
    
    this.addLevelTransitions();
  }

  update() {
    // Вызываем update игрока для анимаций
    this.player.update();
    
    // Отслеживаем движение для случайных встреч
    if (!this.isInBattle) {
      this.trackPlayerMovement();
    }
  }

  private trackPlayerMovement() {
    // Проверяем изменилась ли позиция игрока
    const moved = this.player.x !== this.lastPlayerX || this.player.y !== this.lastPlayerY;
    
    if (moved) {
      this.walkSteps++;
      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
      
      // Проверка на случайную битву каждые 20 пикселей перемещения
      if (this.walkSteps % 20 === 0) {
        console.log(`🚶 Шаг ${this.walkSteps}`);
        this.checkForRandomEncounter();
      }
    }
  }

  private checkForRandomEncounter() {
    // Временно увеличиваем шанс для тестирования
    const testChance = 0.05; // 30% для теста
    const encounterRoll = Math.random();
    console.log(`🎲 Проверка встречи: Шанс ${testChance}, Бросок ${encounterRoll.toFixed(2)}`);
    
    if (encounterRoll < testChance && !this.isInBattle) {
      console.log('⚔️ Случайная встреча активирована!');
      this.triggerBattle();
    }
  }

  triggerBattle(enemyType?: string) {
    if (this.isInBattle) {
      console.warn('Битва уже активна!');
      return;
    }
    
    this.isInBattle = true;
    
    // Останавливаем игрока
    this.player.setVelocity(0, 0);
    
    // Добавляем визуальный эффект
    this.cameras.main.flash(300, 255, 0, 0);
    this.cameras.main.shake(300, 0.01);
    
    // Пауза перед запуском битвы
    this.time.delayedCall(500, () => {
      // Пауза основной сцены
      this.scene.pause();
      
      // Передаем тип врага в сцену битвы
      const enemyTypes = ['slime', 'goblin', 'orc'];
      const randomEnemy = enemyType || enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      console.log(`🎭 Запуск битвы с: ${randomEnemy}`);
      
      // Запускаем сцену битвы
      this.scene.launch('battle', { 
        enemyType: randomEnemy,
        playerData: {
          health: this.player.health,
          maxHealth: this.player.maxHealth,
          attack: this.player.attack,
          defense: this.player.defense
        }
      });
      
      // Сброс счетчика шагов
      this.walkSteps = 0;
    });
  }

  // Метод для возобновления игры после битвы (БЫЛО resumeFromBattle)
  onBattleEnd(result: string, data?: any) {
    console.log(`🔄 Возврат из битвы: ${result}`, data);
    
    // Сбрасываем флаг битвы
    this.isInBattle = false;
    
    // Обновляем состояние игрока если есть данные
    if (data) {
      if (data.playerHealth !== undefined) {
        this.player.health = data.playerHealth;
        console.log(`❤️ Здоровье игрока обновлено: ${this.player.health}/${this.player.maxHealth}`);
      }
      if (data.playerDefense !== undefined) {
        this.player.defense = data.playerDefense; // Сбрасываем временную защиту
      }
    }
    
    // Сбрасываем счетчик шагов
    this.walkSteps = 0;
    
    // Показываем результат
    this.showBattleResult(result);
    
    // Возобновляем сцену с задержкой (чтобы сообщение успело показаться)
    this.time.delayedCall(1000, () => {
      this.scene.resume();
      console.log('✅ Основная сцена возобновлена');
      
      // Обновляем позицию для отслеживания
      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
    });
  }

  private showBattleResult(result: string) {
    // Удаляем старый текст если есть
    if (this.battleResultText) {
      this.battleResultText.destroy();
    }
    
    let message = '';
    let color = '#ffffff';
    let bgColor = '#00000080';
    
    switch(result) {
      case BattleState.VICTORY:
        message = '🎖️ ПОБЕДА!';
        color = '#00ff00';
        bgColor = '#000000c0';
        break;
      case BattleState.DEFEAT:
        message = '💀 ПОРАЖЕНИЕ';
        color = '#ff0000';
        bgColor = '#400000c0';
        
        // При поражении телепортируем игрока на спавн и восстанавливаем здоровье
        const spawnPoint = this.tilemap.findObject(
          TilemapLayer.Objects,
          ({ name }) => name === TilemapObject.SpawnPoint,
        )!;
        this.player.setPosition(spawnPoint.x!, spawnPoint.y!);
        this.player.health = this.player.maxHealth;
        console.log('♻️ Игрок телепортирован и восстановлен');
        break;
      case BattleState.FLEE:
        message = '🏃 УСПЕШНОЕ БЕГСТВО';
        color = '#ffff00';
        bgColor = '#404000c0';
        break;
      default:
        message = 'Битва завершена';
    }
    
    this.battleResultText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      message,
      {
        font: 'bold 36px monospace',
        color: color,
        backgroundColor: bgColor,
        padding: { x: 30, y: 15 },
        stroke: '#000',
        strokeThickness: 6,
        align: 'center'
      }
    );
    
    this.battleResultText.setOrigin(0.5);
    this.battleResultText.setDepth(10000);
    
    // Добавляем тень
    this.battleResultText.setShadow(4, 4, 'rgba(0,0,0,0.8)', 5);
    
    // Исчезновение с анимацией
    this.tweens.add({
      targets: this.battleResultText,
      y: this.battleResultText.y - 80,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      delay: 1000,
      onComplete: () => {
        if (this.battleResultText) {
          this.battleResultText.destroy();
          this.battleResultText = null;
        }
      }
    });
  }

private addLevelTransitions() {
   // Находим ВСЕ объекты перехода на карте
  const transitionObjects = this.tilemap.filterObjects(
    TilemapLayer.Objects,
    (obj: any) => obj.name === 'NextLevel' || obj.type === 'exit'
  );

  // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ:
  if (!transitionObjects || transitionObjects.length === 0) {
    console.log('No transition objects found on this map');
    return;
  }
  transitionObjects.forEach(transition => {
    // Создаём невидимую физическую зону
    const trigger = this.physics.add.staticBody(
      transition.x!,
      transition.y!,
      transition.width!,
      transition.height!
    );

    // Собираем свойства из Tiled
    const properties = transition.properties || [];
    const exitData = {
      targetScene: properties.find((p: {name: string, value: any}) => p.name === 'targetScene')?.value || 'main',
      spawnPoint: properties.find((p: {name: string, value: any}) => p.name === 'spawnPoint')?.value || 'default',
      fadeDuration: parseInt(properties.find((p: {name: string, value: any}) => p.name === 'fadeDuration')?.value || '1000')
    };

    // Сохраняем данные в триггере
    (trigger as any).exitData = exitData;

    type ArcadeColliderType = Phaser.Types.Physics.Arcade.ArcadeColliderType;

    // ПЕРЕХОД ПРИ ЛЮБОМ Соприкосновении (без нажатия Space)
    this.physics.add.overlap(
      this.player as unknown as ArcadeColliderType, // Игрок, а не его селектор!
      trigger as unknown as ArcadeColliderType,
      () => {
        if (!state.isTypewriting && !this.isInBattle) {
          console.log('Player touched level transition:', exitData);
          this.transitionToScene(exitData);
        }
      },
      undefined,
      this
    );

    // Визуализация для отладки (можно убрать позже)
    if (process.env.NODE_ENV === 'development') {
      const debugRect = this.add.rectangle(
        transition.x! + transition.width! / 2,
        transition.y! + transition.height! / 2,
        transition.width!,
        transition.height!,
        0x00ff00, 0.3
      );
      debugRect.setDepth(Depth.AbovePlayer);
      
      // Добавляем текст с именем перехода
      this.add.text(
        transition.x!,
        transition.y! - 20,
        `→ ${exitData.targetScene}`,
        { fontSize: '12px', color: '#0f0' }
      ).setDepth(Depth.AbovePlayer);
    }
  });
}

private transitionToScene(exitData: any) {
  console.log('=== LEVEL TRANSITION ===');
  console.log('Transition data:', exitData);
  
  if (!exitData?.targetScene) return;
  
  // Блокируем ввод и движение
  state.isTypewriting = true;
  this.player.setVelocity(0, 0); // Останавливаем игрока
  
  // Приводим к нижнему регистру для совместимости
  const targetScene = exitData.targetScene.toLowerCase();
  
  // Подготовка данных игрока
  const playerData = {
    x: this.player.x,
    y: this.player.y,
    health: 100,
    inventory: []
  };
  
  // Эффект "всасывания" или волны перед переходом (опционально)
  this.cameras.main.shake(300, 0.01);
  this.cameras.main.flash(300, 100, 100, 255);
  
  // Задержка перед затемнением
  this.time.delayedCall(300, () => {
    // Затемнение экрана
    this.cameras.main.fadeOut(exitData.fadeDuration, 0, 0, 0);
    
    // После затемнения - переход
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      console.log(`Transitioning to: ${targetScene}`);
      
      if (targetScene === 'main') {
        // Телепорт внутри текущей сцены
        this.teleportPlayer(exitData.spawnPoint);
        this.cameras.main.fadeIn(exitData.fadeDuration);
        
        // Разблокировка
        this.time.delayedCall(exitData.fadeDuration, () => {
          state.isTypewriting = false;
        });
      } else {
        // Переход в другую сцену
        this.scene.start(targetScene, {
          spawnPoint: exitData.spawnPoint || 'default',
          playerData: playerData
        });
      }
    });
  });
}

// Вспомогательный метод для телепорта
private teleportPlayer(spawnPointName: string) {
  const spawnPoint = this.tilemap.findObject(
    TilemapLayer.Objects,
    (obj: any) => obj.name === spawnPointName
  );
  
  if (spawnPoint) {
    console.log(`Teleporting to: ${spawnPoint.x}, ${spawnPoint.y}`);
    this.player.setPosition(spawnPoint.x!, spawnPoint.y!);
    
    // Небольшый эффект появления
    this.player.setAlpha(0);
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 500
    });
  } else {
    console.warn(`Spawn point "${spawnPointName}" not found`);
    this.player.setPosition(100, 100);
  }
}

}