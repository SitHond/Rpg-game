export enum BattlePhase {
  PLAYER_SELECT = 'PLAYER_SELECT',
  PLAYER_RESOLVE = 'PLAYER_RESOLVE',
  ENEMY_REACT = 'ENEMY_REACT',
  TURN_END = 'TURN_END',
  BATTLE_END = 'BATTLE_END',
}

export enum BattleAction {
  STRIKE = 'STRIKE',
  INTERACT = 'INTERACT',
  FOCUS = 'FOCUS',
  SPARE = 'SPARE',
}

export enum SoulForm {
  RED_BALANCE = 'RED_BALANCE',
  BLUE_GRAVITY = 'BLUE_GRAVITY',
  GREEN_SHIELD = 'GREEN_SHIELD',
  YELLOW_IMPULSE = 'YELLOW_IMPULSE',
}

export type Mood = 'AGGRESSIVE' | 'NEUTRAL' | 'TRUSTING';

export interface EmotionState {
  aggression: number; // 0..100
  trust: number;      // 0..100
  confusion: number;  // 0..100
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  focus: number;
  maxFocus: number;
}

export interface EnemyStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mercy: number; // 0..100
}

export interface TurnTelemetry {
  strikesAttempted: number;
  strikesMissed: number;
  damageDealt: number;
  damageTaken: number;
  dodgeDurationMs: number;
  grazes: number;
}

export type InteractKind = 'THREATEN' | 'JOKE' | 'EMPATHY' | 'ANALYZE';

export type EnemyStatus = 'STUNNED' | 'FEARED';

export interface StatusState {
  stunnedTurns: number;
  fearedTurns: number;
}
