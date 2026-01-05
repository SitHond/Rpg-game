// src/systems/HUDSystem.ts
// @ts-nocheck
import Phaser from 'phaser';

export class HUDSystem {
  private scene: Phaser.Scene;
  private player: any;

  private hudContainer!: Phaser.GameObjects.Container;
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private mapNameText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;

  private coins: number;
  private mapTitle: string;

  constructor(scene: Phaser.Scene, player: any, opts?: { coins?: number; mapTitle?: string }) {
    this.scene = scene;
    this.player = player;
    this.coins = opts?.coins ?? 100;
    this.mapTitle = opts?.mapTitle ?? 'ДЕРЕВНЯ';
  }

  create() {
    // Контейнер HUD (рисуем в world-space + компенсируем scroll, как у тебя)
    this.hudContainer = this.scene.add.container(0, 0).setDepth(10000);

    this.healthBarBg = this.scene.add.graphics();
    this.healthBar = this.scene.add.graphics();

    this.hudContainer.add(this.healthBarBg);
    this.hudContainer.add(this.healthBar);

    this.healthText = this.scene.add
      .text(100, 25, '', {
        font: 'bold 16px "Courier New"',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: true },
      })
      .setOrigin(0.5);
    this.hudContainer.add(this.healthText);

    this.levelText = this.scene.add
      .text(700, 25, '', {
        font: 'bold 16px "Courier New"',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: true },
      })
      .setOrigin(1, 0.5);
    this.hudContainer.add(this.levelText);

    this.mapNameText = this.scene.add
      .text(400, 25, this.mapTitle, {
        font: 'bold 18px "Courier New"',
        color: '#00ffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: true },
      })
      .setOrigin(0.5);
    this.hudContainer.add(this.mapNameText);

    this.coinsText = this.scene.add.text(100, 55, `💰 ${this.coins}`, {
      font: 'bold 16px "Courier New"',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: true },
    });
    this.hudContainer.add(this.coinsText);

    this.update();
  }

  setCoins(coins: number) {
    this.coins = coins;
  }

  getCoins() {
    return this.coins;
  }

  setMapTitle(title: string) {
    this.mapTitle = title;
    if (this.mapNameText) this.mapNameText.setText(title);
  }

  update() {
    if (!this.player) return;

    this.healthBarBg.clear();
    this.healthBar.clear();

    const cameraX = this.scene.cameras.main.scrollX;
    const cameraY = this.scene.cameras.main.scrollY;

    // bg hp
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(10 + cameraX, 10 + cameraY, 200, 30);
    this.healthBarBg.lineStyle(2, 0xffffff, 1);
    this.healthBarBg.strokeRect(10 + cameraX, 10 + cameraY, 200, 30);

    const hp = this.player.health ?? 1;
    const maxHp = this.player.maxHealth ?? 1;
    const healthPercent = maxHp > 0 ? hp / maxHp : 0;
    const healthWidth = 196 * Math.max(0, Math.min(1, healthPercent));

    let healthColor = 0x00ff00;
    if (healthPercent < 0.3) healthColor = 0xff0000;
    else if (healthPercent < 0.6) healthColor = 0xffff00;

    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(12 + cameraX, 12 + cameraY, healthWidth, 26);

    this.healthText.setText(`❤️ ${Math.floor(hp)}/${maxHp}`);
    this.healthText.x = 12 + cameraX + healthWidth / 2;
    this.healthText.y = 25 + cameraY;

    const lvl = this.player.level ?? 1;
    const exp = this.player.experience ?? 0;
    const expNext = this.player.experienceToNextLevel ?? 0;
    this.levelText.setText(`⚔️ Ур.${lvl} (${exp}/${expNext})`);
    this.levelText.x = 790 + cameraX;
    this.levelText.y = 25 + cameraY;

    this.mapNameText.x = 400 + cameraX;
    this.mapNameText.y = 25 + cameraY;

    this.coinsText.setText(`💰 ${this.coins}`);
    this.coinsText.x = 100 + cameraX;
    this.coinsText.y = 55 + cameraY;
  }

  destroy() {
    this.hudContainer?.destroy(true);
  }
}
