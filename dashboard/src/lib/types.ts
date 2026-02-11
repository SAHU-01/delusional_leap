export interface User {
  id: string
  email: string | null
  name: string | null
  dream_category: 'solo_trip' | 'salary' | 'side_hustle' | 'self_growth' | null
  blocker: string | null
  pace: 'delusional' | 'steady' | 'flow' | null
  created_at: string
  streak_count: number
  total_moves: number
  is_premium: boolean
}

export interface Move {
  id: string
  user_id: string
  move_type: 'quick' | 'power' | 'boss'
  title: string | null
  description: string | null
  proof_text: string | null
  proof_photo_url: string | null
  ai_verified: boolean
  ai_feedback: string | null
  points: number | null
  completed_at: string
}

export interface SponsoredChallenge {
  id: string
  title: string
  description: string | null
  sponsor_name: string | null
  sponsor_logo_url: string | null
  category: string | null
  move_type: 'quick' | 'power' | 'boss' | null
  points_bonus: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface DailyTask {
  id: string
  category: string
  move_type: 'quick' | 'power' | 'boss' | null
  title: string
  description: string | null
  tier: number
  is_active: boolean
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  user_id: string | null
  event_type: string | null
  event_data: Record<string, unknown> | null
  created_at: string
}

export const DREAM_CATEGORIES = [
  { value: 'solo_trip', label: 'Solo Trip', emoji: '✈️' },
  { value: 'salary', label: 'Salary Goal', emoji: '💰' },
  { value: 'side_hustle', label: 'Side Hustle', emoji: '🚀' },
  { value: 'self_growth', label: 'Self Growth', emoji: '🌱' },
]

export const MOVE_TYPES = [
  { value: 'quick', label: 'Quick Move', points: 10, color: '#4ADE80' },
  { value: 'power', label: 'Power Move', points: 25, color: '#FBBF24' },
  { value: 'boss', label: 'Boss Move', points: 50, color: '#FF3366' },
]

export const PACE_OPTIONS = [
  { value: 'delusional', label: 'Delusional', emoji: '🔥' },
  { value: 'steady', label: 'Steady', emoji: '🎯' },
  { value: 'flow', label: 'Flow', emoji: '🌊' },
]
