import { EmotionState, Mood, InteractKind } from './types';
import { EmotionThresholds } from './constants';

export class EmotionSystem {
  constructor(public state: EmotionState) {}

  clamp() {
    this.state.aggression = Math.max(0, Math.min(100, this.state.aggression));
    this.state.trust = Math.max(0, Math.min(100, this.state.trust));
    this.state.confusion = Math.max(0, Math.min(100, this.state.confusion));
  }

  getMood(): Mood {
    if (this.state.trust >= 60) return 'TRUSTING';
    if (this.state.aggression >= 60) return 'AGGRESSIVE';
    return 'NEUTRAL';
  }

  canSpare(): boolean {
    return (
      this.state.trust >= EmotionThresholds.TRUST_FOR_SPARE ||
      this.state.confusion >= EmotionThresholds.CONFUSION_FOR_SPARE
    );
  }

  applyInteract(kind: InteractKind) {
    switch (kind) {
      case 'THREATEN':
        this.state.aggression += 10;
        this.state.trust -= 6;
        this.state.confusion += 2;
        break;
      case 'JOKE':
        this.state.trust += 6;
        this.state.aggression -= 4;
        this.state.confusion += 4;
        break;
      case 'EMPATHY':
        this.state.trust += 10;
        this.state.aggression -= 8;
        this.state.confusion -= 2;
        break;
      case 'ANALYZE':
        this.state.confusion += 8;
        break;
    }
    this.clamp();
  }
}
