'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { label: 'Přehled', href: '/dashboard' },
  { label: 'Správa zón', href: '/dashboard/zones' },
  { label: 'Statistiky', href: '/dashboard/statistics' },
  { label: 'Konfigurace', href: '/dashboard/configuration' },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center px-6 gap-8">
        <span className="font-bold text-gray-900 text-sm tracking-wide">
          BIOT DL
        </span>

        <nav className="flex h-full items-center gap-1">
          {navItems.map(({ label, href }) => {
            const isActive =
              href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-full items-center px-3 border-b-2 text-sm transition-colors ${
                  isActive
                    ? 'border-blue-600 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Odhlásit se
          </button>
        </div>
      </div>
    </header>
  )
}
