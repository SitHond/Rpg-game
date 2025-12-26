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

  // HUD элементы
  private hudContainer!: Phaser.GameObjects.Container;
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private mapNameText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private playerCoins: number = 100;
  
  // Эффекты
  private footstepParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Музыка
  private bgMusic!: Phaser.Sound.BaseSound;
  
  // Меню паузы
  private isPaused: boolean = false;
  private pauseMenuElements: Phaser.GameObjects.GameObject[] = [];
  private pauseMenuKeyListener: any = null;

  constructor() {
    super(key.scene.main);
  }

  init(data: any) {
    console.log('=== MAIN SCENE INIT ===');
    
    // Восстановление данных игрока если есть
    if (data?.playerData) {
      this.playerCoins = data.playerData.coins || 100;
      console.log('Данные игрока восстановлены:', data.playerData);
    }
  }

  preload() {
    // Предзагрузка NPC текстур
    const npcTextures = ['npc_villager', 'npc_shopkeeper', 'npc_guard'];
    npcTextures.forEach(texture => {
      if (!this.textures.exists(texture)) {
        this.load.image(texture, `assets/npcs/${texture}.png`);
      }
    });
    
    // Загрузка музыки для основной игры
    if (!this.cache.audio.exists('bg_music')) {
      this.load.audio('bg_music', 'assets/music/exploration.mp3');
    }
    
    if (!this.cache.audio.exists('footstep')) {
      this.load.audio('footstep', 'assets/sounds/footstep.wav');
    }
    
    if (!this.cache.audio.exists('coin_pickup')) {
      this.load.audio('coin_pickup', 'assets/sounds/coin.wav');
    }
    
    // Создаем placeholder текстуры если реальные не загрузились
    this.createPlaceholderTextures();
  }

  private createPlaceholderTextures() {
    // Создаем простые placeholder текстуры
    const placeholderColors = {
      'npc_villager': 0x00aa00,    // Зеленый
      'npc_shopkeeper': 0xaa0000,  // Красный
      'npc_guard': 0x0000aa        // Синий
    };
    
    Object.entries(placeholderColors).forEach(([textureName, color]) => {
      if (!this.textures.exists(textureName)) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeRect(0, 0, 32, 32);
        
        // Добавляем букву для идентификации
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(16, 16, 10);
        
        // Первая буква имени
        graphics.fillStyle(0xffffff, 1);
        const letter = textureName.replace('npc_', '').charAt(0).toUpperCase();
        
        graphics.generateTexture(textureName, 32, 32);
        graphics.destroy();
        
        console.log(`Создана placeholder текстура: ${textureName}`);
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
    
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.5);
    
    // Создание HUD
    this.createHUD();
    
    // Настройка звуков
    this.setupAudio();
    
    // Создание эффектов
    this.createEffects();

    // Отладка карты (только в dev режиме)
    if (this.debugMode) {
      render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);
    }

    // Интро текст
    state.isTypewriting = true;
    render(
      <Typewriter
        text="Добро пожаловать в деревню! WASD для движения, E - говорить с NPC, ESC - меню"
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
    
    // Добавляем монеты на карту (для теста)
    if (this.debugMode) {
      this.spawnTestCoins();
    }
    
    // Эффект появления
    this.cameras.main.fadeIn(1000, 0, 0, 0);
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
  }

  private createHUD() {
    // Контейнер для HUD (фиксированная позиция на экране)
    this.hudContainer = this.add.container(0, 0).setDepth(10000);
    
    // Фон панели здоровья
    this.healthBarBg = this.add.graphics();
    this.hudContainer.add(this.healthBarBg);
    
    // Полоска здоровья
    this.healthBar = this.add.graphics();
    this.hudContainer.add(this.healthBar);
    
    // Текст здоровья
    this.healthText = this.add.text(100, 25, '', {
      font: 'bold 16px "Courier New"',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        stroke: true
      }
    }).setOrigin(0.5);
    this.hudContainer.add(this.healthText);
    
    // Уровень и опыт
    this.levelText = this.add.text(700, 25, '', {
      font: 'bold 16px "Courier New"',
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
    }).setOrigin(1, 0.5);
    this.hudContainer.add(this.levelText);
    
    // Название карты
    this.mapNameText = this.add.text(400, 25, 'ДЕРЕВНЯ ОЗЕРОГРАД', {
      font: 'bold 18px "Courier New"',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        stroke: true
      }
    }).setOrigin(0.5);
    this.hudContainer.add(this.mapNameText);
    
    // Монеты
    this.coinsText = this.add.text(100, 55, `💰 ${this.playerCoins}`, {
      font: 'bold 16px "Courier New"',
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
    this.hudContainer.add(this.coinsText);
    
    // Обновляем HUD
    this.updateHUD();
  }

  private updateHUD() {
    // Очищаем графику
    this.healthBarBg.clear();
    this.healthBar.clear();
    
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;
    
    // Фон полоски здоровья
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(10 + cameraX, 10 + cameraY, 200, 30);
    this.healthBarBg.lineStyle(2, 0xffffff, 1);
    this.healthBarBg.strokeRect(10 + cameraX, 10 + cameraY, 200, 30);
    
    // Сама полоска здоровья
    const healthPercent = this.player.health / this.player.maxHealth;
    const healthWidth = 196 * healthPercent;
    
    // Цвет в зависимости от здоровья
    let healthColor = 0x00ff00; // Зеленый
    if (healthPercent < 0.3) healthColor = 0xff0000; // Красный
    else if (healthPercent < 0.6) healthColor = 0xffff00; // Желтый
    
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(12 + cameraX, 12 + cameraY, healthWidth, 26);
    
    // Текст здоровья
    this.healthText.setText(`❤️ ${Math.floor(this.player.health)}/${this.player.maxHealth}`);
    this.healthText.x = 12 + cameraX + healthWidth / 2;
    this.healthText.y = 25 + cameraY;
    
    // Уровень и опыт
    this.levelText.setText(`⚔️ Ур.${this.player.level} (${this.player.experience}/${this.player.experienceToNextLevel})`);
    this.levelText.x = 790 + cameraX;
    this.levelText.y = 25 + cameraY;
    
    // Название карты
    this.mapNameText.x = 400 + cameraX;
    this.mapNameText.y = 25 + cameraY;
    
    // Монеты
    this.coinsText.setText(`💰 ${this.playerCoins}`);
    this.coinsText.x = 100 + cameraX;
    this.coinsText.y = 55 + cameraY;
  }

  private setupAudio() {
    try {
      // Проверяем наличие музыки в кеше
      if (this.cache.audio.exists('bg_music')) {
        this.bgMusic = this.sound.add('bg_music', {
          volume: 0.3,
          loop: true
        });
        this.bgMusic.play();
      } else {
        console.log('Фоновая музыка не найдена в кеше');
      }
    } catch (error) {
      console.log('Ошибка при загрузке музыки:', error);
    }
  }

  private createEffects() {
    // Создаем placeholder текстуру для частиц если нет
    if (!this.textures.exists('particle_dust')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xcccccc, 1);
      graphics.fillCircle(0, 0, 4);
      graphics.generateTexture('particle_dust', 8, 8);
      graphics.destroy();
    }
    
    // Частицы для следов
    this.footstepParticles = this.add.particles(0, 0, 'particle_dust', {
      x: 0,
      y: 0,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.5, end: 0 },
      speed: 10,
      lifespan: 300,
      frequency: -1,
      emitting: false
    });
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
      if (this.isInBattle || state.isTypewriting || this.isPaused) return;
      
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
    // Меню (ESC)
    this.input.keyboard!.on('keydown-ESC', () => {
      this.togglePauseMenu();
    });
    
    // Тестовая битва
    this.input.keyboard!.on('keydown-B', () => {
      if (!this.isInBattle && !this.isPaused) {
        console.log('Битва запущена по клавише B');
        this.triggerBattle();
      }
    });
    
    // Добавить монеты (для теста)
    if (this.debugMode) {
      this.input.keyboard!.on('keydown-C', () => {
        this.addCoins(50);
        this.showFloatingText('+50 монет', 0xffff00);
      });
      
      this.input.keyboard!.on('keydown-H', () => {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
        this.updateHUD();
        this.showFloatingText('+20 HP', 0x00ff00);
      });
    }
    
    // Отладка
    if (this.debugMode) {
      this.input.keyboard!.on('keydown-F1', () => {
        console.log('=== ОТЛАДКА ===');
        console.log('Игрок:', this.player);
        console.log('NPC на сцене:', this.npcManager.getAllNPCs().length);
        console.log('Позиция игрока:', { x: this.player.x, y: this.player.y });
        console.log('Монеты:', this.playerCoins);
        console.log('Пауза:', this.isPaused);
      });
    }
  }

  private togglePauseMenu() {
    if (this.isInBattle) {
      console.log('Нельзя открыть меню во время битвы');
      this.showFloatingText('Нельзя в бою!', 0xff0000);
      return;
    }
    
    if (state.isTypewriting) {
      console.log('Нельзя открыть меню во время диалога');
      return;
    }
    
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.openPauseMenu();
    }
  }

  private openPauseMenu() {
    console.log('📋 Открытие меню паузы');
    
    this.isPaused = true;
    
    // Эффект паузы
    this.cameras.main.flash(200, 255, 255, 255, true);
    
    // Паузим обновление сцены
    this.scene.pause();
    
    // Создаем меню паузы
    this.createPauseMenu();
  }

  private createPauseMenu() {
    // Затемнение фона
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8)
      .setInteractive()
      .setDepth(9999);
    
    // Контейнер для меню
    const menuContainer = this.add.container(400, 300).setDepth(10000);
    
    // Фон меню
    const menuBg = this.add.rectangle(0, 0, 500, 400, 0x1a1a2e)
      .setStrokeStyle(4, 0xffff00);
    menuContainer.add(menuBg);
    
    // Заголовок
    const title = this.add.text(0, -80, '⏸ ПАУЗА', {
      font: 'bold 40px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    menuContainer.add(title);
    
    // Кнопки меню
    const buttons = [
      { text: '▶ ПРОДОЛЖИТЬ', action: 'resume' },
      { text: '⚙ НАСТРОЙКИ', action: 'settings' },
      { text: '🚪 ВЫЙТИ В МЕНЮ', action: 'exit' }
    ];
    
    const buttonObjects: Phaser.GameObjects.Text[] = [];
    
    buttons.forEach((buttonData, index) => {
      const button = this.add.text(0, -10 + index * 70, buttonData.text, {
        font: 'bold 28px "Courier New"',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { left: 30, right: 30, top: 15, bottom: 15 },
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
      
      menuContainer.add(button);
      
      // Эффекты кнопок
      button.on('pointerover', () => {
        button.setStyle({ color: '#ffff00', backgroundColor: '#333300c0' });
        this.playSound('menu_select');
      });
      
      button.on('pointerout', () => {
        button.setStyle({ color: '#ffffff', backgroundColor: '#00000080' });
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
            this.handlePauseMenuAction(buttonData.action, [overlay, menuContainer]);
          }
        });
      });
      
      buttonObjects.push(button);
    });
    
    // Управление клавиатурой
    let selectedIndex = 0;
    const updateSelection = () => {
      buttonObjects.forEach((button, index) => {
        if (!button.active) return;
        
        if (index === selectedIndex) {
          button.setStyle({ 
            color: '#ffff00', 
            backgroundColor: '#333300c0',
            stroke: '#ffff00'
          });
        } else {
          button.setStyle({ 
            color: '#ffffff', 
            backgroundColor: '#00000080',
            stroke: '#000000'
          });
        }
      });
    };
    
    updateSelection();
    
    // Обработчики клавиш для меню
    const keyListener = this.input.keyboard?.addKeys({
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    
    if (keyListener) {
      keyListener.UP.on('down', () => {
        selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });
      
      keyListener.DOWN.on('down', () => {
        selectedIndex = (selectedIndex + 1) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });
      
      keyListener.W.on('down', () => {
        selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });
      
      keyListener.S.on('down', () => {
        selectedIndex = (selectedIndex + 1) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });
      
      keyListener.ENTER.on('down', () => {
        this.playSound('menu_confirm');
        this.handlePauseMenuAction(buttons[selectedIndex].action, [overlay, menuContainer]);
      });
      
      keyListener.ESC.on('down', () => {
        this.playSound('menu_confirm');
        this.resumeGame();
      });
      
      // Сохраняем ссылку для очистки
      this.pauseMenuKeyListener = keyListener;
    }
    
    // Сохраняем элементы для очистки
    this.pauseMenuElements = [overlay, menuContainer];
  }

  private handlePauseMenuAction(action: string, elements: Phaser.GameObjects.GameObject[]) {
    switch (action) {
      case 'resume':
        this.resumeGame();
        break;
      case 'settings':
        this.showFloatingText('Настройки в разработке', 0x00ffff);
        // Не закрываем меню после выбора настроек
        break;
      case 'exit':
        this.returnToMainMenu(elements);
        break;
    }
  }

  private resumeGame() {
    if (!this.isPaused) return;
    
    console.log('▶ Возобновление игры');
    
    // Удаляем элементы меню паузы
    this.pauseMenuElements.forEach(element => {
      if (element && element.active) {
        element.destroy();
      }
    });
    
    this.pauseMenuElements = [];
    
    // Удаляем обработчики клавиш
    if (this.pauseMenuKeyListener) {
      Object.values(this.pauseMenuKeyListener).forEach((key: any) => {
        if (key instanceof Phaser.Input.Keyboard.Key) {
          key.removeAllListeners();
        }
      });
      this.pauseMenuKeyListener = null;
    }
    
    // Возобновляем игру
    this.scene.resume();
    this.isPaused = false;
    
    // Эффект возвращения
    this.cameras.main.flash(200, 255, 255, 255, true);
  }

  private returnToMainMenu(elements?: Phaser.GameObjects.GameObject[]) {
    console.log('🚪 Возврат в главное меню');
    
    // Удаляем элементы меню паузы
    if (elements && elements.length > 0) {
      elements.forEach(element => {
        if (element.active) {
          element.destroy();
        }
      });
    }
    
    this.pauseMenuElements = [];
    
    // Удаляем обработчики клавиш
    if (this.pauseMenuKeyListener) {
      Object.values(this.pauseMenuKeyListener).forEach((key: any) => {
        if (key instanceof Phaser.Input.Keyboard.Key) {
          key.removeAllListeners();
        }
      });
      this.pauseMenuKeyListener = null;
    }
    
    // Эффект перехода
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    // Плавное затухание музыки
    if (this.bgMusic) {
      this.tweens.add({
        targets: this.bgMusic,
        volume: 0,
        duration: 800,
        onComplete: () => {
          this.bgMusic.stop();
        }
      });
    }
    
    // После завершения анимации
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Останавливаем сцену
      this.scene.stop();
      
      // Запускаем главное меню
      if (this.scene.get(key.scene.menu)) {
        this.scene.start(key.scene.menu);
      } else {
        // Если меню не зарегистрировано, перезапускаем игру
        this.scene.start(key.scene.main);
      }
    });
  }

  private playSound(soundName: string) {
    try {
      if (this.cache.audio.exists(soundName)) {
        this.sound.play(soundName, { volume: 0.5 });
      }
    } catch {
      // Игнорируем если звук не загружен
    }
  }

  update() {
    // Если игра на паузе, не обновляем
    if (this.isPaused) return;
    
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
    
    // Обновляем HUD
    this.updateHUD();
    
    // Обновляем эффекты
    this.updateEffects();
  }

  private updateEffects() {
    // Частицы при движении
    if (this.player.body && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) {
      this.footstepParticles.setPosition(this.player.x, this.player.y + 10);
      this.footstepParticles.start();
      
      // Звук шагов (интервал) - с проверкой существования
      if (this.time.now % 300 < 50 && this.cache.audio.exists('footstep')) {
        this.sound.play('footstep', { volume: 0.1 });
      }
    } else {
      this.footstepParticles.stop();
    }
  }

  private updateInteractionIndicator() {
    const closestNPC = this.npcManager.findClosestInteractableNPC();
    
    if (closestNPC && !this.isInBattle && !this.isPaused) {
      if (!this.interactText) {
        this.interactText = this.add.text(
          0, 0,
          '[E] Поговорить',
          {
            font: '20px monospace',
            color: '#ffff00',
            backgroundColor: '#000000a0',
            padding: { x: 15, y: 8 },
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3
          }
        );
        this.interactText.setOrigin(0.5);
        this.interactText.setDepth(Depth.AbovePlayer);
      }
      
      // Позиционируем над NPC
      this.interactText.x = closestNPC.x;
      this.interactText.y = closestNPC.y - 70;
      
      // Мерцание
      this.interactText.alpha = 0.7 + 0.3 * Math.sin(this.time.now * 0.005);
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
    if (this.isInBattle || this.isPaused) {
      console.warn('Битва уже активна или игра на паузе!');
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
            defense: this.player.defense,
            coins: this.playerCoins
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
      if (data.coins !== undefined) {
        this.playerCoins = data.coins;
        console.log(`💰 Монеты: ${this.playerCoins}`);
      }
      
      // Опыт и уровни
      if (data.experienceGained) {
        this.player.gainExperience(data.experienceGained);
        this.showFloatingText(`+${data.experienceGained} опыта`, 0x00ffff);
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
          if (!state.isTypewriting && !this.isInBattle && !this.isPaused) {
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
      this.showFloatingText(`Сцена "${targetScene}" не найдена!`, 0xff0000);
      
      state.isTypewriting = false;
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
      experience: this.player.experience,
      coins: this.playerCoins
    };
    
    // Эффект перехода
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.flash(300, 100, 100, 255);
    
    // Задержка перед затемнением
    this.time.delayedCall(300, () => {
      // Затемнение
      this.cameras.main.fadeOut(exitData.fadeDuration, 0, 0, 0);
      
      // Останавливаем музыку
      if (this.bgMusic) {
        this.tweens.add({
          targets: this.bgMusic,
          volume: 0,
          duration: exitData.fadeDuration * 0.8,
          onComplete: () => {
            this.bgMusic.stop();
          }
        });
      }
      
      // После затемнения - переход
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        console.log(`Переход на сцену: ${targetScene}`);
        
        // Запускаем новую сцену
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
      
      // Эффект телепортации
      const teleportEffect = this.add.particles(this.player.x, this.player.y, 'particle_dust', {
        scale: { start: 0.2, end: 0 },
        alpha: { start: 1, end: 0 },
        speed: 100,
        lifespan: 500,
        quantity: 20,
        emitting: false
      });
      
      teleportEffect.explode(20);
      
      this.player.setPosition(spawnPoint.x!, spawnPoint.y!);
      
      // Эффект появления
      this.player.setAlpha(0);
      this.tweens.add({
        targets: this.player,
        alpha: 1,
        duration: 500
      });
      
      // Эффект появления на новой позиции
      this.time.delayedCall(100, () => {
        teleportEffect.setPosition(this.player.x, this.player.y);
        teleportEffect.explode(20);
      });
    } else {
      console.warn(`Точка спавна "${spawnPointName}" не найдена`);
      this.player.setPosition(100, 100);
    }
  }

  // Вспомогательные методы
  private addCoins(amount: number) {
    this.playerCoins += amount;
    this.updateHUD();
    this.sound.play('coin_pickup', { volume: 0.3 });
  }

  private showFloatingText(text: string, color: number = 0xffffff) {
    const floatingText = this.add.text(
      this.player.x,
      this.player.y - 50,
      text,
      {
        font: 'bold 20px "Courier New"',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(Depth.AbovePlayer);
    
    // Анимация всплывания
    this.tweens.add({
      targets: floatingText,
      y: floatingText.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => floatingText.destroy()
    });
  }

  private spawnTestCoins() {
    if (!this.debugMode) return;
    
    // Создаем несколько тестовых монет
    for (let i = 0; i < 5; i++) {
      const coinX = 200 + i * 100;
      const coinY = 300;
      
      const coin = this.add.circle(coinX, coinY, 8, 0xffff00, 1)
        .setDepth(Depth.AbovePlayer);
      
      // Физическое тело для сбора
      const coinBody = this.physics.add.existing(coin, true) as Phaser.Physics.Arcade.Sprite;
      
      // Анимация вращения
      this.tweens.add({
        targets: coin,
        y: coin.y - 5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Коллизия с игроком
      this.physics.add.overlap(
        this.player,
        coinBody,
        () => {
          this.addCoins(10);
          coin.destroy();
          this.showFloatingText('+10 монет', 0xffff00);
        },
        undefined,
        this
      );
    }
  }
  
  // Очистка при уничтожении сцены
  destroy() {
    if (this.npcManager && this.npcManager.removeAllNPCs) {
      this.npcManager.removeAllNPCs();
    }
    
    // Останавливаем музыку
    if (this.bgMusic) {
      this.bgMusic.stop();
    }
    
    // Очищаем меню паузы
    this.pauseMenuElements.forEach(element => {
      if (element && element.active) {
        element.destroy();
      }
    });
    
    this.pauseMenuElements = [];
    
    // Удаляем обработчики клавиш меню
    if (this.pauseMenuKeyListener) {
      Object.values(this.pauseMenuKeyListener).forEach((key: any) => {
        if (key instanceof Phaser.Input.Keyboard.Key) {
          key.removeAllListeners();
        }
      });
      this.pauseMenuKeyListener = null;
    }
    
    super.destroy();
  }
}