'use client'

import { useState } from 'react'
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    data?: { users: number; moves: number; challenges: number; tasks: number }
    error?: string
  } | null>(null)

  async function handleSeed() {
    if (!confirm('This will delete all existing data and create new demo data. Continue?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/seed', { method: 'POST' })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Seed Database</h1>
        <p className="text-gray-500 mt-1">
          Populate the database with demo data for the hackathon demo
        </p>
      </div>

      <div className="card">
        <div className="p-8 text-center">
          <Database className="w-16 h-16 text-[#FF3366] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Generate Demo Data
          </h2>
          <p className="text-gray-600 mb-6">
            This will create:
          </p>
          <ul className="text-left max-w-xs mx-auto space-y-2 mb-6">
            <li className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 bg-[#FF3366] rounded-full"></span>
              50 demo users with varied profiles
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 bg-[#FF6B35] rounded-full"></span>
              500 moves across the last 30 days
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 bg-[#FBBF24] rounded-full"></span>
              5 sponsored challenges
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 bg-[#4ADE80] rounded-full"></span>
              20 daily tasks per category
            </li>
          </ul>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="btn btn-primary px-8 py-3 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Seed Database
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className={`card p-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <h3 className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'Database seeded successfully!' : 'Error seeding database'}
              </h3>
              {result.success && result.data && (
                <ul className="mt-2 text-sm text-green-700 space-y-1">
                  <li>Created {result.data.users} users</li>
                  <li>Created {result.data.moves} moves</li>
                  <li>Created {result.data.challenges} sponsored challenges</li>
                  <li>Created {result.data.tasks} daily tasks</li>
                </ul>
              )}
              {result.error && (
                <p className="mt-2 text-sm text-red-700">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 bg-amber-50 border-amber-200">
        <h3 className="font-medium text-amber-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Make sure you&apos;ve run the SQL schema in Supabase first</li>
          <li>• This will DELETE all existing data before creating new data</li>
          <li>• The data is randomized, so each seed will be different</li>
          <li>• After seeding, refresh the dashboard pages to see the data</li>
        </ul>
      </div>
    </div>
  )
}
