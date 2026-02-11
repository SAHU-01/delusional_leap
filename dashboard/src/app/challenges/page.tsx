'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SponsoredChallenge, Move, DREAM_CATEGORIES, MOVE_TYPES } from '@/lib/types'
import { Plus, X, Calendar, Users, Trophy } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<SponsoredChallenge[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<SponsoredChallenge | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sponsor_name: '',
    sponsor_logo_url: '',
    category: 'solo_trip',
    move_type: 'quick' as 'quick' | 'power' | 'boss',
    points_bonus: 10,
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [challengesRes, movesRes] = await Promise.all([
        supabase.from('sponsored_challenges').select('*').order('created_at', { ascending: false }),
        supabase.from('moves').select('*'),
      ])

      if (challengesRes.data) setChallenges(challengesRes.data)
      if (movesRes.data) setMoves(movesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingChallenge(null)
    setFormData({
      title: '',
      description: '',
      sponsor_name: '',
      sponsor_logo_url: '',
      category: 'solo_trip',
      move_type: 'quick',
      points_bonus: 10,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    })
    setShowModal(true)
  }

  function openEditModal(challenge: SponsoredChallenge) {
    setEditingChallenge(challenge)
    setFormData({
      title: challenge.title,
      description: challenge.description || '',
      sponsor_name: challenge.sponsor_name || '',
      sponsor_logo_url: challenge.sponsor_logo_url || '',
      category: challenge.category || 'solo_trip',
      move_type: (challenge.move_type || 'quick') as 'quick' | 'power' | 'boss',
      points_bonus: challenge.points_bonus,
      start_date: challenge.start_date || '',
      end_date: challenge.end_date || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingChallenge) {
        const { error } = await supabase
          .from('sponsored_challenges')
          .update(formData)
          .eq('id', editingChallenge.id)

        if (error) throw error

        setChallenges(challenges.map(c =>
          c.id === editingChallenge.id ? { ...c, ...formData } : c
        ))
      } else {
        const { data, error } = await supabase
          .from('sponsored_challenges')
          .insert([{ ...formData, is_active: true }])
          .select()
          .single()

        if (error) throw error
        if (data) setChallenges([data, ...challenges])
      }

      setShowModal(false)
    } catch (error) {
      console.error('Error saving challenge:', error)
    }
  }

  async function toggleActive(challenge: SponsoredChallenge) {
    try {
      const { error } = await supabase
        .from('sponsored_challenges')
        .update({ is_active: !challenge.is_active })
        .eq('id', challenge.id)

      if (error) throw error

      setChallenges(challenges.map(c =>
        c.id === challenge.id ? { ...c, is_active: !c.is_active } : c
      ))
    } catch (error) {
      console.error('Error toggling challenge:', error)
    }
  }

  function getChallengeStats(challengeId: string) {
    // For demo purposes, we'll calculate based on move descriptions
    // In production, you'd have a challenge_id on moves or a separate participation table
    const participants = new Set(
      moves.filter(m => m.description?.includes(challengeId.slice(0, 8))).map(m => m.user_id)
    ).size
    const completions = moves.filter(m => m.description?.includes(challengeId.slice(0, 8))).length

    return { participants, completions }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading challenges...</div>
      </div>
    )
  }

  const activeChallenges = challenges.filter(c => c.is_active)
  const inactiveChallenges = challenges.filter(c => !c.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sponsored Challenges</h1>
          <p className="text-gray-500 mt-1">
            {activeChallenges.length} active • {inactiveChallenges.length} inactive
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Challenges</h2>
          <div className="grid grid-cols-2 gap-6">
            {activeChallenges.map((challenge) => {
              const moveType = MOVE_TYPES.find(t => t.value === challenge.move_type)
              const category = DREAM_CATEGORIES.find(c => c.value === challenge.category)
              const stats = getChallengeStats(challenge.id)

              return (
                <div key={challenge.id} className="card">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {challenge.sponsor_logo_url ? (
                          <img
                            src={challenge.sponsor_logo_url}
                            alt={challenge.sponsor_name || ''}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF3366] to-[#FF6B35] flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
                          {challenge.sponsor_name && (
                            <p className="text-sm text-gray-500">by {challenge.sponsor_name}</p>
                          )}
                        </div>
                      </div>
                      <button
                        className={`toggle ${challenge.is_active ? 'active' : ''}`}
                        onClick={() => toggleActive(challenge)}
                      ></button>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">
                      {challenge.description || 'No description'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {category && (
                        <span className="badge badge-hibiscus">
                          {category.emoji} {category.label}
                        </span>
                      )}
                      {moveType && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${moveType.color}20`,
                            color: moveType.color,
                          }}
                        >
                          {moveType.label}
                        </span>
                      )}
                      <span className="badge badge-yellow">
                        +{challenge.points_bonus} bonus pts
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {challenge.start_date && challenge.end_date ? (
                          <span>
                            {format(parseISO(challenge.start_date), 'MMM d')} -{' '}
                            {format(parseISO(challenge.end_date), 'MMM d')}
                          </span>
                        ) : (
                          <span>No dates set</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-2xl font-semibold text-[#FF3366]">
                          {stats.participants}
                        </div>
                        <div className="text-sm text-gray-500">Participants</div>
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-[#4ADE80]">
                          {stats.completions}
                        </div>
                        <div className="text-sm text-gray-500">Completions</div>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(challenge)}
                      className="mt-4 w-full btn btn-outline"
                    >
                      Edit Challenge
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inactive Challenges */}
      {inactiveChallenges.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-500 mb-4">Inactive Challenges</h2>
          <div className="grid grid-cols-3 gap-4">
            {inactiveChallenges.map((challenge) => (
              <div key={challenge.id} className="card opacity-60 hover:opacity-100 transition-opacity">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{challenge.title}</h3>
                    <button
                      className={`toggle ${challenge.is_active ? 'active' : ''}`}
                      onClick={() => toggleActive(challenge)}
                    ></button>
                  </div>
                  {challenge.sponsor_name && (
                    <p className="text-sm text-gray-500 mt-1">by {challenge.sponsor_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="card">
          <div className="p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No challenges yet</h3>
            <p className="text-gray-500 mt-1">
              Create your first sponsored challenge to engage users
            </p>
            <button onClick={openCreateModal} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" />
              Create Challenge
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sponsor Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.sponsor_name}
                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sponsor Logo URL
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://..."
                    value={formData.sponsor_logo_url}
                    onChange={(e) => setFormData({ ...formData, sponsor_logo_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {DREAM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Move Type
                  </label>
                  <select
                    className="input"
                    value={formData.move_type}
                    onChange={(e) => setFormData({ ...formData, move_type: e.target.value as 'quick' | 'power' | 'boss' })}
                  >
                    {MOVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Points
                </label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.points_bonus}
                  onChange={(e) => setFormData({ ...formData, points_bonus: parseInt(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingChallenge ? 'Save Changes' : 'Create Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
