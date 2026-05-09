'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SwitchToAutoButton({ zoneId }: { zoneId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await fetch(`/api/zone/${zoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lightingMode: 'automatic' }),
})
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <span className="text-base leading-none">↺</span>
      {loading ? 'Přepínám…' : 'Přepnout na automatiku'}
    </button>
  )
}