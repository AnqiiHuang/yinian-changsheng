import { create } from 'zustand';
import { TALENTS } from '../game/content';
import { bootScreen } from '../game/engine/flow';
import { shuffle } from '../game/engine/rng';
import { validateSave } from '../game/engine/validate';
import type { SaveData, StepResult } from '../game/types';
import { SaveRepository, exportText, type KeyValueStorage } from '../services/saveRepository';

const DRAFT_KEY = 'yinian.draft';

export interface CreateDraft {
  name: string;
  appearanceId: string;
  originId: string;
  talentId: string;
  offeredTalentIds: string[];
  seed: number;
  step: 0 | 1;
}

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => void;
}

interface GameStore {
  ready: boolean;
  loadError: string | null;
  backup: SaveData | null;
  save: SaveData | null;
  stale: boolean;
  toast: string | null;
  confirm: ConfirmState | null;
  sheetId: string | null;
  draft: CreateDraft | null;
  prepareId: 'tutorial' | 'bamboo' | null;
  guest: 'opening' | 'create';
  boot: () => void;
  dismissToast: () => void;
  ask: (input: ConfirmState) => void;
  cancelAsk: () => void;
  confirmAsk: () => void;
  openSheet: (id: string) => void;
  closeSheet: () => void;
  setDraft: (patch: Partial<CreateDraft>) => void;
  ensureDraft: () => void;
  commit: (fn: (save: SaveData) => StepResult) => void;
  replaceSave: (save: SaveData, toast?: string) => void;
  importText: (text: string) => void;
  downloadSave: () => void;
  wipe: () => void;
  restoreBackup: () => void;
  markStale: () => void;
  setPrepare: (id: 'tutorial' | 'bamboo' | null) => void;
  setGuest: (guest: 'opening' | 'create') => void;
}

function storage(): KeyValueStorage {
  return localStorage;
}

function draftBox(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function readDraft(): CreateDraft | null {
  const raw = draftBox()?.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CreateDraft;
  } catch {
    return null;
  }
}

function writeDraft(draft: CreateDraft | null): void {
  const box = draftBox();
  if (!box) return;
  if (!draft) box.removeItem(DRAFT_KEY);
  else box.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function makeDraft(seed = Date.now() % 100000): CreateDraft {
  const { list } = shuffle(TALENTS.map((talent) => talent.id), seed, 0);
  return {
    name: '',
    appearanceId: 'app_robe',
    originId: 'origin_herb',
    talentId: list[0],
    offeredTalentIds: list.slice(0, 3),
    seed,
    step: 0,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  ready: false,
  loadError: null,
  backup: null,
  save: null,
  stale: false,
  toast: null,
  confirm: null,
  sheetId: null,
  draft: null,
  prepareId: null,
  guest: 'opening',
  boot: () => {
    const repo = new SaveRepository(storage());
    const loaded = repo.read();
    if (!loaded.ok) {
      set({ ready: true, loadError: loaded.error, backup: loaded.backup, save: null, draft: readDraft() });
      return;
    }
    if (!loaded.save) {
      set({ ready: true, loadError: null, save: null, draft: readDraft(), backup: repo.readBackup() });
      return;
    }
    const save = structuredClone(loaded.save);
    save.screen = bootScreen(save);
    set({ ready: true, loadError: null, save, backup: repo.readBackup(), draft: null });
  },
  dismissToast: () => set({ toast: null }),
  ask: (input) => set({ confirm: input }),
  cancelAsk: () => set({ confirm: null }),
  confirmAsk: () => {
    const current = get().confirm;
    set({ confirm: null });
    current?.run();
  },
  openSheet: (id) => set({ sheetId: id }),
  closeSheet: () => set({ sheetId: null }),
  setDraft: (patch) => {
    const draft = { ...(get().draft ?? makeDraft()), ...patch };
    writeDraft(draft);
    set({ draft });
  },
  ensureDraft: () => {
    if (get().draft) return;
    const existing = readDraft() ?? makeDraft();
    writeDraft(existing);
    set({ draft: existing });
  },
  commit: (fn) => {
    const current = get().save;
    if (!current) return;
    if (get().stale) {
      set({ toast: '进度已在另一处更新，请刷新后再继续。' });
      return;
    }
    const result = fn(current);
    if (!result.ok) {
      set({ toast: result.error });
      return;
    }
    const repo = new SaveRepository(storage());
    const stored = repo.revision();
    if (stored !== null && stored !== current.revision) {
      set({ stale: true, toast: '进度已在另一处更新，请刷新后再继续。' });
      return;
    }
    const next = result.save;
    next.revision = current.revision + 1;
    next.savedAt = Date.now();
    if (!repo.write(next)) {
      set({ toast: '当前设备无法保存进度，请先导出存档' });
      return;
    }
    set({ save: next, toast: result.toast ?? null, loadError: null });
  },
  replaceSave: (save, toast) => {
    const repo = new SaveRepository(storage());
    const preserve = Boolean(get().loadError && get().backup);
    if (!repo.write(save, { preserveBackup: preserve })) {
      set({ toast: '当前设备无法保存进度，请先导出存档' });
      return;
    }
    writeDraft(null);
    set({ save, toast: toast ?? null, loadError: null, draft: null, stale: false });
  },
  importText: (text) => {
    if (text.length > 400_000) {
      set({ toast: '存档文件过大' });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      set({ toast: '存档无法解析' });
      return;
    }
    const checked = validateSave(parsed);
    if (!checked.ok) {
      set({ toast: checked.error });
      return;
    }
    const repo = new SaveRepository(storage());
    const current = get().save;
    if (current) repo.write(current);
    checked.save.screen = bootScreen(checked.save);
    if (!repo.write(checked.save, { preserveBackup: true })) {
      set({ toast: '当前设备无法保存进度，请先导出存档' });
      return;
    }
    set({ save: checked.save, toast: '存档已导入', loadError: null, stale: false });
  },
  downloadSave: () => {
    const save = get().save ?? get().backup;
    if (!save) {
      set({ toast: '没有可以导出的存档' });
      return;
    }
    const blob = new Blob([exportText(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yinian-save.json';
    link.click();
    URL.revokeObjectURL(url);
  },
  wipe: () => {
    const repo = new SaveRepository(storage());
    const current = get().save;
    if (current) repo.write(current);
    repo.removeMain();
    writeDraft(null);
    set({ save: null, draft: null, loadError: null, toast: '这趟人生已经放下', stale: false });
  },
  restoreBackup: () => {
    const backup = get().backup ?? new SaveRepository(storage()).readBackup();
    if (!backup) {
      set({ toast: '没有可用的备份' });
      return;
    }
    const repo = new SaveRepository(storage());
    const next = structuredClone(backup);
    next.screen = bootScreen(next);
    if (!repo.write(next, { preserveBackup: true })) {
      set({ toast: '当前设备无法保存进度，请先导出存档' });
      return;
    }
    set({ save: next, loadError: null, toast: '已从上一份快照恢复' });
  },
  markStale: () => set({ stale: true, toast: '进度已在另一处更新，请刷新后再继续。' }),
  setPrepare: (id) => set({ prepareId: id }),
  setGuest: (guest) => set({ guest }),
}));
