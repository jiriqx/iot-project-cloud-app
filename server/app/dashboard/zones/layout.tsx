'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ZoneSidebar } from './_components/ZoneSidebar'

type Zone = { id: string; name: string }

export default function ZonesLayout({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([])
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/zone')
      .then(r => r.json())
      .then(data => setZones((data.zones ?? []).map((z: Zone) => ({ id: z.id, name: z.name }))))
      .catch(() => {})
  }, [pathname])

  return (
    <div className="flex flex-1 min-h-0">
      <ZoneSidebar zones={zones} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
