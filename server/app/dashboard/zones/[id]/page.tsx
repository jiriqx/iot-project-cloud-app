'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { LightGrid } from './_components/LightGrid'
import { EventLog, type ZoneEvent } from './_components/EventLog'
import { AddNodeButton } from './_components/AddNodeButton'
import { ZoneEditForm } from '../_components/ZoneEditForm'

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
    events: Array<{
      id: string
      eventType: string
      trigger: string
      timestamp: string
    }>
  }>
}

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isValidId = Boolean(id?.match(/^[a-f\d]{24}$/i))
  const [zone, setZone] = useState<Zone | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const [editing, setEditing] = useState(false)

  const fetchZone = useCallback(() => {
    if (!id?.match(/^[a-f\d]{24}$/i)) return Promise.resolve()
    return fetch(`/api/zone/${id}`)
      .then(r => {
        if (r.status === 404) { setIsNotFound(true); return null }
        return r.json()
      })
      .then(data => { if (data) setZone(data) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    fetchZone()
  }, [fetchZone])

  if (!isValidId || isNotFound) notFound()
  if (!zone) return null

  const nodesForGrid = zone.nodes.map((n) => {
    const externalId = n.externalId ?? ''
    const deviceId = externalId.split('/')[1] ?? externalId
    const label = `Node ${deviceId}`
    const latestEvent = n.events[0]
    const status: 'on' | 'off' | 'offline' = latestEvent
      ? (latestEvent.eventType as 'on' | 'off')
      : 'offline'
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

      <LightGrid nodes={nodesForGrid} />

      {events.length > 0 && <EventLog events={events} />}
    </div>
  )
}
