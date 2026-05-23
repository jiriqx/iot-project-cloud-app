'use client'

import { useCallback, useEffect, useState } from 'react'
import { ZoneSidebar } from './zones/_components/ZoneSidebar'
import { NodeCard } from './_components/NodeCard'
import { SkeletonLine } from '@/app/_components/Skeleton'

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
    isOnline: boolean
  }>
}

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; zones: ApiZone[]; fetchedAt: number }

function NodeCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1.5 flex-1 pr-2">
          <SkeletonLine className="w-36" />
          <SkeletonLine className="w-24 h-3" />
        </div>
        <SkeletonLine className="w-14 h-5 rounded-full shrink-0" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <SkeletonLine className="w-20 h-3" />
            <SkeletonLine className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
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
      <SkeletonLine className="w-52 h-5 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <NodeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    fetch('/api/zone')
      .then(r => r.json())
      .then(data => setState({ status: 'done', zones: data.zones ?? [], fetchedAt: Date.now() }))
      .catch(() => setState({ status: 'error', message: 'Nepodařilo se načíst nody. Zkontrolujte připojení.' }))
  }, [fetchKey])

  const refreshZones = useCallback(() => {
    fetch('/api/zone')
      .then(r => r.json())
      .then(data => setState(prev =>
        prev.status === 'done' ? { status: 'done', zones: data.zones ?? [], fetchedAt: Date.now() } : prev
      ))
      .catch(() => { })
  }, [])

  if (state.status === 'error') {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{state.message}</span>
          <button
            onClick={() => { setState({ status: 'loading' }); setFetchKey(k => k + 1) }}
            className="ml-4 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'loading') return <DashboardSkeleton />

  const { zones, fetchedAt: now } = state

  const displayNodes = zones.flatMap((zone) =>
    zone.nodes.map((node, i) => {
      const latestEvent = node.events[0] ?? null
      const lastStateChange = node.lastStateChange

      const effectiveStatus = node.isOnline ? 'active' : 'inactive'

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
              <NodeCard key={node.id} {...node} onRefresh={refreshZones} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
