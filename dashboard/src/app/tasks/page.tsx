'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyTask, DREAM_CATEGORIES, MOVE_TYPES } from '@/lib/types'
import { Plus, Trash2, GripVertical } from 'lucide-react'

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [moveTypeFilter, setMoveTypeFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState<Partial<DailyTask> | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const { data } = await supabase
        .from('daily_tasks')
        .select('*')
        .order('tier', { ascending: true })
        .order('created_at', { ascending: false })

      if (data) {
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateTask(id: string, updates: Partial<DailyTask>) {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Error updating task:', error.message, error.details, error.hint)
        alert(`Error updating task: ${error.message}`)
        return
      }

      setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t))
      setEditingId(null)
    } catch (error: any) {
      console.error('Error updating task:', error?.message || error)
      alert(`Error updating task: ${error?.message || 'Unknown error'}`)
    }
  }

  async function createTask() {
    if (!newTask?.title || !newTask?.category) return

    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .insert([{
          title: newTask.title,
          category: newTask.category,
          move_type: newTask.move_type || 'quick',
          description: newTask.description || '',
          tier: newTask.tier || 1,
          is_active: true,
        }])
        .select()
        .single()

      if (error) throw error

      if (data) {
        setTasks([data, ...tasks])
        setNewTask(null)
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTasks(tasks.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  async function toggleActive(task: DailyTask) {
    await updateTask(task.id, { is_active: !task.is_active })
  }

  const filteredTasks = tasks.filter(task => {
    if (categoryFilter && task.category !== categoryFilter) return false
    if (moveTypeFilter && task.move_type !== moveTypeFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Tasks</h1>
          <p className="text-gray-500 mt-1">
            {tasks.length} tasks • These feed into the mobile app
          </p>
        </div>
        <button
          onClick={() => setNewTask({ category: 'solo_trip', move_type: 'quick', tier: 1 })}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
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

        <select
          className="input w-40"
          value={moveTypeFilter}
          onChange={(e) => setMoveTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {MOVE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="notion-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Title</th>
              <th className="w-40">Category</th>
              <th className="w-32">Move Type</th>
              <th style={{ minWidth: '80px' }}>Tier</th>
              <th>Description</th>
              <th className="w-24">Active</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {/* New Task Row */}
            {newTask && (
              <tr className="bg-green-50">
                <td></td>
                <td>
                  <input
                    type="text"
                    className="input"
                    placeholder="Task title..."
                    autoFocus
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createTask()
                      if (e.key === 'Escape') setNewTask(null)
                    }}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    value={newTask.category || ''}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  >
                    {DREAM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="input"
                    value={newTask.move_type || 'quick'}
                    onChange={(e) => setNewTask({ ...newTask, move_type: e.target.value as DailyTask['move_type'] })}
                  >
                    {MOVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="5"
                    value={newTask.tier || 1}
                    onChange={(e) => setNewTask({ ...newTask, tier: parseInt(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input"
                    placeholder="Description..."
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </td>
                <td>
                  <button className="toggle active"></button>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={createTask}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setNewTask(null)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Tasks */}
            {filteredTasks.map((task) => {
              const isEditing = editingId === task.id
              const category = DREAM_CATEGORIES.find(c => c.value === task.category)
              const moveType = MOVE_TYPES.find(t => t.value === task.move_type)

              return (
                <tr key={task.id} className={!task.is_active ? 'opacity-50' : ''}>
                  <td>
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="input"
                        defaultValue={task.title}
                        autoFocus
                        onBlur={(e) => updateTask(task.id, { title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateTask(task.id, { title: (e.target as HTMLInputElement).value })
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -mx-2"
                        onClick={() => setEditingId(task.id)}
                      >
                        {task.title}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className="input"
                      value={task.category}
                      onChange={(e) => updateTask(task.id, { category: e.target.value })}
                    >
                      {DREAM_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input w-28"
                      value={task.move_type || 'quick'}
                      onChange={(e) => updateTask(task.id, { move_type: e.target.value as DailyTask['move_type'] })}
                      style={{
                        backgroundColor: `${moveType?.color}10`,
                        borderColor: moveType?.color,
                      }}
                    >
                      {MOVE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ minWidth: '60px' }}
                      value={task.tier}
                      onChange={(e) => updateTask(task.id, { tier: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-gray-600 text-sm">
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Add description..."
                      defaultValue={task.description || ''}
                      onBlur={(e) => {
                        if (e.target.value !== task.description) {
                          updateTask(task.id, { description: e.target.value })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateTask(task.id, { description: (e.target as HTMLInputElement).value })
                        }
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className={`toggle ${task.is_active ? 'active' : ''}`}
                      onClick={() => toggleActive(task)}
                    ></button>
                  </td>
                  <td>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredTasks.length === 0 && !newTask && (
          <div className="py-12 text-center text-gray-500">
            No tasks found. Click &quot;Add Task&quot; to create one.
          </div>
        )}
      </div>
    </div>
  )
}
