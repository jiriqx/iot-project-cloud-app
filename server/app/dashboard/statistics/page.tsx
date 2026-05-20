'use client'

import { useCallback, useEffect, useState } from 'react'

const PERIOD_OPTIONS = [
  { label: '7 dní', days: 7 },
  { label: '30 dní', days: 30 },
  { label: '90 dní', days: 90 },
] as const

type Metrics = { totalHours: number; totalEvents: number; avgMinutes: number }
type ZoneStat = { id: string; name: string; hours: number; anomaly: boolean }
type RecentEvent = {
  id: string
  timestamp: string
  zone: string
  light: string
  state: string
  trigger: string
}
type ZoneOption = { id: string; name: string }

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 tabular-nums">
        {value}{' '}
        <span className="text-base font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `dnes ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `včera ${time}`
  return `${d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} ${time}`
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  if (seconds < 60) return `${seconds} s`
  const min = Math.round(seconds / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [days, setDays] = useState(30)
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ totalHours: 0, totalEvents: 0, avgMinutes: 0 })
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch zone list for filter pills
  useEffect(() => {
    fetch('/api/zone')
      .then((r) => r.json())
      .then((data) => {
        const z = (data.zones ?? []).map((z: { id: string; name: string }) => ({ id: z.id, name: z.name }))
        setZones(z)
      })
      .catch(() => { })
  }, [])

  const fetchStats = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ days: String(days) })
    if (zoneId) params.set('zoneId', zoneId)
    fetch(`/api/statistics?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setMetrics(data.metrics)
        setZoneStats(data.zoneStats ?? [])
        setRecentEvents(data.recentEvents ?? [])
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [days, zoneId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const maxHours = Math.max(...zoneStats.map((z) => z.hours), 1)
  const anomalyZone = zoneStats.find((z) => z.anomaly)

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Přehled provozu osvětlení
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Period pills */}
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${days === p.days
                    ? 'bg-blue-600 border-blue-600 text-white font-medium'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Zone pills */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setZoneId(null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${zoneId === null
                  ? 'bg-blue-600 border-blue-600 text-white font-medium'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
            >
              Celá budova
            </button>
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoneId(z.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${zoneId === z.id
                    ? 'bg-blue-600 border-blue-600 text-white font-medium'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
              >
                {z.name}
              </button>
            ))}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Celková doba svícení"
            value={metrics.totalHours.toLocaleString('cs-CZ')}
            unit="hod"
          />
          <MetricCard
            label="Počet sepnutí"
            value={metrics.totalEvents.toLocaleString('cs-CZ')}
            unit=""
          />
          <MetricCard
            label="Prům. doba / sepnutí"
            value={String(metrics.avgMinutes)}
            unit="min"
          />
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
            Doba svícení per zóna (hod / {days} dní)
          </p>

          {zoneStats.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Žádná data.</p>
          ) : (
            <div className="space-y-3">
              {zoneStats.map((zone) => {
                const widthPct = (zone.hours / maxHours) * 100
                return (
                  <div key={zone.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-gray-700 text-right">
                      {zone.name}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${zone.anomaly ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span
                      className={`w-14 shrink-0 text-sm font-medium tabular-nums ${zone.anomaly ? 'text-red-500' : 'text-gray-700'
                        }`}
                    >
                      {zone.hours} h
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Anomaly alert */}
          {anomalyZone && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              <span className="shrink-0 mt-0.5">⚠</span>
              <p>
                <span className="font-medium">{anomalyZone.name}</span> vykazuje
                výrazně vyšší dobu svícení — timeout pravděpodobně nastaven
                příliš vysoký. Doporučeno zkontrolovat konfiguraci zóny.
              </p>
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Poslední události
          </h2>

          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Žádné události.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentEvents.map((event) => {
                return (
                  <li
                    key={event.id}
                    className="flex items-center gap-4 py-2.5 text-sm"
                  >
                    {/* State dot */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${event.state === 'zapnuto' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    />

                    {/* Time */}
                    <span className="text-gray-400 w-28 shrink-0 tabular-nums">
                      {formatTime(event.timestamp)}
                    </span>

                    {/* Zone · Light */}
                    <span className="flex-1 text-gray-800">
                      {event.zone}{' '}
                      <span className="text-gray-400">·</span>{' '}
                      {event.light}{' '}
                      <span className="text-gray-500">— {event.state}</span>
                    </span>

                    {/* Trigger */}
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${event.trigger === 'auto'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {event.trigger}
                    </span>

                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
