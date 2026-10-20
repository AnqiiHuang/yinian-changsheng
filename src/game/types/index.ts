export const SCHEMA_VERSION = 1;

export type RealmId = 'mortal' | 'qi' | 'foundation' | 'golden';
export type StageId = 'early' | 'mid' | 'late';
export type SchoolId = 'sword' | 'fire' | 'body';
export type RoadId = 'none' | 'immortal' | 'demon';
export type ItemType = 'technique' | 'heart' | 'treasure' | 'consumable' | 'material' | 'plot';
export type Quality = 'common' | 'spirit' | 'rare';
export type Ownership = 'permanent' | 'run';
export type ScreenId =
  | 'opening'
  | 'create'
  | 'home'
  | 'map'
  | 'prepare'
  | 'run'
  | 'event'
  | 'battle'
  | 'settlement'
  | 'cultivate'
  | 'inventory'
  | 'bonds'
  | 'journal'
  | 'settings'
  | 'breakthrough';

export type NodeKind = 'battle' | 'event' | 'rest' | 'merchant' | 'elite' | 'boss' | 'treasure' | 'prep';
export type NodeIcon = 'sword' | 'scroll' | 'lamp' | 'bag' | 'rest' | 'boss';
export type Risk = '低' | '中' | '高';
export type DungeonId = 'tutorial' | 'bamboo';
export type SettlementKind = 'victory' | 'retreat' | 'defeat' | 'abandon';
export type BattleAction = 'attack' | 'defend' | 'spell' | 'pill' | 'powder';
export type SceneId = 'village' | 'shrine' | 'bamboo' | 'night';

export interface Condition {
  op: 'all' | 'any' | 'not' | 'realmAtLeast' | 'item' | 'flag' | 'relation' | 'renown' | 'count' | 'location' | 'road' | 'school' | 'stones' | 'runHp';
  of?: Condition[];
  realm?: RealmId;
  itemId?: string;
  qty?: number;
  flag?: string;
  value?: boolean;
  npcId?: string;
  min?: number;
  factionId?: string;
  key?: string;
  locationId?: string;
  road?: RoadId;
  school?: SchoolId;
}

export type Effect =
  | { op: 'stones'; amount: number }
  | { op: 'cultivation'; amount: number; grantId?: string }
  | { op: 'item'; itemId: string; qty: number; persist?: boolean; grantId?: string }
  | { op: 'learn'; itemId: string }
  | { op: 'equip'; slot: 'technique' | 'heart'; itemId: string }
  | { op: 'relation'; npcId: string; amount: number; reason: string }
  | { op: 'renown'; factionId: string; amount: number }
  | { op: 'flag'; flag: string; value?: boolean }
  | { op: 'counter'; key: string; amount: number }
  | { op: 'codex'; entryId: string }
  | { op: 'clue'; clueId: string; text: string }
  | { op: 'feedback'; text: string }
  | { op: 'runHp'; amount: number }
  | { op: 'runHpPct'; amount: number }
  | { op: 'runMp'; amount: number }
  | { op: 'dao'; amount: number }
  | { op: 'achievement'; id: string }
  | { op: 'battle'; enemyId: string }
  | { op: 'endRun'; kind: 'retreat' | 'victory' }
  | { op: 'unlock'; locationId: string }
  | { op: 'meet'; npcId: string; reason: string }
  | { op: 'quest'; questId: string; title: string; detail: string; status: 'open' | 'done' };

export interface Cost {
  kind: 'item' | 'stones' | 'runHp';
  itemId?: string;
  amount: number;
  shopDiscount?: boolean;
}

export interface EventChoice {
  id: string;
  label: string;
  detail?: string;
  condition?: Condition;
  hideIfUnavailable?: boolean;
  costs: Cost[];
  resultText: string;
  effects: Effect[];
}

export interface EventDefinition {
  id: string;
  title: string;
  locationIds: string[];
  scene: SceneId;
  body: string;
  weight: number;
  cooldown: number;
  once?: boolean;
  chainId?: string;
  chainStep?: number;
  condition?: Condition;
  safeFallback?: boolean;
  inPool?: boolean;
  choices: EventChoice[];
}

export interface IntentTemplate {
  id: string;
  name: string;
  kind: 'attack' | 'heavy' | 'charge' | 'guard';
  power: number;
  telegraph: string;
}

export interface DropDef {
  itemId?: string;
  qty?: number;
  stones?: number;
  cultivation?: number;
  weight: number;
  guaranteed?: boolean;
  onceGrantId?: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  rank: 'normal' | 'elite' | 'boss';
  hp: number;
  atk: number;
  def: number;
  danger: Risk | '极高';
  traits: string;
  mechanism: string;
  intents: IntentTemplate[];
  drops: DropDef[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  quality: Quality;
  school: SchoolId | 'any';
  description: string;
  effectText: string;
  price: number | null;
  sellable: boolean;
  source: string;
}

export interface BlessingDefinition {
  id: string;
  name: string;
  school: SchoolId | 'any';
  max: number;
  description: string;
}

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  qty: number;
  ownership: Ownership;
  sealed: boolean;
}

export interface Player {
  name: string;
  appearanceId: string;
  originId: string;
  talentId: string;
  offeredTalentIds: string[];
  realm: RealmId;
  stage: StageId;
  cultivation: number;
  lifetimeCultivation: number;
  insightReserve: number;
  road: RoadId;
  learnedTechniqueIds: string[];
  learnedHeartIds: string[];
  equipment: {
    techniqueId: string | null;
    heartId: string | null;
    treasureInstanceIds: string[];
  };
  inventory: ItemInstance[];
  spiritStones: number;
  daoYun: number;
  hpFlat: number;
}

export interface StatusInstance {
  id: 'burn' | 'swordIntent' | 'defending';
  stacks: number;
  turns: number;
  sourceAtk: number;
}

export interface BattleReward {
  stones: number;
  cultivation: number;
  items: { itemId: string; qty: number; grantId?: string }[];
}

export interface BattleState {
  battleId: string;
  enemyId: string;
  round: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyShield: number;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerShield: number;
  playerAtk: number;
  playerDef: number;
  enemyAtk: number;
  enemyDef: number;
  intentIndex: number;
  statuses: StatusInstance[];
  log: string[];
  lastBrief?: string;
  counters: Record<string, number>;
  finished: 'win' | 'lose' | null;
  auto: boolean;
  rngCursor: number;
  rewardGranted: boolean;
  pendingReward: BattleReward;
  school: SchoolId;
  heartId: string | null;
  treasureIds: string[];
  blessings: { id: string; stacks: number }[];
  mirrorReady: boolean;
  nodeEndsRun: boolean;
}

export interface RunNode {
  id: string;
  layer: number;
  kind: NodeKind;
  label: string;
  icon: NodeIcon;
  risk: Risk;
  enemyId?: string;
  eventId?: string;
  endsRun?: boolean;
  reward?: { itemId?: string; qty?: number; stones?: number; cultivation?: number; text: string };
  rewardGranted?: boolean;
  rested?: boolean;
  revealed?: boolean;
  trait?: string;
}

export interface PendingResult {
  title: string;
  text: string;
  deltas: string[];
}

export interface RunState {
  runId: string;
  dungeonId: DungeonId;
  seed: number;
  rngCursor: number;
  map: RunNode[];
  layer: number;
  nodeId: string | null;
  phase: 'choose' | 'event' | 'result' | 'battle' | 'blessing' | 'rest';
  loot: ItemInstance[];
  stones: number;
  cultivation: number;
  blessings: { id: string; stacks: number }[];
  blessingOffer: string[] | null;
  blessingSerial: number;
  sealedInstanceId: string | null;
  battle: BattleState | null;
  eventId: string | null;
  choiceId: string | null;
  pendingBattleEnemyId: string | null;
  pendingBattleEnds: boolean;
  pendingEnd: 'retreat' | 'victory' | null;
  seenEvents: string[];
  pendingResult: PendingResult | null;
  loadout: {
    techniqueId: string;
    heartId: string | null;
    treasureInstanceIds: string[];
  };
  supplies: { instanceId: string; definitionId: string; qty: number }[];
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  inspected: number;
  keyNodesCleared: number;
  mirrorReady: boolean;
  log: string[];
  generationNotes: string[];
}

export interface Quest {
  id: string;
  title: string;
  detail: string;
  status: 'open' | 'done';
}

export interface WorldState {
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  relations: Record<string, { value: number; lastReason: string }>;
  renown: Record<string, number>;
  unlockedLocations: string[];
  currentLocation: string;
  feedback: string;
  quests: Quest[];
  clues: { id: string; text: string }[];
  eventCooldown: Record<string, number>;
  metNpcs: string[];
}

export interface CodexState {
  entries: string[];
  achievements: Record<string, { unlocked: boolean; claimed: boolean }>;
  stories: { eventId: string; choiceId: string; summary: string }[];
}

export interface TownEvent {
  eventId: string;
  choiceId: string | null;
  result: PendingResult | null;
}

export interface PendingSettlement {
  id: string;
  runId: string;
  dungeonId: DungeonId;
  kind: SettlementKind;
  claimed: boolean;
  items: { definitionId: string; qty: number; sealed?: boolean }[];
  lost: { definitionId: string; qty: number }[];
  returnedSupplies: { definitionId: string; qty: number }[];
  stones: number;
  cultivation: number;
  cultivationDropped: number;
  summary: string;
  advice?: string;
  grants: string[];
  seenEvents: string[];
  overflowNote?: string;
}

export interface Settings {
  sound: boolean;
  fontScale: 'standard' | 'large' | 'xlarge';
  reduceMotion: boolean;
  battleSpeed: 'normal' | 'fast';
  narrative?: 'full' | 'type';
}

export interface AnalyticsEvent {
  name: string;
  at: number;
  props: Record<string, string | number | boolean>;
}

export interface SaveData {
  schemaVersion: number;
  saveId: string;
  revision: number;
  savedAt: number;
  devMarked?: boolean;
  player: Player;
  run: RunState | null;
  settlement: PendingSettlement | null;
  world: WorldState;
  codex: CodexState;
  ledger: { claimedRewardIds: string[]; storyGrants: string[] };
  settings: Settings;
  ceremonyBaseline?: { maxHp: number; atk: number; def: number; maxMp: number };
  screen: ScreenId;
  townEvent: TownEvent | null;
  analytics: AnalyticsEvent[];
  calendar: { age: number; seasonIndex: number };
  ceremonySeen: boolean;
}

export type StepResult = { ok: true; save: SaveData; toast?: string } | { ok: false; error: string };

export interface AdResult {
  status: 'completed' | 'cancelled' | 'unavailable' | 'error';
  impressionId?: string;
  reason?: string;
}

export interface AdShowInput {
  placementId: string;
  contextId: string;
  rewardDescription: string;
}

export interface AdProvider {
  isAvailable(placementId: string): Promise<boolean>;
  showRewarded(input: AdShowInput): Promise<AdResult>;
}
