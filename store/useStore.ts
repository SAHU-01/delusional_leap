import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSupabaseUser,
  recordMove,
  updateUserStats,
  fetchDailyTasks,
  fetchSponsoredChallenges,
  upsertUserProfile,
  SupabaseDailyTask,
  SupabaseSponsoredChallenge,
} from '@/lib/supabase';

export interface OnboardingData {
  dream: string | null;
  blocker: string | null;
  pace: string | null;
}

export interface User {
  name: string;
  email: string;
  bucketListItem: string;
  quizResult: string | null;
  pace: string | null;
  onboardingComplete: boolean;
  firstTimeComplete: boolean;
  onboardingData: OnboardingData;
  supabaseUserId: string | null;
}

export interface SponsoredChallenge {
  id: string;
  title: string;
  description?: string;
  sponsorName?: string;
  sponsorLogoUrl?: string;
  category?: string;
  moveType: 'quick' | 'power' | 'boss';
  pointsBonus: number;
  startDate?: string;
  endDate?: string;
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

export interface MoveProof {
  id: string;
  moveId: string;
  moveTitle: string;
  moveType: 'quick' | 'power' | 'boss';
  proofType: 'text' | 'photo' | 'ai_verified';
  proofText?: string;
  proofPhoto?: string; // base64 thumbnail
  aiVerified?: boolean;
  aiMessage?: string;
  verifiedOffline?: boolean;
  completedAt: string;
  date: string;
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
  proofHistory: MoveProof[];
  sponsoredChallenges: SponsoredChallenge[];

  // User actions
  setUser: (user: Partial<User>) => void;
  resetUser: () => void;
  setSupabaseUserId: (id: string) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  setUserBucketListItem: (item: string) => void;
  completeFirstTime: () => void;

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
  loadDailyTasksFromSupabase: () => Promise<void>;
  completeDailyMove: (id: string, proof?: MoveProof) => void;
  getDailyMoves: () => DailyMove[];
  loadSponsoredChallenges: () => Promise<void>;

  // Move actions
  addMove: (move: Move) => void;
  updateMove: (id: string, move: Partial<Move>) => void;
  deleteMove: (id: string) => void;

  // Proof actions
  addProof: (proof: MoveProof) => void;
  getProofHistory: () => MoveProof[];

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
  email: '',
  bucketListItem: '',
  quizResult: null,
  pace: null,
  onboardingComplete: false,
  firstTimeComplete: false,
  onboardingData: initialOnboardingData,
  supabaseUserId: null,
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
      proofHistory: [],
      sponsoredChallenges: [],

      // User actions
      setUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),
      resetUser: () => set({ user: initialUser }),
      setSupabaseUserId: (id) =>
        set((state) => ({
          user: { ...state.user, supabaseUserId: id },
        })),
      setUserName: (name) => {
        set((state) => ({
          user: { ...state.user, name },
        }));
        // Fire-and-forget: Update Supabase
        const userId = get().user.supabaseUserId;
        if (userId) {
          upsertUserProfile(userId, { name });
        }
      },
      setUserEmail: (email) => {
        set((state) => ({
          user: { ...state.user, email },
        }));
        // Fire-and-forget: Update Supabase
        const userId = get().user.supabaseUserId;
        if (userId) {
          upsertUserProfile(userId, { email });
        }
      },
      setUserBucketListItem: (item) => {
        set((state) => ({
          user: { ...state.user, bucketListItem: item },
        }));
        // Fire-and-forget: Update Supabase
        const userId = get().user.supabaseUserId;
        if (userId) {
          upsertUserProfile(userId, { bucket_list_item: item });
        }
      },
      completeFirstTime: () => {
        set((state) => ({
          user: { ...state.user, firstTimeComplete: true },
        }));
      },

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
      completeOnboarding: () => {
        const state = get();
        const { dream, blocker, pace } = state.user.onboardingData;

        // Set onboarding complete locally first
        set((state) => ({
          user: { ...state.user, onboardingComplete: true },
        }));

        // Fire-and-forget: Create user in Supabase
        createSupabaseUser(dream, blocker, pace).then((userId) => {
          if (userId) {
            set((state) => ({
              user: { ...state.user, supabaseUserId: userId },
            }));
          }
        });
      },

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

        // Generate new moves for today using local fallback
        const newMoves = generateMovesForCategory(category, today);
        set({
          dailyMoves: newMoves,
          lastDailyMovesDate: today,
          dailyMovesCompletedToday: 0,
        });
      },

      // Load daily tasks from Supabase, falling back to local if fails
      loadDailyTasksFromSupabase: async () => {
        const state = get();
        const today = getTodayString();
        const category = state.user.onboardingData.dream || 'growth';

        // Check if we already have moves for today
        const todayMoves = state.dailyMoves.filter((m) => m.date === today);
        if (todayMoves.length > 0) {
          return; // Already have moves for today
        }

        // Calculate tier based on total moves
        const tier = Math.floor(state.totalMovesCompleted / 10) + 1;

        try {
          const supabaseTasks = await fetchDailyTasks(category, tier);

          if (supabaseTasks && supabaseTasks.length >= 3) {
            // Pick one of each type from Supabase tasks
            const quickTasks = supabaseTasks.filter((t) => t.move_type === 'quick');
            const powerTasks = supabaseTasks.filter((t) => t.move_type === 'power');
            const bossTasks = supabaseTasks.filter((t) => t.move_type === 'boss');

            // Randomly select one from each type (or use first if only one)
            const getRandomTask = (tasks: SupabaseDailyTask[]) => {
              if (tasks.length === 0) return null;
              return tasks[Math.floor(Math.random() * tasks.length)];
            };

            const quickTask = getRandomTask(quickTasks);
            const powerTask = getRandomTask(powerTasks);
            const bossTask = getRandomTask(bossTasks);

            // Only use Supabase tasks if we have at least one of each type
            if (quickTask && powerTask && bossTask) {
              const newMoves: DailyMove[] = [
                {
                  id: `quick-${today}-${Date.now()}`,
                  type: 'quick',
                  title: quickTask.title,
                  description: quickTask.description || '',
                  points: 1,
                  timeEstimate: '2-5 min',
                  completed: false,
                  date: today,
                },
                {
                  id: `power-${today}-${Date.now() + 1}`,
                  type: 'power',
                  title: powerTask.title,
                  description: powerTask.description || '',
                  points: 3,
                  timeEstimate: '15-30 min',
                  completed: false,
                  date: today,
                },
                {
                  id: `boss-${today}-${Date.now() + 2}`,
                  type: 'boss',
                  title: bossTask.title,
                  description: bossTask.description || '',
                  points: 10,
                  timeEstimate: 'The scary one',
                  completed: false,
                  date: today,
                },
              ];

              set({
                dailyMoves: newMoves,
                lastDailyMovesDate: today,
                dailyMovesCompletedToday: 0,
              });
              return;
            }
          }

          // Fall back to local if Supabase doesn't have enough tasks
          get().generateDailyMoves();
        } catch (err) {
          get().generateDailyMoves();
        }
      },

      // Load sponsored challenges from Supabase
      loadSponsoredChallenges: async () => {
        try {
          const challenges = await fetchSponsoredChallenges();
          const mapped: SponsoredChallenge[] = challenges.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            sponsorName: c.sponsor_name,
            sponsorLogoUrl: c.sponsor_logo_url,
            category: c.category,
            moveType: c.move_type,
            pointsBonus: c.points_bonus,
            startDate: c.start_date,
            endDate: c.end_date,
          }));
          set({ sponsoredChallenges: mapped });
        } catch (err) {
          // Silently fail - sponsored challenges are optional
        }
      },

      completeDailyMove: (id, proof) => {
        const state = get();
        const today = getTodayString();
        const move = state.dailyMoves.find((m) => m.id === id);

        set((currentState) => {
          const updatedMoves = currentState.dailyMoves.map((m) =>
            m.id === id
              ? { ...m, completed: true, completedAt: new Date().toISOString() }
              : m
          );

          const completedCount = updatedMoves.filter(
            (m) => m.date === today && m.completed
          ).length;

          const points = move?.points || 0;

          return {
            dailyMoves: updatedMoves,
            dailyMovesCompletedToday: completedCount,
            totalMovesCompleted: currentState.totalMovesCompleted + 1,
            visionBoard: {
              ...currentState.visionBoard,
              filledCells: Math.min(
                currentState.visionBoard.totalCells,
                currentState.visionBoard.filledCells + 1
              ),
            },
          };
        });

        // Check and update streak
        get().checkAndUpdateStreak();

        // Fire-and-forget: Record move to Supabase
        const userId = get().user.supabaseUserId;
        if (userId && move) {
          recordMove(
            userId,
            move.type,
            move.title,
            move.description,
            proof?.proofText,
            proof?.proofPhoto,
            proof?.aiVerified || false,
            proof?.aiMessage,
            move.points
          );
        }
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

      // Proof actions
      addProof: (proof) =>
        set((state) => ({
          proofHistory: [proof, ...state.proofHistory],
        })),
      getProofHistory: () => {
        const state = get();
        return state.proofHistory;
      },

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

        let newStreakCount: number;

        if (lastDate === yesterdayString || lastDate === null) {
          // Continuing or starting streak
          newStreakCount = state.streaks.count + 1;
          set((currentState) => ({
            streaks: {
              ...currentState.streaks,
              count: newStreakCount,
              lastDate: new Date().toISOString(),
            },
          }));
        } else {
          // Streak broken, start fresh
          newStreakCount = 1;
          set((currentState) => ({
            streaks: {
              ...currentState.streaks,
              count: newStreakCount,
              lastDate: new Date().toISOString(),
            },
          }));
        }

        // Fire-and-forget: Update stats in Supabase
        const userId = get().user.supabaseUserId;
        const totalMoves = get().totalMovesCompleted;
        if (userId) {
          updateUserStats(userId, newStreakCount, totalMoves);
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
          proofHistory: [],
          sponsoredChallenges: [],
        }),
    }),
    {
      name: 'delusional-leap-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
