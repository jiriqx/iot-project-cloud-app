'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { LightGrid } from './_components/LightGrid'
import { EventLog, type ZoneEvent } from './_components/EventLog'
import { SwitchToAutoButton } from './_components/SwitchToAutoButton'

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

function nodeMetaLabel(count: number) {
  if (count === 0) return null
  if (count <= 2) return Array.from({ length: count }, (_, i) => `Node ${i + 1}`).join(', ')
  return `${count} nody`
}

type Light = {
  id: string
  label: string | null
  status: string
  nodeId: string
  events: Array<{
    id: string
    eventType: string
    trigger: string
    timestamp: string
    durationSeconds: number | null
  }>
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
    lights: Light[]
  }>
}

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [zone, setZone] = useState<Zone | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)

  useEffect(() => {
    if (!id?.match(/^[a-f\d]{24}$/i)) {
      setIsNotFound(true)
      return
    }
    fetchWithAuth(`/api/zone/${id}`)
      .then(r => {
        if (r.status === 404) { setIsNotFound(true); return null }
        return r.json()
      })
      .then(data => { if (data) setZone(data) })
      .catch(() => {})
  }, [id])

  if (isNotFound) notFound()
  if (!zone) return null

  const lights = zone.nodes.flatMap((n) =>
    n.lights.map((l) => ({
      id: l.id,
      label: l.label ?? 'Světlo',
      status: l.status as 'on' | 'off' | 'offline',
      nodeId: l.nodeId,
    }))
  )

  const nodes = zone.nodes.map((n) => ({
    id: n.id,
    externalId: n.externalId ?? '',
  }))

  const events: ZoneEvent[] = zone.nodes
    .flatMap((n) =>
      n.lights.flatMap((l) =>
        l.events.map((e) => ({
          id: e.id,
          lightLabel: l.label ?? 'Světlo',
          eventType: e.eventType as 'on' | 'off',
          trigger: e.trigger as 'auto' | 'manual',
          timestamp: e.timestamp,
          durationSeconds: e.durationSeconds,
        }))
      )
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)

  const nodeLabel = nodeMetaLabel(zone.nodes.length)

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{zone.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{lights.length} světel</span>
            {nodeLabel && (
              <>
                <span>·</span>
                <span>{nodeLabel}</span>
              </>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeBadge[zone.lightingMode] ?? 'bg-gray-100 text-gray-600'}`}>
              {modeLabel[zone.lightingMode] ?? zone.lightingMode}
            </span>
          </div>
        </div>
        <SwitchToAutoButton zoneId={zone.id} />
      </div>

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

      {zone.nodes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-gray-500">Zóna nemá žádné nody</p>
          <p className="mt-1 text-xs text-gray-400">Přidejte node a připojte k němu světla.</p>
        </div>
      ) : (
        <LightGrid lights={lights} nodes={nodes} />
      )}

      {events.length > 0 && <EventLog events={events} />}
    </div>
  )
}
