import { create } from 'zustand';
import {
  DEFAULT_GROUP_ID,
  createGroup,
  watchlistEntryId,
  type WatchlistData,
  type WatchlistGroup,
  type WatchlistItem,
  watchlistRepo,
} from '@/repositories/watchlist';

interface WatchlistState extends WatchlistData {
  activeGroupId: string;
  hydrated: boolean;
  hydrate: () => void;
  persist: () => void;
  add: (code: string, name: string, groupId?: string) => void;
  addToGroup: (code: string, name: string, groupId: string) => boolean;
  removeFromGroup: (code: string, groupId: string) => void;
  removeAll: (code: string) => void;
  toggleGroup: (code: string, name: string, groupId: string) => void;
  has: (code: string) => boolean;
  hasInGroup: (code: string, groupId: string) => boolean;
  getGroupIdsForCode: (code: string) => string[];
  setActiveGroup: (groupId: string) => void;
  addGroup: (name: string) => WatchlistGroup;
  updateGroup: (groupId: string, name: string) => void;
  removeGroup: (groupId: string) => void;
  reorderGroups: (orderedIds: string[]) => void;
  reorderItemsInGroup: (groupId: string, orderedItemIds: string[]) => void;
  getItemsByGroup: (groupId: string) => WatchlistItem[];
  sortedGroups: () => WatchlistGroup[];
}

function syncFromRepo(
  currentActiveId?: string,
): Pick<WatchlistState, 'groups' | 'items' | 'activeGroupId'> {
  const data = watchlistRepo.load();
  const groups = [...data.groups].sort((a, b) => a.order - b.order);
  const fallback =
    groups.find((g) => g.id === DEFAULT_GROUP_ID)?.id ?? groups[0]?.id ?? DEFAULT_GROUP_ID;
  const active =
    currentActiveId && groups.some((g) => g.id === currentActiveId)
      ? currentActiveId
      : fallback;
  return { groups, items: data.items, activeGroupId: active };
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  groups: [],
  items: [],
  activeGroupId: DEFAULT_GROUP_ID,
  hydrated: false,

  hydrate: () => {
    const synced = syncFromRepo(get().activeGroupId);
    set({ ...synced, hydrated: true });
  },

  persist: () => {
    const { groups, items } = get();
    watchlistRepo.save({ groups, items });
  },

  sortedGroups: () => [...get().groups].sort((a, b) => a.order - b.order),

  getItemsByGroup: (groupId) =>
    get()
      .items.filter((i) => i.groupId === groupId)
      .sort((a, b) => a.order - b.order),

  hasInGroup: (code, groupId) =>
    get().items.some((i) => i.code === code && i.groupId === groupId),

  getGroupIdsForCode: (code) =>
    [...new Set(get().items.filter((i) => i.code === code).map((i) => i.groupId))],

  has: (code) => get().items.some((i) => i.code === code),

  addToGroup: (code, name, groupId) => {
    if (get().hasInGroup(code, groupId)) return false;
    const inGroup = get().items.filter((i) => i.groupId === groupId);
    const newItem: WatchlistItem = {
      id: watchlistEntryId(code, groupId),
      code,
      name,
      groupId,
      order: inGroup.length,
      addedAt: new Date().toISOString(),
    };
    set({ items: [...get().items, newItem] });
    get().persist();
    return true;
  },

  add: (code, name, groupId) => {
    const gid = groupId ?? get().activeGroupId ?? DEFAULT_GROUP_ID;
    get().addToGroup(code, name, gid);
  },

  removeFromGroup: (code, groupId) => {
    set({
      items: get().items.filter((i) => !(i.code === code && i.groupId === groupId)),
    });
    get().persist();
  },

  removeAll: (code) => {
    set({ items: get().items.filter((i) => i.code !== code) });
    get().persist();
  },

  toggleGroup: (code, name, groupId) => {
    if (get().hasInGroup(code, groupId)) {
      get().removeFromGroup(code, groupId);
    } else {
      get().addToGroup(code, name, groupId);
    }
  },

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  addGroup: (name) => {
    const data = { groups: get().groups, items: get().items };
    const group = createGroup(name, data);
    set({ groups: [...get().groups, group], activeGroupId: group.id });
    get().persist();
    return group;
  },

  updateGroup: (groupId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({
      groups: get().groups.map((g) =>
        g.id === groupId ? { ...g, name: trimmed } : g,
      ),
    });
    get().persist();
  },

  removeGroup: (groupId) => {
    const groups = get().groups;
    if (groups.length <= 1) return;
    const fallback = groups.find((g) => g.id !== groupId)?.id ?? DEFAULT_GROUP_ID;
    set({
      groups: groups.filter((g) => g.id !== groupId),
      items: get().items.filter((i) => i.groupId !== groupId),
      activeGroupId: get().activeGroupId === groupId ? fallback : get().activeGroupId,
    });
    get().persist();
  },

  reorderGroups: (orderedIds) => {
    const map = new Map(get().groups.map((g) => [g.id, g]));
    const groups = orderedIds
      .map((id, order) => {
        const g = map.get(id);
        return g ? { ...g, order } : null;
      })
      .filter(Boolean) as WatchlistGroup[];
    const rest = get().groups.filter((g) => !orderedIds.includes(g.id));
    rest.forEach((g, i) => groups.push({ ...g, order: orderedIds.length + i }));
    set({ groups });
    get().persist();
  },

  reorderItemsInGroup: (groupId, orderedItemIds) => {
    const map = new Map(get().items.map((i) => [i.id, i]));
    const reordered = orderedItemIds
      .map((id, order) => {
        const item = map.get(id);
        return item ? { ...item, order } : null;
      })
      .filter(Boolean) as WatchlistItem[];
    const others = get().items.filter((i) => i.groupId !== groupId);
    set({ items: [...others, ...reordered] });
    get().persist();
  },
}));
