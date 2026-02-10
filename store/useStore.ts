import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingData {
  dream: string | null;
  blocker: string | null;
  pace: string | null;
}

export interface User {
  name: string;
  quizResult: string | null;
  pace: string | null;
  onboardingComplete: boolean;
  onboardingData: OnboardingData;
}

export interface Dream {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  moves: string[];
}

export interface Move {
  id: string;
  dreamId: string;
  title: string;
  description: string;
  completedAt?: string;
  createdAt: string;
}

export interface Streaks {
  count: number;
  lastDate: string | null;
  freezes: number;
}

export interface Settings {
  notifications: boolean;
  haptics: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface AppState {
  user: User;
  dreams: Dream[];
  moves: Move[];
  streaks: Streaks;
  settings: Settings;

  // User actions
  setUser: (user: Partial<User>) => void;
  resetUser: () => void;

  // Onboarding actions
  setOnboardingDream: (dream: string) => void;
  setOnboardingBlocker: (blocker: string) => void;
  setOnboardingPace: (pace: string) => void;
  completeOnboarding: () => void;

  // Dream actions
  addDream: (dream: Dream) => void;
  updateDream: (id: string, dream: Partial<Dream>) => void;
  deleteDream: (id: string) => void;

  // Move actions
  addMove: (move: Move) => void;
  updateMove: (id: string, move: Partial<Move>) => void;
  deleteMove: (id: string) => void;

  // Streak actions
  updateStreaks: (streaks: Partial<Streaks>) => void;
  incrementStreak: () => void;
  useFreeze: () => void;

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
}

const initialOnboardingData: OnboardingData = {
  dream: null,
  blocker: null,
  pace: null,
};

const initialUser: User = {
  name: '',
  quizResult: null,
  pace: null,
  onboardingComplete: false,
  onboardingData: initialOnboardingData,
};

const initialStreaks: Streaks = {
  count: 0,
  lastDate: null,
  freezes: 0,
};

const initialSettings: Settings = {
  notifications: true,
  haptics: true,
  theme: 'system',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: initialUser,
      dreams: [],
      moves: [],
      streaks: initialStreaks,
      settings: initialSettings,

      // User actions
      setUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),
      resetUser: () => set({ user: initialUser }),

      // Onboarding actions
      setOnboardingDream: (dream) =>
        set((state) => ({
          user: {
            ...state.user,
            onboardingData: { ...state.user.onboardingData, dream },
          },
        })),
      setOnboardingBlocker: (blocker) =>
        set((state) => ({
          user: {
            ...state.user,
            onboardingData: { ...state.user.onboardingData, blocker },
          },
        })),
      setOnboardingPace: (pace) =>
        set((state) => ({
          user: {
            ...state.user,
            onboardingData: { ...state.user.onboardingData, pace },
          },
        })),
      completeOnboarding: () =>
        set((state) => ({
          user: { ...state.user, onboardingComplete: true },
        })),

      // Dream actions
      addDream: (dream) =>
        set((state) => ({
          dreams: [...state.dreams, dream],
        })),
      updateDream: (id, dreamData) =>
        set((state) => ({
          dreams: state.dreams.map((d) =>
            d.id === id ? { ...d, ...dreamData } : d
          ),
        })),
      deleteDream: (id) =>
        set((state) => ({
          dreams: state.dreams.filter((d) => d.id !== id),
        })),

      // Move actions
      addMove: (move) =>
        set((state) => ({
          moves: [...state.moves, move],
        })),
      updateMove: (id, moveData) =>
        set((state) => ({
          moves: state.moves.map((m) =>
            m.id === id ? { ...m, ...moveData } : m
          ),
        })),
      deleteMove: (id) =>
        set((state) => ({
          moves: state.moves.filter((m) => m.id !== id),
        })),

      // Streak actions
      updateStreaks: (streakData) =>
        set((state) => ({
          streaks: { ...state.streaks, ...streakData },
        })),
      incrementStreak: () =>
        set((state) => ({
          streaks: {
            ...state.streaks,
            count: state.streaks.count + 1,
            lastDate: new Date().toISOString(),
          },
        })),
      useFreeze: () =>
        set((state) => ({
          streaks: {
            ...state.streaks,
            freezes: Math.max(0, state.streaks.freezes - 1),
          },
        })),

      // Settings actions
      updateSettings: (settingsData) =>
        set((state) => ({
          settings: { ...state.settings, ...settingsData },
        })),
    }),
    {
      name: 'delusional-leap-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
