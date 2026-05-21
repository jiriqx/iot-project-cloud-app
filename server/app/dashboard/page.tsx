'use client'

import { useCallback, useEffect, useState } from 'react'
import { ZoneSidebar } from './zones/_components/ZoneSidebar'
import { NodeCard } from './_components/NodeCard'

type ApiZone = {
  id: string
  name: string
  timeoutSeconds: number
  lightingMode: string
  nodes: Array<{
    id: string
    mac: string | null
    externalId: string | null
    status: string
    events: Array<{ timestamp: string; trigger: string }>
    lastStateChange: { state: boolean; timestamp: string; trigger: string } | null
    lastPing: string | null
  }>
}

export default function DashboardPage() {
  const [zones, setZones] = useState<ApiZone[]>([])

  const fetchZones = useCallback(() => {
    fetch('/api/zone')
      .then(r => r.json())
      .then(data => setZones(data.zones ?? []))
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const now = Date.now()

  const displayNodes = zones.flatMap((zone) =>
    zone.nodes.map((node, i) => {
      const latestEvent = node.events[0] ?? null
      const lastStateChange = node.lastStateChange

      const ONE_MINUTE_MS = 5 * 60 * 1000
      const pingRecent = node.lastPing
        ? now - new Date(node.lastPing).getTime() < ONE_MINUTE_MS
        : false
      const effectiveStatus = pingRecent ? 'active' : 'inactive'

      const lightStatus: 'on' | 'off' | 'unknown' =
        !lastStateChange
          ? 'unknown'
          : lastStateChange.state ? 'on' : 'off'

      let remainingSeconds: number | null = null
      const latestTimestamp = lastStateChange?.timestamp ?? latestEvent?.timestamp
      if (latestTimestamp && effectiveStatus === 'active') {
        const elapsed = (now - new Date(latestTimestamp).getTime()) / 1000
        remainingSeconds = Math.max(0, Math.round(zone.timeoutSeconds - elapsed))
      }

      return {
        id: node.id,
        mac: node.mac ?? null,
        externalId: node.externalId ?? null,
        name: `Node ${i + 1} — ${zone.name}`,
        status: effectiveStatus,
        lightStatus,
        lightingMode: zone.lightingMode,
        lastEventAt: lastStateChange?.timestamp ?? latestEvent?.timestamp ?? null,
        lastTrigger: (lastStateChange?.trigger as 'auto' | 'manual' | null) ?? (latestEvent?.trigger as 'auto' | 'manual' | null) ?? null,
        timeoutSeconds: zone.timeoutSeconds,
        remainingSeconds,
      }
    })
  )

  return (
    <div className="flex flex-1 min-h-0">
      <ZoneSidebar zones={zones.map((z) => ({ id: z.id, name: z.name }))} />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-start gap-3 rounded-md bg-orange-50 border border-orange-200 px-4 py-3 mb-6 text-sm text-gray-700">
          <span className="text-orange-500 shrink-0 mt-0.5">⚡</span>
          <p>
            Tento scénář probíhá plně automaticky na úrovni nodů — bez zásahu
            uživatele. PIR senzor detekuje pohyb → Node zapne světlo → po
            vypršení timeoutu bez pohybu světlo zhasne. Tato obrazovka slouží
            pouze ke sledování live stavu nodů a jejich zón.
          </p>
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Live stav nodů
        </h2>

        {displayNodes.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Žádné nody nejsou registrovány.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayNodes.map((node) => (
              <NodeCard key={node.id} {...node} onRefresh={fetchZones} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
