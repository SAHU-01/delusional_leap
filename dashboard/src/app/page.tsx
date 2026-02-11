'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Move, DREAM_CATEGORIES, MOVE_TYPES } from '@/lib/types'
import { Users, Zap, Target, Crown, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'

interface Stats {
  totalUsers: number
  activeToday: number
  totalMoves: number
  premiumUsers: number
}

interface MovesPerDay {
  date: string
  count: number
}

interface CategoryCount {
  name: string
  value: number
  color: string
}

const COLORS = ['#FF3366', '#FF6B35', '#FBBF24', '#4ADE80']

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    totalMoves: 0,
    premiumUsers: 0,
  })
  const [movesPerDay, setMovesPerDay] = useState<MovesPerDay[]>([])
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryCount[]>([])
  const [recentMoves, setRecentMoves] = useState<(Move & { user?: User })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch users
      const { data: users } = await supabase.from('users').select('*')

      // Fetch moves
      const { data: moves } = await supabase
        .from('moves')
        .select('*')
        .order('completed_at', { ascending: false })

      if (users && moves) {
        // Calculate stats
        const today = new Date().toISOString().split('T')[0]
        const todayMoves = moves.filter((m: Move) =>
          m.completed_at.split('T')[0] === today
        )
        const activeUserIds = new Set(todayMoves.map((m: Move) => m.user_id))

        setStats({
          totalUsers: users.length,
          activeToday: activeUserIds.size,
          totalMoves: moves.length,
          premiumUsers: users.filter((u: User) => u.is_premium).length,
        })

        // Calculate moves per day (last 30 days)
        const last30Days: MovesPerDay[] = []
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i)
          const dateStr = format(date, 'yyyy-MM-dd')
          const count = moves.filter((m: Move) =>
            m.completed_at.split('T')[0] === dateStr
          ).length
          last30Days.push({
            date: format(date, 'MMM d'),
            count,
          })
        }
        setMovesPerDay(last30Days)

        // Calculate category distribution
        const categoryCounts = DREAM_CATEGORIES.map((cat, idx) => ({
          name: cat.label,
          value: users.filter((u: User) => u.dream_category === cat.value).length,
          color: COLORS[idx],
        }))
        setCategoryDistribution(categoryCounts)

        // Recent moves with user info
        const recentWithUsers = moves.slice(0, 20).map((move: Move) => ({
          ...move,
          user: users.find((u: User) => u.id === move.user_id),
        }))
        setRecentMoves(recentWithUsers)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back, Gabby! Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF3366]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#FF3366]" />
            </div>
            <div>
              <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4ADE80]/10 rounded-lg">
              <Zap className="w-5 h-5 text-[#4ADE80]" />
            </div>
            <div>
              <div className="stat-value">{stats.activeToday.toLocaleString()}</div>
              <div className="stat-label">Active Today</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FBBF24]/10 rounded-lg">
              <Target className="w-5 h-5 text-[#FBBF24]" />
            </div>
            <div>
              <div className="stat-value">{stats.totalMoves.toLocaleString()}</div>
              <div className="stat-label">Moves Completed</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
              <Crown className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <div className="stat-value">{stats.premiumUsers.toLocaleString()}</div>
              <div className="stat-label">Premium Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Moves Over Time */}
        <div className="col-span-2 card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">Moves Completed (Last 30 Days)</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={movesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FF3366"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FF3366' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">Dream Categories</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-4">
              {categoryDistribution.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-gray-600">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Recent Activity</h2>
          <span className="text-sm text-gray-500">Last 20 moves</span>
        </div>
        <div className="card-body">
          {recentMoves.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-0">
              {recentMoves.map((move) => {
                const moveType = MOVE_TYPES.find(t => t.value === move.move_type)
                return (
                  <div key={move.id} className="activity-item">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: moveType?.color || '#gray' }}
                    >
                      {move.points || moveType?.points}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {move.user?.name || 'Unknown User'}
                        </span>
                        <span className="badge badge-gray">{moveType?.label}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{move.title}</p>
                      {move.proof_text && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          Proof: {move.proof_text}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(parseISO(move.completed_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
