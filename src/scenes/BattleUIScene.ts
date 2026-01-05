// src/scenes/BattleUIScene.ts
import Phaser from 'phaser';
import { BattleAction, BattlePhase, InteractKind } from '../battle/types';

type UIState = {
  phase: BattlePhase;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  focus: number;
  canSpare: boolean;

  line: string;
  hint: string;
  interactOpen: boolean;
};

type StrikeGrade = 'MISS' | 'OK' | 'GOOD' | 'PERFECT';
type StrikeResult = { grade: StrikeGrade; multiplier: number; effectChance: number };

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

const ACTIONS: BattleAction[] = [
  BattleAction.STRIKE,
  BattleAction.INTERACT,
  BattleAction.FOCUS,
  BattleAction.SPARE,
];

export class BattleUIScene extends Phaser.Scene {
  private state: UIState = {
    phase: BattlePhase.PLAYER_SELECT,
    playerHp: 20,
    playerMaxHp: 20,
    enemyHp: 30,
    enemyMaxHp: 30,
    focus: 0,
    canSpare: false,
    line: 'Choose an action',
    hint: '',
    interactOpen: false,
  };

  // Panels / elements
  private topPanel!: Phaser.GameObjects.Rectangle;
  private bottomPanel!: Phaser.GameObjects.Rectangle;

  private youText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;

  private hpBg!: Phaser.GameObjects.Rectangle;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private enemyHpBg!: Phaser.GameObjects.Rectangle;
  private enemyHpFill!: Phaser.GameObjects.Rectangle;

  private lineText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  private strikeText!: Phaser.GameObjects.Text;
  private interactText!: Phaser.GameObjects.Text;
  private focusText!: Phaser.GameObjects.Text;
  private spareText!: Phaser.GameObjects.Text;

  private strikeZone!: Phaser.GameObjects.Zone;
  private interactZone!: Phaser.GameObjects.Zone;
  private focusZone!: Phaser.GameObjects.Zone;
  private spareZone!: Phaser.GameObjects.Zone;

  // selection marker
  private selectedIndex = 0;
  private selectorMarker!: Phaser.GameObjects.Rectangle;

  // overlay
  private overlayContainer!: Phaser.GameObjects.Container;
  private overlayBg!: Phaser.GameObjects.Rectangle;
  private threatenText!: Phaser.GameObjects.Text;
  private jokeText!: Phaser.GameObjects.Text;
  private empathyText!: Phaser.GameObjects.Text;
  private analyzeText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;

  private threatenZone!: Phaser.GameObjects.Zone;
  private jokeZone!: Phaser.GameObjects.Zone;
  private empathyZone!: Phaser.GameObjects.Zone;
  private analyzeZone!: Phaser.GameObjects.Zone;
  private closeZone!: Phaser.GameObjects.Zone;

  private onUIStateBound?: (next: Partial<UIState>) => void;

  // ===== STRIKE mini-game in UI =====
  private strikeRunning = false;
  private strikeContainer?: Phaser.GameObjects.Container;
  private strikeZones: Phaser.GameObjects.Rectangle[] = [];
  private strikeCursor?: Phaser.GameObjects.Rectangle;
  private strikeClickZone?: Phaser.GameObjects.Zone;
  private strikeTween?: Phaser.Tweens.Tween;
  private strikeTimeout?: Phaser.Time.TimerEvent;

  // cached layout
  private panelX = 0;
  private panelW = 0;
  private bottomY = 0;
  private bottomH = 0;

  constructor() {
    super('BattleUIScene');
  }

  create() {
    // UI-сцена прозрачная (фон рисует BattleScene)
    this.cameras.main.setScroll(0, 0);
    this.scene.bringToTop();

    this.buildUI();
    this.applyStateToUI();

    // updates from BattleScene
    this.onUIStateBound = (next: Partial<UIState>) => {
      this.state = { ...this.state, ...next };
      this.applyStateToUI();
    };
    this.game.events.on('battle:uiState', this.onUIStateBound);

    // STRIKE start request from BattleScene
    this.game.events.on('battle:strikeStart', (cfg?: { durationMs?: number }) => {
      const durationMs = Math.max(600, Math.min(3000, cfg?.durationMs ?? 1500));
      this.startStrikeUI(durationMs);
    });

    // keyboard nav
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.moveSelection(-1));
    kb?.on('keydown-RIGHT', () => this.moveSelection(+1));
    kb?.on('keydown-A', () => this.moveSelection(-1));
    kb?.on('keydown-D', () => this.moveSelection(+1));
    kb?.on('keydown-ENTER', () => {
      if (this.strikeRunning) this.finishStrikeFromInput();
      else this.confirmSelection();
    });
    kb?.on('keydown-SPACE', () => {
      if (this.strikeRunning) this.finishStrikeFromInput();
      else this.confirmSelection();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  private buildUI() {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    this.panelW = Math.min(720, w - 80);
    this.panelX = (w - this.panelW) / 2;

    // === TOP PANEL ===
    const topY = 24;
    const topH = 104;

    this.topPanel = this.add.rectangle(this.panelX, topY, this.panelW, topH, 0x000000, 1).setOrigin(0, 0);
    this.topPanel.setStrokeStyle(3, 0xffffff, 1);

    this.youText = this.add.text(this.panelX + 22, topY + 18, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.enemyText = this.add.text(this.panelX + 22, topY + 46, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    const barsX = this.panelX + this.panelW * 0.40;
    const barW = this.panelW * 0.55;
    const barH = 10;

    this.hpBg = this.add.rectangle(barsX, topY + 32, barW, barH, 0x333333, 1).setOrigin(0, 0.5);
    this.hpFill = this.add.rectangle(barsX, topY + 32, barW, barH, 0x22c55e, 1).setOrigin(0, 0.5);

    this.enemyHpBg = this.add.rectangle(barsX, topY + 60, barW, barH, 0x333333, 1).setOrigin(0, 0.5);
    this.enemyHpFill = this.add.rectangle(barsX, topY + 60, barW, barH, 0xef4444, 1).setOrigin(0, 0.5);

    // === BOTTOM PANEL ===
    this.bottomH = 150;
    this.bottomY = h - this.bottomH - 24;

    this.bottomPanel = this.add.rectangle(this.panelX, this.bottomY, this.panelW, this.bottomH, 0x000000, 1).setOrigin(0, 0);
    this.bottomPanel.setStrokeStyle(3, 0xffffff, 1);

    this.lineText = this.add.text(this.panelX + 22, this.bottomY + 18, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: this.panelW - 44 },
    });

    // === ACTIONS ROW ===
    const actionsY = this.bottomY + 72;

    this.strikeText = this.add.text(this.panelX + 22, actionsY, '[STRIKE]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.interactText = this.add.text(this.panelX + this.panelW * 0.28, actionsY, '[INTERACT]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.focusText = this.add.text(this.panelX + this.panelW * 0.56, actionsY, '[FOCUS]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.spareText = this.add.text(this.panelX + this.panelW * 0.78, actionsY, '[SPARE]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    // marker
    this.selectorMarker = this.add.rectangle(0, 0, 10, 10, 0xffffff, 1).setOrigin(0.5);
    this.selectorMarker.setVisible(false);

    // hint
    this.hintText = this.add.text(this.panelX + 22, this.bottomY + this.bottomH - 24, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#bbbbbb',
    });

    // zones
    this.strikeZone = this.makeTextZone(this.strikeText, () => this.onAction(BattleAction.STRIKE));
    this.interactZone = this.makeTextZone(this.interactText, () => this.onAction(BattleAction.INTERACT));
    this.focusZone = this.makeTextZone(this.focusText, () => this.onAction(BattleAction.FOCUS));
    this.spareZone = this.makeTextZone(this.spareText, () => this.onAction(BattleAction.SPARE));

    this.strikeZone.on('pointerover', () => this.setSelection(0));
    this.interactZone.on('pointerover', () => this.setSelection(1));
    this.focusZone.on('pointerover', () => this.setSelection(2));
    this.spareZone.on('pointerover', () => this.setSelection(3));

    // === INTERACT OVERLAY ===
    this.overlayContainer = this.add.container(0, 0);

    const ovW = Math.min(520, this.panelW - 40);
    const ovH = 270;
    const ovX = (w - ovW) / 2;
    const ovY = (h - ovH) / 2 - 20;

    this.overlayBg = this.add.rectangle(ovX, ovY, ovW, ovH, 0x000000, 1).setOrigin(0, 0);
    this.overlayBg.setStrokeStyle(3, 0xffffff, 1);

    const title = this.add.text(ovX + 20, ovY + 18, 'INTERACT', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });

    this.threatenText = this.add.text(ovX + 20, ovY + 62, '[THREATEN]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.jokeText = this.add.text(ovX + 20, ovY + 96, '[JOKE]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.empathyText = this.add.text(ovX + 20, ovY + 130, '[EMPATHY]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.analyzeText = this.add.text(ovX + 20, ovY + 164, '[ANALYZE]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.closeText = this.add.text(ovX + 20, ovY + 218, '[CLOSE]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.overlayContainer.add([
      this.overlayBg,
      title,
      this.threatenText,
      this.jokeText,
      this.empathyText,
      this.analyzeText,
      this.closeText,
    ]);

    this.threatenZone = this.makeTextZone(this.threatenText, () => this.onInteract('THREATEN'));
    this.jokeZone = this.makeTextZone(this.jokeText, () => this.onInteract('JOKE'));
    this.empathyZone = this.makeTextZone(this.empathyText, () => this.onInteract('EMPATHY'));
    this.analyzeZone = this.makeTextZone(this.analyzeText, () => this.onInteract('ANALYZE'));
    this.closeZone = this.makeTextZone(this.closeText, () => this.onCloseInteract());

    // depths
    const DEPTH_PANEL = 50_000;
    const DEPTH_TEXT = 55_000;
    const DEPTH_MARKER = 56_000;
    const DEPTH_ZONE = 70_000;
    const DEPTH_STRIKE = 80_000;

    const panels = [this.topPanel, this.bottomPanel, this.hpBg, this.hpFill, this.enemyHpBg, this.enemyHpFill];
    panels.forEach((o) => o.setDepth(DEPTH_PANEL).setScrollFactor(0));

    const texts = [
      this.youText,
      this.enemyText,
      this.lineText,
      this.hintText,
      this.strikeText,
      this.interactText,
      this.focusText,
      this.spareText,
    ];
    texts.forEach((o) => o.setDepth(DEPTH_TEXT).setScrollFactor(0));

    this.selectorMarker.setDepth(DEPTH_MARKER).setScrollFactor(0);

    [this.strikeZone, this.interactZone, this.focusZone, this.spareZone].forEach((z) =>
      z.setDepth(DEPTH_ZONE).setScrollFactor(0)
    );

    this.overlayContainer.setDepth(60_000).setScrollFactor(0);

    // reserve depth constant (used by strike mini)
    this.data.set('DEPTH_STRIKE', DEPTH_STRIKE);
  }

  private makeTextZone(textObj: Phaser.GameObjects.Text, onClick: () => void) {
    const padX = 10;
    const padY = 6;
    const b = textObj.getBounds();

    const z = this.add.zone(b.x - padX, b.y - padY, b.width + padX * 2, b.height + padY * 2).setOrigin(0, 0);
    z.setInteractive({ useHandCursor: true });
    z.on('pointerdown', onClick);
    return z;
  }

  private applyStateToUI() {
    const hpPct = (v: number, m: number) => clamp01(v / Math.max(1, m));

    this.youText.setText(`YOU  HP ${this.state.playerHp}/${this.state.playerMaxHp}   FOCUS ${this.state.focus}`);
    this.enemyText.setText(`ENEMY HP ${this.state.enemyHp}/${this.state.enemyMaxHp}`);

    this.lineText.setText(this.state.line || '...');
    this.hintText.setText(this.state.hint || '');

    // HP bars
    const p = hpPct(this.state.playerHp, this.state.playerMaxHp);
    const e = hpPct(this.state.enemyHp, this.state.enemyMaxHp);

    this.hpFill.width = Math.floor(this.hpBg.width * p);
    this.enemyHpFill.width = Math.floor(this.enemyHpBg.width * e);

    // Enable/disable action row
    const canChoose = this.state.phase === BattlePhase.PLAYER_SELECT && !this.state.interactOpen && !this.strikeRunning;

    this.setActionEnabled(this.strikeText, this.strikeZone, canChoose);
    this.setActionEnabled(this.interactText, this.interactZone, canChoose);
    this.setActionEnabled(this.focusText, this.focusZone, canChoose);
    this.setActionEnabled(this.spareText, this.spareZone, canChoose && this.state.canSpare);

    // marker position
    if (canChoose) {
      this.selectorMarker.setVisible(true);
      this.snapMarkerToIndex(this.selectedIndex);
    } else {
      this.selectorMarker.setVisible(false);
    }

    // Overlay
    this.overlayContainer.setVisible(!!this.state.interactOpen);

    const overlayActive = !!this.state.interactOpen;
    this.setZoneEnabled(this.threatenText, this.threatenZone, overlayActive);
    this.setZoneEnabled(this.jokeText, this.jokeZone, overlayActive);
    this.setZoneEnabled(this.empathyText, this.empathyZone, overlayActive);
    this.setZoneEnabled(this.analyzeText, this.analyzeZone, overlayActive);
    this.setZoneEnabled(this.closeText, this.closeZone, overlayActive);
  }

  private setActionEnabled(label: Phaser.GameObjects.Text, zone: Phaser.GameObjects.Zone, enabled: boolean) {
    label.setAlpha(enabled ? 1 : 0.35);
    if (enabled) zone.setInteractive({ useHandCursor: true });
    else zone.disableInteractive();
  }

  private setZoneEnabled(label: Phaser.GameObjects.Text, zone: Phaser.GameObjects.Zone, enabled: boolean) {
    label.setAlpha(enabled ? 1 : 0.35);
    if (enabled) zone.setInteractive({ useHandCursor: true });
    else zone.disableInteractive();
  }

  private onAction(a: BattleAction) {
    const canChoose = this.state.phase === BattlePhase.PLAYER_SELECT && !this.state.interactOpen && !this.strikeRunning;
    if (!canChoose) return;
    if (a === BattleAction.SPARE && !this.state.canSpare) return;
    this.game.events.emit('battle:action', a);
  }

  private onInteract(k: InteractKind) {
    if (!this.state.interactOpen) return;
    this.game.events.emit('battle:interact', k);
  }

  private onCloseInteract() {
    if (!this.state.interactOpen) return;
    this.game.events.emit('battle:interactClose');
  }

  // ===== Selection controls =====
  private moveSelection(dir: -1 | 1) {
    const canChoose = this.state.phase === BattlePhase.PLAYER_SELECT && !this.state.interactOpen && !this.strikeRunning;
    if (!canChoose) return;

    let idx = this.selectedIndex;
    for (let i = 0; i < ACTIONS.length; i++) {
      idx = (idx + dir + ACTIONS.length) % ACTIONS.length;
      if (ACTIONS[idx] === BattleAction.SPARE && !this.state.canSpare) continue;
      break;
    }
    this.setSelection(idx);
  }

  private setSelection(idx: number) {
    const canChoose = this.state.phase === BattlePhase.PLAYER_SELECT && !this.state.interactOpen && !this.strikeRunning;
    if (!canChoose) return;

    if (ACTIONS[idx] === BattleAction.SPARE && !this.state.canSpare) return;

    this.selectedIndex = idx;
    this.snapMarkerToIndex(idx);
  }

  private snapMarkerToIndex(idx: number) {
    const target =
      idx === 0 ? this.strikeText : idx === 1 ? this.interactText : idx === 2 ? this.focusText : this.spareText;

    const b = target.getBounds();
    this.selectorMarker.x = b.x - 14;
    this.selectorMarker.y = b.y + b.height / 2;
  }

  private confirmSelection() {
    const canChoose = this.state.phase === BattlePhase.PLAYER_SELECT && !this.state.interactOpen && !this.strikeRunning;
    if (!canChoose) return;

    const action = ACTIONS[this.selectedIndex];
    if (action === BattleAction.SPARE && !this.state.canSpare) return;

    this.onAction(action);
  }

  // ===== STRIKE MINI GAME (inside bottom panel) =====
  private startStrikeUI(durationMs: number) {
    if (this.strikeRunning) return;

    this.strikeRunning = true;
    this.applyStateToUI();

    // приглушаем кнопки на время мини-игры
    this.strikeText.setAlpha(0.25);
    this.interactText.setAlpha(0.25);
    this.focusText.setAlpha(0.25);
    this.spareText.setAlpha(0.25);
    this.selectorMarker.setVisible(false);

    // чистим если вдруг осталось
    this.destroyStrikeUI();

    const DEPTH_STRIKE = (this.data.get('DEPTH_STRIKE') as number) ?? 80_000;

    // позиция: строго внутри нижней панели (без перекрытий)
    const cx = this.panelX + this.panelW / 2;
    const cy = this.bottomY + 110; // чуть ниже строки диалога, выше hint

    this.strikeContainer = this.add.container(0, 0).setDepth(DEPTH_STRIKE).setScrollFactor(0);

    // панель
    const barW = Math.min(520, this.panelW - 44);
    const panel = this.add.rectangle(cx, cy, barW, 60, 0x000000, 1).setOrigin(0.5);
    panel.setStrokeStyle(3, 0xffffff, 1);
    this.strikeContainer.add(panel);

    // зоны
    const zoneCenters = [-barW * 0.25, 0, barW * 0.25];
    this.strikeZones = zoneCenters.map((dx) => {
      const r = this.add.rectangle(cx + dx, cy, 86, 18, 0x111111, 1).setOrigin(0.5);
      r.setStrokeStyle(2, 0xffffff, 1);
      this.strikeContainer!.add(r);
      return r;
    });

    // курсор
    const leftX = cx - barW / 2 + 16;
    const rightX = cx + barW / 2 - 16;

    this.strikeCursor = this.add.rectangle(leftX, cy, 6, 30, 0xffffff, 1).setOrigin(0.5);
    this.strikeContainer.add(this.strikeCursor);

    // кликабельная зона
    this.strikeClickZone = this.add.zone(cx - barW / 2, cy - 30, barW, 60).setOrigin(0, 0);
    this.strikeClickZone.setDepth(DEPTH_STRIKE + 1).setScrollFactor(0);
    this.strikeClickZone.setInteractive({ useHandCursor: true });
    this.strikeClickZone.on('pointerdown', () => this.finishStrikeFromInput());

    // tween
    this.strikeTween = this.tweens.add({
      targets: this.strikeCursor,
      x: rightX,
      duration: durationMs,
      ease: 'Linear',
      onComplete: () => {
        if (this.strikeRunning) this.finishStrike({ grade: 'MISS', multiplier: 0, effectChance: 0 });
      },
    });

    // safety timeout
    this.strikeTimeout = this.time.delayedCall(durationMs + 700, () => {
      if (this.strikeRunning) this.finishStrike({ grade: 'MISS', multiplier: 0, effectChance: 0 });
    });
  }

  private finishStrikeFromInput() {
    if (!this.strikeRunning || !this.strikeCursor) return;

    this.strikeTween?.stop();

    const x = this.strikeCursor.x;

    let bestDist = Infinity;
    for (const z of this.strikeZones) {
      const d = Math.abs(x - z.x);
      if (d < bestDist) bestDist = d;
    }

    let res: StrikeResult;
    if (bestDist > 55) res = { grade: 'MISS', multiplier: 0, effectChance: 0 };
    else if (bestDist > 32) res = { grade: 'OK', multiplier: 0.8, effectChance: 0.05 };
    else if (bestDist > 14) res = { grade: 'GOOD', multiplier: 1.0, effectChance: 0.15 };
    else res = { grade: 'PERFECT', multiplier: 1.25, effectChance: 0.30 };

    this.finishStrike(res);
  }

  private finishStrike(res: StrikeResult) {
    if (!this.strikeRunning) return;

    this.strikeRunning = false;

    this.destroyStrikeUI();

    // вернуть видимость/состояние кнопок
    this.applyStateToUI();

    // отдать результат BattleScene
    this.game.events.emit('battle:strikeResult', res);
  }

  private destroyStrikeUI() {
    this.strikeTimeout?.remove(false);
    this.strikeTimeout = undefined;

    this.strikeTween?.stop();
    this.strikeTween = undefined;

    this.strikeClickZone?.removeAllListeners();
    this.strikeClickZone?.destroy();
    this.strikeClickZone = undefined;

    this.strikeContainer?.destroy(true);
    this.strikeContainer = undefined;

    this.strikeZones = [];
    this.strikeCursor = undefined;
  }

  private shutdown() {
    if (this.onUIStateBound) {
      this.game.events.off('battle:uiState', this.onUIStateBound);
      this.onUIStateBound = undefined;
    }

    this.game.events.removeAllListeners('battle:strikeStart');

    this.destroyStrikeUI();
    this.children.removeAll(true);
  }
}
