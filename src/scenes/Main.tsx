//main
// @ts-nocheck
// src/scenes/Main.tsx
import Phaser from 'phaser';
import { render } from 'phaser-jsx';
import { NPCManager, npcRegistry, dialogueRegistry } from '../managers/NPCManager';

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
import { BattleState } from '../constants/battle';

interface Sign extends Phaser.Physics.Arcade.StaticBody {
  text?: string;
  exitData?: {  
    targetScene: string;
    spawnPoint: string;
    fadeDuration: number;
  };
}

export class Main extends Phaser.Scene {
  private npcManager!: NPCManager;
  private player!: Player;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  
  // Свойства для системы случайных встреч
  private walkSteps: number = 0;
  private encounterChance: number = 0.05;
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;
  private isInBattle: boolean = false;
  private battleResultText: Phaser.GameObjects.Text | null = null;
  private interactText: Phaser.GameObjects.Text | null = null;
  private debugMode: boolean = import.meta.env.DEV;

  constructor() {
    super(key.scene.main);
  }

  preload() {
    // Предзагрузка NPC текстур
    const npcTextures = ['npc_villager', 'npc_shopkeeper', 'npc_guard'];
    npcTextures.forEach(texture => {
      if (!this.textures.exists(texture)) {
        this.load.image(texture, `assets/npcs/${texture}.png`);
      }
    });
  }

  create() {
    console.log('=== MAIN SCENE START ===');
    
    // Загрузка тайловой карты
    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });

    const tileset = this.tilemap.addTilesetImage(
      TILESET_NAME,
      key.image.tuxemon,
    )!;

    // Создание слоев карты
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

    // Настройка физики
    this.worldLayer.setCollisionByProperty({ collides: true });
    this.physics.world.bounds.width = this.worldLayer.width;
    this.physics.world.bounds.height = this.worldLayer.height;

    aboveLayer.setDepth(Depth.AbovePlayer);

    // Создание игрока
    this.addPlayer();
    
    // Создание NPC системы
    this.setupNPCs();

    // Настройка камеры
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels,
    );

    // Отладка карты (только в dev режиме)
    if (this.debugMode) {
      render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);
    }

    // Интро текст
    state.isTypewriting = true;
    render(
      <Typewriter
        text="WASD или стрелки для движения. E - взаимодействие с NPC"
        onEnd={() => (state.isTypewriting = false)}
      />,
      this,
    );

    // Управление
    this.setupControls();
    
    // Добавляем переходы между уровнями
    this.addLevelTransitions();
    
    // Проверяем наличие сцены диалога
    if (!this.scene.get('dialog')) {
      console.warn('Сцена dialog не зарегистрирована!');
    }
  }

  private addPlayer() {
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      ({ name }) => name === TilemapObject.SpawnPoint,
    )!;

    // Создаем игрока
    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);
    
    // Запоминаем начальную позицию для отслеживания движения
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;
    
    // Добавляем в физику
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    
    // Добавляем коллизии
    this.physics.add.collider(this.player, this.worldLayer);
    
    // Устанавливаем камеру на игрока
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.5);
  }

  private setupNPCs() {
    // Создаем менеджер NPC
    this.npcManager = new NPCManager(this);
    
    // Устанавливаем ссылку на игрока
    this.npcManager.registerPlayer(this.player);
    
    // Загружаем NPC из карты или создаем программно
    this.loadNPCs();
    
    // Настройка взаимодействия с NPC
    this.setupNPCInteraction();
  }
  
  private loadNPCs() {
    // Пытаемся загрузить NPC из объектов карты
    const npcsLoadedFromMap = this.loadNPCsFromTilemap();
    
    // Если не загрузилось ни одного NPC из карты
    if (npcsLoadedFromMap === 0) {
      console.log('NPC не найдены на карте, создаем программно');
      // Создаем стандартных NPC
      this.createDefaultNPCs();
    } else {
      console.log(`Загружено ${npcsLoadedFromMap} NPC с карты`);
    }
  }
  
  private loadNPCsFromTilemap(): number {
    let npcCount = 0;
    
    try {
      // Ищем все объекты с типом 'npc' на карте
      const npcObjects = this.tilemap.filterObjects(
        TilemapLayer.Objects,
        (obj: any) => {
          const properties = obj.properties || [];
          const type = properties.find((p: any) => p.name === 'type')?.value;
          const name = obj.name;
          return type === 'npc' || name?.toLowerCase().includes('npc');
        }
      );

      console.log(`Найдено объектов NPC на карте: ${npcObjects.length}`);

      // Создаем NPC для каждого найденного объекта
      npcObjects.forEach((npcObj: any) => {
        const properties = npcObj.properties || [];
        const npcId = properties.find((p: any) => p.name === 'npcId')?.value || 'shopkeeper_1' || 'villager_1';
        const facing = properties.find((p: any) => p.name === 'facing')?.value || 'front';
        
        // Получаем настройки NPC из реестра
        const npcSettings = npcRegistry[npcId];
        
        if (npcSettings) {
          // Создаем NPC на позиции из карты
          const npc = this.npcManager.createNPC(
            npcSettings,
            { 
              x: npcObj.x + (npcObj.width || 32) / 2,
              y: npcObj.y + (npcObj.height || 32) / 2 
            }
          );
          
          if (npc) {
            // Устанавливаем направление
            if (facing === 'left') {
              npc.setFlipX(true);
            } else if (facing === 'right') {
              npc.setFlipX(false);
            }
            
            // Добавляем отладочный маркер если в режиме отладки
            if (this.debugMode) {
              this.addDebugMarker(npcObj.x, npcObj.y, npcSettings.displayName);
            }
            
            npcCount++;
            console.log(`NPC создан из карты: ${npcSettings.displayName} (${npcId})`);
          }
        } else {
          console.warn(`NPC с ID "${npcId}" не найден в реестре`);
        }
      });
    } catch (error) {
      console.error('Ошибка при загрузке NPC с карты:', error);
    }
    
    return npcCount;
  }
  
  private createDefaultNPCs() {
    // Создаем стандартных NPC для тестирования
    Object.values(npcRegistry).forEach(npcSettings => {
      if (npcSettings.mapId === 'main' || !npcSettings.mapId) {
        this.npcManager.createNPC(npcSettings);
      }
    });
  }
  
  private addDebugMarker(x: number, y: number, label: string) {
    // Отладочный маркер для NPC на карте
    const marker = this.add.rectangle(x, y, 32, 32, 0x00ff00, 0.3);
    marker.setDepth(Depth.AbovePlayer);
    
    const text = this.add.text(x, y - 20, label, {
      fontSize: '10px',
      color: '#0f0',
      backgroundColor: '#00000080'
    });
    text.setOrigin(0.5);
    text.setDepth(Depth.AbovePlayer);
  }
  
  private setupNPCInteraction() {
    this.input.keyboard?.on('keydown-E', () => {
      if (this.isInBattle || state.isTypewriting) return;
      
      const dialogData = this.npcManager.initiateDialogueWithClosestNPC();
      if (dialogData) {
        this.startDialogue(dialogData);
      }
    });
  }
  
  private startDialogue(dialogData: any) {
    console.log(`Начало диалога с ${dialogData.name}`);
    
    // Паузим основную сцену
    this.scene.pause();
    
    // Проверяем, есть ли сцена диалога
    if (this.scene.get('dialog')) {
      // Запускаем сцену диалогов
      this.scene.launch('dialog', {
        dialogData: dialogData
      });
    } else {
      console.error('Сцена диалога не найдена!');
      // Временное сообщение
      state.isTypewriting = true;
      render(
        <Typewriter
          text={`${dialogData.name}: "Привет!"`}
          onEnd={() => (state.isTypewriting = false)}
        />,
        this,
      );
      this.scene.resume();
    }
  }
  
  // Метод для завершения диалога
  onDialogEnd() {
    console.log('Диалог завершен');
    this.scene.resume();
  }

  private setupControls() {
    // Меню
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.pause(key.scene.main);
      this.scene.launch(key.scene.menu);
    });
    
    // Тестовая битва
    this.input.keyboard!.on('keydown-B', () => {
      if (!this.isInBattle) {
        console.log('Битва запущена по клавише B');
        this.triggerBattle();
      }
    });
    
    // Отладка
    if (this.debugMode) {
      this.input.keyboard!.on('keydown-F1', () => {
        console.log('=== ОТЛАДКА ===');
        console.log('Игрок:', this.player);
        console.log('NPC на сцене:', this.npcManager.getAllNPCs().length);
        console.log('Позиция игрока:', { x: this.player.x, y: this.player.y });
      });
    }
  }

  update() {
    // Обновляем игрока
    if (this.player.update) {
      this.player.update();
    }
    
    // Обновляем NPC менеджер
    if (this.npcManager.updateManager) {
      this.npcManager.updateManager();
    }
    
    // Отслеживаем движение для случайных встреч
    if (!this.isInBattle) {
      this.trackPlayerMovement();
    }
    
    // Обновляем индикатор взаимодействия
    this.updateInteractionIndicator();
  }

  private updateInteractionIndicator() {
    const closestNPC = this.npcManager.findClosestInteractableNPC();
    
    if (closestNPC && !this.isInBattle) {
      if (!this.interactText) {
        this.interactText = this.add.text(
          this.cameras.main.centerX,
          this.cameras.main.centerY + 200,
          '[E] Поговорить',
          {
            font: '20px monospace',
            color: '#ffff00',
            backgroundColor: '#000000a0',
            padding: { x: 15, y: 8 },
            align: 'center'
          }
        );
        this.interactText.setOrigin(0.5);
        this.interactText.setDepth(10000);
      }
    } else if (this.interactText) {
      this.interactText.destroy();
      this.interactText = null;
    }
  }

  private trackPlayerMovement() {
    const moved = this.player.x !== this.lastPlayerX || this.player.y !== this.lastPlayerY;
    
    if (moved) {
      this.walkSteps++;
      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
      
      // Проверка на случайную битву каждые 20 пикселей перемещения
      if (this.walkSteps % 20 === 0) {
        this.checkForRandomEncounter();
      }
    }
  }

  private checkForRandomEncounter() {
    const encounterRoll = Math.random();
    
    if (this.debugMode) {
      console.log(`🎲 Проверка встречи: Шанс ${this.encounterChance}, Бросок ${encounterRoll.toFixed(2)}`);
    }
    
    if (encounterRoll < this.encounterChance && !this.isInBattle) {
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
    
    // Визуальный эффект
    this.cameras.main.flash(300, 255, 0, 0);
    this.cameras.main.shake(300, 0.01);
    
    // Пауза перед запуском битвы
    this.time.delayedCall(500, () => {
      // Пауза основной сцены
      this.scene.pause();
      
      // Выбираем случайного врага
      const enemyTypes = ['slime', 'goblin', 'orc'];
      const randomEnemy = enemyType || enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      console.log(`🎭 Запуск битвы с: ${randomEnemy}`);
      
      // Проверяем наличие сцены битвы
      if (this.scene.get('battle')) {
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
      } else {
        console.error('Сцена битвы не найдена!');
        this.isInBattle = false;
        this.scene.resume();
      }
      
      // Сброс счетчика шагов
      this.walkSteps = 0;
    });
  }

  // Метод для возобновления игры после битвы
  onBattleEnd(result: string, data?: any) {
    console.log(`🔄 Возврат из битвы: ${result}`, data);
    
    // Сбрасываем флаг битвы
    this.isInBattle = false;
    
    // Обновляем состояние игрока
    if (data) {
      if (data.playerHealth !== undefined) {
        this.player.health = data.playerHealth;
        console.log(`❤️ Здоровье игрока: ${this.player.health}/${this.player.maxHealth}`);
      }
      if (data.playerDefense !== undefined) {
        this.player.defense = data.playerDefense;
      }
    }
    
    // Сбрасываем счетчик шагов
    this.walkSteps = 0;
    
    // Показываем результат
    this.showBattleResult(result);
    
    // Возобновляем сцену с задержкой
    this.time.delayedCall(1000, () => {
      this.scene.resume();
      console.log('✅ Основная сцена возобновлена');
      
      // Обновляем позицию для отслеживания
      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
    });
  }

  private showBattleResult(result: string) {
    // Удаляем старый текст
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
        
        // При поражении телепортируем игрока на спавн
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
    
    // Анимация исчезновения
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
    const transitionObjects = this.tilemap.filterObjects(
      TilemapLayer.Objects,
      (obj: any) => obj.name === 'NextLevel' || obj.type === 'exit'
    );

    if (!transitionObjects || transitionObjects.length === 0) {
      if (this.debugMode) {
        console.log('Объекты перехода не найдены на карте');
      }
      return;
    }
    
    transitionObjects.forEach((transition: any) => {
      // Создаем триггер перехода
      const trigger = this.physics.add.staticBody(
        transition.x!,
        transition.y!,
        transition.width!,
        transition.height!
      );

      // Получаем свойства из Tiled
      const properties = transition.properties || [];
      const exitData = {
        targetScene: properties.find((p: {name: string, value: any}) => p.name === 'targetScene')?.value || 'main',
        spawnPoint: properties.find((p: {name: string, value: any}) => p.name === 'spawnPoint')?.value || 'default',
        fadeDuration: parseInt(properties.find((p: {name: string, value: any}) => p.name === 'fadeDuration')?.value || '1000')
      };

      // Сохраняем данные
      (trigger as any).exitData = exitData;

      // Обработчик перехода
      this.physics.add.overlap(
        this.player,
        trigger as Phaser.Physics.Arcade.StaticBody,
        () => {
          if (!state.isTypewriting && !this.isInBattle) {
            console.log('Переход на уровень:', exitData);
            this.transitionToScene(exitData);
          }
        },
        undefined,
        this
      );

      // Визуализация для отладки
      if (this.debugMode) {
        const debugRect = this.add.rectangle(
          transition.x! + transition.width! / 2,
          transition.y! + transition.height! / 2,
          transition.width!,
          transition.height!,
          0x00ff00, 0.3
        );
        debugRect.setDepth(Depth.AbovePlayer);
        
        const debugText = this.add.text(
          transition.x!,
          transition.y! - 20,
          `→ ${exitData.targetScene}`,
          { fontSize: '12px', color: '#0f0' }
        );
        debugText.setDepth(Depth.AbovePlayer);
      }
    });
  }

  private transitionToScene(exitData: any) {
  console.log('=== ПЕРЕХОД НА УРОВЕНЬ ===');
  console.log('Данные перехода:', exitData);
  
  if (!exitData?.targetScene) return;
  
  // Блокируем ввод
  state.isTypewriting = true;
  this.player.setVelocity(0, 0);
  
  const targetScene = exitData.targetScene.toLowerCase();
  
  // Проверяем, существует ли сцена
  const sceneExists = this.game.scene.keys.hasOwnProperty(targetScene);
  
  if (!sceneExists) {
    console.error(`Сцена "${targetScene}" не найдена! Доступные сцены:`, 
                  Object.keys(this.game.scene.keys));
    
    // Показываем сообщение об ошибке
    const errorText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Сцена "${targetScene}" не найдена!`,
      { 
        font: '24px Arial', 
        color: '#ff0000',
        backgroundColor: '#000000c0',
        padding: { x: 20, y: 10 }
      }
    );
    errorText.setOrigin(0.5);
    errorText.setDepth(10000);
    
    // Удаляем через 3 секунды
    this.time.delayedCall(3000, () => {
      errorText.destroy();
      state.isTypewriting = false;
    });
    
    return;
  }
  
  // Подготовка данных игрока
  const playerData = {
    x: this.player.x,
    y: this.player.y,
    health: this.player.health,
    maxHealth: this.player.maxHealth,
    attack: this.player.attack,
    defense: this.player.defense,
    level: this.player.level,
    experience: this.player.experience
  };
  
  // Эффект перехода
  this.cameras.main.shake(300, 0.01);
  this.cameras.main.flash(300, 100, 100, 255);
  
  // Задержка перед затемнением
  this.time.delayedCall(300, () => {
    // Затемнение
    this.cameras.main.fadeOut(exitData.fadeDuration, 0, 0, 0);
    
    // После затемнения - переход
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      console.log(`Переход на сцену: ${targetScene}`);
      
      // ВСЕГДА запускаем новую сцену через scene.start
      this.scene.start(targetScene, {
        spawnPoint: exitData.spawnPoint || 'default',
        playerData: playerData
      });
    });
  });
}

  private teleportPlayer(spawnPointName: string) {
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      (obj: any) => obj.name === spawnPointName
    );
    
    if (spawnPoint) {
      console.log(`Телепорт на: ${spawnPoint.x}, ${spawnPoint.y}`);
      this.player.setPosition(spawnPoint.x!, spawnPoint.y!);
      
      // Эффект появления
      this.player.setAlpha(0);
      this.tweens.add({
        targets: this.player,
        alpha: 1,
        duration: 500
      });
    } else {
      console.warn(`Точка спавна "${spawnPointName}" не найдена`);
      this.player.setPosition(100, 100);
    }
  }
  
  // Очистка при уничтожении сцены
  destroy() {
    if (this.npcManager && this.npcManager.removeAllNPCs) {
      this.npcManager.removeAllNPCs();
    }
    super.destroy();
  }
}