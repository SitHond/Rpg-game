import { IPattern, PatternContext } from './IPattern';

export class PatternRunner {
  private current: IPattern | null = null;

  start(pattern: IPattern, ctx: PatternContext) {
    this.stop(ctx);
    this.current = pattern;
    this.current.start(ctx);
  }

  update(ctx: PatternContext, dtMs: number) {
    this.current?.update(ctx, dtMs);
  }

  stop(ctx: PatternContext) {
    if (!this.current) return;
    this.current.stop(ctx);
    this.current = null;
  }
}
