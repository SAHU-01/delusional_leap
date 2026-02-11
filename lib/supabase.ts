import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase client initialized

// Types matching Supabase schema
export interface SupabaseUser {
  id: string;
  email?: string;
  name?: string;
  dream_category: 'solo_trip' | 'salary' | 'side_hustle' | 'self_growth' | null;
  blocker?: string;
  pace: 'delusional' | 'steady' | 'flow' | null;
  created_at?: string;
  streak_count: number;
  total_moves: number;
  is_premium: boolean;
}

export interface SupabaseMove {
  id?: string;
  user_id: string;
  move_type: 'quick' | 'power' | 'boss';
  title: string;
  description?: string;
  proof_text?: string;
  proof_photo_url?: string;
  ai_verified: boolean;
  ai_feedback?: string;
  points: number;
  completed_at?: string;
}

export interface SupabaseDailyTask {
  id: string;
  category: string;
  move_type: 'quick' | 'power' | 'boss';
  title: string;
  description?: string;
  tier: number;
  is_active: boolean;
  created_at?: string;
}

export interface SupabaseSponsoredChallenge {
  id: string;
  title: string;
  description?: string;
  sponsor_name?: string;
  sponsor_logo_url?: string;
  category?: string;
  move_type: 'quick' | 'power' | 'boss';
  points_bonus: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at?: string;
}

// Map app dream categories to Supabase schema categories
const dreamCategoryMap: Record<string, string> = {
  travel: 'solo_trip',
  worth: 'salary',
  launch: 'side_hustle',
  growth: 'self_growth',
};

// Reverse map for fetching tasks
const reverseDreamCategoryMap: Record<string, string> = {
  solo_trip: 'travel',
  salary: 'worth',
  side_hustle: 'launch',
  self_growth: 'growth',
};

/**
 * Create a new user in Supabase after onboarding
 * Fire-and-forget: doesn't block UI
 */
export async function createSupabaseUser(
  dreamCategory: string | null,
  blocker: string | null,
  pace: string | null
): Promise<string | null> {
  try {
    const mappedCategory = dreamCategory ? dreamCategoryMap[dreamCategory] || dreamCategory : null;

    const { data, error } = await supabase
      .from('users')
      .insert({
        dream_category: mappedCategory,
        blocker,
        pace,
        streak_count: 0,
        total_moves: 0,
        is_premium: false,
      })
      .select('id')
      .single();

    if (error) {
      return null;
    }

    return data.id;
  } catch (err) {
    return null;
  }
}

/**
 * Record a completed move in Supabase
 * Fire-and-forget: doesn't block UI
 */
export async function recordMove(
  userId: string,
  moveType: 'quick' | 'power' | 'boss',
  title: string,
  description: string,
  proofText?: string,
  proofPhotoUrl?: string,
  aiVerified: boolean = false,
  aiFeedback?: string,
  points: number = 0
): Promise<void> {
  try {
    await supabase.from('moves').insert({
      user_id: userId,
      move_type: moveType,
      title,
      description,
      proof_text: proofText,
      proof_photo_url: proofPhotoUrl,
      ai_verified: aiVerified,
      ai_feedback: aiFeedback,
      points,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silently fail - move is recorded locally
  }
}

/**
 * Update user streak and total moves in Supabase
 * Fire-and-forget: doesn't block UI
 */
export async function updateUserStats(
  userId: string,
  streakCount: number,
  totalMoves: number
): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        streak_count: streakCount,
        total_moves: totalMoves,
      })
      .eq('id', userId);
  } catch (err) {
    // Silently fail - stats are tracked locally
  }
}

/**
 * Fetch daily tasks from Supabase based on category and tier
 * Returns null if fetch fails (caller should use local fallback)
 */
export async function fetchDailyTasks(
  dreamCategory: string,
  tier: number = 1
): Promise<SupabaseDailyTask[] | null> {
  try {
    const supabaseCategory = dreamCategoryMap[dreamCategory] || dreamCategory;

    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('category', supabaseCategory)
      .lte('tier', tier)
      .eq('is_active', true);

    if (error) {
      return null;
    }

    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch active sponsored challenges from Supabase
 * Returns empty array if fetch fails
 */
export async function fetchSponsoredChallenges(): Promise<SupabaseSponsoredChallenge[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sponsored_challenges')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today);

    if (error) {
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Upsert user profile data (for first-time onboarding tasks)
 * Uses user ID as key for concurrent-safe upserts
 */
export async function upsertUserProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    bucket_list_item?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) {
      console.error('[Supabase] Error upserting user profile:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception upserting user profile:', err);
    return false;
  }
}

/**
 * Delete a user from Supabase (for app reset)
 */
export async function deleteSupabaseUser(userId: string): Promise<boolean> {
  try {
    // First delete user's moves
    await supabase.from('moves').delete().eq('user_id', userId);

    // Then delete the user
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      console.error('[Supabase] Error deleting user:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception deleting user:', err);
    return false;
  }
}

/**
 * Subscribe to realtime changes for daily_tasks table
 */
export function subscribeToDailyTasks(
  callback: (payload: { eventType: string; new: SupabaseDailyTask | null; old: SupabaseDailyTask | null }) => void
) {
  return supabase
    .channel('daily_tasks_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_tasks' },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as SupabaseDailyTask | null,
          old: payload.old as SupabaseDailyTask | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to realtime changes for sponsored_challenges table
 */
export function subscribeToSponsoredChallenges(
  callback: (payload: { eventType: string; new: SupabaseSponsoredChallenge | null; old: SupabaseSponsoredChallenge | null }) => void
) {
  return supabase
    .channel('sponsored_challenges_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sponsored_challenges' },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as SupabaseSponsoredChallenge | null,
          old: payload.old as SupabaseSponsoredChallenge | null,
        });
      }
    )
    .subscribe();
}

/**
 * Unsubscribe from a realtime channel
 */
export function unsubscribeFromChannel(channel: ReturnType<typeof supabase.channel>) {
  return supabase.removeChannel(channel);
}

// Export for testing connection
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Connection test exception:', err);
    return false;
  }
}
