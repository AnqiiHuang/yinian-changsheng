import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ACHIEVEMENTS, APPEARANCES, BLESSING_MAP, ENEMY_MAP, EVENT_MAP, ITEM_MAP, LOCATIONS, NAME_POOL, ORIGINS, TALENTS } from '../../game/content';
import {
  abandonRun,
  acknowledgeCeremony,
  actInBattle,
  attemptBreakthrough,
  autoResolveBattle,
  chooseNode,
  chooseRunOption,
  chooseTownOption,
  claimSettlement,
  continueAfterResult,
  continueTown,
  createSave,
  equipHeart,
  equipTechnique,
  inspectNode,
  leaveBattle,
  leaveRest,
  moveScreen,
  openTownEvent,
  pickBlessing,
  restHere,
  safeRetreat,
  sealLoot,
  setBattleAuto,
  startDungeon,
  talkToJiang,
  updateSettings,
  visibleTextLength,
} from '../../game/engine/flow';
import { suggestAction } from '../../game/engine/combat';
import {
  activeEvent,
  ageText,
  blessingCards,
  choiceViews,
  codexLines,
  dungeonCopy,
  goalOf,
  homeActions,
  knownFactions,
  knownNpcs,
  playerStats,
  progressText,
  qualityLabel,
  typeLabel,
} from '../../game/engine/view';
import type { SaveData } from '../../game/types';
import { useGame } from '../../state/store';
import {
  BottomNav,
  ChoiceButton,
  DangerBadge,
  EmptyState,
  ItemTile,
  NarrativePanel,
  RealmProgress,
  RewardPanel,
  SceneArt,
  SceneHeader,
  TopStatusBar,
} from '../components/ui';

function act(fn: (save: SaveData) => { ok: boolean; error?: string; save?: SaveData; toast?: string }) {
  useGame.getState().commit((save) => fn(save) as ReturnType<typeof moveScreen>);
}

function TownFrame({ save, children }: { save: SaveData; children: ReactNode }) {
  return (
    <>
      <TopStatusBar save={save} onSettings={() => act((current) => moveScreen(current, 'settings'))} />
      <main className="main">{children}</main>
      <BottomNav current={save.screen} onNavigate={(id) => act((current) => moveScreen(current, id as SaveData['screen']))} />
    </>
  );
}

export function OpeningScreen() {
  const save = useGame((state) => state.save);
  const ask = useGame((state) => state.ask);
  const ensure = useGame((state) => state.ensureDraft);
  return (
    <main className="main" style={{ padding: 0 }}>
      <SceneArt scene="opening" className="scene opening-scene" alt="青岚远山" />
      <div className="hero stack">
        <div className="seal">念</div>
        <h1 className="game-title">一念长生</h1>
        <p className="verse">山海无尽，凡骨亦可问长生</p>
        {save ? (
          <>
            <button className="btn primary" data-testid="continue" onClick={() => act((current) => moveScreen(current, 'home'))}>继续修行</button>
            <button className="btn ghost" onClick={() => ask({
              title: '开始新人生',
              body: '新角色确认之后会覆盖当前人生。此操作不可撤销，建议先到设置里导出存档。',
              confirmLabel: '仍要重开',
              danger: true,
              run: () => { ensure(); act((current) => moveScreen(current, 'create')); },
            })}>开始新人生</button>
          </>
        ) : (
          <button className="btn primary" data-testid="enter-world" onClick={() => { ensure(); useGame.getState().setGuest('create'); }}>踏入此世</button>
        )}
      </div>
    </main>
  );
}

export function CreateScreen() {
  const draft = useGame((state) => state.draft);
  const setDraft = useGame((state) => state.setDraft);
  const replaceSave = useGame((state) => state.replaceSave);
  const existing = useGame((state) => state.save);
  useEffect(() => { useGame.getState().ensureDraft(); }, []);
  if (!draft) return null;
  const length = visibleTextLength(draft.name.trim());
  const invalid = length < 2 || length > 12;
  return (
    <main className="main stack">
      <p className="eyebrow">青禾村 · 十八岁</p>
      <h1 className="page-title">写下名字</h1>
      <label className="field">名字
        <input aria-label="名字" value={draft.name} onChange={(event) => setDraft({ name: event.target.value })} />
      </label>
      <button className="btn ghost" onClick={() => setDraft({ name: NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] })}>随机取一个名字</button>
      {invalid ? <p className="reason">名字需要 2 到 12 个字。当前 {length} 个。</p> : null}
      <h2>形象</h2>
      {APPEARANCES.map((item) => (
        <button key={item.id} className={draft.appearanceId === item.id ? 'option on' : 'option'} onClick={() => setDraft({ appearanceId: item.id })}>
          <strong>{item.name}</strong>
          <div className="muted">{item.summary}</div>
        </button>
      ))}
      <h2>出身</h2>
      {ORIGINS.map((item) => (
        <button key={item.id} className={draft.originId === item.id ? 'option on' : 'option'} onClick={() => setDraft({ originId: item.id })}>
          <strong>{item.name}</strong>
          <div className="muted">{item.summary}</div>
        </button>
      ))}
      <h2>天赋</h2>
      <p className="muted">这次给出三门，只选一门。刷新页面不会重抽。</p>
      {draft.offeredTalentIds.map((id) => {
        const talent = TALENTS.find((item) => item.id === id);
        if (!talent) return null;
        return (
          <button key={id} className={draft.talentId === id ? 'option on' : 'option'} onClick={() => setDraft({ talentId: id })}>
            <strong>{talent.name}</strong>
            <div className="muted">{talent.summary}</div>
          </button>
        );
      })}
      <button className="btn primary" data-testid="confirm-create" disabled={invalid} onClick={() => {
        const result = createSave(draft);
        if (!result.ok) {
          useGame.setState({ toast: result.error });
          return;
        }
        replaceSave(result.save, existing ? '新的人生开始了' : '你站在青禾村的旧屋前');
      }}>踏入青禾</button>
      <button className="btn ghost" onClick={() => {
        if (existing) act((current) => moveScreen(current, 'opening'));
        else useGame.getState().setGuest('opening');
      }}>返回</button>
    </main>
  );
}

export function HomeScreen({ save }: { save: SaveData }) {
  const [open, setOpen] = useState(false);
  const goal = goalOf(save);
  const actions = homeActions(save);
  const stats = playerStats(save);
  return (
    <TownFrame save={save}>
      <p className="eyebrow">{save.player.name} · {ageText(save)}</p>
      <h1 className="page-title">{progressText(save).label}</h1>
      <SceneArt scene={save.player.realm === 'mortal' ? 'village' : 'bamboo'} alt={save.player.realm === 'mortal' ? '青禾远山' : '雾隐竹林'} />
      <div className="statrow" style={{ margin: '12px 0' }}>
        <span className="stat">修为 {save.player.cultivation}</span>
        <span className="stat">灵石 {save.player.spiritStones}</span>
        <span className="stat">气血 {stats.maxHp}</span>
      </div>
      <button className="goal" onClick={() => setOpen((value) => !value)}>
        <div className="eyebrow">当前目标</div>
        <strong>{goal.title}</strong>
      </button>
      {open ? <p className="prose">{goal.how}</p> : null}
      <div className="stack" style={{ marginTop: 12 }}>
        {actions.map((action) => (
          <ChoiceButton key={action.id} label={action.label} detail={action.detail} onClick={() => runHome(action.id)} />
        ))}
      </div>
      <p className="feedback">{save.world.feedback}</p>
    </TownFrame>
  );
}

function runHome(id: string) {
  const setPrepare = useGame.getState().setPrepare;
  if (id === 'claim') return act((save) => moveScreen(save, 'settlement'));
  if (id === 'continue') return act((save) => moveScreen(save, save.run?.phase === 'battle' ? 'battle' : save.run?.phase === 'event' || save.run?.phase === 'result' ? 'event' : 'run'));
  if (id === 'rain') return act((save) => openTownEvent(save, 'event_rain_1'));
  if (id === 'shen') return act((save) => openTownEvent(save, 'event_shen'));
  if (id === 'tutorial') { setPrepare('tutorial'); return act((save) => moveScreen(save, 'prepare')); }
  if (id === 'bamboo') { setPrepare('bamboo'); return act((save) => moveScreen(save, 'prepare')); }
  if (id === 'break') return act((save) => attemptBreakthrough(save));
  if (id === 'rain2') return act((save) => openTownEvent(save, 'event_rain_2'));
  if (id === 'rain3') return act((save) => openTownEvent(save, 'event_rain_3'));
  return act((save) => moveScreen(save, 'map'));
}

export function MapScreen({ save }: { save: SaveData }) {
  const [place, setPlace] = useState(save.world.currentLocation);
  const selected = LOCATIONS.find((item) => item.id === place) ?? LOCATIONS[0];
  const bambooOpen = save.world.unlockedLocations.includes('loc_bamboo');
  return (
    <TownFrame save={save}>
      <h1 className="page-title">青岚州</h1>
      <p className="muted">州中其余去处还只在传闻里，这一段先不设空入口。</p>
      <div className="stack">
        {LOCATIONS.map((location) => {
          const locked = location.id === 'loc_bamboo' && !bambooOpen;
          if (locked) {
            return <div key={location.id} className="place locked"><strong>{location.name}</strong><div className="muted">{location.lockText}</div></div>;
          }
          return (
            <button key={location.id} className={place === location.id ? 'place here' : 'place'} onClick={() => setPlace(location.id)}>
              <strong>{location.name}</strong>
              <span className="muted">{save.world.currentLocation === location.id ? '当前所在' : '可前往'}</span>
            </button>
          );
        })}
      </div>
      <SceneArt scene={selected.scene} alt={selected.name} />
      <p className="prose">{selected.desc}</p>
      {selected.id === 'loc_qinghe' ? (
        <div className="stack">
          <button className="btn" onClick={() => act((current) => talkToJiang(current))}>找江小满说几句</button>
          <button className="btn ghost" onClick={() => act((current) => ({ ok: true as const, save: { ...current, world: { ...current.world, currentLocation: 'loc_qinghe', feedback: '你在旧屋里坐了一会儿。寿元没有因此减少。' } } }))}>在村里歇一会儿</button>
        </div>
      ) : null}
      {selected.id === 'loc_shrine' && !save.world.flags.rain_done ? <button className="btn primary" onClick={() => runHome('rain')}>推开庙门</button> : null}
      {selected.id === 'loc_shrine' && save.world.flags.rain_done && !save.world.flags.qi_taught ? <button className="btn primary" onClick={() => runHome('shen')}>走向侧殿</button> : null}
      {selected.id === 'loc_shrine' && save.world.flags.qi_taught ? <button className="btn" onClick={() => runHome('tutorial')}>整理行装，去引气试炼</button> : null}
      {selected.id === 'loc_bamboo' && bambooOpen ? <button className="btn primary" onClick={() => runHome('bamboo')}>准备进入竹林</button> : null}
      {save.run ? <button className="btn primary" onClick={() => runHome('continue')}>继续历练</button> : null}
    </TownFrame>
  );
}

export function PrepareScreen({ save }: { save: SaveData }) {
  const prepareId = useGame((state) => state.prepareId) ?? (save.player.realm === 'mortal' ? 'tutorial' : 'bamboo');
  const info = dungeonCopy(prepareId);
  const pills = save.player.inventory.filter((item) => ITEM_MAP[item.definitionId]?.type === 'consumable');
  const [bring, setBring] = useState<Record<string, number>>(() => Object.fromEntries(pills.map((item) => [item.definitionId, item.qty])));
  const ask = useGame((state) => state.ask);
  if (save.run) {
    return (
      <TownFrame save={save}>
        <h1 className="page-title">还有一场没结束</h1>
        <p className="prose">不能同时开两场历练。回到刚才的路，或者确认后放弃并按战败结算。</p>
        <button className="btn primary" onClick={() => runHome('continue')}>继续历练</button>
        <button className="btn danger" onClick={() => ask({
          title: '放弃并结算',
          body: '主动放弃按战败：灵石和可堆叠材料保留一半，未封存的新法宝与功法书失去。已有装备不会掉。',
          confirmLabel: '确认放弃',
          danger: true,
          run: () => act((current) => abandonRun(current)),
        })}>放弃并结算</button>
      </TownFrame>
    );
  }
  return (
    <TownFrame save={save}>
      <SceneHeader scene={prepareId === 'bamboo' ? 'bamboo' : 'shrine'} kicker={info.suggest} title={info.name} />
      <p className="prose">敌情：{info.trait}</p>
      <p>可能收获：{info.loot}</p>
      <p>节点：{info.nodes} 处。{info.retreat}</p>
      <p>当前功法：{ITEM_MAP[save.player.equipment.techniqueId ?? '']?.name ?? '未装备'}</p>
      <h2>携带补给</h2>
      {pills.length === 0 ? <EmptyState text="行囊里没有可带的丹药。" /> : pills.map((item) => {
        const def = ITEM_MAP[item.definitionId];
        const qty = bring[item.definitionId] ?? 0;
        return (
          <div key={item.instanceId} className="split">
            <span>{def?.name} 带 {qty}/{item.qty}</span>
            <span className="row-btn">
              <button className="icon-btn" aria-label="减少" onClick={() => setBring({ ...bring, [item.definitionId]: Math.max(0, qty - 1) })}>-</button>
              <button className="icon-btn" aria-label="增加" onClick={() => setBring({ ...bring, [item.definitionId]: Math.min(item.qty, qty + 1) })}>+</button>
            </span>
          </div>
        );
      })}
      <button className="btn primary" data-testid="enter-dungeon" onClick={() => act((current) => startDungeon(current, prepareId, Object.entries(bring).map(([definitionId, qty]) => ({ definitionId, qty }))))}>进入秘境</button>
    </TownFrame>
  );
}

export function RunScreen({ save }: { save: SaveData }) {
  const run = save.run;
  const [pause, setPause] = useState(false);
  const ask = useGame((state) => state.ask);
  if (!run) return null;
  const nodes = run.map.filter((node) => node.layer === run.layer);
  const past = run.map.filter((node) => node.layer < run.layer);
  return (
    <>
      <TopStatusBar save={save} onPause={() => setPause(true)} />
      <main className="main stack">
        <SceneHeader scene="bamboo" kicker={`第 ${run.layer + 1} 处`} title={run.dungeonId === 'bamboo' ? '雾隐竹林' : '引气试炼'} />
        <div className="statrow">
          <span className="stat">气血 {run.hp}/{run.maxHp}</span>
          <span className="stat">灵力 {run.mp}/{run.maxMp}</span>
        </div>
        {past.map((node) => <div key={node.id} className="muted">已过 · {node.label}</div>)}
        {run.phase === 'choose' ? nodes.map((node) => (
          <div key={node.id} className="stack">
            <ChoiceButton
              label={`${node.label} · ${node.kind === 'battle' || node.kind === 'elite' || node.kind === 'boss' ? '战斗' : node.kind === 'merchant' ? '商人' : node.kind === 'rest' || node.kind === 'prep' ? '休息' : '奇遇'}`}
              detail={`${node.risk === '高' ? '危险 ' : ''}${node.revealed || node.risk !== '高' ? node.trait ?? '' : '风险未明'}`}
              onClick={() => act((current) => chooseNode(current, node.id))}
            />
            {save.player.talentId === 'talent_eye' && run.inspected < 1 && !node.revealed ? (
              <button className="btn ghost" onClick={() => act((current) => inspectNode(current, node.id))}>察看此路</button>
            ) : null}
          </div>
        )) : null}
        {run.phase === 'blessing' ? (
          <>
            <h2>造化三选一</h2>
            {blessingCards(save).map((card) => (
              <ChoiceButton key={card.id} label={card.name} detail={card.text} onClick={() => act((current) => pickBlessing(current, card.id))} />
            ))}
          </>
        ) : null}
        {run.phase === 'rest' ? (
          <RestPanel save={save} />
        ) : null}
        {run.blessings.length ? <p className="muted">本局造化：{run.blessings.map((item) => `${BLESSING_MAP[item.id]?.name ?? item.id}×${item.stacks}`).join('、')}</p> : null}
      </main>
      {pause ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card stack">
            <h2 className="page-title">暂停</h2>
            <p className="muted">只是停下查看，不会放弃这场历练。</p>
            <button className="btn" onClick={() => { setPause(false); act((current) => moveScreen(current, 'inventory')); }}>查看行囊</button>
            <button className="btn" onClick={() => { setPause(false); act((current) => moveScreen(current, 'settings')); }}>设置</button>
            <button className="btn danger" onClick={() => ask({
              title: '放弃这场历练',
              body: '按战败结算：普通灵石和材料保留一半，未封存的新法宝与功法书失去。已学会的功法和原有装备保留。',
              confirmLabel: '确认放弃',
              danger: true,
              run: () => act((current) => abandonRun(current)),
            })}>放弃并结算</button>
            <button className="btn primary" onClick={() => setPause(false)}>继续</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RestPanel({ save }: { save: SaveData }) {
  const run = save.run;
  if (!run) return null;
  const node = run.map.find((entry) => entry.id === run.nodeId);
  const ask = useGame((state) => state.ask);
  return (
    <div className="stack">
      <h2>{node?.label}</h2>
      <p className="prose">{node?.trait}</p>
      <button className="btn" disabled={Boolean(node?.rested)} onClick={() => act((current) => restHere(current))}>{node?.rested ? '这里已经歇过' : '在这里恢复'}</button>
      {run.loot.filter((item) => {
        const kind = ITEM_MAP[item.definitionId]?.type;
        return kind === 'treasure' || kind === 'technique' || kind === 'heart';
      }).map((item) => (
        <button key={item.instanceId} className="btn ghost" disabled={Boolean(run.sealedInstanceId)} onClick={() => act((current) => sealLoot(current, item.instanceId))}>
          封存{ITEM_MAP[item.definitionId]?.name}
        </button>
      ))}
      {run.sealedInstanceId ? <p className="muted">本局已封存一件，战败也会带回。</p> : null}
      <button className="btn danger" onClick={() => ask({
        title: '安全撤离',
        body: '从这里离开会带回本局全部战利、灵石和修为。不按战败打折。',
        confirmLabel: '带回全部收获',
        run: () => act((current) => safeRetreat(current)),
      })}>安全撤离</button>
      <button className="btn primary" onClick={() => act((current) => leaveRest(current))}>继续向前</button>
    </div>
  );
}

export function EventScreen({ save }: { save: SaveData }) {
  const event = activeEvent(save);
  const reduce = save.settings.reduceMotion;
  if (!event) return null;
  const views = choiceViews(save, event.result ? [] : event.choices);
  const inRun = Boolean(save.run);
  return (
    <>
      {inRun ? <TopStatusBar save={save} onPause={() => act((current) => moveScreen(current, 'run'))} /> : <TopStatusBar save={save} />}
      <main className="main">
        <SceneHeader scene={event.scene} kicker={inRun ? '秘境中' : '青岚'} title={event.title} />
        {event.result ? (
          <div className="stack">
            <p className="prose">{event.result.text}</p>
            <RewardPanel lines={event.result.deltas} />
            <button className="btn primary" data-testid="continue-result" onClick={() => act((current) => current.run ? continueAfterResult(current) : continueTown(current))}>继续</button>
          </div>
        ) : (
          <>
            <NarrativePanel text={event.body} reduce={reduce} />
            <div className="stack">
              {views.map(({ choice, disabled, reason, detail }) => (
                <ChoiceButton key={choice.id} label={choice.label} detail={detail} disabled={disabled} reason={reason} onClick={() => act((current) => current.run ? chooseRunOption(current, choice.id) : chooseTownOption(current, choice.id))} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export function BattleScreen({ save }: { save: SaveData }) {
  const battle = save.run?.battle;
  const [full, setFull] = useState(false);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setPulse((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    if (!battle?.auto || battle.finished || document.hidden) return;
    const delay = save.settings.battleSpeed === 'fast' ? 280 : 700;
    const timer = window.setTimeout(() => {
      act((current) => {
        const live = current.run?.battle;
        if (!live || live.finished || !live.auto) return { ok: true, save: current };
        return actInBattle(current, suggestAction(live, current));
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [battle?.auto, battle?.round, battle?.finished, pulse, save.settings.battleSpeed]);
  if (!battle || !save.run) return null;
  const enemy = ENEMY_MAP[battle.enemyId];
  const intent = enemy?.intents[battle.intentIndex % enemy.intents.length];
  const logs = full ? battle.log : battle.log.slice(-4);
  const beaten = Boolean(save.world.flags[`beat:${battle.enemyId}`]);
  const pill = save.run.supplies.some((item) => item.definitionId === 'con_heal' && item.qty > 0);
  const powder = save.run.supplies.some((item) => item.definitionId === 'con_mind' && item.qty > 0);
  return (
    <>
      <TopStatusBar save={save} />
      <main className="main stack">
        <SceneArt scene="bamboo" alt={enemy?.name ?? '战斗'} />
        <div className="split">
          <h1 className="page-title">{enemy?.name}</h1>
          <DangerBadge text={enemy?.danger ?? '中'} />
        </div>
        <div className="bars">
          <div>气血 {battle.enemyHp}/{battle.enemyMaxHp}</div>
          <div className="bar"><i style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }} /></div>
        </div>
        <p>{battle.finished ? '战斗已经分出结果' : `下一手：${intent?.name}。${intent?.telegraph}`}</p>
        <div className="log">
          {logs.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        </div>
        <button className="btn ghost" onClick={() => setFull((value) => !value)}>{full ? '收起记录' : '展开全部记录'}</button>
        <div className="bars">
          <div className="split"><span>我方气血 {battle.playerHp}/{battle.playerMaxHp}</span><span>灵力 {battle.playerMp}/{battle.playerMaxMp}</span></div>
          <div className="bar"><i style={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }} /></div>
          <div className="bar mp"><i style={{ width: `${(battle.playerMp / Math.max(1, battle.playerMaxMp)) * 100}%` }} /></div>
          {battle.playerShield > 0 ? <div>护盾 {battle.playerShield}</div> : null}
        </div>
        {battle.finished ? (
          <button className="btn primary" onClick={() => act((current) => leaveBattle(current))}>{battle.finished === 'win' ? '离开战斗' : '查看结算'}</button>
        ) : (
          <div className="battle-actions">
            <button className="btn primary" data-testid="battle-attack" onClick={() => act((current) => actInBattle(current, 'attack'))}>攻击</button>
            <button className="btn" data-testid="battle-defend" onClick={() => act((current) => actInBattle(current, 'defend'))}>守御</button>
            <button className="btn" data-testid="battle-spell" disabled={battle.playerMp < 8} onClick={() => act((current) => actInBattle(current, 'spell'))}>
              施术{battle.playerMp < 8 ? `（灵力不足，还差${8 - battle.playerMp}）` : ''}
            </button>
            {pill ? <button className="btn ghost" onClick={() => act((current) => actInBattle(current, 'pill'))}>服下回春丹</button> : null}
            {powder ? <button className="btn ghost" onClick={() => act((current) => actInBattle(current, 'powder'))}>服下凝神散</button> : null}
            <button className="btn ghost" onClick={() => act((current) => setBattleAuto(current, !battle.auto))}>{battle.auto ? '停止自动' : '自动战斗'}</button>
            {beaten && enemy?.rank === 'normal' ? <button className="btn ghost" onClick={() => act((current) => autoResolveBattle(current))}>快速结算</button> : null}
            {enemy?.rank === 'boss' ? <p className="muted">首领默认手动。自动战斗使用同一套规则。</p> : null}
          </div>
        )}
      </main>
    </>
  );
}

export function SettlementScreen({ save }: { save: SaveData }) {
  const settlement = save.settlement;
  if (!settlement) return null;
  const title = settlement.kind === 'victory' ? '胜利' : settlement.kind === 'retreat' ? '撤离' : '战败';
  return (
    <main className="main stack">
      <p className="eyebrow">{settlement.dungeonId === 'bamboo' ? '雾隐竹林' : '引气试炼'}</p>
      <h1 className="page-title">{title}</h1>
      <p className="prose">{settlement.summary}</p>
      {settlement.advice ? <div className="banner-note">{settlement.advice}</div> : null}
      <RewardPanel lines={[
        `灵石 +${settlement.stones}`,
        `修为 +${settlement.cultivation}`,
        settlement.cultivationDropped ? `未带回的修为 ${settlement.cultivationDropped}` : '',
        ...settlement.items.map((item) => `${ITEM_MAP[item.definitionId]?.name ?? item.definitionId} ×${item.qty}${item.sealed ? '（封存）' : ''}`),
        ...settlement.returnedSupplies.map((item) => `带回${ITEM_MAP[item.definitionId]?.name ?? ''} ×${item.qty}`),
        ...settlement.lost.map((item) => `失去 ${ITEM_MAP[item.definitionId]?.name ?? item.definitionId} ×${item.qty}`),
      ].filter(Boolean)} />
      <button className="btn primary" data-testid="claim" onClick={() => act((current) => claimSettlement(current))}>直接领取</button>
      <p className="muted">正式广告未接入，这里没有额外领取。领过一次之后再点也不会重复发放。</p>
    </main>
  );
}

export function CultivateScreen({ save }: { save: SaveData }) {
  const progress = progressText(save);
  const stats = playerStats(save);
  const ready = save.player.realm === 'mortal' && save.player.cultivation >= 50 && save.world.flags.tutorial_completed && save.world.flags.qi_taught;
  return (
    <TownFrame save={save}>
      <p className="eyebrow">修行</p>
      <h1 className="page-title">{progress.label}</h1>
      <RealmProgress {...progress} />
      <div className="statrow">
        <span className="stat">气血 {stats.maxHp}</span>
        <span className="stat">攻击 {stats.atk}</span>
        <span className="stat">防御 {stats.def}</span>
        <span className="stat">灵力 {stats.maxMp}</span>
      </div>
      <h2>功法</h2>
      {save.player.learnedTechniqueIds.length === 0 ? <EmptyState text="还没有学会功法。先去破庙侧殿。" /> : save.player.learnedTechniqueIds.map((id) => (
        <button key={id} className="btn" onClick={() => act((current) => equipTechnique(current, id))}>{ITEM_MAP[id]?.name}{save.player.equipment.techniqueId === id ? ' · 装备中' : ''}</button>
      ))}
      <h2>心法</h2>
      {save.player.learnedHeartIds.length === 0 ? <p className="muted">引气之后领悟养元经。</p> : save.player.learnedHeartIds.map((id) => (
        <button key={id} className="btn" onClick={() => act((current) => equipHeart(current, id))}>{ITEM_MAP[id]?.name}{save.player.equipment.heartId === id ? ' · 装备中' : ''}</button>
      ))}
      <h2>法宝</h2>
      <p className="muted">第二个法宝槽在筑基后解锁。这一段还没有筑基试炼。</p>
      {save.player.realm === 'mortal' ? (
        <button className="btn primary" disabled={!ready} onClick={() => act((current) => attemptBreakthrough(current))}>
          {ready ? '尝试突破' : '尝试突破'}
        </button>
      ) : <p className="muted">筑基试炼尚未开放。先在竹林取得青髓草。</p>}
      {!ready && save.player.realm === 'mortal' ? <p className="reason">{breakthroughReason(save)}</p> : null}
      {save.player.daoYun > 0 ? <p>道蕴 {save.player.daoYun}。它先记着，这一段不换成攻击。</p> : null}
    </TownFrame>
  );
}

function breakthroughReason(save: SaveData): string {
  if (!save.world.flags.qi_taught) return '还没听沈砚讲完引气。';
  if (!save.world.flags.tutorial_completed) return '还没把引气试炼走完。';
  if (save.player.cultivation < 50) return `修为不足，还差 ${50 - save.player.cultivation}。`;
  return '';
}

export function InventoryScreen({ save }: { save: SaveData }) {
  const [type, setType] = useState('all');
  const [school, setSchool] = useState('all');
  const open = useGame((state) => state.openSheet);
  const items = useMemo(() => {
    const bag = [...save.player.inventory, ...(save.run?.loot ?? [])];
    return bag.filter((item) => {
      const def = ITEM_MAP[item.definitionId];
      if (!def) return false;
      if (type !== 'all' && def.type !== type) return false;
      if (school !== 'all' && def.school !== school && def.school !== 'any') return false;
      return true;
    });
  }, [save, type, school]);
  return (
    <>
      {save.run ? <TopStatusBar save={save} onPause={() => act((current) => moveScreen(current, current.run?.phase === 'battle' ? 'battle' : 'run'))} /> : null}
      {save.run ? null : <TopStatusBar save={save} onSettings={() => act((current) => moveScreen(current, 'settings'))} />}
      <main className="main">
        <h1 className="page-title">行囊</h1>
        <div className="filters">
          {['all', 'technique', 'heart', 'treasure', 'consumable', 'material', 'plot'].map((id) => (
            <button key={id} className={type === id ? 'on' : ''} onClick={() => setType(id)}>{id === 'all' ? '全部' : typeLabel(id)}</button>
          ))}
          {['all', 'sword', 'fire'].map((id) => (
            <button key={id} className={school === id ? 'on' : ''} onClick={() => setSchool(id)}>{id === 'all' ? '全流派' : id === 'sword' ? '剑' : '火'}</button>
          ))}
        </div>
        <div className="tiles">
          {items.length === 0 ? <EmptyState text="这一栏是空的。" /> : items.map((item) => {
            const def = ITEM_MAP[item.definitionId];
            return <ItemTile key={item.instanceId} name={def?.name ?? item.definitionId} meta={`${qualityLabel(def?.quality ?? 'common')} · ${typeLabel(def?.type ?? '')}${item.ownership === 'run' ? ' · 本局' : ''}`} qty={item.qty} onClick={() => open(item.instanceId)} />;
          })}
        </div>
        {save.run ? <button className="btn primary" onClick={() => act((current) => moveScreen(current, current.run?.phase === 'battle' ? 'battle' : current.run?.phase === 'event' ? 'event' : 'run'))}>回到历练</button> : null}
      </main>
      {save.run ? null : <BottomNav current="inventory" onNavigate={(id) => act((current) => moveScreen(current, id as SaveData['screen']))} />}
    </>
  );
}

export function BondsScreen({ save }: { save: SaveData }) {
  const people = knownNpcs(save);
  const factions = knownFactions(save);
  return (
    <TownFrame save={save}>
      <h1 className="page-title">因缘</h1>
      {people.length === 0 ? <EmptyState text="还没有打过交道的人。" /> : people.map((npc) => (
        <article key={npc.id} className="panel">
          <strong>{npc.name}</strong>
          <div className="muted">{npc.role} · {npc.label}</div>
          <p>{npc.blurb}</p>
          <p className="muted">最近：{npc.reason}</p>
          {npc.id === 'npc_jiang' ? <button className="btn" disabled={Boolean(save.world.flags.talk_jiang)} onClick={() => act((current) => talkToJiang(current))}>{save.world.flags.talk_jiang ? '今日无话' : '听她说说药'}</button> : null}
          {save.world.flags.talk_jiang && npc.id === 'npc_jiang' ? <p className="reason">她已经把要说的话说完了。</p> : null}
        </article>
      ))}
      <h2>势力</h2>
      {factions.length === 0 ? <p className="muted">还没有和州中势力打过交道。</p> : factions.map((faction) => (
        <div key={faction.id} className="split"><span>{faction.name}</span><span>声望 {faction.value}</span></div>
      ))}
      <h2>待办</h2>
      {save.world.quests.filter((quest) => quest.status === 'open').map((quest) => (
        <div key={quest.id} className="panel"><strong>{quest.title}</strong><p>{quest.detail}</p></div>
      ))}
      {(save.world.counters.settledRuns ?? 0) >= 2 && save.world.flags.rain_chain_started && !save.world.flags.rain_3_done ? (
        <button className="btn" onClick={() => runHome(save.world.flags.rain_2_done ? 'rain3' : 'rain2')}>推进雨夜那件事</button>
      ) : null}
    </TownFrame>
  );
}

export function JournalScreen({ save }: { save: SaveData }) {
  const entries = codexLines(save);
  return (
    <TownFrame save={save}>
      <h1 className="page-title">山海志</h1>
      <h2>已发生的事</h2>
      {save.codex.stories.length === 0 ? <EmptyState text="还没有写下的经历。" /> : save.codex.stories.slice(-8).reverse().map((story, index) => (
        <p key={`${story.eventId}-${index}`}>{EVENT_MAP[story.eventId]?.title ?? '经历'}：{story.summary}</p>
      ))}
      <h2>图鉴</h2>
      {entries.length === 0 ? <p className="muted">见闻会在你真正遇到之后出现。</p> : entries.map((entry) => (
        <article key={entry.title} className="panel"><strong>{entry.title}</strong><p>{entry.text}</p></article>
      ))}
      <h2>题签</h2>
      {ACHIEVEMENTS.map((item) => {
        const got = save.codex.achievements[item.id]?.unlocked;
        return <div key={item.id} className="panel"><strong>{item.name}</strong><p>{got ? item.detail : item.hint}</p><span className="muted">{got ? '已记下' : '未达成'}</span></div>;
      })}
    </TownFrame>
  );
}

export function SettingsScreen({ save }: { save: SaveData }) {
  const ask = useGame((state) => state.ask);
  const [privacy, setPrivacy] = useState(false);
  const back = () => act((current) => moveScreen(current, current.run ? (current.run.phase === 'battle' ? 'battle' : 'run') : 'home'));
  return (
    <main className="main stack">
      <h1 className="page-title">设置</h1>
      <button className="btn" disabled title="当前版本没有音频素材">音效：暂无音频素材</button>
      <p className="reason">没有音效文件，所以不显示正在播放。</p>
      <div className="filters">
        {(['standard', 'large', 'xlarge'] as const).map((size) => (
          <button key={size} className={save.settings.fontScale === size ? 'on' : ''} onClick={() => act((current) => updateSettings(current, { fontScale: size }))}>{size === 'standard' ? '标准' : size === 'large' ? '大' : '特大'}</button>
        ))}
      </div>
      <button className="btn" onClick={() => act((current) => updateSettings(current, { reduceMotion: !current.settings.reduceMotion }))}>
        {save.settings.reduceMotion ? '已减少动画' : '减少动画'}
      </button>
      <button className="btn" onClick={() => act((current) => updateSettings(current, { battleSpeed: current.settings.battleSpeed === 'fast' ? 'normal' : 'fast' }))}>
        战斗速度：{save.settings.battleSpeed === 'fast' ? '快' : '标准'}
      </button>
      <button className="btn" onClick={() => useGame.getState().downloadSave()}>导出存档</button>
      <label className="btn">导入存档
        <input aria-label="导入存档" type="file" accept="application/json" hidden onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          useGame.getState().importText(await file.text());
        }} />
      </label>
      <button className="btn ghost" onClick={() => setPrivacy(true)}>隐私说明</button>
      <button className="btn ghost" onClick={() => act((current) => moveScreen(current, 'opening'))}>回到题头</button>
      <button className="btn danger" onClick={() => ask({
        title: '清空这趟人生',
        body: '清空后无法从游戏里找回，建议先导出。设备上仍会留一份刚才的备份，直到下一次成功写入覆盖它。',
        confirmLabel: '确认清空',
        danger: true,
        run: () => useGame.getState().wipe(),
      })}>清空存档</button>
      <button className="btn primary" onClick={back}>返回</button>
      {privacy ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card stack">
            <h2 className="page-title">隐私</h2>
            <p className="prose">进度只保存在这台设备里，不会上传姓名，也没有账号。导出的文件包含角色名和剧情选择，请自己保管。</p>
            <button className="btn" onClick={() => setPrivacy(false)}>知道了</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export function BreakthroughScreen({ save }: { save: SaveData }) {
  const [skipped, setSkipped] = useState(save.settings.reduceMotion);
  useEffect(() => {
    if (save.settings.reduceMotion) return;
    const timer = window.setTimeout(() => setSkipped(true), 2400);
    return () => window.clearTimeout(timer);
  }, [save.settings.reduceMotion]);
  return (
    <main className="main stack">
      <SceneArt scene="opening" alt="引气之后的山色" />
      {!skipped ? <button className="btn ghost" onClick={() => setSkipped(true)}>跳过</button> : null}
      {skipped ? (
        <>
          <div className="seal-mark">气</div>
          <h1 className="page-title">炼气</h1>
          <p className="prose">呼吸落到丹田，雨声忽然远了。</p>
          <p>灵力按炼气初期重新流转。雾隐竹林已经肯为你开门。养元经已领悟。</p>
          <button className="btn primary" onClick={() => act((current) => acknowledgeCeremony(current))}>记下这一念</button>
        </>
      ) : <p className="prose">气正沿着经脉走完第一圈。</p>}
    </main>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <main className="main stack">
      <h1 className="page-title">书页没有展开</h1>
      <p className="prose">{message}。原来的备份还在，没有被这次错误覆盖。</p>
      <button className="btn primary" onClick={() => useGame.getState().boot()}>重试</button>
      <button className="btn" onClick={() => useGame.getState().restoreBackup()}>从备份恢复</button>
      <button className="btn" onClick={() => useGame.getState().downloadSave()}>导出备份</button>
      <button className="btn danger" onClick={() => useGame.getState().wipe()}>放下这份损坏的记录</button>
    </main>
  );
}
