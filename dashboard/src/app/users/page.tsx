'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Move, DREAM_CATEGORIES, PACE_OPTIONS, MOVE_TYPES } from '@/lib/types'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type SortField = 'name' | 'streak_count' | 'total_moves' | 'created_at'
type SortDirection = 'asc' | 'desc'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userMoves, setUserMoves] = useState<Move[]>([])
  const [loadingMoves, setLoadingMoves] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchQuery, categoryFilter, sortField, sortDirection])

  async function fetchUsers() {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterAndSortUsers() {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((u) => u.dream_category === categoryFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number | Date = a[sortField] || ''
      let bVal: string | number | Date = b[sortField] || ''

      if (sortField === 'created_at') {
        aVal = new Date(aVal as string)
        bVal = new Date(bVal as string)
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredUsers(filtered)
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  async function selectUser(user: User) {
    setSelectedUser(user)
    setLoadingMoves(true)

    try {
      const { data } = await supabase
        .from('moves')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (data) {
        setUserMoves(data)
      }
    } catch (error) {
      console.error('Error fetching user moves:', error)
    } finally {
      setLoadingMoves(false)
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">{users.length} total users</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {DREAM_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.emoji} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="notion-table">
          <thead>
            <tr>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th>Email</th>
              <th>Dream</th>
              <th>Pace</th>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('streak_count')}
              >
                <div className="flex items-center gap-1">
                  Streak
                  <SortIcon field="streak_count" />
                </div>
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_moves')}
              >
                <div className="flex items-center gap-1">
                  Moves
                  <SortIcon field="total_moves" />
                </div>
              </th>
              <th>Premium</th>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Joined
                  <SortIcon field="created_at" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const dreamCat = DREAM_CATEGORIES.find(
                (c) => c.value === user.dream_category
              )
              const pace = PACE_OPTIONS.find((p) => p.value === user.pace)

              return (
                <tr
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => selectUser(user)}
                >
                  <td className="font-medium">{user.name || '—'}</td>
                  <td className="text-gray-600">{user.email || '—'}</td>
                  <td>
                    {dreamCat ? (
                      <span className="badge badge-hibiscus">
                        {dreamCat.emoji} {dreamCat.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {pace ? (
                      <span className="text-gray-600">
                        {pace.emoji} {pace.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className="font-medium text-[#FF6B35]">
                      {user.streak_count} days
                    </span>
                  </td>
                  <td>{user.total_moves}</td>
                  <td>
                    {user.is_premium ? (
                      <span className="badge badge-yellow">Premium</span>
                    ) : (
                      <span className="badge badge-gray">Free</span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    {format(parseISO(user.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="modal-content max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedUser.name || 'Unknown User'}
                </h2>
                <p className="text-gray-500">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* User Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-semibold text-[#FF3366]">
                    {selectedUser.streak_count}
                  </div>
                  <div className="text-sm text-gray-500">Day Streak</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-semibold text-[#FBBF24]">
                    {selectedUser.total_moves}
                  </div>
                  <div className="text-sm text-gray-500">Total Moves</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-semibold text-[#4ADE80]">
                    {selectedUser.is_premium ? 'Premium' : 'Free'}
                  </div>
                  <div className="text-sm text-gray-500">Plan</div>
                </div>
              </div>

              {/* User Moves */}
              <h3 className="font-medium text-gray-900 mb-4">Recent Moves</h3>
              {loadingMoves ? (
                <div className="text-center py-8 text-gray-500">
                  Loading moves...
                </div>
              ) : userMoves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No moves yet
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {userMoves.map((move) => {
                    const moveType = MOVE_TYPES.find(
                      (t) => t.value === move.move_type
                    )
                    return (
                      <div
                        key={move.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${moveType?.color}20`,
                              color: moveType?.color,
                            }}
                          >
                            {moveType?.label} • {move.points} pts
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(
                              parseISO(move.completed_at),
                              'MMM d, h:mm a'
                            )}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {move.title}
                        </p>
                        {move.proof_text && (
                          <p className="text-sm text-gray-600 mt-1">
                            {move.proof_text}
                          </p>
                        )}
                        {move.ai_verified && (
                          <div className="mt-2 text-xs text-green-600">
                            ✓ AI Verified
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
