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
  category: string;
  description: string;
  deadline: string | null;
  createdAt: string;
  completedAt?: string;
  moves: string[];
}

export interface DailyMove {
  id: string;
  type: 'quick' | 'power' | 'boss';
  title: string;
  description: string;
  points: number;
  timeEstimate: string;
  completed: boolean;
  completedAt?: string;
  date: string; // YYYY-MM-DD format
}

export interface Move {
  id: string;
  dreamId: string;
  title: string;
  description: string;
  type: 'quick' | 'power' | 'boss';
  points: number;
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

export interface VisionBoard {
  totalCells: number;
  filledCells: number;
}

interface AppState {
  user: User;
  dreams: Dream[];
  activeDream: Dream | null;
  moves: Move[];
  dailyMoves: DailyMove[];
  totalMovesCompleted: number;
  streaks: Streaks;
  settings: Settings;
  visionBoard: VisionBoard;
  dailyMovesCompletedToday: number;
  lastDailyMovesDate: string | null;

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
  setActiveDream: (dream: Dream) => void;

  // Daily Move actions
  generateDailyMoves: () => void;
  completeDailyMove: (id: string) => void;
  getDailyMoves: () => DailyMove[];

  // Move actions
  addMove: (move: Move) => void;
  updateMove: (id: string, move: Partial<Move>) => void;
  deleteMove: (id: string) => void;

  // Streak actions
  updateStreaks: (streaks: Partial<Streaks>) => void;
  incrementStreak: () => void;
  useFreeze: () => void;
  addFreeze: (count?: number) => void;
  checkAndUpdateStreak: () => void;

  // Vision Board actions
  updateVisionBoard: () => void;
  getVisionBoardPercentage: () => number;

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;

  // Reset for testing
  resetAll: () => void;
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

const initialVisionBoard: VisionBoard = {
  totalCells: 16,
  filledCells: 0,
};

// Move suggestions per dream category
const MOVE_SUGGESTIONS: Record<string, { quick: { title: string; description: string }[]; power: { title: string; description: string }[]; boss: { title: string; description: string }[] }> = {
  travel: {
    quick: [
      { title: 'Save $10 to your trip fund', description: 'Transfer $10 to a separate savings account or jar right now.' },
      { title: 'Research one destination', description: 'Spend 5 minutes looking up your dream location on Pinterest or Google.' },
      { title: 'Follow a travel creator', description: 'Find someone who\'s been where you want to go and hit follow.' },
      { title: 'Screenshot a flight deal', description: 'Open Google Flights and save a screenshot of prices to your destination.' },
      { title: 'Add 1 item to your packing list', description: 'Start your packing list with one essential item you\'ll need.' },
    ],
    power: [
      { title: 'Set a trip savings goal', description: 'Calculate the total cost and set up automatic transfers.' },
      { title: 'Research accommodations', description: 'Spend 20 minutes comparing hotels, hostels, or Airbnbs.' },
      { title: 'Plan your first day itinerary', description: 'Map out what you\'ll do on day one of your trip.' },
      { title: 'Get your passport sorted', description: 'Check expiration date or start the renewal/application process.' },
      { title: 'Learn 10 phrases in the local language', description: 'Use Duolingo or YouTube to learn essential phrases.' },
    ],
    boss: [
      { title: 'Book the flight', description: 'Stop researching. Pull the trigger and book it today. You can do this!' },
      { title: 'Tell 3 people your travel date', description: 'Make it real by announcing your trip to friends or family.' },
      { title: 'Request time off work', description: 'Send that email to your manager. Block the dates.' },
      { title: 'Book your accommodation', description: 'Lock in where you\'re staying. Refundable options are fine!' },
      { title: 'Create a countdown post', description: 'Share your trip countdown on social media. Make it public!' },
    ],
  },
  worth: {
    quick: [
      { title: 'Write down 3 wins from this year', description: 'List accomplishments that prove you deserve more.' },
      { title: 'Research market salary', description: 'Spend 5 minutes on Glassdoor looking up your role\'s pay.' },
      { title: 'Save one negotiation tip', description: 'Find and screenshot one salary negotiation tip.' },
      { title: 'Update one line on your resume', description: 'Refresh your resume with a recent achievement.' },
      { title: 'Practice saying your number out loud', description: 'Say your desired salary in the mirror 3 times.' },
    ],
    power: [
      { title: 'Document your impact', description: 'Write down specific examples of value you\'ve added at work.' },
      { title: 'Role-play the conversation', description: 'Practice your ask with a friend or record yourself.' },
      { title: 'Research 3 companies that pay more', description: 'Find companies in your field with better compensation.' },
      { title: 'Update your LinkedIn headline', description: 'Refresh your profile to reflect your current value.' },
      { title: 'Write your negotiation script', description: 'Draft exactly what you\'ll say when you ask.' },
    ],
    boss: [
      { title: 'Schedule the meeting', description: 'Email your manager and request time to discuss compensation.' },
      { title: 'Have the conversation', description: 'It\'s time. Ask for what you\'re worth. You got this!' },
      { title: 'Apply to 3 higher-paying roles', description: 'Send out applications today. Know your options.' },
      { title: 'Send a cold message to a dream company', description: 'Reach out on LinkedIn to someone at your target company.' },
      { title: 'Share your salary publicly', description: 'Post about pay transparency. Help others while empowering yourself.' },
    ],
  },
  launch: {
    quick: [
      { title: 'Name your project', description: 'Give your idea a working title. It doesn\'t have to be perfect.' },
      { title: 'Write your one-liner', description: 'Describe what you\'re building in one sentence.' },
      { title: 'Buy the domain', description: 'Spend 5 minutes and secure a domain name for your idea.' },
      { title: 'Create a project folder', description: 'Make a dedicated folder for all your ideas and notes.' },
      { title: 'Follow 3 founders in your space', description: 'Find inspiration from people who\'ve launched similar things.' },
    ],
    power: [
      { title: 'Write your about page', description: 'Draft the story of why you\'re building this.' },
      { title: 'Create your first prototype', description: 'Build a rough version, even if it\'s just on paper.' },
      { title: 'Set up your social media', description: 'Create the Instagram/TikTok/Twitter for your project.' },
      { title: 'Make a simple landing page', description: 'Use Carrd or Notion to create a basic web presence.' },
      { title: 'Define your first 10 customers', description: 'List 10 specific people who would use your product.' },
    ],
    boss: [
      { title: 'Tell 5 people about your idea', description: 'Share what you\'re building. Make it real by saying it out loud.' },
      { title: 'Launch a waitlist', description: 'Open sign-ups and start collecting early interest.' },
      { title: 'Make your first sale', description: 'Sell one unit, even at a discount. Revenue is validation.' },
      { title: 'Post your launch announcement', description: 'Share it publicly. The world needs to know!' },
      { title: 'Do your first customer interview', description: 'Talk to a potential customer for 20 minutes.' },
    ],
  },
  growth: {
    quick: [
      { title: 'Define your future self', description: 'Write 3 sentences about who you\'re becoming.' },
      { title: 'Set one morning intention', description: 'Choose how you want to feel and show up today.' },
      { title: 'Journal for 5 minutes', description: 'Write whatever comes to mind. No filter, just flow.' },
      { title: 'Unfollow 5 accounts that drain you', description: 'Curate your feed to match who you\'re becoming.' },
      { title: 'Send a gratitude text', description: 'Message someone who\'s supported you and say thanks.' },
    ],
    power: [
      { title: 'Create a morning routine', description: 'Design a realistic morning ritual for your future self.' },
      { title: 'Read for 20 minutes', description: 'Start that book that\'s been collecting dust.' },
      { title: 'Take yourself on a solo date', description: 'Do something alone that future-you would do.' },
      { title: 'Write your 1-year vision', description: 'Describe your life one year from today in detail.' },
      { title: 'Meditate for 15 minutes', description: 'Sit with yourself. Breathe. Reset your energy.' },
    ],
    boss: [
      { title: 'Set a scary boundary', description: 'Tell someone no, or protect your time/energy publicly.' },
      { title: 'Sign up for that course', description: 'Stop thinking about it. Invest in your growth today.' },
      { title: 'Have the hard conversation', description: 'Say what you\'ve been avoiding. Clear the air.' },
      { title: 'Share your transformation publicly', description: 'Post about your growth journey. Inspire others.' },
      { title: 'Book a therapy or coaching session', description: 'Invest in support. You don\'t have to figure it out alone.' },
    ],
  },
};

const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const generateMovesForCategory = (category: string, date: string): DailyMove[] => {
  const suggestions = MOVE_SUGGESTIONS[category] || MOVE_SUGGESTIONS.growth;

  // Randomly select one from each type
  const quickIndex = Math.floor(Math.random() * suggestions.quick.length);
  const powerIndex = Math.floor(Math.random() * suggestions.power.length);
  const bossIndex = Math.floor(Math.random() * suggestions.boss.length);

  return [
    {
      id: `quick-${date}-${Date.now()}`,
      type: 'quick',
      title: suggestions.quick[quickIndex].title,
      description: suggestions.quick[quickIndex].description,
      points: 1,
      timeEstimate: '2-5 min',
      completed: false,
      date,
    },
    {
      id: `power-${date}-${Date.now() + 1}`,
      type: 'power',
      title: suggestions.power[powerIndex].title,
      description: suggestions.power[powerIndex].description,
      points: 3,
      timeEstimate: '15-30 min',
      completed: false,
      date,
    },
    {
      id: `boss-${date}-${Date.now() + 2}`,
      type: 'boss',
      title: suggestions.boss[bossIndex].title,
      description: suggestions.boss[bossIndex].description,
      points: 10,
      timeEstimate: 'The scary one',
      completed: false,
      date,
    },
  ];
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: initialUser,
      dreams: [],
      activeDream: null,
      moves: [],
      dailyMoves: [],
      totalMovesCompleted: 0,
      streaks: initialStreaks,
      settings: initialSettings,
      visionBoard: initialVisionBoard,
      dailyMovesCompletedToday: 0,
      lastDailyMovesDate: null,

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
      setActiveDream: (dream) =>
        set({ activeDream: dream }),

      // Daily Move actions
      generateDailyMoves: () => {
        const state = get();
        const today = getTodayString();
        const category = state.user.onboardingData.dream || 'growth';

        // Check if we already have moves for today
        const todayMoves = state.dailyMoves.filter((m) => m.date === today);
        if (todayMoves.length > 0) {
          return; // Already have moves for today
        }

        // Generate new moves for today
        const newMoves = generateMovesForCategory(category, today);
        set({
          dailyMoves: newMoves,
          lastDailyMovesDate: today,
          dailyMovesCompletedToday: 0,
        });
      },

      completeDailyMove: (id) => {
        const state = get();
        const today = getTodayString();

        set((state) => {
          const updatedMoves = state.dailyMoves.map((m) =>
            m.id === id
              ? { ...m, completed: true, completedAt: new Date().toISOString() }
              : m
          );

          const completedCount = updatedMoves.filter(
            (m) => m.date === today && m.completed
          ).length;

          const move = state.dailyMoves.find((m) => m.id === id);
          const points = move?.points || 0;

          return {
            dailyMoves: updatedMoves,
            dailyMovesCompletedToday: completedCount,
            totalMovesCompleted: state.totalMovesCompleted + 1,
            visionBoard: {
              ...state.visionBoard,
              filledCells: Math.min(
                state.visionBoard.totalCells,
                state.visionBoard.filledCells + 1
              ),
            },
          };
        });

        // Check and update streak
        get().checkAndUpdateStreak();
      },

      getDailyMoves: () => {
        const state = get();
        const today = getTodayString();
        return state.dailyMoves.filter((m) => m.date === today);
      },

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
      addFreeze: (count = 1) =>
        set((state) => ({
          streaks: {
            ...state.streaks,
            freezes: state.streaks.freezes + count,
          },
        })),
      checkAndUpdateStreak: () => {
        const state = get();
        const today = getTodayString();
        const lastDate = state.streaks.lastDate
          ? state.streaks.lastDate.split('T')[0]
          : null;

        if (lastDate === today) {
          // Already updated streak today
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayString || lastDate === null) {
          // Continuing or starting streak
          set((state) => ({
            streaks: {
              ...state.streaks,
              count: state.streaks.count + 1,
              lastDate: new Date().toISOString(),
            },
          }));
        } else {
          // Streak broken, start fresh
          set((state) => ({
            streaks: {
              ...state.streaks,
              count: 1,
              lastDate: new Date().toISOString(),
            },
          }));
        }
      },

      // Vision Board actions
      updateVisionBoard: () => {
        const state = get();
        set({
          visionBoard: {
            ...state.visionBoard,
            filledCells: Math.min(
              state.visionBoard.totalCells,
              state.totalMovesCompleted
            ),
          },
        });
      },
      getVisionBoardPercentage: () => {
        const state = get();
        return Math.round(
          (state.visionBoard.filledCells / state.visionBoard.totalCells) * 100
        );
      },

      // Settings actions
      updateSettings: (settingsData) =>
        set((state) => ({
          settings: { ...state.settings, ...settingsData },
        })),

      // Reset for testing
      resetAll: () =>
        set({
          user: initialUser,
          dreams: [],
          activeDream: null,
          moves: [],
          dailyMoves: [],
          totalMovesCompleted: 0,
          streaks: initialStreaks,
          settings: initialSettings,
          visionBoard: initialVisionBoard,
          dailyMovesCompletedToday: 0,
          lastDailyMovesDate: null,
        }),
    }),
    {
      name: 'delusional-leap-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
