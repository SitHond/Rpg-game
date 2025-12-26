import Phaser from 'phaser';
import { NPC, NPCSettings } from '../entities/NPC';

// Импортируем ВСЕ диалоги
import { villager } from '../data/dialogs/village/villager';
import { guard } from '../data/dialogs/village/guards';
import { shopkeeper } from '../data/dialogs/village/shopkeepes';
// import { tavernkeeperDialog } from '../data/dialogs/tavernkeeper';
// import { wizardDialog } from '../data/dialogs/wizard';

// Унифицированная база данных NPC (единственный источник истины)
export const npcRegistry: Record<string, NPCSettings> = {
  villager_1: {
    npcId: 'villager_1',
    displayName: 'Деревенский житель',
    spriteKey: 'npc_villager',
    spriteFrame: 'villager_idle',
    dialogueId: 'villager',
    mapId: 'main',
    spawnPosition: { x: 300, y: 200 },
    canWander: true,
    wanderDistance: 50
  },
  villager_2: {
    npcId: 'villager_2',
    displayName: 'Селянка',
    spriteKey: 'npc_villager',
    spriteFrame: 'villager_female_idle',
    dialogueId: 'villager',
    mapId: 'main',
    spawnPosition: { x: 350, y: 250 },
    canWander: true,
    wanderDistance: 30
  },
  shopkeeper_1: {
    npcId: 'shopkeeper_1',
    displayName: 'Торговец Гарольд',
    spriteKey: 'npc_shopkeeper',
    spriteFrame: 'shopkeeper_idle',
    dialogueId: 'shopkeeper',
    mapId: 'main',
    spawnPosition: { x: 500, y: 300 },
    canWander: false
  },
  guard_1: {
    npcId: 'guard_1',
    displayName: 'Стражник Борис',
    spriteKey: 'npc_guard',
    spriteFrame: 'guard_idle',
    dialogueId: 'guard',
    mapId: 'main',
    spawnPosition: { x: 400, y: 100 },
    canWander: true,
    wanderDistance: 30
  },
  tavernkeeper_1: {
    npcId: 'tavernkeeper_1',
    displayName: 'Трактирщик Олег',
    spriteKey: 'npc_tavernkeeper',
    spriteFrame: 'tavernkeeper_idle',
    dialogueId: 'tavernkeeper',
    mapId: 'main',
    spawnPosition: { x: 600, y: 400 },
    canWander: false
  },
  wizard_1: {
    npcId: 'wizard_1',
    displayName: 'Маг Элдрин',
    spriteKey: 'npc_wizard',
    spriteFrame: 'wizard_idle',
    dialogueId: 'wizard',
    mapId: 'main',
    spawnPosition: { x: 700, y: 150 },
    canWander: false
  }
};

// Унифицированная база данных диалогов
export const dialogueRegistry: Record<string, any> = {
  villager: villager,
  shopkeeper: shopkeeper,
//   guard: guard,
//   tavernkeeper: tavernkeeperDialog,
  wizard: guard
};

export class NPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPC> = new Map();
  private playerRef?: Phaser.Physics.Arcade.Sprite;
  private interactionDistance: number = 80;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public registerPlayer(player: Phaser.Physics.Arcade.Sprite) {
    this.playerRef = player;
  }

  public spawnNPCsForMap(mapName: string) {
    Object.values(npcRegistry).forEach(npcSettings => {
      if (npcSettings.mapId === mapName) {
        this.createNPC(npcSettings);
      }
    });
  }

  public createNPC(settings: NPCSettings, customPosition?: { x: number; y: number }) {
    const dialogue = dialogueRegistry[settings.dialogueId];
    
    if (!dialogue) {
      console.warn(`Диалог не найден: ${settings.dialogueId}`);
      return null;
    }
    
    const npc = new NPC(this.scene, settings, dialogue, customPosition);
    this.npcs.set(settings.npcId, npc);
    
    console.log(`NPC создан: ${settings.displayName} (${settings.npcId}) на позиции`, 
                customPosition || settings.spawnPosition);
    return npc;
  }

  public getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  public getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  public findClosestInteractableNPC(): NPC | null {
    if (!this.playerRef) return null;
    
    let closestNPC: NPC | null = null;
    let closestDistance = this.interactionDistance;
    
    this.npcs.forEach(npc => {
      const distance = Phaser.Math.Distance.Between(
        this.playerRef!.x,
        this.playerRef!.y,
        npc.x,
        npc.y
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNPC = npc;
      }
    });
    
    return closestNPC;
  }

  public updateManager() {
    if (!this.playerRef) return;
    
    const player = this.playerRef;
    
    this.npcs.forEach(npc => {
      // Проверяем расстояние до игрока
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        npc.x,
        npc.y
      );
      
      const shouldBeInteractable = distance < this.interactionDistance;
      
      if (shouldBeInteractable !== npc.canInteract) {
        npc.setCanInteract(shouldBeInteractable);
        
        if (shouldBeInteractable) {
          npc.lookAt(player.x, player.y);
        }
      }
      
      // Обновляем NPC
      npc.updateNPC();
    });
  }

  public initiateDialogueWithClosestNPC(): any {
  const closestNPC = this.findClosestInteractableNPC();
  
  if (closestNPC) {
    let dialogStart = 'start';
    
    // Логика выбора диалога в зависимости от состояния
    if (closestNPC.alreadySpoken) {
      // При повторном разговоре
      dialogStart = this.scene.registry.get(`npc_${closestNPC.npcSettings.npcId}_talked`) || 'second_talk';
    }
    
    // Проверяем квесты
    const questCompleted = this.scene.registry.get('quest_wolf_problem');
    if (questCompleted && closestNPC.npcSettings.npcId === 'villager_1') {
      dialogStart = 'after_quest';
    }
    
    const dialog = {
      ...closestNPC.dialogue,
      name: closestNPC.npcSettings.displayName,
      start: dialogStart
    };
    
    closestNPC.alreadySpoken = true;
    console.log(`Инициирован диалог: ${closestNPC.npcSettings.displayName} (${dialogStart})`);
    return dialog;
  }
  
  return null;
}

  public removeAllNPCs() {
    this.npcs.forEach(npc => npc.cleanup());
    this.npcs.clear();
  }
}