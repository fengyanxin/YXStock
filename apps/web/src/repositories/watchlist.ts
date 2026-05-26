import { createId } from '@/utils/id';

export const DEFAULT_GROUP_ID = 'default';

export interface WatchlistGroup {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface WatchlistItem {
  /** 条目唯一 id（同一股票可在多个分组各有一条） */
  id: string;
  code: string;
  name: string;
  groupId: string;
  order: number;
  addedAt: string;
}

export function watchlistEntryId(code: string, groupId: string): string {
  return `${code}::${groupId}`;
}

export interface WatchlistData {
  groups: WatchlistGroup[];
  items: WatchlistItem[];
}

export interface IWatchlistRepository {
  load(): WatchlistData;
  save(data: WatchlistData): void;
  getDefaultGroupId(): string;
}

const STORAGE_KEY = 'yxstock-watchlist-v2';
const LEGACY_KEY = 'yxstock-watchlist';

function defaultData(): WatchlistData {
  const now = new Date().toISOString();
  return {
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        name: '默认分组',
        order: 0,
        createdAt: now,
      },
    ],
    items: [],
  };
}

function migrateLegacy(): WatchlistData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const data = defaultData();
    data.items = parsed.map((row: Record<string, unknown>, i: number) => {
      const code = String(row.code ?? '');
      return {
        id: watchlistEntryId(code, DEFAULT_GROUP_ID),
        code,
        name: String(row.name ?? ''),
        groupId: DEFAULT_GROUP_ID,
        order: i,
        addedAt: String(row.addedAt ?? new Date().toISOString()),
      };
    });
    localStorage.removeItem(LEGACY_KEY);
    return data;
  } catch {
    return null;
  }
}

function migrateStorePersist(): WatchlistData | null {
  try {
    const raw = localStorage.getItem('yxstock-watchlist-store');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { items?: WatchlistItem[] } };
    const items = parsed.state?.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    const data = defaultData();
    data.items = items.map((row, i) => {
      const groupId = row.groupId ?? DEFAULT_GROUP_ID;
      return {
        id: row.id ?? watchlistEntryId(row.code, groupId),
        code: row.code,
        name: row.name,
        groupId,
        order: row.order ?? i,
        addedAt: row.addedAt ?? new Date().toISOString(),
      };
    });
    return data;
  } catch {
    return null;
  }
}

export class LocalWatchlistRepository implements IWatchlistRepository {
  getDefaultGroupId(): string {
    return DEFAULT_GROUP_ID;
  }

  load(): WatchlistData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as WatchlistData;
        if (data.groups?.length) return normalizeData(data);
      }
    } catch {
      /* fall through */
    }
    const migrated = migrateLegacy() ?? migrateStorePersist();
    if (migrated) {
      this.save(migrated);
      return migrated;
    }
    const fresh = defaultData();
    this.save(fresh);
    return fresh;
  }

  save(data: WatchlistData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }
}

function normalizeData(data: WatchlistData): WatchlistData {
  const groups = [...(data.groups ?? [])].sort((a, b) => a.order - b.order);
  if (groups.length === 0) {
    return defaultData();
  }
  const groupIds = new Set(groups.map((g) => g.id));
  const fallback = groups[0].id;
  const seen = new Set<string>();
  const items: WatchlistItem[] = [];
  for (const raw of data.items ?? []) {
    const groupId = groupIds.has(raw.groupId) ? raw.groupId : fallback;
    const code = raw.code?.trim() ?? '';
    if (!code) continue;
    const key = watchlistEntryId(code, groupId);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: raw.id ?? key,
      code,
      name: raw.name ?? code,
      groupId,
      order: raw.order ?? items.filter((x) => x.groupId === groupId).length,
      addedAt: raw.addedAt ?? new Date().toISOString(),
    });
  }
  return { groups, items };
}

/** Placeholder for cloud sync after login */
export class RemoteWatchlistRepository implements IWatchlistRepository {
  load(): WatchlistData {
    throw new Error('Remote watchlist not implemented');
  }
  save(): void {
    throw new Error('Remote watchlist not implemented');
  }
  getDefaultGroupId(): string {
    throw new Error('Remote watchlist not implemented');
  }
}

export const watchlistRepo: IWatchlistRepository = new LocalWatchlistRepository();

export function createGroup(name: string, data: WatchlistData): WatchlistGroup {
  const maxOrder = data.groups.reduce((m, g) => Math.max(m, g.order), -1);
  return {
    id: createId(),
    name: name.trim() || '未命名分组',
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
}
