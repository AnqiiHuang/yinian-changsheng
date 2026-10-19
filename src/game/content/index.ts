import type {
  BlessingDefinition,
  EnemyDefinition,
  EventDefinition,
  ItemDefinition,
} from '../types';
import { ENEMY_STATS } from '../balance/config';

export interface OriginDef {
  id: string;
  name: string;
  summary: string;
  stones: number;
  hpFlat: number;
  items: { id: string; qty: number }[];
  rumor: boolean;
}

export interface TalentDef {
  id: string;
  name: string;
  summary: string;
}

export interface AppearanceDef {
  id: string;
  name: string;
  summary: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  blurb: string;
}

export interface CodexEntry {
  id: string;
  title: string;
  text: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  detail: string;
  hint: string;
}

export interface LocationDef {
  id: string;
  name: string;
  desc: string;
  scene: 'village' | 'shrine' | 'bamboo' | 'night';
  lockText?: string;
}

export const APPEARANCES: AppearanceDef[] = [
  { id: 'app_robe', name: '青衫', summary: '旧青衫，袖口磨得发白。形象不改变气血与攻击。' },
  { id: 'app_plain', name: '素衣', summary: '素白短衣，头发用木簪挽起。形象不改变气血与攻击。' },
  { id: 'app_travel', name: '短褐', summary: '短褐与草鞋，方便走山路。形象不改变气血与攻击。' },
];

export const ORIGINS: OriginDef[] = [
  {
    id: 'origin_herb',
    name: '山村采药人',
    summary: '多带灵木枝，认得常见药草。初始灵石较少。',
    stones: 20,
    hpFlat: 0,
    items: [{ id: 'mat_wood', qty: 3 }],
    rumor: false,
  },
  {
    id: 'origin_scholar',
    name: '落第书生',
    summary: '多带灵石，听过山外修士的传闻。没有额外药材。',
    stones: 36,
    hpFlat: 0,
    items: [],
    rumor: true,
  },
  {
    id: 'origin_escort',
    name: '镖局学徒',
    summary: '体魄更扎实，气血永久提高10。灵石与药材都中等。',
    stones: 24,
    hpFlat: 10,
    items: [],
    rumor: false,
  },
];

export const TALENTS: TalentDef[] = [
  { id: 'talent_bone', name: '根骨坚实', summary: '气血提高一成。' },
  { id: 'talent_eye', name: '观物入微', summary: '每局可额外察看一个未知节点的风险。' },
  { id: 'talent_study', name: '勤学不倦', summary: '从功法书学习时，灵木枝消耗降低一成。' },
  { id: 'talent_market', name: '市井熟客', summary: '秘境商人的普通商品价格降低一成。' },
];

export const NAME_POOL = ['沈照', '林晚宁', '周衡', '陈野', '顾清和', '叶安', '江澄', '苏禾', '秦石', '温宁', '陆听白', '谢无咎', '许青禾', '韩渡', '宋小安'];

export const LOCATIONS: LocationDef[] = [
  {
    id: 'loc_qinghe',
    name: '青禾村',
    desc: '晨雾贴着稻田。你的旧屋还在，灶是冷的，巷口能看见去破庙的土路。',
    scene: 'village',
  },
  {
    id: 'loc_shrine',
    name: '山雨破庙',
    desc: '残瓦接不住雨。神像身上有水痕，侧殿里有一盏一次只亮一小会儿的灯。',
    scene: 'shrine',
  },
  {
    id: 'loc_bamboo',
    name: '雾隐竹林',
    desc: '窄石径沿着浅溪进去。竹影很密，石灯大多熄了，只有深处偶尔闪一点淡光。',
    scene: 'bamboo',
    lockText: '炼气之后才进得去。引气完成前，林中的雾不认你。',
  },
];

export const NPCS: NpcDef[] = [
  { id: 'npc_jiang', name: '江小满', role: '村中采药人', blurb: '背篓总是半满。她认得你，也认得不该一次采尽的药圃。' },
  { id: 'npc_shen', name: '沈砚', role: '失去修为的书生', blurb: '他现在教的是呼吸，不是飞升。话不多，灯芯却捻得很仔细。' },
  { id: 'npc_ye', name: '夜无归', role: '烬灯会修士', blurb: '黑衣，肩上有剑伤。他不肯报宗门，只把一封干燥的信护在怀里。' },
  { id: 'npc_qin', name: '秦照', role: '巡山弟子', blurb: '字迹端正。他要的是你看见的事实，不是一句有罪或无罪。' },
  { id: 'npc_wen', name: '温婆婆', role: '隐居药师', blurb: '住在山下柳巷。有人托你转告，今年的花还是开了。' },
];

export const FACTIONS = [
  { id: 'qingheng', name: '清衡宗' },
  { id: 'duquan', name: '渡川盟' },
  { id: 'jindeng', name: '烬灯会' },
];

export const CODEX: CodexEntry[] = [
  { id: 'rumor_gate', title: '山外有修士', text: '你听过不完整的传闻：山外有人修炼，天门是很旧的说法。没有人告诉你那扇门为什么关上。' },
  { id: 'codex_spring', title: '石阶清泉', text: '竹林石阶下有一脉凉泉，沙里夹着淡淡灵光。可以歇息，也可以只把泉眼记下。' },
  { id: 'codex_boss', title: '山魈的蓄力', text: '雾骨山魈会先蹲下蓄力。下一击是重击，守御能让这记直接伤害减半。' },
  { id: 'codex_rain', title: '柳巷温家', text: '破庙里的人要你记住：山下柳巷，温家。今年的花还是开了。' },
  { id: 'codex_rubbing', title: '残碑半句', text: '拓本上只有半句。清衡宗与烬灯会各解释一半，后文不在这一张纸上。' },
  { id: 'codex_market', title: '纸灯商人', text: '竹林里有个不报名号的商人，纸灯的样式在坊市应当有人认得。坊市本身还没开放。' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'ach_spark', name: '初识灵机', detail: '完成引气，从凡人进入炼气。', hint: '把破庙、试炼和五十修为走完。' },
  { id: 'ach_return', name: '首次全身而退', detail: '胜利或安全撤离，并带回当次收获。', hint: '休息处可以安全撤离。' },
  { id: 'ach_treasure', name: '第一件灵品法宝', detail: '获得一件灵品法宝。', hint: '商人、宝匣和首领都可能带着法宝。' },
  { id: 'ach_rain', name: '雨夜之约', detail: '把破庙那夜的事问到一个段落。', hint: '那夜的选择在两次历练之后还会有消息。' },
];

export const ITEMS: ItemDefinition[] = [
  {
    id: 'tech_songfeng',
    name: '松风剑诀',
    type: 'technique',
    quality: 'common',
    school: 'sword',
    description: '剑修基础功法。剑路清朗，适合把剑意一层层叠上去。',
    effectText: '攻击造成1.0倍剑击。施术消耗8灵力，造成1.6倍伤害，并获得1层剑意。',
    price: null,
    sellable: false,
    source: '沈砚传授，或在竹林战利中找到另一卷',
  },
  {
    id: 'tech_lihuo',
    name: '离火诀',
    type: 'technique',
    quality: 'common',
    school: 'fire',
    description: '火修基础功法。火息沉，不追求一击，追求把灼烧叠到能引爆。',
    effectText: '攻击造成0.85倍伤害并施加1层灼烧。施术消耗8灵力，造成1.2倍伤害，并引爆灼烧。',
    price: null,
    sellable: false,
    source: '沈砚传授，或在竹林战利中找到另一卷',
  },
  {
    id: 'heart_yangyuan',
    name: '养元经',
    type: 'heart',
    quality: 'common',
    school: 'any',
    description: '引气之后用来稳住灵力的心法。',
    effectText: '灵力上限提高10。',
    price: null,
    sellable: false,
    source: '引气成功时领悟',
  },
  {
    id: 'heart_tingfeng',
    name: '听风录',
    type: 'heart',
    quality: 'common',
    school: 'any',
    description: '把第一剑的回势收成灵力。',
    effectText: '每场战斗的第一次普通攻击额外恢复2点灵力。',
    price: null,
    sellable: false,
    source: '竹林精英与宝匣',
  },
  {
    id: 'tre_mirror',
    name: '裂纹铜镜',
    type: 'treasure',
    quality: 'spirit',
    school: 'any',
    description: '镜面有一道旧裂纹。它只肯在致命的那一下出一次力。',
    effectText: '每局一次，免于致命伤，气血保留1。触发后本局失效，下一局恢复。',
    price: 48,
    sellable: true,
    source: '雾骨山魈的战利',
  },
  {
    id: 'tre_jade',
    name: '回灵玉',
    type: 'treasure',
    quality: 'spirit',
    school: 'any',
    description: '温润的小玉。击中时能感到一点点回流。',
    effectText: '每累计3次攻击命中恢复2点灵力，每回合最多触发一次。',
    price: 40,
    sellable: true,
    source: '竹林夜行商',
  },
  {
    id: 'tre_lamp',
    name: '青莲灯',
    type: 'treasure',
    quality: 'spirit',
    school: 'any',
    description: '灯焰很小，偏青。守御时会轻轻一跳。',
    effectText: '每场战斗的第一次守御，清除自身一层灼烧。',
    price: 36,
    sellable: true,
    source: '竹林宝匣',
  },
  {
    id: 'tre_gourd',
    name: '赤炎葫',
    type: 'treasure',
    quality: 'spirit',
    school: 'fire',
    description: '葫芦口有一点干涸的火星。',
    effectText: '每场战斗第一次施加灼烧时，额外增加1层。',
    price: 36,
    sellable: true,
    source: '雾骨山魈的战利',
  },
  {
    id: 'con_heal',
    name: '回春丹',
    type: 'consumable',
    quality: 'common',
    school: 'any',
    description: '常见丹药，苦，见效快。只能在历练或战斗中服用。',
    effectText: '恢复25%最大气血。药效提升会按层数增加这个比例。',
    price: 20,
    sellable: true,
    source: '开局随身，商人与战利也可能再得到',
  },
  {
    id: 'con_mind',
    name: '凝神散',
    type: 'consumable',
    quality: 'common',
    school: 'any',
    description: '一包干粉，冲水就能喝。用来在战斗里回灵力。',
    effectText: '恢复10点灵力。',
    price: 18,
    sellable: true,
    source: '夜行商与竹林战利',
  },
  {
    id: 'mat_marrow',
    name: '青髓草',
    type: 'material',
    quality: 'spirit',
    school: 'any',
    description: '筑基所需的主药之一。这一株的茎是青白色的。',
    effectText: '筑基材料。当前样本不能出售，也不能代替修为。',
    price: null,
    sellable: false,
    source: '雾骨山魈每次战胜必掉1株',
  },
  {
    id: 'mat_wood',
    name: '灵木枝',
    type: 'material',
    quality: 'common',
    school: 'any',
    description: '普通灵木的枝条，可以用来学习功法书。',
    effectText: '学习一本功法或心法书需要消耗4枝，勤学不倦则为3枝。',
    price: 8,
    sellable: true,
    source: '采药出身、竹林事件与普通战斗',
  },
  {
    id: 'plot_letter',
    name: '旧家书',
    type: 'plot',
    quality: 'common',
    school: 'any',
    description: '信纸是干的。收信的人在山下柳巷温家。',
    effectText: '剧情信物，获得即保存，不可出售，战败不会失去。',
    price: null,
    sellable: false,
    source: '在破庙把回春丹留给夜无归',
  },
  {
    id: 'plot_rubbing',
    name: '残碑拓本',
    type: 'plot',
    quality: 'common',
    school: 'any',
    description: '只有半句。墨色很淡，边角是秦照拓的。',
    effectText: '剧情信物，获得即保存，不可出售，战败不会失去。',
    price: null,
    sellable: false,
    source: '雨夜之约的第三段',
  },
];

export const BLESSINGS: BlessingDefinition[] = [
  { id: 'bless_sword_qi', name: '剑气追加', school: 'sword', max: 3, description: '普通攻击后追加一次打击，倍率为0.25，每多一层提高0.1。每回合一次。' },
  { id: 'bless_sword_echo', name: '剑阵回响', school: 'sword', max: 2, description: '施术前消耗现有剑意。每层剑意额外提高0.3倍伤害，第二层造化再提高0.1。施术后仍获得1层剑意。' },
  { id: 'bless_burn', name: '灼烧加深', school: 'fire', max: 3, description: '灼烧回合末伤害提高。基础是每层来源攻击的10%，每一层造化再提高5%。' },
  { id: 'bless_shield', name: '护盾加固', school: 'any', max: 3, description: '守御时额外获得最大气血4%乘层数的护盾。' },
  { id: 'bless_mp', name: '灵力上限', school: 'any', max: 3, description: '灵力上限提高4点乘层数。挑选后立即生效。' },
  { id: 'bless_pill', name: '药效提升', school: 'any', max: 3, description: '回春丹的治疗比例提高10%乘层数。' },
];

const attack = (id: string, name: string, power: number, telegraph: string) => ({ id, name, kind: 'attack' as const, power, telegraph });

export const ENEMIES: EnemyDefinition[] = [
  {
    id: 'enemy_leaf',
    name: '竹叶妖',
    rank: 'normal',
    ...ENEMY_STATS.enemy_leaf,
    danger: '低',
    traits: '动作轻，只会反复抓挠',
    mechanism: '没有蓄力，适合用来熟悉攻击和守御。',
    intents: [attack('scratch', '抓挠', 1, '它屈起叶子，准备抓向你的手臂。')],
    drops: [
      { stones: 8, weight: 1, guaranteed: true },
      { cultivation: 3, weight: 1, guaranteed: true },
      { itemId: 'mat_wood', qty: 1, weight: 1 },
    ],
  },
  {
    id: 'enemy_fox',
    name: '雾狸',
    rank: 'normal',
    ...ENEMY_STATS.enemy_fox,
    danger: '低',
    traits: '短促扑击，血不多',
    mechanism: '连续扑击，没有特殊阶段。',
    intents: [attack('pounce', '扑击', 1, '雾狸伏低身子，下一扑很直。')],
    drops: [
      { stones: 8, weight: 1, guaranteed: true },
      { cultivation: 3, weight: 1, guaranteed: true },
      { itemId: 'con_heal', qty: 1, weight: 1 },
    ],
  },
  {
    id: 'enemy_lamp',
    name: '石灯残火',
    rank: 'normal',
    ...ENEMY_STATS.enemy_lamp,
    danger: '中',
    traits: '贴近时带一点灼热',
    mechanism: '普通攻击为主，偶尔停下来积一点护盾。',
    intents: [
      attack('scorch', '扑火', 1, '残火膨了一下，要贴到你身上。'),
      { id: 'guard', name: '缩火', kind: 'guard', power: 0, telegraph: '它缩回灯盏，火势暂时弱下去。' },
    ],
    drops: [
      { stones: 10, weight: 1, guaranteed: true },
      { cultivation: 3, weight: 1, guaranteed: true },
      { itemId: 'mat_wood', qty: 1, weight: 1 },
    ],
  },
  {
    id: 'enemy_snake',
    name: '青鳞蛇',
    rank: 'normal',
    ...ENEMY_STATS.enemy_snake,
    danger: '中',
    traits: '两击之后会停顿',
    mechanism: '攻击两轮，然后盘起身子获得护盾。',
    intents: [
      attack('bite', '噬咬', 1, '青鳞蛇昂起脖子。'),
      attack('bite2', '再咬', 1, '它没有退，还要再咬一口。'),
      { id: 'coil', name: '盘身', kind: 'guard', power: 0, telegraph: '它开始盘到石上，鳞片收紧。' },
    ],
    drops: [
      { stones: 10, weight: 1, guaranteed: true },
      { cultivation: 4, weight: 1, guaranteed: true },
      { itemId: 'con_mind', qty: 1, weight: 1 },
    ],
  },
  {
    id: 'enemy_shade',
    name: '竹影客',
    rank: 'elite',
    ...ENEMY_STATS.enemy_shade,
    danger: '高',
    traits: '血更厚，会夹一记较重的斩击',
    mechanism: '普通斩击与较重的一斩交替。重斩可用守御减伤。',
    intents: [
      attack('cut', '斩击', 1, '竹影客侧过残刃。'),
      { id: 'heavy', name: '重斩', kind: 'heavy', power: 1.5, telegraph: '他提起残刃，下一斩明显更重。' },
    ],
    drops: [
      { stones: 14, weight: 1, guaranteed: true },
      { cultivation: 6, weight: 1, guaranteed: true },
      { itemId: 'heart_tingfeng', qty: 1, weight: 3 },
      { itemId: 'tre_jade', qty: 1, weight: 2 },
      { itemId: 'con_mind', qty: 1, weight: 2 },
    ],
  },
  {
    id: 'enemy_wugu',
    name: '雾骨山魈',
    rank: 'boss',
    ...ENEMY_STATS.enemy_wugu,
    danger: '高',
    traits: '先蓄力，再重击；守御可让重击减半',
    mechanism: '攻击、蓄力、重击循环。蓄力当回合不造成伤害，下一手重击可用守御减半。',
    intents: [
      attack('claw', '挥爪', 1, '山魈挥出一只长爪。'),
      { id: 'charge', name: '蓄力', kind: 'charge', power: 0, telegraph: '它蹲低身子，雾气堆在爪上。下一击会是重击。' },
      { id: 'smash', name: '重击', kind: 'heavy', power: 2.2, telegraph: '重击要落下来了。守御可以让这记伤害减半。' },
    ],
    drops: [
      { itemId: 'mat_marrow', qty: 1, weight: 1, guaranteed: true },
      { stones: 22, weight: 1, guaranteed: true },
      { cultivation: 16, weight: 1, guaranteed: true },
      { itemId: 'tre_gourd', qty: 1, weight: 2 },
      { itemId: 'tre_mirror', qty: 1, weight: 2 },
      { itemId: 'tech_songfeng', qty: 1, weight: 1 },
      { itemId: 'tech_lihuo', qty: 1, weight: 1 },
    ],
  },
];

export const EVENTS: EventDefinition[] = [
  {
    id: 'event_spring',
    title: '石阶清泉',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '石阶缝里渗出一脉细泉，水气发凉。泉边没有足印，只有一层将化未化的薄霜。你蹲下去，看见细沙里嵌着极淡的灵光，像谁把星子碾碎了洒在水底。袖口被雾气沾湿，你暂时没有伸手。',
    weight: 4,
    cooldown: 1,
    safeFallback: true,
    inPool: true,
    choices: [
      {
        id: 'rest',
        label: '掬水，在石阶上歇一会儿',
        detail: '恢复一些气血，不取水底的东西',
        costs: [],
        resultText: '你捧了两口水，凉意沿手腕走到肩。喘息慢慢平了，泉底的光你没有去动，起身时石阶上只多了一个湿印。',
        effects: [{ op: 'runHpPct', amount: 28 }, { op: 'codex', entryId: 'codex_spring' }],
      },
      {
        id: 'note',
        label: '记下泉眼，不在这里久留',
        detail: '获得少量修为',
        costs: [],
        resultText: '你把泉眼、石阶和霜的位置记在心里。这点见闻很轻，却是你自己走出来的，不是谁塞进手里的地图。',
        effects: [
          { op: 'cultivation', amount: 4 },
          { op: 'codex', entryId: 'codex_spring' },
        ],
      },
    ],
  },
  {
    id: 'event_scroll',
    title: '风过竹简',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '风把一截竹简吹到溪边，绳扣已经松开。简上的字被水洇开，仍能认出几句调息的心得。旁边压着一小束晒干的叶子，叶脉里还留着一点青气。绳结上还有没干的泥点，像是刚被人松开。',
    weight: 4,
    cooldown: 1,
    safeFallback: true,
    inPool: true,
    choices: [
      {
        id: 'read',
        label: '把残简上的心得读完',
        detail: '获得少量修为',
        costs: [],
        resultText: '你顺着没被洇开的句子调了一遍呼吸。心得很粗，只够你记住“先守住，再出招”。读完，简就散在溪边。',
        effects: [{ op: 'cultivation', amount: 6 }],
      },
      {
        id: 'take',
        label: '带走那束晒干的叶子',
        detail: '获得灵木枝',
        costs: [],
        resultText: '你没有细读，只把干叶收进囊里。叶子还能用，简上的句子则被风一页页掀走，你没有追。',
        effects: [{ op: 'item', itemId: 'mat_wood', qty: 2 }],
      },
    ],
  },
  {
    id: 'event_garden',
    title: '林间药圃',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '竹林让出一块空地，有人用石块围出药圃，土还是湿的。几株灵木幼苗挤在一起，叶背带着细绒。远处没有人声，只有雨滴顺着竹节一节节往下跳。石缝里留着半个浅浅的脚印，朝竹林外。',
    weight: 3,
    cooldown: 1,
    safeFallback: true,
    inPool: true,
    choices: [
      {
        id: 'pick',
        label: '采集已经长成的枝叶',
        detail: '获得较多灵木枝',
        costs: [],
        resultText: '你只采了长成的枝，没有动苗。枝条入手仍带着土气。空地看起来少了一圈，但石围还在，主人回来认得出。',
        effects: [{ op: 'item', itemId: 'mat_wood', qty: 3 }],
      },
      {
        id: 'leave',
        label: '留一半，把幼苗盖好',
        detail: '材料更少，江小满会记住',
        costs: [],
        resultText: '你采了一枝，又把露出的根须用湿土盖上。这种留法不值钱，可若是江小满看见，她会知道你没有把野生的圃一次挖尽。',
        effects: [
          { op: 'item', itemId: 'mat_wood', qty: 1 },
          { op: 'relation', npcId: 'npc_jiang', amount: 6, reason: '你在竹林药圃留了苗' },
          { op: 'meet', npcId: 'npc_jiang', reason: '同村采药' },
        ],
      },
    ],
  },
  {
    id: 'event_traveler',
    title: '山路行脚人',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '雾里走来一个背篓的行脚人，斗笠还在滴水。他用竹杖点了点深处：“前头那东西会先蹲下蓄力，再扑上来。想活命，就在它抬爪的时候把气守住。”斗笠沿上的水珠还在一颗颗往下掉。',
    weight: 3,
    cooldown: 1,
    safeFallback: true,
    inPool: true,
    choices: [
      {
        id: 'trade',
        label: '用一句见闻交换他的提醒',
        detail: '记下山魈的蓄力',
        costs: [],
        resultText: '你说了破庙和雨。他把蓄力的姿势又比了一遍：蹲下的那一下不打人，抬爪才是重的。说完他戴好斗笠，背篓声远了。',
        effects: [
          { op: 'codex', entryId: 'codex_boss' },
          { op: 'clue', clueId: 'clue_boss', text: '雾骨山魈蓄力后的重击，可以用守御减半。' },
          { op: 'flag', flag: 'hint_boss' },
        ],
      },
      {
        id: 'leave',
        label: '道谢，沿主路继续走',
        detail: '不停留，他留下一点灵石',
        costs: [],
        resultText: '你拱手让开路面。行脚人把几枚潮润的灵石搁到石灯上，说算是借个道。等你再看，斗笠已经淡进雾里。',
        effects: [{ op: 'stones', amount: 6 }],
      },
    ],
  },
  {
    id: 'event_bridge',
    title: '断桥',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '溪上的石板断了一截，缺口下面是没膝的冷水。对岸石台上放着一只没人取走的布包，袋口露出干燥的药草。水不算深，青苔却滑，踩空会磕到石头。布包的绳结打得很松，像是随手搁下的。',
    weight: 3,
    cooldown: 1,
    inPool: true,
    choices: [
      {
        id: 'around',
        label: '绕路，不下水取包',
        detail: '更安全，修为很少',
        costs: [],
        resultText: '你沿上游找了一处浅滩绕过去，没有碰那只布包。多走了一段，鞋倒是干的。对岸的包还在原处，像在等别人。',
        effects: [{ op: 'cultivation', amount: 2 }],
      },
      {
        id: 'wade',
        label: '涉水过去，取回布包',
        detail: '消耗8点气血，获得灵木枝和灵石',
        condition: { op: 'runHp', min: 12 },
        costs: [{ kind: 'runHp', amount: 8 }],
        resultText: '你踩进冷水，青苔还是滑了一下，小腿磕青了一块。布包是干的，里面有枝条和一小把灵石，没有字条。',
        effects: [
          { op: 'item', itemId: 'mat_wood', qty: 2 },
          { op: 'stones', amount: 8 },
        ],
      },
    ],
  },
  {
    id: 'event_bell',
    title: '倒悬古铃',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '一枚旧铜铃倒挂在竹枝上。没有风，铃舌却自己轻响。铃下的土刚被翻过，像有什么东西蹲坐了很久。你靠近时，雾的深处传来短促的喘息。铜锈的气味混在湿土里，你停在三步之外。',
    weight: 2,
    cooldown: 1,
    inPool: true,
    choices: [
      {
        id: 'look',
        label: '循着铃声查看',
        detail: '会进入一场低危战斗',
        costs: [],
        resultText: '铃舌忽然停了。雾里扑出一只湿淋淋的雾狸，爪子上全是泥。它没有退路，你也已经站在铃下。',
        effects: [{ op: 'battle', enemyId: 'enemy_fox' }],
      },
      {
        id: 'mark',
        label: '记下位置，先离开',
        detail: '不战斗，获得少量修为',
        costs: [],
        resultText: '你在附近的石上划了一道，没有去掀那片新土。铃声在背后又响了一下，像提醒，也像放你走。',
        effects: [
          { op: 'cultivation', amount: 3 },
          { op: 'flag', flag: 'bell_marked' },
        ],
      },
    ],
  },
  {
    id: 'event_merchant',
    title: '夜行商',
    locationIds: ['loc_bamboo'],
    scene: 'night',
    body: '竹影里支着一盏纸灯，灯下坐着个不报姓名的商人。他摊开的东西不多，价钱写在纸签上，来路却一字不提。灯火很稳，人影比灯还静，像在等一个肯问的人。灯杆是新削的，纸灯上却没有招牌。',
    weight: 2,
    cooldown: 1,
    inPool: true,
    choices: [
      {
        id: 'buy_jade',
        label: '买下回灵玉',
        detail: '花费灵石，未封存则战败会失去',
        costs: [{ kind: 'stones', amount: 40, shopDiscount: true }],
        resultText: '玉是温的，价钱也实在。商人不解释来路，只把纸签揭下。你把它放进本局的战利里，若战败又没封存，它不会跟你回去。',
        effects: [{ op: 'item', itemId: 'tre_jade', qty: 1 }],
      },
      {
        id: 'buy_powder',
        label: '买下一包凝神散',
        detail: '花费灵石，可在战斗中恢复灵力',
        costs: [{ kind: 'stones', amount: 18, shopDiscount: true }],
        resultText: '纸包很轻，上面只写着“凝神”两个字。商人收了灵石，把灯芯拨亮一点，表示这笔买卖到此为止。',
        effects: [{ op: 'item', itemId: 'con_mind', qty: 1 }],
      },
      {
        id: 'ask',
        label: '询问来路，然后离开',
        detail: '不购买',
        costs: [],
        resultText: '他只说纸灯的样式坊市有人认得，别的不讲。你没有掏灵石。灯仍在原处，人却像早就准备好放你走。',
        effects: [
          { op: 'codex', entryId: 'codex_market' },
          { op: 'clue', clueId: 'clue_market', text: '夜行商的纸灯样式，坊市应当有人认得。坊市尚未开放。' },
        ],
      },
    ],
  },
  {
    id: 'event_shed',
    title: '空置猎棚',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '猎棚的门虚掩着，里面有干草和一壶尚温的水，主人不在。棚外的绳套还绷着，猎物的位置却空了。机关上的木楔松了半寸，再碰一下就会打下来。草垫还留着一点余温，壶盖也没有盖严。',
    weight: 3,
    cooldown: 1,
    inPool: true,
    choices: [
      {
        id: 'rest',
        label: '进屋歇息，不碰绳套',
        detail: '恢复气血与灵力',
        costs: [],
        resultText: '你喝了半壶温水，在干草上坐到呼吸平稳。绳套仍绷在门外，你出去时从边上绕开，木楔动也没动。',
        effects: [
          { op: 'runHpPct', amount: 35 },
          { op: 'runMp', amount: 4 },
        ],
      },
      {
        id: 'trap',
        label: '检查绳套，取走剩下的补给',
        detail: '会挨一下机关，损失6点气血',
        condition: { op: 'runHp', min: 10 },
        costs: [{ kind: 'runHp', amount: 6 }],
        resultText: '木楔果然脱落，藤条打在肩上，火辣辣的。绳套尽头挂着一点干粮和枝条，主人也许是匆匆离开的。',
        effects: [
          { op: 'item', itemId: 'mat_wood', qty: 1 },
          { op: 'stones', amount: 6 },
        ],
      },
    ],
  },
  {
    id: 'event_qin',
    title: '山中琴声',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '雾的深处有人拨弦，声音不高，像把散乱的呼吸一根根拢回来。你找不到弹琴的人，只看见石上放着一截断弦，露水还没干。弦的那一头没入更密的竹影。雾把琴音切成几段，却没有吹散它。',
    weight: 2,
    cooldown: 1,
    inPool: true,
    choices: [
      {
        id: 'listen',
        label: '站着把这一曲听完',
        detail: '恢复灵力，获得少量修为',
        costs: [],
        resultText: '曲调没有词。你听完，灵力像被轻轻梳过，肩上的劲也松了。再看石头，断弦还在，弹琴的人始终没有现身。',
        effects: [
          { op: 'runMp', amount: 8 },
          { op: 'cultivation', amount: 2 },
        ],
      },
      {
        id: 'follow',
        label: '沿琴声走进竹影',
        detail: '刮伤损失4点气血，获得更多修为',
        condition: { op: 'runHp', min: 8 },
        costs: [{ kind: 'runHp', amount: 4 }],
        resultText: '藤蔓刮过手背，琴声却在你拨开竹子的时候停了。地上有一枚温热的灵石，像刚从弦上滚落。人已经不在。',
        effects: [
          { op: 'cultivation', amount: 8 },
          { op: 'stones', amount: 8 },
        ],
      },
    ],
  },
  {
    id: 'event_rain_1',
    title: '雨夜破庙',
    locationIds: ['loc_shrine'],
    scene: 'shrine',
    body: '雨水沿着破败的神像往下淌。你推门时，一个黑衣人抬起头，指间的暗红灵光随即熄灭。他肩上有一道剑伤，怀里的信却被护得干燥。听见山道上传来的铃声，他将信推到你面前：“山下柳巷，温家。若我走不出去，烦请告诉她，今年的花还是开了。”门外有人停下了脚步。',
    weight: 0,
    cooldown: 99,
    once: true,
    chainId: 'rain',
    chainStep: 1,
    inPool: false,
    choices: [
      {
        id: 'heal',
        label: '以回春丹为他止血',
        detail: '消耗一枚回春丹',
        condition: { op: 'item', itemId: 'con_heal', qty: 1 },
        costs: [{ kind: 'item', itemId: 'con_heal', amount: 1 }],
        resultText: '他没有报宗门，只在你包扎时把呼吸放轻。信被你收下。门外的铃声近了又远，他记住的是你递丹药的那只手。',
        effects: [
          { op: 'flag', flag: 'rain_helped' },
          { op: 'flag', flag: 'rain_chain_started' },
          { op: 'flag', flag: 'rain_done' },
          { op: 'meet', npcId: 'npc_ye', reason: '雨夜破庙' },
          { op: 'relation', npcId: 'npc_ye', amount: 18, reason: '你用回春丹为他止了血' },
          { op: 'renown', factionId: 'jindeng', amount: 6 },
          { op: 'item', itemId: 'plot_letter', qty: 1, persist: true, grantId: 'story:letter' },
          { op: 'meet', npcId: 'npc_wen', reason: '家书上写着柳巷温家' },
          { op: 'codex', entryId: 'codex_rain' },
          { op: 'cultivation', amount: 8, grantId: 'story:rain:cult' },
          { op: 'feedback', text: '侧殿里有灯。一位书生一直没有出声。' },
          { op: 'quest', questId: 'q_shrine', title: '山雨破庙', detail: '你已经进过破庙。', status: 'done' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '去破庙侧殿，听沈砚讲引气。', status: 'open' },
        ],
      },
      {
        id: 'ask',
        label: '请巡山弟子说明缘由',
        detail: '不消耗物品',
        costs: [],
        resultText: '你没有把信拿走，只请门外的人把话说清。秦照记下你看见的伤和那句关于花的话，没有当场断定黑衣人有罪。',
        effects: [
          { op: 'flag', flag: 'rain_investigate' },
          { op: 'flag', flag: 'rain_chain_started' },
          { op: 'flag', flag: 'rain_done' },
          { op: 'meet', npcId: 'npc_ye', reason: '雨夜破庙' },
          { op: 'meet', npcId: 'npc_qin', reason: '你请他说明缘由' },
          { op: 'relation', npcId: 'npc_qin', amount: 12, reason: '你请他说明，而不是直接放人' },
          { op: 'relation', npcId: 'npc_ye', amount: -4, reason: '你把门外的人请了进来' },
          { op: 'renown', factionId: 'qingheng', amount: 6 },
          { op: 'cultivation', amount: 8, grantId: 'story:rain:cult' },
          { op: 'feedback', text: '侧殿里有灯。一位书生一直没有出声。' },
          { op: 'quest', questId: 'q_shrine', title: '山雨破庙', detail: '你已经进过破庙。', status: 'done' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '去破庙侧殿，听沈砚讲引气。', status: 'open' },
        ],
      },
      {
        id: 'pay',
        label: '留下干粮，暂且离开',
        detail: '消耗8灵石',
        condition: { op: 'stones', min: 8 },
        hideIfUnavailable: true,
        costs: [{ kind: 'stones', amount: 8 }],
        resultText: '你把灵石压在干处，当作干粮的钱，没有接那封信。黑衣人看了你一眼，没再追问。门外的脚步也暂时停住了。',
        effects: [
          { op: 'flag', flag: 'rain_left' },
          { op: 'flag', flag: 'rain_chain_started' },
          { op: 'flag', flag: 'rain_done' },
          { op: 'meet', npcId: 'npc_ye', reason: '雨夜破庙' },
          { op: 'relation', npcId: 'npc_ye', amount: 4, reason: '你留下了干粮，但没有救治' },
          { op: 'cultivation', amount: 8, grantId: 'story:rain:cult' },
          { op: 'feedback', text: '侧殿里有灯。一位书生一直没有出声。' },
          { op: 'quest', questId: 'q_shrine', title: '山雨破庙', detail: '你已经进过破庙。', status: 'done' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '去破庙侧殿，听沈砚讲引气。', status: 'open' },
        ],
      },
      {
        id: 'free',
        label: '记住此地，先行离开',
        detail: '灵石不足，这一次不消耗',
        condition: { op: 'not', of: [{ op: 'stones', min: 8 }] },
        hideIfUnavailable: true,
        costs: [],
        resultText: '你身上没有多余的灵石，只能把柳巷两个字记住，然后退出门缝。黑衣人没有拦你，也没有把信硬塞给你。',
        effects: [
          { op: 'flag', flag: 'rain_left' },
          { op: 'flag', flag: 'rain_chain_started' },
          { op: 'flag', flag: 'rain_done' },
          { op: 'meet', npcId: 'npc_ye', reason: '雨夜破庙' },
          { op: 'cultivation', amount: 8, grantId: 'story:rain:cult' },
          { op: 'feedback', text: '侧殿里有灯。一位书生一直没有出声。' },
          { op: 'quest', questId: 'q_shrine', title: '山雨破庙', detail: '你已经进过破庙。', status: 'done' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '去破庙侧殿，听沈砚讲引气。', status: 'open' },
        ],
      },
    ],
  },
  {
    id: 'event_rain_2',
    title: '柳巷来信',
    locationIds: ['loc_qinghe'],
    scene: 'village',
    body: '两次历练之后，村口石墩上压着一封潮信。角上写着秦照的名字，字迹端正。信里只提温家的花开了，又问你在破庙里究竟看见了谁，有没有把那封家书带走。信纸边角被捏出了细纹，墨却没有晕开。',
    weight: 0,
    cooldown: 99,
    once: true,
    chainId: 'rain',
    chainStep: 2,
    inPool: false,
    condition: {
      op: 'all',
      of: [
        { op: 'flag', flag: 'rain_chain_started' },
        { op: 'count', key: 'settledRuns', min: 2 },
        { op: 'not', of: [{ op: 'flag', flag: 'rain_2_done' }] },
      ],
    },
    choices: [
      {
        id: 'tell',
        label: '按原话告诉秦照',
        detail: '不添油，也不隐瞒伤势',
        costs: [],
        resultText: '你把破庙里的伤、熄灭的灵光和那句花开了照实说了。秦照没有马上定性，只说他还要再对一次铃声传来的方向。',
        effects: [
          { op: 'flag', flag: 'rain_2_done' },
          { op: 'flag', flag: 'rain_told' },
          { op: 'meet', npcId: 'npc_qin', reason: '他写了信来问' },
          { op: 'relation', npcId: 'npc_qin', amount: 8, reason: '你按原话说明了破庙那夜' },
          { op: 'feedback', text: '秦照说，证据还缺一块碑上的句子。' },
        ],
      },
      {
        id: 'wait',
        label: '先把信收好，今夜不问',
        detail: '支线还在，只是推迟',
        costs: [],
        resultText: '你把潮信烘干收好，没有连夜去找人。温家的地址还在，秦照的问题也还在。这封信不会因为你迟一天就消失。',
        effects: [
          { op: 'flag', flag: 'rain_2_done' },
          { op: 'flag', flag: 'rain_waited' },
          { op: 'feedback', text: '信你收着。想问的时候，还可以去找秦照。' },
        ],
      },
    ],
  },
  {
    id: 'event_rain_3',
    title: '铃声未绝',
    locationIds: ['loc_qinghe', 'loc_shrine'],
    scene: 'shrine',
    body: '山道上的铃声又响了一阵，随即远去。秦照把一块残碑拓片交给你，声音压得很低：“黑衣人不是单纯的贼。碑上的半句话，仙门和烬灯会各认一半，谁也没把后文拿出来。”铃声停了以后，山道重新静下来。',
    weight: 0,
    cooldown: 99,
    once: true,
    chainId: 'rain',
    chainStep: 3,
    inPool: false,
    condition: {
      op: 'all',
      of: [
        { op: 'flag', flag: 'rain_2_done' },
        { op: 'not', of: [{ op: 'flag', flag: 'rain_3_done' }] },
      ],
    },
    choices: [
      {
        id: 'both',
        label: '两份说法都先记下',
        detail: '不在今夜站队',
        costs: [],
        resultText: '你把两种解释并排记下，谁也没圈成答案。秦照没勉强你。拓本留下了，后文仍然缺着，但这条线不再是一团乱麻。',
        effects: [
          { op: 'flag', flag: 'rain_3_done' },
          { op: 'flag', flag: 'rain_both' },
          { op: 'item', itemId: 'plot_rubbing', qty: 1, persist: true, grantId: 'story:rubbing' },
          { op: 'codex', entryId: 'codex_rubbing' },
          { op: 'clue', clueId: 'clue_rubbing', text: '残碑只有半句，清衡宗与烬灯会各执一词。' },
          { op: 'relation', npcId: 'npc_qin', amount: 6, reason: '你没有只听一面之词' },
          { op: 'achievement', id: 'ach_rain' },
          { op: 'feedback', text: '雨夜的事有了段落。更大的后文还不在青岚这一角。' },
        ],
      },
      {
        id: 'sect',
        label: '先记下清衡宗的说法',
        detail: '声望与个人判断分开',
        costs: [],
        resultText: '你让秦照把清衡宗的解释说完，并告诉他你记下了，但夜无归的伤你也没涂改。拓本留下，宗门声望动了一点，疑问还在。',
        effects: [
          { op: 'flag', flag: 'rain_3_done' },
          { op: 'flag', flag: 'rain_sect_note' },
          { op: 'item', itemId: 'plot_rubbing', qty: 1, persist: true, grantId: 'story:rubbing' },
          { op: 'codex', entryId: 'codex_rubbing' },
          { op: 'renown', factionId: 'qingheng', amount: 8 },
          { op: 'relation', npcId: 'npc_qin', amount: 4, reason: '你听完了清衡宗的说法' },
          { op: 'achievement', id: 'ach_rain' },
          { op: 'feedback', text: '你记下了一面说法，另一面并没有被抹掉。' },
        ],
      },
    ],
  },
  {
    id: 'event_shen',
    title: '侧殿引气',
    locationIds: ['loc_shrine'],
    scene: 'shrine',
    body: '沈砚坐在破庙侧殿，把熄灭的灯芯重新捻直。他看了看你的呼吸，说引气不是飞升，是先让气走一条不伤经脉的路。案上摊着两卷基础功法，一卷剑气清朗，一卷火息沉稳。灯花跳了一下，又稳住。',
    weight: 0,
    cooldown: 99,
    once: true,
    inPool: false,
    condition: {
      op: 'all',
      of: [
        { op: 'flag', flag: 'rain_done' },
        { op: 'not', of: [{ op: 'flag', flag: 'qi_taught' }] },
      ],
    },
    choices: [
      {
        id: 'sword',
        label: '修习松风剑诀',
        detail: '剑修。攻击清朗，施术积累剑意',
        costs: [],
        resultText: '你跟着他把一缕气送进剑路。肩背发暖，并不轰烈。沈砚说，能守住这一路，再谈以后的山。另一卷火诀仍留在案上。',
        effects: [
          { op: 'flag', flag: 'qi_taught' },
          { op: 'flag', flag: 'school_sword' },
          { op: 'meet', npcId: 'npc_shen', reason: '他在侧殿教你引气' },
          { op: 'relation', npcId: 'npc_shen', amount: 10, reason: '你愿意从最基本的呼吸学起' },
          { op: 'learn', itemId: 'tech_songfeng' },
          { op: 'equip', slot: 'technique', itemId: 'tech_songfeng' },
          { op: 'cultivation', amount: 12, grantId: 'story:shen:cult' },
          { op: 'feedback', text: '松风剑诀已经能用。下一步是进山走完三处试炼。' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '你已经选定松风剑诀。', status: 'done' },
          { op: 'quest', questId: 'q_tutorial', title: '引气试炼', detail: '完成三处试炼，再回来突破。', status: 'open' },
        ],
      },
      {
        id: 'fire',
        label: '修习离火诀',
        detail: '火修。攻击施加灼烧，施术可以引爆',
        costs: [],
        resultText: '火息沉在掌心，只是温，不是燎原。沈砚让你把这点温稳住，说能引爆之前，先学会别烧到自己。剑诀仍留在案上。',
        effects: [
          { op: 'flag', flag: 'qi_taught' },
          { op: 'flag', flag: 'school_fire' },
          { op: 'meet', npcId: 'npc_shen', reason: '他在侧殿教你引气' },
          { op: 'relation', npcId: 'npc_shen', amount: 10, reason: '你愿意从最基本的呼吸学起' },
          { op: 'learn', itemId: 'tech_lihuo' },
          { op: 'equip', slot: 'technique', itemId: 'tech_lihuo' },
          { op: 'cultivation', amount: 12, grantId: 'story:shen:cult' },
          { op: 'feedback', text: '离火诀已经能用。下一步是进山走完三处试炼。' },
          { op: 'quest', questId: 'q_shen', title: '侧殿的书生', detail: '你已经选定离火诀。', status: 'done' },
          { op: 'quest', questId: 'q_tutorial', title: '引气试炼', detail: '完成三处试炼，再回来突破。', status: 'open' },
        ],
      },
    ],
  },
  {
    id: 'event_tutorial_fork',
    title: '林边岔路',
    locationIds: ['loc_bamboo'],
    scene: 'bamboo',
    body: '溪水在这里分成两股。一股回到你来时的石径，雾薄，脚步声也稳。另一股钻进更密的竹丛，前面有兽毛刮在石上的声音，像一只落单的雾狸还没走远。两股水声一轻一重，并不一样。',
    weight: 0,
    cooldown: 99,
    inPool: false,
    choices: [
      {
        id: 'leave',
        label: '沿着旧径安全撤离',
        detail: '带回目前的全部收获',
        costs: [],
        resultText: '你转向雾薄的那一股。兽毛的声音留在背后，没有追出来。这次试炼可以停在这里，已经拿到的东西都还在。',
        effects: [{ op: 'endRun', kind: 'retreat' }],
      },
      {
        id: 'chase',
        label: '追进竹丛看个究竟',
        detail: '还有一场低危战斗',
        costs: [],
        resultText: '你拨开湿竹，雾狸果然还在舔爪子。它受了惊，退路被溪水挡住。这一场不大，打完就能把试炼走完。',
        effects: [{ op: 'battle', enemyId: 'enemy_fox' }],
      },
    ],
  },
];

export const ITEM_MAP = Object.fromEntries(ITEMS.map((item) => [item.id, item]));
export const EVENT_MAP = Object.fromEntries(EVENTS.map((event) => [event.id, event]));
export const ENEMY_MAP = Object.fromEntries(ENEMIES.map((enemy) => [enemy.id, enemy]));
export const BLESSING_MAP = Object.fromEntries(BLESSINGS.map((blessing) => [blessing.id, blessing]));
export const ORIGIN_MAP = Object.fromEntries(ORIGINS.map((origin) => [origin.id, origin]));
export const TALENT_MAP = Object.fromEntries(TALENTS.map((talent) => [talent.id, talent]));
export const APPEARANCE_MAP = Object.fromEntries(APPEARANCES.map((appearance) => [appearance.id, appearance]));
export const NPC_MAP = Object.fromEntries(NPCS.map((npc) => [npc.id, npc]));
export const CODEX_MAP = Object.fromEntries(CODEX.map((entry) => [entry.id, entry]));
export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function poolEvents(): EventDefinition[] {
  return EVENTS.filter((event) => event.inPool);
}

export function fallbackEvents(): EventDefinition[] {
  return EVENTS.filter((event) => event.safeFallback);
}
