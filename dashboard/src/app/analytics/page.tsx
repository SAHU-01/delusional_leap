'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Move, DREAM_CATEGORIES, MOVE_TYPES } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts'
import { subDays, format, parseISO, differenceInDays } from 'date-fns'

const COLORS = ['#FF3366', '#FF6B35', '#FBBF24', '#4ADE80', '#60A5FA']

interface RetentionData {
  day: string
  rate: number
}

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [usersRes, movesRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('moves').select('*'),
      ])

      if (usersRes.data) setUsers(usersRes.data)
      if (movesRes.data) setMoves(movesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Completion rate by move type
  const moveTypeCompletion = MOVE_TYPES.map(type => ({
    name: type.label,
    count: moves.filter(m => m.move_type === type.value).length,
    color: type.color,
  }))

  // Popular dream categories
  const categoryPopularity = DREAM_CATEGORIES.map((cat, idx) => ({
    name: cat.label,
    value: users.filter(u => u.dream_category === cat.value).length,
    color: COLORS[idx],
  }))

  // Streak distribution
  const streakBuckets = [
    { range: '0', min: 0, max: 0 },
    { range: '1-3', min: 1, max: 3 },
    { range: '4-7', min: 4, max: 7 },
    { range: '8-14', min: 8, max: 14 },
    { range: '15-30', min: 15, max: 30 },
    { range: '30+', min: 31, max: 999 },
  ]

  const streakDistribution = streakBuckets.map(bucket => ({
    range: bucket.range,
    count: users.filter(u => u.streak_count >= bucket.min && u.streak_count <= bucket.max).length,
  }))

  // Retention calculation
  function calculateRetention(): RetentionData[] {
    const now = new Date()
    const retentionDays = [1, 3, 7, 14, 30]

    return retentionDays.map(day => {
      // Users who joined at least 'day' days ago
      const eligibleUsers = users.filter(u => {
        const joinDate = parseISO(u.created_at)
        return differenceInDays(now, joinDate) >= day
      })

      // Of those, how many have moves on day N or later?
      const retainedUsers = eligibleUsers.filter(u => {
        const joinDate = parseISO(u.created_at)
        const targetDate = subDays(now, day)
        return moves.some(m =>
          m.user_id === u.id &&
          parseISO(m.completed_at) >= targetDate
        )
      })

      const rate = eligibleUsers.length > 0
        ? Math.round((retainedUsers.length / eligibleUsers.length) * 100)
        : 0

      return { day: `Day ${day}`, rate }
    })
  }

  const retentionData = calculateRetention()

  // Premium conversion rate
  const premiumRate = users.length > 0
    ? Math.round((users.filter(u => u.is_premium).length / users.length) * 100)
    : 0

  // Time of day activity (simplified - based on hour)
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const count = moves.filter(m => {
      const moveHour = new Date(m.completed_at).getHours()
      return moveHour === hour
    }).length
    return {
      hour: `${hour}:00`,
      count,
    }
  })

  // Average moves per day
  const uniqueDays = new Set(moves.map(m => m.completed_at.split('T')[0])).size
  const avgMovesPerDay = uniqueDays > 0 ? Math.round(moves.length / uniqueDays) : 0

  // DAU/MAU calculation
  const today = new Date()
  const last30DaysUsers = new Set(
    moves
      .filter(m => differenceInDays(today, parseISO(m.completed_at)) <= 30)
      .map(m => m.user_id)
  ).size

  const todayUsers = new Set(
    moves
      .filter(m => m.completed_at.split('T')[0] === format(today, 'yyyy-MM-dd'))
      .map(m => m.user_id)
  ).size

  const dauMauRatio = last30DaysUsers > 0
    ? Math.round((todayUsers / last30DaysUsers) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Deep dive into user engagement and behavior</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="stat-value text-[#FF3366]">{avgMovesPerDay}</div>
          <div className="stat-label">Avg Moves/Day</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-[#FF6B35]">{dauMauRatio}%</div>
          <div className="stat-label">DAU/MAU Ratio</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-[#FBBF24]">{premiumRate}%</div>
          <div className="stat-label">Premium Conversion</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-[#4ADE80]">
            {Math.round(users.reduce((acc, u) => acc + u.streak_count, 0) / (users.length || 1))}
          </div>
          <div className="stat-label">Avg Streak (days)</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Move Type Completion */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">Moves by Type</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moveTypeCompletion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {moveTypeCompletion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dream Category Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">Dream Categories</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPopularity}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryPopularity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Streak Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">Streak Distribution</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={streakDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Retention */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-medium text-gray-900">User Retention</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}%`, 'Retention']}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#FF3366"
                  fill="#FF3366"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time of Day Heatmap */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-medium text-gray-900">Activity by Hour</h2>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10 }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#FBBF24" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-medium text-gray-900">Detailed Metrics</h2>
        </div>
        <div className="card-body">
          <table className="notion-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Total Users</td>
                <td>{users.length}</td>
                <td className="text-gray-500">All registered users</td>
              </tr>
              <tr>
                <td className="font-medium">Total Moves</td>
                <td>{moves.length}</td>
                <td className="text-gray-500">All completed moves</td>
              </tr>
              <tr>
                <td className="font-medium">Premium Users</td>
                <td>{users.filter(u => u.is_premium).length}</td>
                <td className="text-gray-500">Users on premium plan</td>
              </tr>
              <tr>
                <td className="font-medium">Quick Moves</td>
                <td>{moves.filter(m => m.move_type === 'quick').length}</td>
                <td className="text-gray-500">10 points each</td>
              </tr>
              <tr>
                <td className="font-medium">Power Moves</td>
                <td>{moves.filter(m => m.move_type === 'power').length}</td>
                <td className="text-gray-500">25 points each</td>
              </tr>
              <tr>
                <td className="font-medium">Boss Moves</td>
                <td>{moves.filter(m => m.move_type === 'boss').length}</td>
                <td className="text-gray-500">50 points each</td>
              </tr>
              <tr>
                <td className="font-medium">AI Verified Moves</td>
                <td>{moves.filter(m => m.ai_verified).length}</td>
                <td className="text-gray-500">Moves verified by AI</td>
              </tr>
              <tr>
                <td className="font-medium">Highest Streak</td>
                <td>{Math.max(...users.map(u => u.streak_count), 0)} days</td>
                <td className="text-gray-500">Longest active streak</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
