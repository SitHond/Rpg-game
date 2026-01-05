import Phaser from 'phaser';
import { BulletManager } from '../BulletManager';
import { Soul } from '../../entities/Soul';

export interface PatternContext {
  scene: Phaser.Scene;
  bullets: BulletManager;
  soul: Soul;
  arena: Phaser.Geom.Rectangle;
}

export interface IPattern {
  start(ctx: PatternContext): void;
  update(ctx: PatternContext, dtMs: number): void;
  stop(ctx: PatternContext): void;
}
