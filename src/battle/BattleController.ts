import { BattleAction, BattlePhase, PlayerStats, EnemyStats, InteractKind, StatusState } from './types';
import { EmotionSystem } from './EmotionSystem';
import { FocusTuning } from './constants';
import { SoulLinkTelemetry } from './SoulLinkTelemetry';

export interface BattleModel {
  phase: BattlePhase;
  player: PlayerStats;
  enemy: EnemyStats;
  emotion: EmotionSystem;
  telemetry: SoulLinkTelemetry;
  status: StatusState;
  lastLine?: string;
  lastAction?: BattleAction;
}

export class BattleController {
  public model: BattleModel;

  constructor(player: PlayerStats, enemy: EnemyStats, emotion: EmotionSystem) {
    this.model = {
      phase: BattlePhase.PLAYER_SELECT,
      player,
      enemy,
      emotion,
      telemetry: new SoulLinkTelemetry(),
      status: { stunnedTurns: 0, fearedTurns: 0 },
    };
    this.model.telemetry.startTurn();
  }

  setPhase(p: BattlePhase) {
    this.model.phase = p;
  }

  applyStrike(multiplier: number, missed: boolean) {
    this.model.lastAction = BattleAction.STRIKE;
    this.model.telemetry.addStrikeAttempt(missed);

    if (missed) return { dmg: 0, applied: null as null | 'STUNNED' | 'FEARED' };

    const base = Math.max(1, this.model.player.atk - Math.floor(this.model.enemy.def * 0.4));
    const dmg = Math.max(1, Math.floor(base * multiplier));

    this.model.enemy.hp = Math.max(0, this.model.enemy.hp - dmg);
    this.model.telemetry.addDamageDealt(dmg);

    // эмоции
    this.model.emotion.state.aggression += 4;
    this.model.emotion.state.trust -= 2;
    this.model.emotion.clamp();

    // эффекты (минимально)
    let applied: null | 'STUNNED' | 'FEARED' = null;

    // PERFECT: шанс stun
    if (multiplier >= 1.25 && Math.random() < 0.25) {
      this.model.status.stunnedTurns = Math.max(this.model.status.stunnedTurns, 1);
      applied = 'STUNNED';
    } else if (multiplier >= 1.0 && Math.random() < 0.15) {
      this.model.status.fearedTurns = Math.max(this.model.status.fearedTurns, 1);
      applied = 'FEARED';
    }

    return { dmg, applied };
  }

  applyInteract(kind: InteractKind) {
    this.model.lastAction = BattleAction.INTERACT;
    this.model.emotion.applyInteract(kind);

    const mercyGain = (kind === 'EMPATHY') ? 12 : (kind === 'JOKE') ? 8 : 4;
    this.model.enemy.mercy = Math.min(100, this.model.enemy.mercy + mercyGain);
  }

  applyFocus() {
    this.model.lastAction = BattleAction.FOCUS;
    this.model.player.focus = Math.min(this.model.player.maxFocus, this.model.player.focus + FocusTuning.FOCUS_ACTION_GAIN);
    this.model.emotion.state.aggression -= 3;
    this.model.emotion.clamp();
  }

  canSpare() {
    return this.model.emotion.canSpare() || this.model.enemy.mercy >= 80;
  }

  applySpare(): { success: boolean; bonusText?: string } {
    this.model.lastAction = BattleAction.SPARE;

    if (!this.canSpare()) return { success: false };

    // базовые бонусы (таблица наград подключается позже)
    this.model.player.focus = Math.min(this.model.player.maxFocus, this.model.player.focus + 10);
    this.model.player.hp = Math.min(this.model.player.maxHp, this.model.player.hp + 2);

    return { success: true, bonusText: 'SPARED: +FOCUS, +HP' };
  }

  applyEnemyHit(raw: number) {
    let dmg = raw;

    if (this.model.player.focus > 0) {
      dmg = Math.max(0, Math.floor(dmg * (1 - FocusTuning.FOCUS_DAMAGE_REDUCTION)));
    }

    this.model.player.hp = Math.max(0, this.model.player.hp - dmg);
    this.model.telemetry.addDamageTaken(dmg);

    this.model.emotion.state.confusion += 2;
    this.model.emotion.clamp();

    return dmg;
  }

  addGraze() {
    this.model.player.focus = Math.min(this.model.player.maxFocus, this.model.player.focus + FocusTuning.GRAZE_GAIN);
    this.model.telemetry.addGraze();
  }

  endTurn() {
    this.model.telemetry.startTurn();
  }
}
