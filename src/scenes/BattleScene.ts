// src/scenes/BattleScene.ts
import Phaser from 'phaser';

import { BattleController } from '../battle/BattleController';
import { EmotionSystem } from '../battle/EmotionSystem';
import { BulletManager } from '../battle/BulletManager';
import { EnemyAI } from '../battle/EnemyAI';

import { BattleAction, BattlePhase, InteractKind } from '../battle/types';
import { Soul } from '../entities/Soul';

import { PatternRunner } from '../battle/patterns/PatternRunner';
import { PatternContext } from '../battle/patterns/IPattern';
import { SprayPattern } from '../battle/patterns/SprayPattern';
import { AimedPattern } from '../battle/patterns/AimedPattern';
import { RingPattern } from '../battle/patterns/RingPattern';

export type StrikeGrade = 'MISS' | 'OK' | 'GOOD' | 'PERFECT';
export interface StrikeResult {
  grade: StrikeGrade;
  multiplier: number;
  effectChance: number;
}

type BattleInitData = {
  returnSceneKey?: string; // сцена, которую надо resume после боя
  enemyType?: string;
};

export class BattleScene extends Phaser.Scene {
  private returnSceneKey: string = 'Main';

  private controller!: BattleController;

  private soul!: Soul;
  private bulletManager!: BulletManager;
  private enemyAI!: EnemyAI;

  private bg!: Phaser.GameObjects.Rectangle;
  private arenaBox!: Phaser.GameObjects.Rectangle;
  private arenaBounds!: Phaser.Geom.Rectangle;

  private patternRunner!: PatternRunner;
  private patternCtx!: PatternContext;

  private actionListenerBound = false;

  constructor() {
    super('BattleScene');
  }

  init(data: BattleInitData) {
    if (data?.returnSceneKey) this.returnSceneKey = data.returnSceneKey;
  }

  create() {
    // 1) Чёрный фон камеры + чёрная подложка поверх всего мира
    this.cameras.main.setBackgroundColor(0x000000);

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100_000);

    this.scale.on('resize', (s: Phaser.Structs.Size) => {
      this.bg.setSize(s.width, s.height);
    });

    this.physics.world.setFPS(60);

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY + 20;

    // Arena
    this.arenaBox = this.add
      .rectangle(cx, cy, 360, 220, 0x000000)
      .setStrokeStyle(3, 0xffffff, 1)
      .setDepth(0);

    this.arenaBounds = new Phaser.Geom.Rectangle(cx - 180, cy - 110, 360, 220);

    // Controller
    this.controller = new BattleController(
      { hp: 20, maxHp: 20, atk: 6, def: 2, focus: 0, maxFocus: 30 },
      { hp: 30, maxHp: 30, atk: 5, def: 1, mercy: 0 },
      new EmotionSystem({ aggression: 30, trust: 20, confusion: 0 })
    );

    // Soul
    this.soul = new Soul(this, { startX: cx, startY: cy, bounds: this.arenaBounds });
    this.soul.freeze();

    // Bullets
    this.bulletManager = new BulletManager(
      this,
      this.soul,
      this.arenaBounds,
      () => {
        this.controller.addGraze();
        this.pushUI({ line: `GRAZE +FOCUS (${this.controller.model.player.focus})` });
      },
      () => {
        const dmg = this.controller.applyEnemyHit(2);
        this.pushUI({ line: `HIT -${dmg} HP (${this.controller.model.player.hp}/${this.controller.model.player.maxHp})` });

        if (this.controller.model.player.hp <= 0) {
          this.endBattle('killed_by_enemy');
        }
      }
    );

    this.enemyAI = new EnemyAI();

    // Patterns
    this.patternRunner = new PatternRunner();
    this.patternCtx = { scene: this, bullets: this.bulletManager, soul: this.soul, arena: this.arenaBounds };

    // UI scene
    this.scene.launch('BattleUIScene');

    // Bind UI events once
    if (!this.actionListenerBound) {
      this.actionListenerBound = true;

      this.game.events.on('battle:action', async (action: BattleAction) => {
        if (this.controller.model.phase !== BattlePhase.PLAYER_SELECT) return;

        if (action === BattleAction.INTERACT) {
          // открытие overlay делаем через uiState
          this.controller.setPhase(BattlePhase.PLAYER_RESOLVE);
          this.pushUI({ line: 'Choose INTERACT option...' });
          this.game.events.emit('battle:uiState', { interactOpen: true });
          return;
        }

        await this.resolveAction(action);
      });

      this.game.events.on('battle:interact', async (kind: InteractKind) => {
        if (this.controller.model.phase !== BattlePhase.PLAYER_RESOLVE) return;
        await this.resolveInteract(kind);
      });

      this.game.events.on('battle:interactClose', () => {
        if (this.controller.model.phase === BattlePhase.PLAYER_RESOLVE) {
          this.enterPlayerSelect('Choose an action');
        }
      });
    }

    this.enterPlayerSelect('Choose an action');
  }

  update(_: number, dt: number) {
    this.soul.update(dt);

    if (this.controller.model.phase === BattlePhase.ENEMY_REACT) {
      this.bulletManager.update();
      this.patternRunner.update(this.patternCtx, dt);
      this.controller.model.telemetry.addDodgeDuration(dt);

      if (!this.bulletManager.isActive()) {
        this.enterTurnEnd();
      }
    }
  }

  private pushUI(extra?: Partial<{ line: string; hint: string; interactOpen: boolean }>) {
    const m = this.controller.model;
    this.game.events.emit('battle:uiState', {
      phase: m.phase,
      playerHp: m.player.hp,
      playerMaxHp: m.player.maxHp,
      enemyHp: m.enemy.hp,
      enemyMaxHp: m.enemy.maxHp,
      focus: m.player.focus,
      canSpare: this.controller.canSpare(),
      line: extra?.line ?? m.lastLine ?? '',
      hint: extra?.hint ?? this.getHintByPhase(),
      interactOpen: extra?.interactOpen ?? false,
    });
  }

  private getHintByPhase() {
    if (this.controller.model.phase === BattlePhase.ENEMY_REACT) {
      return 'Move: arrows | Shield(GREEN): SPACE | Dash(YELLOW): SHIFT';
    }
    if (this.controller.model.phase === BattlePhase.PLAYER_RESOLVE) {
      return 'STRIKE: click on the bar (or SPACE) to hit';
    }
    return 'Click buttons to act.';
  }

  private enterPlayerSelect(line: string) {
    this.controller.setPhase(BattlePhase.PLAYER_SELECT);
    this.soul.freeze();

    this.patternRunner.stop(this.patternCtx);
    this.bulletManager.stop();
    this.bulletManager.clear();

    this.pushUI({ line, interactOpen: false });
  }

  private async resolveAction(action: BattleAction) {
    this.controller.setPhase(BattlePhase.PLAYER_RESOLVE);
    this.pushUI({ line: `Resolving ${action}...`, interactOpen: false });

    if (action === BattleAction.STRIKE) {
      this.pushUI({ line: 'STRIKE: click on the bar (or SPACE)', interactOpen: false });

      // ✅ STRIKE мини-игра теперь внутри BattleUIScene
      const res = await this.requestStrikeFromUI();

      const missed = res.grade === 'MISS';
      const out = this.controller.applyStrike(res.multiplier, missed);

      if (missed) {
        this.pushUI({ line: 'MISS...' });
      } else {
        const fx = out.applied ? ` +${out.applied}` : '';
        this.pushUI({ line: `${res.grade}! Damage ${out.dmg}${fx}` });
      }

      if (this.controller.model.enemy.hp <= 0) {
        this.endBattle('killed_enemy');
        return;
      }

      if (this.controller.model.status.stunnedTurns > 0) {
        this.controller.model.status.stunnedTurns -= 1;
        this.pushUI({ line: 'Enemy is STUNNED. No attack this turn.' });
        this.time.delayedCall(600, () => this.enterTurnEnd());
        return;
      }

      this.time.delayedCall(450, () => this.enterEnemyReact());
      return;
    }

    if (action === BattleAction.FOCUS) {
      this.controller.applyFocus();
      this.pushUI({ line: `FOCUS (focus=${this.controller.model.player.focus})` });
      this.time.delayedCall(450, () => this.enterEnemyReact());
      return;
    }

    if (action === BattleAction.SPARE) {
      const res = this.controller.applySpare();
      if (!res.success) {
        this.enterPlayerSelect('SPARE failed... not ready.');
        return;
      }
      this.pushUI({ line: res.bonusText ?? 'SPARED' });
      this.time.delayedCall(700, () => this.endBattle('spared_enemy'));
      return;
    }
  }

  private requestStrikeFromUI(): Promise<StrikeResult> {
    return new Promise<StrikeResult>((resolve) => {
      const onResult = (res: StrikeResult) => {
        this.game.events.off('battle:strikeResult', onResult as any);
        resolve(res);
      };

      this.game.events.on('battle:strikeResult', onResult as any);

      // старт мини-игры в UI
      this.game.events.emit('battle:strikeStart', {
        durationMs: 1500,
      });
    });
  }

  private async resolveInteract(kind: InteractKind) {
    this.controller.applyInteract(kind);
    const mood = this.controller.model.emotion.getMood();
    this.pushUI({
      line: `INTERACT(${kind}) mood=${mood} trust=${this.controller.model.emotion.state.trust} mercy=${this.controller.model.enemy.mercy}`,
      interactOpen: false,
    });
    this.time.delayedCall(500, () => this.enterEnemyReact());
  }

  private enterEnemyReact() {
    this.patternRunner.stop(this.patternCtx);
    this.bulletManager.clear();

    this.controller.setPhase(BattlePhase.ENEMY_REACT);
    this.soul.unfreeze();

    const mood = this.controller.model.emotion.getMood();
    const decision = this.enemyAI.decide(mood, this.controller.model.telemetry.get(), this.controller.model.status);

    if (this.controller.model.status.fearedTurns > 0) {
      this.controller.model.status.fearedTurns -= 1;
    }

    this.controller.model.lastLine = decision.line;
    this.pushUI({ line: decision.line, interactOpen: false });

    this.soul.setForm(decision.soulForm);

    this.bulletManager.start(decision.reactDurationMs);
    this.patternRunner.start(this.resolvePattern(decision.pattern), this.patternCtx);
  }

  private resolvePattern(id: 'SPRAY' | 'AIMED' | 'RING') {
    switch (id) {
      case 'AIMED':
        return new AimedPattern();
      case 'RING':
        return new RingPattern();
      case 'SPRAY':
      default:
        return new SprayPattern();
    }
  }

  private enterTurnEnd() {
    this.controller.setPhase(BattlePhase.TURN_END);

    this.patternRunner.stop(this.patternCtx);
    this.bulletManager.stop();
    this.bulletManager.clear();

    this.soul.freeze();

    this.pushUI({ line: 'Choose an action', interactOpen: false });

    this.time.delayedCall(650, () => {
      if (this.controller.model.phase === BattlePhase.BATTLE_END) return;
      this.controller.endTurn();
      this.enterPlayerSelect('Choose an action');
    });
  }

  private endBattle(reason: 'killed_enemy' | 'spared_enemy' | 'killed_by_enemy') {
    this.controller.setPhase(BattlePhase.BATTLE_END);

    this.patternRunner.stop(this.patternCtx);
    this.bulletManager.stop();
    this.bulletManager.clear();
    this.soul.freeze();

    const outcome =
      reason === 'spared_enemy' ? 'spared' : reason === 'killed_enemy' ? 'killed' : 'dead';

    const line = outcome === 'spared' ? 'Enemy spared.' : outcome === 'killed' ? 'Enemy defeated.' : 'You died.';
    this.pushUI({ line, interactOpen: false });

    this.game.events.emit('battle:ended', { outcome });

    this.time.delayedCall(650, () => {
      this.scene.stop('BattleUIScene');
      this.scene.stop();

      if (this.returnSceneKey) {
        this.scene.resume(this.returnSceneKey);
      }
    });
  }
}
