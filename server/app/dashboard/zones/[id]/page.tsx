'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { LightGrid } from './_components/LightGrid'
import { EventLog, type ZoneEvent } from './_components/EventLog'
import { AddNodeButton } from './_components/AddNodeButton'
import { ZoneEditForm } from '../_components/ZoneEditForm'
import { SkeletonLine, SkeletonCard } from '@/app/_components/Skeleton'

const modeLabel: Record<string, string> = {
  automatic: 'automatický režim',
  manual: 'manuální režim',
  off: 'vypnuto',
}

const modeBadge: Record<string, string> = {
  automatic: 'bg-blue-100 text-blue-700',
  manual: 'bg-yellow-100 text-yellow-700',
  off: 'bg-gray-100 text-gray-600',
}

const sensitivityLabel: Record<string, string> = {
  LOW: 'Nízká',
  MEDIUM: 'Střední',
  HIGH: 'Vysoká',
}

type Zone = {
  id: string
  name: string
  timeoutSeconds: number
  sensorSensitivity: string
  lightingMode: string
  nightModeStart: string | null
  nightModeEnd: string | null
  nodes: Array<{
    id: string
    externalId: string | null
    mac: string | null
    isOnline: boolean
    lastStateChange: { state: boolean; timestamp: string; trigger: string } | null
    events: Array<{
      id: string
      eventType: string
      trigger: string
      timestamp: string
    }>
  }>
}

function ZoneDetailSkeleton() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div className="space-y-2 flex-1 mr-4">
          <SkeletonLine className="w-48" />
          <SkeletonLine className="w-32 h-3" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine className="w-24 h-8 rounded-md" />
          <SkeletonLine className="w-32 h-8 rounded-md" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 mt-3">
        <SkeletonLine className="w-20 h-3" />
        <SkeletonLine className="w-24 h-3" />
      </div>

      <SkeletonCard className="mb-6">
        <SkeletonLine className="w-24 h-3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
              <SkeletonLine className="w-16 h-3" />
              <SkeletonLine className="w-10 h-6" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine className="w-32 h-3 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonLine className="w-24 h-3" />
              <SkeletonLine className="flex-1 h-3" />
              <SkeletonLine className="w-12 h-3" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  )
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notfound' }
  | { status: 'done'; zone: Zone }

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isInvalidId = !id || !/^[a-f\d]{24}$/i.test(id)
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [fetchKey, setFetchKey] = useState(0)
  const [editing, setEditing] = useState(false)

  const fetchZone = useCallback(() => {
    if (isInvalidId) return
    fetch(`/api/zone/${id}`)
      .then(r => {
        if (r.status === 404) { setState({ status: 'notfound' }); return null }
        return r.json()
      })
      .then(data => { if (data) setState({ status: 'done', zone: data }) })
      .catch(() => setState({ status: 'error', message: 'Nepodařilo se načíst zónu. Zkontrolujte připojení.' }))
  }, [id, isInvalidId])

  useEffect(() => {
    fetchZone()
    const interval = setInterval(() => {
      if (!document.hidden) fetchZone()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchZone, fetchKey])

  if (isInvalidId || state.status === 'notfound') notFound()

  if (state.status === 'error') {
    return (
      <div className="p-6 max-w-4xl">
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

  if (state.status === 'loading') return <ZoneDetailSkeleton />

  const { zone } = state

  const nodesForGrid = zone.nodes.map((n) => {
    const externalId = n.externalId ?? ''
    const label = n.mac ?? 'No MAC'
    const status: 'on' | 'off' | 'offline' = !n.isOnline
      ? 'offline'
      : n.lastStateChange
        ? (n.lastStateChange.state ? 'on' : 'off')
        : 'off'
    return { id: n.id, externalId, label, status }
  })

  const events: ZoneEvent[] = zone.nodes
    .flatMap((n) => {
      const externalId = n.externalId ?? ''
      const deviceId = externalId.split('/')[1] ?? externalId
      const nodeLabel = `Node ${deviceId}`
      return n.events.map((e) => ({
        id: e.id,
        nodeLabel,
        eventType: e.eventType as 'on' | 'off',
        trigger: e.trigger as 'auto' | 'manual',
        timestamp: e.timestamp,
      }))
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{zone.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{zone.nodes.length} {zone.nodes.length === 1 ? 'node' : zone.nodes.length >= 2 && zone.nodes.length <= 4 ? 'nody' : 'nodů'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeBadge[zone.lightingMode] ?? 'bg-gray-100 text-gray-600'}`}>
              {modeLabel[zone.lightingMode] ?? zone.lightingMode}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AddNodeButton zoneId={zone.id} onAdded={fetchZone} />
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            Upravit
          </button>
        </div>
      </div>

      {editing && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
          <ZoneEditForm
            zone={zone}
            onSaved={() => { setEditing(false); fetchZone() }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 text-xs text-gray-400">
        <span>Timeout: {zone.timeoutSeconds} s</span>
        <span>·</span>
        <span>Citlivost: {sensitivityLabel[zone.sensorSensitivity] ?? zone.sensorSensitivity}</span>
        {zone.nightModeStart && zone.nightModeEnd && (
          <>
            <span>·</span>
            <span>Noční režim: {zone.nightModeStart} – {zone.nightModeEnd}</span>
          </>
        )}
      </div>

      <LightGrid nodes={nodesForGrid} onRefresh={fetchZone} />

      {events.length > 0 && <EventLog events={events} />}
    </div>
  )
}
