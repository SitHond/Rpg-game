import { TurnTelemetry } from './types';

export class SoulLinkTelemetry {
  private current: TurnTelemetry = {
    strikesAttempted: 0,
    strikesMissed: 0,
    damageDealt: 0,
    damageTaken: 0,
    dodgeDurationMs: 0,
    grazes: 0,
  };

  startTurn() {
    this.current = {
      strikesAttempted: 0,
      strikesMissed: 0,
      damageDealt: 0,
      damageTaken: 0,
      dodgeDurationMs: 0,
      grazes: 0,
    };
  }

  get(): TurnTelemetry {
    return this.current;
  }

  addStrikeAttempt(missed: boolean) {
    this.current.strikesAttempted += 1;
    if (missed) this.current.strikesMissed += 1;
  }

  addDamageDealt(amount: number) {
    this.current.damageDealt += amount;
  }

  addDamageTaken(amount: number) {
    this.current.damageTaken += amount;
  }

  addGraze() {
    this.current.grazes += 1;
  }

  addDodgeDuration(ms: number) {
    this.current.dodgeDurationMs += ms;
  }
}
