'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Zone = { id: string; name: string }

export function ZoneSidebar({ zones }: { zones: Zone[] }) {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Zóny
        </p>
        <ul className="space-y-0.5">
          {zones.map((zone) => {
            const isActive = pathname === `/dashboard/zones/${zone.id}`
            return (
              <li key={zone.id}>
                <Link
                  href={`/dashboard/zones/${zone.id}`}
                  className={`block px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {zone.name}
                </Link>
              </li>
            )
          })}
        </ul>
        <Link
          href="/dashboard/zones/create"
          className={`mt-3 flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors ${
            pathname === '/dashboard/zones/create'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-base leading-none">+</span> Nová zóna
        </Link>
      </div>
    </aside>
  )
}
