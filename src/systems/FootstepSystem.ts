// src/systems/FootstepSystem.ts
// @ts-nocheck
import Phaser from 'phaser';

export class FootstepSystem {
  private scene: Phaser.Scene;
  private player: any;

  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastStepAt = 0;

  constructor(scene: Phaser.Scene, player: any) {
    this.scene = scene;
    this.player = player;
  }

  create() {
    if (!this.scene.textures.exists('particle_dust')) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xcccccc, 1);
      g.fillCircle(0, 0, 4);
      g.generateTexture('particle_dust', 8, 8);
      g.destroy();
    }

    this.emitter = this.scene.add.particles(0, 0, 'particle_dust', {
      x: 0,
      y: 0,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.5, end: 0 },
      speed: 10,
      lifespan: 300,
      frequency: -1,
      emitting: false,
    });
  }

  update() {
    const body = this.player?.body;
    if (!body) return;

    const moving = body.velocity.x !== 0 || body.velocity.y !== 0;

    if (moving) {
      this.emitter.setPosition(this.player.x, this.player.y + 10);
      this.emitter.start();

      // шаги раз в ~300мс
      if (this.scene.time.now - this.lastStepAt >= 300 && this.scene.cache.audio.exists('footstep')) {
        this.scene.sound.play('footstep', { volume: 0.1 });
        this.lastStepAt = this.scene.time.now;
      }
    } else {
      this.emitter.stop();
    }
  }

  destroy() {
    this.emitter?.remove();
  }
}
