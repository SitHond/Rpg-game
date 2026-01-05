// src/scenes/Main.tsx
// @ts-nocheck
import Phaser from 'phaser';
import { render } from 'phaser-jsx';
import { NPCManager, npcRegistry } from '../managers/NPCManager';

import { TilemapDebug, Typewriter } from '../components';
import { Depth, key, TilemapLayer, TilemapObject, TILESET_NAME } from '../constants';
import { Player } from '../sprites';
import { state } from '../state';
import { BattleState } from '../constants/battle';

import { HUDSystem } from '../systems/HUDSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { FootstepSystem } from '../systems/FootstepSystem';
import { PauseMenuSystem } from '../systems/PauseMenuSystem';
import { RandomEncounterSystem } from '../systems/RandomEncounterSystem';

export class Main extends Phaser.Scene {
  private npcManager!: NPCManager;
  private player!: Player;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;

  private debugMode: boolean = import.meta.env.DEV;

  // Systems
  private hud!: HUDSystem;
  private audioSys!: AudioSystem;
  private footsteps!: FootstepSystem;
  private pauseMenu!: PauseMenuSystem;
  private encounters!: RandomEncounterSystem;

  // UI texts
  private battleResultText: Phaser.GameObjects.Text | null = null;
  private interactText: Phaser.GameObjects.Text | null = null;

  // Player economy
  private playerCoins: number = 100;

  constructor() {
    super(key.scene.main);
  }

  init(data: any) {
    console.log('=== MAIN SCENE INIT ===');

    if (data?.playerData) {
      this.playerCoins = data.playerData.coins || 100;
      console.log('Данные игрока восстановлены:', data.playerData);
    }
  }

  preload() {
    const npcTextures = ['npc_villager', 'npc_shopkeeper', 'npc_guard'];
    npcTextures.forEach((texture) => {
      if (!this.textures.exists(texture)) {
        this.load.image(texture, `assets/npcs/${texture}.png`);
      }
    });

    if (!this.cache.audio.exists('bg_music')) this.load.audio('bg_music', 'assets/music/exploration.mp3');
    if (!this.cache.audio.exists('footstep')) this.load.audio('footstep', 'assets/sounds/footstep.wav');
    if (!this.cache.audio.exists('coin_pickup')) this.load.audio('coin_pickup', 'assets/sounds/coin.wav');

    this.createPlaceholderTextures();
  }

  private createPlaceholderTextures() {
    const placeholderColors = {
      npc_villager: 0x00aa00,
      npc_shopkeeper: 0xaa0000,
      npc_guard: 0x0000aa,
    };

    Object.entries(placeholderColors).forEach(([textureName, color]) => {
      if (!this.textures.exists(textureName)) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeRect(0, 0, 32, 32);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(16, 16, 10);
        graphics.generateTexture(textureName, 32, 32);
        graphics.destroy();
        console.log(`Создана placeholder текстура: ${textureName}`);
      }
    });
  }

  create() {
    console.log('=== MAIN SCENE START ===');

    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });
    const tileset = this.tilemap.addTilesetImage(TILESET_NAME, key.image.tuxemon)!;

    this.tilemap.createLayer(TilemapLayer.BelowPlayer, tileset, 0, 0);
    this.worldLayer = this.tilemap.createLayer(TilemapLayer.World, tileset, 0, 0)!;
    const aboveLayer = this.tilemap.createLayer(TilemapLayer.AbovePlayer, tileset, 0, 0)!;

    this.worldLayer.setCollisionByProperty({ collides: true });
    this.physics.world.bounds.width = this.worldLayer.width;
    this.physics.world.bounds.height = this.worldLayer.height;
    aboveLayer.setDepth(Depth.AbovePlayer);

    this.addPlayer();
    this.setupNPCs();

    this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.5);

    // Systems init
    this.audioSys = new AudioSystem(this);
    this.audioSys.create();

    this.hud = new HUDSystem(this, this.player, { coins: this.playerCoins, mapTitle: 'ДЕРЕВНЯ ОЗЕРОГРАД' });
    this.hud.create();

    this.footsteps = new FootstepSystem(this, this.player);
    this.footsteps.create();

    this.pauseMenu = new PauseMenuSystem(this, {
      playSound: (name) => this.audioSys.play(name, 0.5),
      canOpen: () => {
        // нельзя в бою/диалоге
        if (this.encounters?.inBattle) {
          this.showFloatingText('Нельзя в бою!', 0xff0000);
          return false;
        }
        if (state.isTypewriting) return false;
        return true;
      },
    });
    this.pauseMenu.create();

    this.encounters = new RandomEncounterSystem(this, {
      player: this.player,
      getCoins: () => this.playerCoins,
      onEnd: (result: string, data?: any) => this.onBattleEnd(result, data),
    });
    this.encounters.create();

    // exit-to-menu from pause system
    this.game.events.on('main:exitToMenu', () => this.returnToMainMenu());

    // Управление и прочее
    this.setupControls();
    this.addLevelTransitions();

    if (this.debugMode) {
      render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);
      this.spawnTestCoins();
    }

    state.isTypewriting = true;
    render(
      <Typewriter
        text="Добро пожаловать в деревню! WASD для движения, E - говорить с NPC, ESC - меню"
        onEnd={() => (state.isTypewriting = false)}
      />,
      this
    );

    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private addPlayer() {
    const spawnPoint = this.tilemap.findObject(TilemapLayer.Objects, ({ name }) => name === TilemapObject.SpawnPoint)!;
    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);
    this.physics.add.existing(this.player);
    this.add.existing(this.player);
    this.physics.add.collider(this.player, this.worldLayer);
  }

  private setupNPCs() {
    this.npcManager = new NPCManager(this);
    this.npcManager.registerPlayer(this.player);
    this.loadNPCs();
    this.setupNPCInteraction();
  }

  private loadNPCs() {
    const loaded = this.loadNPCsFromTilemap();
    if (loaded === 0) this.createDefaultNPCs();
    else console.log(`Загружено ${loaded} NPC с карты`);
  }

  private loadNPCsFromTilemap(): number {
    let npcCount = 0;
    try {
      const npcObjects = this.tilemap.filterObjects(TilemapLayer.Objects, (obj: any) => {
        const properties = obj.properties || [];
        const type = properties.find((p: any) => p.name === 'type')?.value;
        const name = obj.name;
        return type === 'npc' || name?.toLowerCase().includes('npc');
      });

      npcObjects.forEach((npcObj: any) => {
        const properties = npcObj.properties || [];
        const npcId = properties.find((p: any) => p.name === 'npcId')?.value || 'shopkeeper_1';
        const facing = properties.find((p: any) => p.name === 'facing')?.value || 'front';

        const npcSettings = npcRegistry[npcId];
        if (!npcSettings) return;

        const npc = this.npcManager.createNPC(npcSettings, {
          x: npcObj.x + (npcObj.width || 32) / 2,
          y: npcObj.y + (npcObj.height || 32) / 2,
        });

        if (npc) {
          if (facing === 'left') npc.setFlipX(true);
          else if (facing === 'right') npc.setFlipX(false);
          npcCount++;
        }
      });
    } catch (e) {
      console.error('Ошибка при загрузке NPC с карты:', e);
    }
    return npcCount;
  }

  private createDefaultNPCs() {
    Object.values(npcRegistry).forEach((npcSettings: any) => {
      if (npcSettings.mapId === 'main' || !npcSettings.mapId) {
        this.npcManager.createNPC(npcSettings);
      }
    });
  }

  private setupNPCInteraction() {
    this.input.keyboard?.on('keydown-E', () => {
      if (this.encounters?.inBattle || state.isTypewriting || this.pauseMenu?.isPaused) return;

      const dialogData = this.npcManager.initiateDialogueWithClosestNPC();
      if (dialogData) this.startDialogue(dialogData);
    });
  }

  private startDialogue(dialogData: any) {
    console.log(`Начало диалога с ${dialogData.name}`);

    // паузим только ввод логикой (в твоей текущей схеме проще оставить pause сцены)
    this.scene.pause();

    if (this.scene.get('dialog')) {
      this.scene.launch('dialog', { dialogData });
    } else {
      state.isTypewriting = true;
      render(
        <Typewriter text={`${dialogData.name}: "Привет!"`} onEnd={() => (state.isTypewriting = false)} />,
        this
      );
      this.scene.resume();
    }
  }

  onDialogEnd() {
    console.log('Диалог завершен');
    this.scene.resume();
  }

  private setupControls() {
    // Тестовая битва
    this.input.keyboard!.on('keydown-B', () => {
      if (!this.encounters?.inBattle && !this.pauseMenu?.isPaused) {
        console.log('Битва запущена по клавише B');
        this.encounters.triggerBattle();
      }
    });

    if (this.debugMode) {
      this.input.keyboard!.on('keydown-C', () => {
        this.addCoins(50);
        this.showFloatingText('+50 монет', 0xffff00);
      });

      this.input.keyboard!.on('keydown-H', () => {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
        this.hud.update();
        this.showFloatingText('+20 HP', 0x00ff00);
      });
    }
  }

  update(_: number, dt: number) {
    if (this.pauseMenu?.isPaused) return;

    this.player.update?.();
    this.npcManager.updateManager?.();

    this.encounters?.update?.();
    this.updateInteractionIndicator();

    this.footsteps?.update?.();
    this.hud?.setCoins(this.playerCoins);
    this.hud?.update?.();
  }

  private updateInteractionIndicator() {
    const closestNPC = this.npcManager.findClosestInteractableNPC();

    if (closestNPC && !this.encounters?.inBattle && !this.pauseMenu?.isPaused) {
      if (!this.interactText) {
        this.interactText = this.add.text(0, 0, '[E] Поговорить', {
          font: '20px monospace',
          color: '#ffff00',
          backgroundColor: '#000000a0',
          padding: { x: 15, y: 8 },
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3,
        });
        this.interactText.setOrigin(0.5);
        this.interactText.setDepth(Depth.AbovePlayer);
      }

      this.interactText.x = closestNPC.x;
      this.interactText.y = closestNPC.y - 70;
      this.interactText.alpha = 0.7 + 0.3 * Math.sin(this.time.now * 0.005);
    } else if (this.interactText) {
      this.interactText.destroy();
      this.interactText = null;
    }
  }

  // === Battle end callback from RandomEncounterSystem ===
  onBattleEnd(result: string, data?: any) {
    console.log(`🔄 Возврат из битвы: ${result}`, data);

    if (data) {
      if (data.playerHealth !== undefined) this.player.health = data.playerHealth;
      if (data.playerDefense !== undefined) this.player.defense = data.playerDefense;
      if (data.coins !== undefined) this.playerCoins = data.coins;

      if (data.experienceGained) {
        this.player.gainExperience?.(data.experienceGained);
        this.showFloatingText(`+${data.experienceGained} опыта`, 0x00ffff);
      }
    }

    this.showBattleResult(result);

    this.time.delayedCall(1000, () => {
      // BattleScene должен сам resume Main; но на всякий случай:
      if (this.scene.isPaused()) this.scene.resume();
      console.log('✅ Основная сцена возобновлена');
    });
  }

  private showBattleResult(result: string) {
    if (this.battleResultText) this.battleResultText.destroy();

    let message = '';
    let color = '#ffffff';
    let bgColor = '#00000080';

    switch (result) {
      case BattleState.VICTORY:
        message = '🎖️ ПОБЕДА!';
        color = '#00ff00';
        bgColor = '#000000c0';
        break;
      case BattleState.DEFEAT:
        message = '💀 ПОРАЖЕНИЕ';
        color = '#ff0000';
        bgColor = '#400000c0';

        const spawnPoint = this.tilemap.findObject(TilemapLayer.Objects, ({ name }) => name === TilemapObject.SpawnPoint)!;
        this.player.setPosition(spawnPoint.x!, spawnPoint.y!);
        this.player.health = this.player.maxHealth;
        break;
      case BattleState.FLEE:
        message = '🏃 УСПЕШНОЕ БЕГСТВО';
        color = '#ffff00';
        bgColor = '#404000c0';
        break;
      default:
        message = 'Битва завершена';
    }

    this.battleResultText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, message, {
      font: 'bold 36px monospace',
      color,
      backgroundColor: bgColor,
      padding: { x: 30, y: 15 },
      stroke: '#000',
      strokeThickness: 6,
      align: 'center',
    });

    this.battleResultText.setOrigin(0.5);
    this.battleResultText.setDepth(10000);
    this.battleResultText.setShadow(4, 4, 'rgba(0,0,0,0.8)', 5);

    this.tweens.add({
      targets: this.battleResultText,
      y: this.battleResultText.y - 80,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      delay: 1000,
      onComplete: () => {
        this.battleResultText?.destroy();
        this.battleResultText = null;
      },
    });
  }

  private addCoins(amount: number) {
    this.playerCoins += amount;
    this.audioSys.play('coin_pickup', 0.3);
  }

  private showFloatingText(text: string, color: number = 0xffffff) {
    const t = this.add
      .text(this.player.x, this.player.y - 50, text, {
        font: 'bold 20px "Courier New"',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(Depth.AbovePlayer);

    this.tweens.add({
      targets: t,
      y: t.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  private spawnTestCoins() {
    for (let i = 0; i < 5; i++) {
      const coinX = 200 + i * 100;
      const coinY = 300;

      const coin = this.add.circle(coinX, coinY, 8, 0xffff00, 1).setDepth(Depth.AbovePlayer);
      const coinBody = this.physics.add.existing(coin, true) as Phaser.Physics.Arcade.Sprite;

      this.tweens.add({ targets: coin, y: coin.y - 5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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

  // Переходы оставлены как у тебя (можно вынести следующим шагом)
  private addLevelTransitions() {
    const transitionObjects = this.tilemap.filterObjects(TilemapLayer.Objects, (obj: any) => obj.name === 'NextLevel' || obj.type === 'exit');
    if (!transitionObjects || transitionObjects.length === 0) return;

    transitionObjects.forEach((transition: any) => {
      const trigger = this.physics.add.staticBody(transition.x!, transition.y!, transition.width!, transition.height!);
      const properties = transition.properties || [];
      const exitData = {
        targetScene: properties.find((p: { name: string; value: any }) => p.name === 'targetScene')?.value || 'main',
        spawnPoint: properties.find((p: { name: string; value: any }) => p.name === 'spawnPoint')?.value || 'default',
        fadeDuration: parseInt(properties.find((p: { name: string; value: any }) => p.name === 'fadeDuration')?.value || '1000'),
      };
      (trigger as any).exitData = exitData;

      this.physics.add.overlap(this.player, trigger as Phaser.Physics.Arcade.StaticBody, () => {
        if (!state.isTypewriting && !this.encounters?.inBattle && !this.pauseMenu?.isPaused) {
          this.transitionToScene(exitData);
        }
      });
    });
  }

  private transitionToScene(exitData: any) {
    if (!exitData?.targetScene) return;

    state.isTypewriting = true;
    this.player.setVelocity(0, 0);

    const targetScene = exitData.targetScene.toLowerCase();
    const sceneExists = this.game.scene.keys.hasOwnProperty(targetScene);
    if (!sceneExists) {
      this.showFloatingText(`Сцена "${targetScene}" не найдена!`, 0xff0000);
      state.isTypewriting = false;
      return;
    }

    const playerData = {
      x: this.player.x,
      y: this.player.y,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      attack: this.player.attack,
      defense: this.player.defense,
      level: this.player.level,
      experience: this.player.experience,
      coins: this.playerCoins,
    };

    this.cameras.main.fadeOut(exitData.fadeDuration, 0, 0, 0);
    this.audioSys.fadeOutAndStop(exitData.fadeDuration * 0.8);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetScene, { spawnPoint: exitData.spawnPoint || 'default', playerData });
    });
  }

  private returnToMainMenu() {
    console.log('🚪 Возврат в главное меню');

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.audioSys.fadeOutAndStop(800);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      if (this.scene.get(key.scene.menu)) this.scene.start(key.scene.menu);
      else this.scene.start(key.scene.main);
    });
  }

  destroy() {
    this.game.events.removeAllListeners('main:exitToMenu');

    this.encounters?.destroy?.();
    this.pauseMenu?.destroy?.();
    this.footsteps?.destroy?.();
    this.hud?.destroy?.();
    this.audioSys?.stop?.();

    this.npcManager?.removeAllNPCs?.();

    super.destroy();
  }
}
