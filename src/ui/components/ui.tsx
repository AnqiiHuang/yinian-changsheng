import { useEffect, useState, type ReactNode } from 'react';
import { ITEM_MAP } from '../../game/content';
import { equipTreasure, learnFromBook, sellItem, useConsumable } from '../../game/engine/flow';
import { qualityLabel, realmLabel, typeLabel } from '../../game/engine/view';
import type { SaveData } from '../../game/types';
import { useGame } from '../../state/store';

export function sceneSrc(scene: string): string {
  const file = scene === 'bamboo' ? 'bamboo.svg' : scene === 'shrine' || scene === 'night' ? 'shrine.svg' : 'opening.svg';
  return `${import.meta.env.BASE_URL}assets/scenes/${file}`;
}

export function SceneArt({ scene, className, alt }: { scene: string; className?: string; alt: string }) {
  return <img className={className ?? 'scene banner'} src={sceneSrc(scene)} alt={alt} />;
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

export function TopStatusBar({ save, onSettings, onPause }: { save: SaveData; onSettings?: () => void; onPause?: () => void }) {
  const run = save.run;
  return (
    <header className="topbar">
      <div className="who">
        <strong>{save.player.name}</strong>
        <div className="muted">{realmLabel(save)}{run ? ` · ${run.dungeonId === 'bamboo' ? '雾隐竹林' : '引气试炼'}` : ''}</div>
      </div>
      {onPause ? <button className="icon-btn" aria-label="暂停" onClick={onPause}>停</button> : null}
      {onSettings ? <button className="icon-btn" aria-label="设置" onClick={onSettings}>设</button> : null}
    </header>
  );
}

const NAV = [
  ['map', '历练'],
  ['cultivate', '修行'],
  ['inventory', '行囊'],
  ['bonds', '因缘'],
  ['journal', '山海志'],
] as const;

export function BottomNav({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <nav className="nav" aria-label="主导航">
      {NAV.map(([id, label]) => (
        <button key={id} className={current === id ? 'active' : ''} aria-current={current === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          <span aria-hidden="true">{label.slice(0, 1)}</span>
          {label}
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

export function NarrativePanel({ text, reduce }: { text: string; reduce?: boolean }) {
  const [count, setCount] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((value) => (value >= text.length ? value : value + 1));
    }, 16);
    return () => window.clearInterval(timer);
  }, [text, reduce]);
  return (
    <p className="prose fade" onClick={() => setCount(text.length)}>
      {text.slice(0, count)}
    </p>
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

export function ItemTile({ name, meta, qty, onClick }: { name: string; meta: string; qty?: number; onClick: () => void }) {
  return (
    <button className="tile" onClick={onClick}>
      <span>
        <strong>{name}</strong>
        <div className="muted">{meta}</div>
      </span>
      {qty ? <b>{qty}</b> : null}
    </button>
  );
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
          <button className="icon-btn" aria-label="关闭" onClick={close}>关</button>
        </div>
        <div><span className="tag">{qualityLabel(def.quality)}</span> {typeLabel(def.type)}</div>
        <p className="prose">{def.description}</p>
        <p>{def.effectText}</p>
        <p className="muted">来源：{def.source}</p>
        {equipped ? <p>当前正装备着它。</p> : null}
        {loot ? <p className="muted">这件还在本局战利里，结算前不算永久获得。</p> : null}
        <SheetActions itemId={item.instanceId} definitionId={item.definitionId} />
      </div>
    </div>
  );
}

function SheetActions({ itemId, definitionId }: { itemId: string; definitionId: string }) {
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
      {sell !== null ? (
        <button className="btn ghost" onClick={() => ask({
          title: `出售${def.name}`,
          body: `出售 1 件，获得 ${sell} 灵石。剧情信物不能这样处理。`,
          confirmLabel: '确认出售',
          run: () => commit((current) => sellItem(current, itemId, 1)),
        })}>出售，得 {sell} 灵石</button>
      ) : <p className="muted">{def.type === 'plot' ? '信物不可出售。' : '这件不能出售。'}</p>}
    </div>
  );
}
