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

  constructor() {
    super(key.scene.main);
  }

  create() {
      console.log('=== TRANSITION START ===');
      //console.log('Exit data:', exitData);
      console.log('Current scene key:', this.scene.key);
      console.log('All scenes:', Object.keys(this.game.scene.keys));
    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });

    // Параметры - это имя, которое вы присвоили набору листов в Tiled, и
    // ключ к изображению набора листов в кэше Phaser (имя, используемое при предварительной загрузке).
    const tileset = this.tilemap.addTilesetImage(
      TILESET_NAME,
      key.image.tuxemon,
    )!;

    // Параметры: название слоя (или индекс) из Tiled, tileset, x, y
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

    // По умолчанию все объекты на экране отображаются по глубине в том порядке, в котором мы их создавали.
    // Мы хотим, чтобы слой "Над игроком" располагался поверх игрока, поэтому мы явно задаем ему глубину.
    // Объекты с большей глубиной будут располагаться поверх объектов с меньшей глубиной.
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
  }

  private addPlayer() {
    // Слои объектов в Tiled позволяют добавлять на карту дополнительную информацию, например, точки появления или пользовательские формы столкновений.
    // В файле tmx есть слой объектов с точкой под названием "Точка появления".
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      ({ name }) => name === TilemapObject.SpawnPoint,
    )!;

    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);
    this.addLevelTransitions();

    // Следите за игроком и worldLayer на предмет столкновений
    this.physics.add.collider(this.player, this.worldLayer);
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
        if (!state.isTypewriting) {
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

  update() {
    this.player.update();
  }
}
