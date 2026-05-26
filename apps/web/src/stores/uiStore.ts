import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IndicatorKey = 'ma' | 'macd' | 'boll' | 'kdj' | 'rsi';

interface UiState {
  activeIndicators: IndicatorKey[];
  klinePeriod: 'daily' | 'weekly' | 'monthly';
  setIndicators: (keys: IndicatorKey[]) => void;
  toggleIndicator: (key: IndicatorKey) => void;
  setKlinePeriod: (p: 'daily' | 'weekly' | 'monthly') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      activeIndicators: ['ma', 'macd', 'kdj'],
      klinePeriod: 'daily',
      setIndicators: (keys) => set({ activeIndicators: keys }),
      toggleIndicator: (key) => {
        const cur = get().activeIndicators;
        set({
          activeIndicators: cur.includes(key)
            ? cur.filter((k) => k !== key)
            : [...cur, key],
        });
      },
      setKlinePeriod: (p) => set({ klinePeriod: p }),
    }),
    { name: 'yxstock-ui' },
  ),
);
