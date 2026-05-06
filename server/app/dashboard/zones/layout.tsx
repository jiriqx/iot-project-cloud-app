'use client'

import { useEffect, useState } from 'react'
import { ZoneSidebar } from './_components/ZoneSidebar'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type Zone = { id: string; name: string }

export default function ZonesLayout({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([])

  useEffect(() => {
    fetchWithAuth('/api/zone')
      .then(r => r.json())
      .then(data => setZones((data.zones ?? []).map((z: Zone) => ({ id: z.id, name: z.name }))))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-1 min-h-0">
      <ZoneSidebar zones={zones} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
