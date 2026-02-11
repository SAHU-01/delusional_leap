'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  Target,
  Trophy,
  BarChart3,
  FileText,
  Flower2,
  Database
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/tasks', label: 'Daily Tasks', icon: Target },
  { href: '/challenges', label: 'Sponsored Challenges', icon: Trophy },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Brand Reports', icon: FileText },
  { href: '/seed', label: 'Seed Database', icon: Database },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <Flower2 className="w-8 h-8 text-hibiscus" />
          <div>
            <h1 className="font-semibold text-gray-900 text-lg leading-tight">Delusional Leap</h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-hibiscus/10 text-hibiscus'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="px-3 py-2 text-xs text-gray-400">
          <p>Gabby&apos;s Command Center</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
