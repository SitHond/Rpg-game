// src/systems/AudioSystem.ts
// @ts-nocheck
import Phaser from 'phaser';

export class AudioSystem {
  private scene: Phaser.Scene;
  private bgMusic?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    try {
      if (this.scene.cache.audio.exists('bg_music')) {
        this.bgMusic = this.scene.sound.add('bg_music', { volume: 0.3, loop: true });
        this.bgMusic.play();
      }
    } catch (e) {
      console.log('AudioSystem: bg music error', e);
    }
  }

  fadeOutAndStop(durationMs: number) {
    if (!this.bgMusic) return;
    this.scene.tweens.add({
      targets: this.bgMusic,
      volume: 0,
      duration: durationMs,
      onComplete: () => this.bgMusic?.stop(),
    });
  }

  stop() {
    this.bgMusic?.stop();
  }

  play(soundName: string, volume: number = 0.5) {
    try {
      if (this.scene.cache.audio.exists(soundName)) {
        this.scene.sound.play(soundName, { volume });
      }
    } catch {
      // ignore
    }
  }
}
