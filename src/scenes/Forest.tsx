import Phaser from 'phaser';
import { render } from 'phaser-jsx';

import { TilemapDebug, Typewriter } from '../components';
import {
  Depth,
  key,
  TilemapLayer,
  TilemapObject,
  TILESET_NAME,
} from '../constants';
import { Player } from '../sprites';
import { state } from '../state';

export class Forest extends Phaser.Scene {
  private player!: Player;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super('forest'); // Ключ сцены в нижнем регистре
  }

  create() {
    console.log('=== FOREST SCENE LOADED ===');
    
    // Пока используем ту же карту, позже замените на forest.json
    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });
    
    const tileset = this.tilemap.addTilesetImage(
      TILESET_NAME,
      key.image.tuxemon,
    )!;

    // Создаём слои
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
    aboveLayer.setDepth(Depth.AbovePlayer);

    // Добавляем игрока
    this.addPlayer();

    // Установите границы камеры
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels,
    );

    // Отладочная информация
    render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);

    // Приветственное сообщение
    state.isTypewriting = true;
    render(
      <Typewriter
        text="Вы в лесу. ESC - вернуться в город."
        onEnd={() => (state.isTypewriting = false)}
      />,
      this,
    );

    // Кнопка возврата
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToMain();
    });
    
    // Добавляем переходы обратно
    this.addReturnTransitions();
  }

  private addPlayer() {
    // Получаем данные из предыдущей сцены
    const spawnPointName = this.registry.get('spawnPoint') || 'forest_entry';
    const playerData = this.registry.get('playerData') || {};
    
    // Ищем точку появления
    let spawnX = 400;
    let spawnY = 300;
    
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      (obj: any) => obj.name === spawnPointName
    );
    
    if (spawnPoint) {
      spawnX = spawnPoint.x!;
      spawnY = spawnPoint.y!;
    }
    
    // Создаём игрока
    this.player = new Player(this, spawnX, spawnY);
    
    // Восстанавливаем данные (если есть)
    if (playerData.health) {
      // Здесь можно восстановить здоровье, если добавите систему здоровья
    }
    
    // Коллизии
    this.physics.add.collider(this.player, this.worldLayer);
    
    // Камера следует за игроком
    this.cameras.main.startFollow(this.player);
    
    // Добавляем взаимодействие с объектами
    this.addForestInteractions();
  }
  
  private addForestInteractions() {
    // Здесь можно добавить лесные объекты: сундуки, NPC, враги
    console.log('Forest interactions loaded');
  }
  
  private addReturnTransitions() {
    // Ищем объекты для возврата в главную сцену
    const exits = this.tilemap.filterObjects(
      TilemapLayer.Objects,
      (obj: any) => obj.type === 'exit' && obj.name?.includes('to_main')
    );
    
  if (!exits || exits.length === 0) {
    console.log('No exit objects found in Forest');
    return;
  }

    exits.forEach(exit => {
      const trigger = this.physics.add.staticBody(
        exit.x!,
        exit.y!,
        exit.width!,
        exit.height!
      );
      
      const properties = exit.properties || [];
      const exitData = {
        targetScene: 'main',
        spawnPoint: properties.find((p: any) => p.name === 'spawnPoint')?.value || 'forest_exit',
        fadeDuration: 1000
      };
      
      (trigger as any).exitData = exitData;
      
      // Переход при касании
      this.physics.add.overlap(
        this.player,
        trigger,
        () => {
          if (!state.isTypewriting) {
            this.transitionToScene(exitData);
          }
        }
      );
      
      // Визуализация для отладки
      if (import.meta.env.DEV) {
        this.add.rectangle(
          exit.x! + exit.width! / 2,
          exit.y! + exit.height! / 2,
          exit.width!,
          exit.height!,
          0xff9900, 0.3
        ).setDepth(Depth.AbovePlayer);
      }
    });
  }
  
  private returnToMain() {
    state.isTypewriting = true;
    
    const playerData = {
      x: this.player.x,
      y: this.player.y,
      health: 100,
      inventory: []
    };
    
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('main', {
        spawnPoint: 'forest_exit',
        playerData: playerData
      });
    });
  }
  
  private transitionToScene(exitData: any) {
    // Копия метода из Main.tsx
    if (!exitData?.targetScene) return;
    
    state.isTypewriting = true;
    this.player.setVelocity(0, 0);
    
    const playerData = {
      x: this.player.x,
      y: this.player.y,
      health: 100,
      inventory: []
    };
    
    this.cameras.main.fadeOut(exitData.fadeDuration, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(exitData.targetScene, {
        spawnPoint: exitData.spawnPoint,
        playerData: playerData
      });
    });
  }

  update() {
    this.player?.update();
  }
}