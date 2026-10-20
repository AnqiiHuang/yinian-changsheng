import { useEffect, useState, type ReactNode } from 'react';
import { ITEM_MAP, LOCATIONS } from '../../game/content';
import { equipTreasure, learnFromBook, sellItem, useConsumable } from '../../game/engine/flow';
import { qualityLabel, realmLabel, typeLabel } from '../../game/engine/view';
import type { SaveData } from '../../game/types';
import { useGame } from '../../state/store';

export const SCENE_REGISTRY: Record<string, { file: string; alt: string; ratio: string }> = {
  opening: { file: 'scenes/opening.svg', alt: '青岚远山', ratio: '390 / 180' },
  village: { file: 'scenes/opening.svg', alt: '青禾村', ratio: '390 / 180' },
  shrine: { file: 'scenes/shrine.svg', alt: '山雨破庙', ratio: '390 / 180' },
  night: { file: 'scenes/shrine.svg', alt: '雨夜破庙', ratio: '390 / 180' },
  bamboo: { file: 'scenes/bamboo.svg', alt: '雾隐竹林', ratio: '390 / 180' },
  enemy_leaf: { file: 'enemies/leaf.svg', alt: '竹叶妖', ratio: '390 / 120' },
  enemy_fox: { file: 'enemies/fox.svg', alt: '雾狸', ratio: '390 / 120' },
  enemy_lamp: { file: 'enemies/lamp.svg', alt: '石灯残火', ratio: '390 / 120' },
  enemy_snake: { file: 'enemies/snake.svg', alt: '青鳞蛇', ratio: '390 / 120' },
  enemy_shade: { file: 'enemies/shade.svg', alt: '竹影客', ratio: '390 / 120' },
  enemy_wugu: { file: 'enemies/wugu.svg', alt: '雾骨山魈', ratio: '390 / 120' },
};

export function sceneSrc(scene: string): string {
  const entry = SCENE_REGISTRY[scene] ?? SCENE_REGISTRY.opening;
  return `${import.meta.env.BASE_URL}assets/${entry.file}`;
}

export function SceneArt({ scene, className, alt }: { scene: string; className?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const entry = SCENE_REGISTRY[scene] ?? SCENE_REGISTRY.opening;
  const src = failed ? `${import.meta.env.BASE_URL}assets/scenes/opening.svg` : `${import.meta.env.BASE_URL}assets/${entry.file}`;
  return (
    <img
      className={className ?? 'scene banner'}
      src={src}
      alt={alt || entry.alt}
      style={{ aspectRatio: entry.ratio }}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}

export function GameShell({ children, save }: { children: ReactNode; save: SaveData | null }) {
  const font = save?.settings.fontScale ?? 'standard';
  const reduce = save?.settings.reduceMotion;
  return (
    <div className="shell">
      <div className={`phone${reduce ? ' reduce' : ''}`} data-font={font}>
        {save?.devMarked ? <div className="dev-flag">开发测试档</div> : null}
        {children}
      </div>
    </div>
  );
}

export function TopStatusBar({ save, onSettings, onPause, combat }: { save: SaveData; onSettings?: () => void; onPause?: () => void; combat?: boolean }) {
  const run = save.run;
  const place = LOCATIONS.find((item) => item.id === save.world.currentLocation)?.name ?? '青禾村';
  const dungeon = run?.dungeonId === 'bamboo' ? '雾隐竹林' : '引气试炼';
  return (
    <header className="topbar">
      <div className="who">
        <strong>{combat && run ? dungeon : save.player.name}</strong>
        <div className="muted">{combat && run ? `第 ${run.layer + 1} 处` : `${realmLabel(save)}${run ? ` · ${dungeon}` : ` · ${place}`}`}</div>
      </div>
      {onPause ? <button className="icon-btn" aria-label="暂停" onClick={onPause}><IconPause /></button> : null}
      {onSettings ? <button className="icon-btn" aria-label="设置" onClick={onSettings}><IconGear /></button> : null}
    </header>
  );
}

function IconPause() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>;
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
      <path d="M10 3h4l.4 2.1a7 7 0 0 1 1.6.9l2-1 2 3.4-1.7 1.4a7 7 0 0 1 0 1.9l1.7 1.4-2 3.4-2-1a7 7 0 0 1-1.6.9L14 21h-4l-.4-2.1a7 7 0 0 1-1.6-.9l-2 1-2-3.4 1.7-1.4a7 7 0 0 1 0-1.9L3.9 8.4l2-3.4 2 1a7 7 0 0 1 1.6-.9L10 3z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}
function IconPath() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M4 18c4-8 6-8 8-4s4 6 8-6" /></svg>;
}
function IconBreath() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M12 19c-4-3-6-6-6-9a6 6 0 0 1 12 0c0 3-2 6-6 9z" /></svg>;
}
function IconBag() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M8 9V7a4 4 0 0 1 8 0v2M6 9h12l-1 11H7z" /></svg>;
}
function IconKnot() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M8 7c4 2 4 8 0 10M16 7c-4 2-4 8 0 10" /></svg>;
}
function IconScroll() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M7 5h10v14H7zM7 7H5v10h2M17 7h2v10h-2" /></svg>;
}
function IconClose() {
  return <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}

const NAV = [
  ['map', '历练', IconPath],
  ['cultivate', '修行', IconBreath],
  ['inventory', '行囊', IconBag],
  ['bonds', '因缘', IconKnot],
  ['journal', '山海志', IconScroll],
] as const;

export function BottomNav({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <nav className="nav" aria-label="主导航">
      {NAV.map(([id, label, Icon]) => (
        <button key={id} className={current === id ? 'active' : ''} aria-current={current === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function SceneHeader({ scene, kicker, title }: { scene: string; kicker: string; title: string }) {
  return (
    <header>
      <SceneArt scene={scene} alt={title} />
      <p className="eyebrow">{kicker}</p>
      <h2 className="page-title">{title}</h2>
    </header>
  );
}

export function NarrativePanel({ text, mode }: { text: string; mode?: 'full' | 'type' }) {
  const typing = mode === 'type';
  const [count, setCount] = useState(typing ? 0 : text.length);
  useEffect(() => {
    if (!typing) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((value) => {
        if (value >= text.length) {
          window.clearInterval(timer);
          return value;
        }
        return value + 1;
      });
    }, 18);
    return () => window.clearInterval(timer);
  }, [text, typing]);
  const done = count >= text.length;
  return (
    <div>
      <p className="prose">
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">{typing ? text.slice(0, count) : text}</span>
      </p>
      {typing && !done ? <button className="btn ghost" type="button" onClick={() => setCount(text.length)}>显示全文</button> : null}
    </div>
  );
}

export function ChoiceButton({ label, detail, disabled, reason, onClick }: { label: string; detail?: string; disabled?: boolean; reason?: string; onClick: () => void }) {
  return (
    <button className="choice" disabled={disabled} onClick={onClick}>
      <strong>{label}</strong>
      {detail ? <small>{detail}</small> : null}
      {disabled && reason ? <small className="reason">{reason}</small> : null}
    </button>
  );
}

export function ItemTile({ name, meta, qty, kind, onClick }: { name: string; meta: string; qty?: number; kind?: string; onClick: () => void }) {
  return (
    <button className="tile" onClick={onClick}>
      <ItemMark kind={kind} />
      <span>
        <strong>{name}</strong>
        <div className="muted">{meta}</div>
      </span>
      {qty ? <b className="stat">{qty}</b> : null}
    </button>
  );
}

function ItemMark({ kind }: { kind?: string }) {
  const path = kind === 'treasure'
    ? 'M12 4l6 4v8l-6 4-6-4V8z'
    : kind === 'consumable'
      ? 'M9 4h6v3l2 3v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l2-3z'
      : kind === 'material'
        ? 'M12 4l7 12H5z'
        : kind === 'plot'
          ? 'M7 5h8l3 3v11H7z'
          : kind === 'technique'
            ? 'M12 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z'
            : kind === 'heart'
              ? 'M12 19c-4-3-6-6-6-9a6 6 0 0 1 12 0c0 3-2 6-6 9z'
              : 'M6 6h12v12H6z';
  return <svg viewBox="0 0 24 24" className="glyph item-mark" aria-hidden="true"><path d={path} /></svg>;
}

export function RewardPanel({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="panel">
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}

export function RealmProgress({ label, current, max, hint }: { label: string; current: number; max: number; hint: string }) {
  const width = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="split"><strong>{label}</strong><span className="stat">{current}/{max}</span></div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
      <p className="muted">{hint}</p>
    </div>
  );
}

export function DangerBadge({ text }: { text: string }) {
  return <span className="danger">危险 · {text}</span>;
}

export function ConfirmDialog() {
  const confirm = useGame((state) => state.confirm);
  const cancel = useGame((state) => state.cancelAsk);
  const accept = useGame((state) => state.confirmAsk);
  if (!confirm) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-card stack">
        <h2 id="confirm-title" className="page-title">{confirm.title}</h2>
        <p className="prose">{confirm.body}</p>
        <button className={confirm.danger ? 'btn danger' : 'btn primary'} onClick={accept}>{confirm.confirmLabel}</button>
        <button className="btn ghost" onClick={cancel}>返回</button>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useGame((state) => state.toast);
  const dismiss = useGame((state) => state.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 2400);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);
  if (!toast) return null;
  return <div className="toast" role="status">{toast}</div>;
}

export function LoadingState({ text = '正在展开书页' }: { text?: string }) {
  return <div className="loading" role="status">{text}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function ItemDetailSheet() {
  const id = useGame((state) => state.sheetId);
  const save = useGame((state) => state.save);
  const close = useGame((state) => state.closeSheet);
  if (!id || !save) return null;
  const owned = save.player.inventory.find((item) => item.instanceId === id);
  const loot = save.run?.loot.find((item) => item.instanceId === id);
  const item = owned ?? loot;
  if (!item) return null;
  const def = ITEM_MAP[item.definitionId];
  if (!def) return null;
  const equipped = save.player.equipment.treasureInstanceIds.includes(item.instanceId) || save.run?.loadout.treasureInstanceIds.includes(item.instanceId);
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={def.name}>
      <div className="sheet-card stack">
        <div className="split">
          <h2 className="page-title">{def.name}</h2>
          <button className="icon-btn" aria-label="关闭" onClick={close}><IconClose /></button>
        </div>
        <div><span className="tag">{qualityLabel(def.quality)}</span> {typeLabel(def.type)}</div>
        <p className="prose">{def.description}</p>
        <p>{def.effectText}</p>
        <p className="muted">来源：{def.source}</p>
        {equipped ? <p>当前正装备着它。</p> : null}
        {loot ? <p className="muted">这件还在本局战利里，结算前不算永久获得。</p> : null}
        <SheetActions itemId={item.instanceId} definitionId={item.definitionId} equipped={Boolean(equipped)} />
      </div>
    </div>
  );
}

function SheetActions({ itemId, definitionId, equipped }: { itemId: string; definitionId: string; equipped: boolean }) {
  const save = useGame((state) => state.save);
  const ask = useGame((state) => state.ask);
  const close = useGame((state) => state.closeSheet);
  if (!save) return null;
  const def = ITEM_MAP[definitionId];
  const commit = useGame.getState().commit;
  if (!def) return null;
  const sell = def.sellable && def.price !== null ? Math.floor(def.price * 0.5) : null;
  return (
    <div className="stack">
      {def.type === 'treasure' ? <button className="btn primary" onClick={() => { commit((current) => equipTreasure(current, itemId)); close(); }}>装备</button> : null}
      {(def.type === 'technique' || def.type === 'heart') && save.player.inventory.some((item) => item.instanceId === itemId) ? (
        <button className="btn primary" onClick={() => commit((current) => learnFromBook(current, itemId))}>研读</button>
      ) : null}
      {def.type === 'consumable' ? <button className="btn" onClick={() => commit((current) => useConsumable(current, definitionId))}>使用</button> : null}
      {def.type === 'treasure' ? <p>特殊效果：{def.effectText}。没有用一个总战力代替这些效果。</p> : null}
      {sell !== null && !equipped ? (
        <button className="btn ghost" onClick={() => ask({
          title: `出售${def.name}`,
          body: `出售 1 件，获得 ${sell} 灵石。信物不能出售。`,
          confirmLabel: '确认出售',
          run: () => commit((current) => sellItem(current, itemId, 1)),
        })}>出售，得 {sell} 灵石</button>
      ) : <p className="muted">{equipped ? '先卸下，才能出售。' : def.type === 'plot' ? '信物不可出售。' : '这件不能出售。'}</p>}
    </div>
  );
}
