// src/systems/PauseMenuSystem.ts
// @ts-nocheck
import Phaser from 'phaser';

export class PauseMenuSystem {
  private scene: Phaser.Scene;
  private playSound: (name: string) => void;
  private canOpen: () => boolean;

  public isPaused = false;

  private pauseMenuElements: Phaser.GameObjects.GameObject[] = [];
  private pauseMenuKeyListener: any = null;

  constructor(scene: Phaser.Scene, deps: { playSound: (name: string) => void; canOpen: () => boolean }) {
    this.scene = scene;
    this.playSound = deps.playSound;
    this.canOpen = deps.canOpen;
  }

  create() {
    this.scene.input.keyboard?.on('keydown-ESC', () => this.toggle());
  }

  toggle() {
    if (!this.canOpen()) return;
    if (this.isPaused) this.resumeGame();
    else this.openPauseMenu();
  }

  private openPauseMenu() {
    this.isPaused = true;

    this.scene.cameras.main.flash(200, 255, 255, 255, true);

    const overlay = this.scene.add
      .rectangle(400, 300, 800, 600, 0x000000, 0.8)
      .setInteractive()
      .setDepth(9999);

    const menuContainer = this.scene.add.container(400, 300).setDepth(10000);

    const menuBg = this.scene.add.rectangle(0, 0, 500, 400, 0x1a1a2e).setStrokeStyle(4, 0xffff00);
    menuContainer.add(menuBg);

    const title = this.scene.add
      .text(0, -80, '⏸ ПАУЗА', {
        font: 'bold 40px "Courier New"',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    menuContainer.add(title);

    const buttons = [
      { text: '▶ ПРОДОЛЖИТЬ', action: 'resume' },
      { text: '⚙ НАСТРОЙКИ', action: 'settings' },
      { text: '🚪 ВЫЙТИ В МЕНЮ', action: 'exit' },
    ];

    const buttonObjects: Phaser.GameObjects.Text[] = [];

    buttons.forEach((b, i) => {
      const btn = this.scene.add
        .text(0, -10 + i * 70, b.text, {
          font: 'bold 28px "Courier New"',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { left: 30, right: 30, top: 15, bottom: 15 },
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      menuContainer.add(btn);

      btn.on('pointerover', () => {
        btn.setStyle({ color: '#ffff00', backgroundColor: '#333300c0' });
        this.playSound('menu_select');
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#ffffff', backgroundColor: '#00000080' });
      });

      btn.on('pointerdown', () => {
        this.playSound('menu_confirm');
        this.scene.tweens.add({
          targets: btn,
          scale: 0.95,
          duration: 100,
          yoyo: true,
          onComplete: () => this.handleAction(b.action),
        });
      });

      buttonObjects.push(btn);
    });

    let selectedIndex = 0;

    const updateSelection = () => {
      buttonObjects.forEach((btn, idx) => {
        if (!btn.active) return;
        if (idx === selectedIndex) {
          btn.setStyle({ color: '#ffff00', backgroundColor: '#333300c0', stroke: '#ffff00' });
        } else {
          btn.setStyle({ color: '#ffffff', backgroundColor: '#00000080', stroke: '#000000' });
        }
      });
    };

    updateSelection();

    const keys = this.scene.input.keyboard?.addKeys({
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    if (keys) {
      keys.UP.on('down', () => {
        selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });

      keys.DOWN.on('down', () => {
        selectedIndex = (selectedIndex + 1) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });

      keys.W.on('down', () => {
        selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });

      keys.S.on('down', () => {
        selectedIndex = (selectedIndex + 1) % buttons.length;
        updateSelection();
        this.playSound('menu_select');
      });

      keys.ENTER.on('down', () => {
        this.playSound('menu_confirm');
        this.handleAction(buttons[selectedIndex].action);
      });

      keys.ESC.on('down', () => {
        this.playSound('menu_confirm');
        this.resumeGame();
      });

      this.pauseMenuKeyListener = keys;
    }

    this.pauseMenuElements = [overlay, menuContainer];
  }

  private handleAction(action: string) {
    switch (action) {
      case 'resume':
        this.resumeGame();
        break;
      case 'settings':
        // можно сделать callback наружу, пока просто тост
        break;
      case 'exit':
        // здесь лучше вызвать callback наружу; в Main ты уже умеешь возвращаться в меню
        this.scene.game.events.emit('main:exitToMenu');
        break;
    }
  }

  resumeGame() {
    if (!this.isPaused) return;

    this.pauseMenuElements.forEach((el) => el?.active && el.destroy());
    this.pauseMenuElements = [];

    if (this.pauseMenuKeyListener) {
      Object.values(this.pauseMenuKeyListener).forEach((k: any) => {
        if (k instanceof Phaser.Input.Keyboard.Key) k.removeAllListeners();
      });
      this.pauseMenuKeyListener = null;
    }

    this.isPaused = false;
    this.scene.cameras.main.flash(200, 255, 255, 255, true);
  }

  destroy() {
    this.resumeGame();
  }
}
