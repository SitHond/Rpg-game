import { Mood, SoulForm, TurnTelemetry, StatusState } from './types';

export type EnemyPatternId = 'SPRAY' | 'AIMED' | 'RING';

export interface EnemyDecision {
  pattern: EnemyPatternId;
  soulForm: SoulForm;
  reactDurationMs: number;
  line: string;
}

export class EnemyAI {
  decide(mood: Mood, telemetry: TurnTelemetry, status: StatusState): EnemyDecision {
    const missRate = telemetry.strikesAttempted > 0
      ? telemetry.strikesMissed / telemetry.strikesAttempted
      : 0;

    const veryPassive = telemetry.damageDealt === 0 && telemetry.dodgeDurationMs > 3500;

    // формы души
    let soulForm: SoulForm = SoulForm.RED_BALANCE;

    if (mood === 'AGGRESSIVE') soulForm = SoulForm.BLUE_GRAVITY;
    if (mood === 'TRUSTING') soulForm = SoulForm.GREEN_SHIELD;
    if (missRate >= 0.6) soulForm = SoulForm.YELLOW_IMPULSE;

    // Fear статус делает бой “мягче”
    if (status.fearedTurns > 0) {
      soulForm = SoulForm.GREEN_SHIELD;
    }

    // паттерн
    let pattern: EnemyPatternId = 'SPRAY';
    if (mood === 'AGGRESSIVE') pattern = 'AIMED';
    if (mood === 'TRUSTING') pattern = 'RING';
    if (veryPassive) pattern = 'SPRAY';

    if (status.fearedTurns > 0) pattern = 'RING';

    // реплика
    let line = '...';
    if (veryPassive) line = 'Ты… даже не пытаешься меня ударить?';
    else if (missRate >= 0.6) line = 'Промахи. Нервы?';
    else if (telemetry.grazes >= 6) line = 'Слишком близко. Ты уверен в себе.';
    if (status.fearedTurns > 0) line = 'Стой… не подходи ближе.';

    // длительность
    let dur = 8000;
    if (mood === 'TRUSTING') dur = 7000;
    if (mood === 'AGGRESSIVE') dur = 9000;
    if (status.fearedTurns > 0) dur = 6500;

    return { pattern, soulForm, reactDurationMs: dur, line };
  }
}
