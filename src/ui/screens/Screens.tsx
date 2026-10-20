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
  actionHints,
  activeEvent,
  ageText,
  battleStatus,
  blessingCards,
  choiceViews,
  codexLines,
  dungeonCopy,
  goalOf,
  homeActions,
  intentAdvice,
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
  const step = draft.step ?? 0;
  const length = visibleTextLength(draft.name.trim());
  const invalid = length < 2 || length > 12;
  const appearance = APPEARANCES.find((item) => item.id === draft.appearanceId);
  const origin = ORIGINS.find((item) => item.id === draft.originId);
  const talent = TALENTS.find((item) => item.id === draft.talentId);
  const back = () => {
    if (step === 1) {
      setDraft({ step: 0 });
      return;
    }
    if (existing) act((current) => moveScreen(current, 'opening'));
    else useGame.getState().setGuest('opening');
  };
  return (
    <main className="main stack">
      <p className="eyebrow">青禾村 · 十八岁 · {step === 0 ? '一' : '二'}</p>
      <h1 className="page-title">{step === 0 ? '你是谁' : '你从何处来'}</h1>
      {step === 0 ? (
        <>
          <label className="field">名字
            <input aria-label="名字" value={draft.name} onChange={(event) => setDraft({ name: event.target.value })} />
          </label>
          <button className="btn ghost" onClick={() => setDraft({ name: NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] })}>随机取一个名字</button>
          {invalid ? <p className="reason">名字需要 2 到 12 个字。当前 {length} 个。</p> : null}
          <h2>形象</h2>
          <p className="muted">只改外形，不改气血和攻击。</p>
          {APPEARANCES.map((item) => (
            <button key={item.id} className={draft.appearanceId === item.id ? 'option on figure' : 'option figure'} onClick={() => setDraft({ appearanceId: item.id })}>
              <AppearanceMark id={item.id} />
              <span><strong>{item.name}</strong><div className="muted">{item.summary}</div></span>
            </button>
          ))}
          <button className="btn primary" disabled={invalid} onClick={() => setDraft({ step: 1 })}>下一步</button>
        </>
      ) : (
        <>
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
            const offered = TALENTS.find((item) => item.id === id);
            if (!offered) return null;
            return (
              <button key={id} className={draft.talentId === id ? 'option on' : 'option'} onClick={() => setDraft({ talentId: id })}>
                <strong>{offered.name}</strong>
                <div className="muted">{offered.summary}</div>
              </button>
            );
          })}
          <div className="panel">
            <strong>{draft.name.trim() || '未名'}</strong>
            <p className="muted">{appearance?.name} · {origin?.name} · {talent?.name}</p>
          </div>
          <button className="btn primary" data-testid="confirm-create" disabled={invalid} onClick={() => {
            const result = createSave(draft);
            if (!result.ok) {
              useGame.setState({ toast: result.error });
              return;
            }
            replaceSave(result.save, existing ? '新的人生开始了' : '你站在青禾村的旧屋前');
          }}>踏入青禾</button>
        </>
      )}
      <button className="btn ghost" onClick={back}>{step === 1 ? '返回上一步' : '返回'}</button>
    </main>
  );
}

function AppearanceMark({ id }: { id: string }) {
  const robe = id === 'app_robe';
  const plain = id === 'app_plain';
  return (
    <svg viewBox="0 0 48 64" className="figure-mark" aria-hidden="true">
      <circle cx="24" cy="14" r="7" />
      {robe ? <path d="M14 28h20l6 28H8z" /> : null}
      {plain ? <path d="M16 28h16v12H16zM18 40h5v16h-5zM25 40h5v16h-5z" /> : null}
      {!robe && !plain ? <path d="M16 30h16l2 10H14zM17 40h6v16h-6zM25 40h6v16h-6z" /> : null}
    </svg>
  );
}

export function HomeScreen({ save }: { save: SaveData }) {
  const [open, setOpen] = useState(false);
  const goal = goalOf(save);
  const actions = homeActions(save);
  const stats = playerStats(save);
  const progress = progressText(save);
  const [primary, ...rest] = actions;
  const place = LOCATIONS.find((item) => item.id === save.world.currentLocation)?.name ?? '青禾村';
  return (
    <TownFrame save={save}>
      <p className="eyebrow">{place} · {ageText(save)}</p>
      <SceneArt className="scene banner home-banner" scene={save.player.realm === 'mortal' ? 'village' : 'bamboo'} alt={save.player.realm === 'mortal' ? '青禾远山' : '雾隐竹林'} />
      <p className="stat progress-line">{progress.label} {progress.current}/{progress.max}</p>
      <button className="goal" onClick={() => setOpen((value) => !value)}>
        <div className="eyebrow">当前目标</div>
        <strong>{goal.title}</strong>
      </button>
      {open ? <p className="prose">{goal.how}</p> : null}
      {primary ? <button className="btn primary" onClick={() => runHome(primary.id)}>{primary.label}<small>{primary.detail}</small></button> : null}
      {rest.map((action) => (
        <button key={action.id} className="btn ghost" onClick={() => runHome(action.id)}>{action.label}</button>
      ))}
      <p className="muted">灵石 {save.player.spiritStones} · 气血 {stats.maxHp}</p>
      {save.world.feedback ? <p className="feedback">{save.world.feedback}</p> : null}
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
  const spots = [
    { id: 'loc_qinghe', x: 78, y: 168 },
    { id: 'loc_shrine', x: 168, y: 108 },
    { id: 'loc_bamboo', x: 262, y: 58 },
  ];
  return (
    <TownFrame save={save}>
      <h1 className="page-title">青岚州</h1>
      <p className="muted">州外只有淡淡山势和传闻。这一段没有做成空入口。</p>
      <div className="paper-map">
        <svg viewBox="0 0 340 220" className="paper-map-art" aria-hidden="true">
          <path className="land" d="M0 150 C70 120 120 140 180 118 C230 100 280 130 340 110 V220 H0Z" />
          <path d="M0 40 C80 20 140 70 220 36 C270 16 310 48 340 30" fill="none" />
          <path d="M78 168 L168 108 L262 58" fill="none" />
        </svg>
        {spots.map((spot) => {
          const location = LOCATIONS.find((item) => item.id === spot.id);
          const locked = spot.id === 'loc_bamboo' && !bambooOpen;
          return (
            <button
              key={spot.id}
              className={place === spot.id ? 'map-pin here' : 'map-pin'}
              style={{ left: `${(spot.x / 340) * 100}%`, top: `${(spot.y / 220) * 100}%` }}
              disabled={locked}
              onClick={() => setPlace(spot.id)}
            >
              {location?.name}
              {save.world.currentLocation === spot.id ? <i>所在</i> : null}
            </button>
          );
        })}
      </div>
      <div className="stack map-list">
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
      <div className="panel">
      <SceneArt scene={selected.scene} className="scene banner home-banner" alt={selected.name} />
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
      </div>
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
          <div className="stack result-block">
            <p className="prose">{event.result.text}</p>
            {event.result.deltas.length ? <RewardPanel lines={event.result.deltas} /> : null}
            <button className="btn primary" data-testid="continue-result" onClick={() => act((current) => current.run ? continueAfterResult(current) : continueTown(current))}>继续</button>
          </div>
        ) : (
          <>
            <NarrativePanel text={event.body} mode={reduce ? 'full' : save.settings.narrative} />
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
  const [logOpen, setLogOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [blessOpen, setBlessOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [struck, setStruck] = useState(false);
  const ask = useGame((state) => state.ask);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setPulse((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    if (!battle?.auto || battle.finished || document.hidden || paused) return;
    const delay = save.settings.battleSpeed === 'fast' ? 280 : 700;
    const timer = window.setTimeout(() => {
      if (document.hidden) return;
      act((current) => {
        const live = current.run?.battle;
        if (!live || live.finished || !live.auto || document.hidden) return { ok: true, save: current };
        return actInBattle(current, suggestAction(live, current), live.round);
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [battle?.auto, battle?.round, battle?.finished, pulse, paused, save.settings.battleSpeed]);
  useEffect(() => {
    if (!battle?.lastBrief || save.settings.reduceMotion) return;
    setStruck(true);
    const timer = window.setTimeout(() => setStruck(false), 200);
    return () => window.clearTimeout(timer);
  }, [battle?.lastBrief, battle?.round, save.settings.reduceMotion]);
  if (!battle || !save.run) return null;
  const enemy = ENEMY_MAP[battle.enemyId];
  const intent = enemy?.intents[battle.intentIndex % (enemy?.intents.length || 1)];
  const hints = actionHints();
  const status = battleStatus(battle);
  const logs = battle.log.slice(-3);
  const beaten = Boolean(save.world.flags[`beat:${battle.enemyId}`]);
  const supplies = save.run.supplies.filter((item) => item.qty > 0);
  const spellShort = battle.playerMp < hints.spellCost;
  const play = (action: 'attack' | 'defend' | 'spell' | 'pill' | 'powder') => {
    const round = battle.round;
    act((current) => actInBattle(current, action, round));
  };
  const rank = enemy?.rank === 'boss' ? '首领' : enemy?.rank === 'elite' ? '精英' : '普通';
  return (
    <div className="battle-page">
      <TopStatusBar save={save} combat onPause={() => { setPaused(true); if (battle.auto) act((current) => setBattleAuto(current, false)); }} />
      <main className="main battle-main">
        <SceneArt className={`enemy-art${struck ? ' struck' : ''}`} scene={battle.enemyId} alt={enemy?.name ?? '对手'} />
        <div className="split">
          <h1 className="page-title">{enemy?.name}</h1>
          <DangerBadge text={`${rank} · ${enemy?.danger ?? '中'}`} />
        </div>
        <div className="bars">
          <div className="split"><span>气血 {battle.enemyHp}/{battle.enemyMaxHp}</span>{battle.enemyShield > 0 ? <span>护盾 {battle.enemyShield}</span> : <span>护盾 0</span>}</div>
          <div className="bar"><i style={{ width: `${(battle.enemyHp / Math.max(1, battle.enemyMaxHp)) * 100}%` }} /></div>
          {battle.enemyShield > 0 ? <div className="bar shield"><i style={{ width: `${Math.min(100, battle.enemyShield)}%` }} /></div> : null}
        </div>
        {status.burn ? <p className="status-line">{status.burn}</p> : null}
        <div className="intent">
          <strong>{battle.finished ? (battle.finished === 'win' ? '胜' : '败') : `下一手 · ${intent?.name ?? '待机'}`}</strong>
          <p>{battle.finished ? '战斗已经分出结果' : `${intent?.telegraph ?? ''} ${intentAdvice(intent?.kind ?? 'attack')}`}</p>
        </div>
        <div className="status-row">
          {status.sword ? <span className="tag" title={status.swordNote}>{status.sword}</span> : null}
          {status.shield > 0 ? <span className="tag">我方护盾 {status.shield}</span> : null}
          {save.run.blessings.slice(0, 3).map((item) => (
            <button key={item.id} className="tag tag-btn" onClick={() => setBlessOpen(true)}>{BLESSING_MAP[item.id]?.name ?? item.id} {item.stacks}/{BLESSING_MAP[item.id]?.max ?? item.stacks}</button>
          ))}
          {save.run.blessings.length > 3 ? <button className="tag tag-btn" onClick={() => setBlessOpen(true)}>全部造化</button> : null}
        </div>
        {status.swordNote ? <p className="muted">{status.swordNote}</p> : null}
        {battle.lastBrief ? <p className="brief">{battle.lastBrief}</p> : null}
        <div className="log">
          {logs.map((line, index) => <p key={`${battle.round}-${index}-${line}`}>{line}</p>)}
        </div>
        <button className="btn ghost" onClick={() => setLogOpen(true)}>展开战报</button>
        {battle.finished ? <p className="muted">{battle.finished === 'win' ? '收获先记在本局，离开后再结算。' : '这场没有打赢。'}</p> : null}
      </main>
      <footer className="battle-dock">
        <div className="split stat">
          <span>气血 {battle.playerHp}/{battle.playerMaxHp}{status.shield > 0 ? ` · 护盾 ${status.shield}` : ''}</span>
          <span>灵力 {battle.playerMp}/{battle.playerMaxMp}</span>
        </div>
        <div className="bar"><i style={{ width: `${(battle.playerHp / Math.max(1, battle.playerMaxHp)) * 100}%` }} /></div>
        {battle.finished ? (
          <button className="btn primary" onClick={() => act((current) => leaveBattle(current))}>{battle.finished === 'win' ? '离开战斗' : '查看结算'}</button>
        ) : (
          <>
            <div className="battle-actions">
              <button className="btn primary" data-testid="battle-attack" onClick={() => play('attack')}>攻击<small>{hints.attack}</small></button>
              <button className="btn" data-testid="battle-defend" onClick={() => play('defend')}>守御<small>{hints.defend}</small></button>
              <button className="btn spell" data-testid="battle-spell" disabled={spellShort} onClick={() => play('spell')}>
                施术<small>{spellShort ? `还差${hints.spellCost - battle.playerMp}` : hints.spell}</small>
              </button>
            </div>
            <div className="dock-row">
              <button className="btn ghost" onClick={() => setBagOpen(true)}>补给</button>
              <button className="btn ghost" onClick={() => act((current) => setBattleAuto(current, !battle.auto))}>{battle.auto ? '自动：开' : '自动：关'}</button>
              {beaten && enemy?.rank === 'normal' ? <button className="btn ghost" onClick={() => act((current) => autoResolveBattle(current))}>快速结算</button> : null}
            </div>
            {enemy?.rank === 'boss' ? <p className="muted">首领默认手动。自动开启后仍用同一套规则。</p> : null}
          </>
        )}
      </footer>
      {bagOpen ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="补给">
          <div className="sheet-card stack">
            <div className="split"><h2 className="page-title">携带的补给</h2><button className="icon-btn" aria-label="关闭" onClick={() => setBagOpen(false)}>关</button></div>
            {supplies.length === 0 ? <EmptyState text="这场没有带丹药。" /> : supplies.map((item) => {
              const def = ITEM_MAP[item.definitionId];
              const action = item.definitionId === 'con_heal' ? 'pill' : item.definitionId === 'con_mind' ? 'powder' : null;
              return (
                <button key={item.instanceId} className="btn" disabled={!action || Boolean(battle.finished)} onClick={() => { if (action) play(action); setBagOpen(false); }}>
                  {def?.name} ×{item.qty}<small>{def?.effectText}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {logOpen ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="战报">
          <div className="sheet-card stack">
            <div className="split"><h2 className="page-title">战报</h2><button className="icon-btn" aria-label="关闭" onClick={() => setLogOpen(false)}>关</button></div>
            <div className="log">{battle.log.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
          </div>
        </div>
      ) : null}
      {blessOpen ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="造化">
          <div className="sheet-card stack">
            <div className="split"><h2 className="page-title">本局造化</h2><button className="icon-btn" aria-label="关闭" onClick={() => setBlessOpen(false)}>关</button></div>
            {save.run.blessings.map((item) => <p key={item.id}>{BLESSING_MAP[item.id]?.name} {item.stacks}/{BLESSING_MAP[item.id]?.max}。{BLESSING_MAP[item.id]?.description}</p>)}
          </div>
        </div>
      ) : null}
      {paused ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="暂停">
          <div className="modal-card stack">
            <h2 className="page-title">暂停</h2>
            <p className="muted">战斗停在这一手。不能回城换装。</p>
            <p>补给 {supplies.map((item) => `${ITEM_MAP[item.definitionId]?.name}×${item.qty}`).join('、') || '无'}</p>
            <button className="btn" onClick={() => { setPaused(false); act((current) => moveScreen(current, 'settings')); }}>设置</button>
            <button className="btn danger" onClick={() => ask({
              title: '放弃这场历练',
              body: '按战败结算：普通灵石和材料保留一半，未封存的新法宝与功法书失去。已学会的功法和原有装备保留。',
              confirmLabel: '确认放弃',
              danger: true,
              run: () => act((current) => abandonRun(current)),
            })}>放弃并结算</button>
            <button className="btn primary" onClick={() => setPaused(false)}>继续战斗</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SettlementScreen({ save }: { save: SaveData }) {
  const settlement = save.settlement;
  if (!settlement) return null;
  const title = settlement.kind === 'victory' ? '胜利' : settlement.kind === 'retreat' ? '撤离' : '战败';
  const brought = settlement.items.filter((item) => !item.sealed);
  const sealed = settlement.items.filter((item) => item.sealed);
  const goal = goalOf({ ...save, settlement: { ...settlement, claimed: true }, run: null });
  return (
    <main className="main stack">
      <p className="eyebrow">{settlement.dungeonId === 'bamboo' ? '雾隐竹林' : '引气试炼'}</p>
      <h1 className="page-title">{title}</h1>
      <p className="prose">{settlement.summary}</p>
      <h2>带回</h2>
      <RewardPanel lines={[
        `灵石 +${settlement.stones}`,
        `修为 +${settlement.cultivation}`,
        ...brought.map((item) => `${ITEM_MAP[item.definitionId]?.name ?? item.definitionId} ×${item.qty}`),
      ]} />
      {sealed.length ? <><h2>封存</h2><RewardPanel lines={sealed.map((item) => `${ITEM_MAP[item.definitionId]?.name} ×${item.qty}`)} /></> : null}
      {settlement.returnedSupplies.length ? <><h2>未用的补给</h2><RewardPanel lines={settlement.returnedSupplies.map((item) => `${ITEM_MAP[item.definitionId]?.name} ×${item.qty}`)} /></> : null}
      {settlement.lost.length || settlement.cultivationDropped ? (
        <>
          <h2>没有带回</h2>
          <RewardPanel lines={[
            settlement.cultivationDropped ? `修为 ${settlement.cultivationDropped}` : '',
            ...settlement.lost.map((item) => `${ITEM_MAP[item.definitionId]?.name ?? item.definitionId} ×${item.qty}`),
          ].filter(Boolean)} />
        </>
      ) : null}
      <h2>接下来</h2>
      <p>{goal.title}</p>
      {settlement.advice ? <p className="muted">{settlement.advice}</p> : null}
      <button className="btn primary" data-testid="claim" onClick={() => act((current) => claimSettlement(current))}>领取并返回</button>
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
        <button className="btn primary" disabled={!ready} onClick={() => act((current) => attemptBreakthrough(current))}>尝试引气</button>
      ) : <p className="muted">当前体验到炼气。筑基试炼尚未开放，下一件可做的事是在竹林里取得青髓草。</p>}
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
  const learned = useMemo(() => {
    const rows: { id: string; kind: 'technique' | 'heart' }[] = [];
    if (type === 'all' || type === 'technique') save.player.learnedTechniqueIds.forEach((id) => rows.push({ id, kind: 'technique' }));
    if (type === 'all' || type === 'heart') save.player.learnedHeartIds.forEach((id) => rows.push({ id, kind: 'heart' }));
    return rows.filter((row) => {
      const def = ITEM_MAP[row.id];
      if (!def) return false;
      return school === 'all' || def.school === school || def.school === 'any';
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
          {learned.map((row) => {
            const def = ITEM_MAP[row.id];
            const equipped = row.kind === 'technique' ? save.player.equipment.techniqueId === row.id : save.player.equipment.heartId === row.id;
            return (
              <ItemTile
                key={`learned-${row.id}`}
                kind={row.kind}
                name={def?.name ?? row.id}
                meta={`${qualityLabel(def?.quality ?? 'common')} · ${typeLabel(row.kind)} · 已学会${equipped ? ' · 装备中' : ''}`}
                onClick={() => act((current) => row.kind === 'technique' ? equipTechnique(current, row.id) : equipHeart(current, row.id))}
              />
            );
          })}
          {items.length === 0 && learned.length === 0 ? <EmptyState text="这一栏是空的。" /> : items.map((item) => {
            const def = ITEM_MAP[item.definitionId];
            const equipped = save.player.equipment.treasureInstanceIds.includes(item.instanceId) || save.player.equipment.techniqueId === item.definitionId || save.player.equipment.heartId === item.definitionId || Boolean(save.run?.loadout.treasureInstanceIds.includes(item.instanceId));
            return <ItemTile key={item.instanceId} kind={def?.type} name={def?.name ?? item.definitionId} meta={`${qualityLabel(def?.quality ?? 'common')} · ${typeLabel(def?.type ?? '')} · ${item.ownership === 'run' ? '本局战利' : '永久'}${equipped ? ' · 装备中' : ''}`} qty={item.qty} onClick={() => open(item.instanceId)} />;
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
          {npc.id === 'npc_jiang' ? <button className="btn" disabled={Boolean(save.world.flags.talk_jiang)} onClick={() => act((current) => talkToJiang(current))}>{save.world.flags.talk_jiang ? '暂时没有新的消息' : '听她说说药'}</button> : null}
        </article>
      ))}
      <h2>线索</h2>
      {save.world.clues.length === 0 ? <p className="muted">还没有可追踪的线索。</p> : save.world.clues.map((clue) => <p key={clue.id}>{clue.text}</p>)}
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
      <button className="btn" onClick={() => act((current) => updateSettings(current, { narrative: current.settings.narrative === 'type' ? 'full' : 'type' }))}>
        剧情：{save.settings.narrative === 'type' ? '逐字' : '直接显示'}
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
  const after = playerStats(save);
  const before = save.ceremonyBaseline ?? after;
  useEffect(() => {
    if (save.settings.reduceMotion) return;
    const timer = window.setTimeout(() => setSkipped(true), 2000);
    return () => window.clearTimeout(timer);
  }, [save.settings.reduceMotion]);
  return (
    <main className="main stack">
      <SceneArt className="scene banner home-banner" scene="opening" alt="引气之后的山色" />
      {!skipped ? <button className="btn ghost" onClick={() => setSkipped(true)}>跳过</button> : null}
      {skipped ? (
        <>
          <div className="seal-mark">气</div>
          <h1 className="page-title">炼气</h1>
          <p className="prose">破庙的雨还在，呼吸却落到了丹田。山路忽然肯为你打开。</p>
          <div className="panel">
            <p>气血 {before.maxHp} → {after.maxHp}</p>
            <p>攻击 {before.atk} → {after.atk}</p>
            <p>防御 {before.def} → {after.def}</p>
            <p>灵力 {before.maxMp} → {after.maxMp}</p>
          </div>
          <p>雾隐竹林已经开放。养元经已领悟并装备。筑基还没有开放。</p>
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
