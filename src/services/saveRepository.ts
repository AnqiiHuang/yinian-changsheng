import { validateSave } from '../game/engine/validate';
import type { SaveData } from '../game/types';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAIN = 'yinian.save.v1';
const BACKUP = 'yinian.save.backup';

export class SaveRepository {
  constructor(private storage: KeyValueStorage, private mainKey = MAIN, private backupKey = BACKUP) {}

  read(): { ok: true; save: SaveData | null } | { ok: false; error: string; backup: SaveData | null } {
    const raw = this.storage.getItem(this.mainKey);
    if (!raw) return { ok: true, save: null };
    return this.parse(raw, true);
  }

  readBackup(): SaveData | null {
    const raw = this.storage.getItem(this.backupKey);
    if (!raw) return null;
    const parsed = this.parse(raw, false);
    return parsed.ok ? parsed.save : null;
  }

  private parse(raw: string, withBackup: boolean): { ok: true; save: SaveData | null } | { ok: false; error: string; backup: SaveData | null } {
    try {
      const parsed = validateSave(JSON.parse(raw));
      if (!parsed.ok) return { ok: false, error: parsed.error, backup: withBackup ? this.readBackup() : null };
      return { ok: true, save: parsed.save };
    } catch {
      return { ok: false, error: '存档无法解析', backup: withBackup ? this.readBackup() : null };
    }
  }

  write(save: SaveData, options?: { preserveBackup?: boolean }): boolean {
    try {
      const text = JSON.stringify(save);
      if (text.length > 1_500_000) return false;
      const previous = this.storage.getItem(this.mainKey);
      if (!options?.preserveBackup && previous) this.storage.setItem(this.backupKey, previous);
      this.storage.setItem(this.mainKey, text);
      if (!options?.preserveBackup && !previous) this.storage.setItem(this.backupKey, text);
      return true;
    } catch {
      return false;
    }
  }

  removeMain(): void {
    this.storage.removeItem(this.mainKey);
  }

  revision(): number | null {
    const raw = this.storage.getItem(this.mainKey);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as { revision?: number };
      return typeof data.revision === 'number' ? data.revision : null;
    } catch {
      return null;
    }
  }
}

export function exportText(save: SaveData): string {
  const copy = structuredClone(save);
  return JSON.stringify(copy);
}
