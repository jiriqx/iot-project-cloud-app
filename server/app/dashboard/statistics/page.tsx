'use client'

import { useEffect, useState } from 'react'
import { SkeletonLine, SkeletonCard } from '@/app/_components/Skeleton'

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
  durationSeconds: number | null
}
type ZoneOption = { id: string; name: string }

type StatsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; metrics: Metrics; zoneStats: ZoneStat[]; recentEvents: RecentEvent[] }

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

function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <SkeletonLine className="w-32 h-3 mb-3" />
      <SkeletonLine className="w-24 h-8" />
    </div>
  )
}

function StatisticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      <SkeletonCard>
        <SkeletonLine className="w-52 h-3 mb-4" />
        <div className="space-y-3">
          {[100, 62, 38, 81].map((pct, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLine className="w-28 h-3 shrink-0" />
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden animate-pulse">
                <div className="h-full bg-gray-200 rounded" style={{ width: `${pct}%` }} />
              </div>
              <SkeletonLine className="w-10 h-3 shrink-0" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine className="w-36 h-3 mb-4" />
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-gray-100 shrink-0" />
              <SkeletonLine className="w-24 h-3 shrink-0" />
              <SkeletonLine className="flex-1 h-3" />
              <SkeletonLine className="w-10 h-4 rounded shrink-0" />
              <SkeletonLine className="w-16 h-3 shrink-0" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </>
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
  const [statsState, setStatsState] = useState<StatsState>({ status: 'loading' })
  const [statsKey, setStatsKey] = useState(0)

  useEffect(() => {
    fetch('/api/zone')
      .then((r) => r.json())
      .then((data) => {
        setZones((data.zones ?? []).map((z: { id: string; name: string }) => ({ id: z.id, name: z.name })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (zoneId) params.set('zoneId', zoneId)
    fetch(`/api/statistics?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setStatsState({
          status: 'done',
          metrics: data.metrics,
          zoneStats: data.zoneStats ?? [],
          recentEvents: data.recentEvents ?? [],
        })
      })
      .catch(() => setStatsState({ status: 'error', message: 'Nepodařilo se načíst statistiky. Zkontrolujte připojení.' }))
  }, [days, zoneId, statsKey])

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Přehled provozu osvětlení
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => { setDays(p.days); setStatsState({ status: 'loading' }) }}
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setZoneId(null); setStatsState({ status: 'loading' }) }}
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
                onClick={() => { setZoneId(z.id); setStatsState({ status: 'loading' }) }}
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

        {statsState.status === 'error' && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{statsState.message}</span>
            <button
              onClick={() => { setStatsState({ status: 'loading' }); setStatsKey(k => k + 1) }}
              className="ml-4 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {statsState.status === 'loading' && <StatisticsSkeleton />}

        {statsState.status === 'done' && (() => {
          const { metrics, zoneStats, recentEvents } = statsState
          const maxHours = Math.max(...zoneStats.map((z) => z.hours), 1)
          const anomalyZone = zoneStats.find((z) => z.anomaly)

          return (
            <>
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
                              className={`h-full rounded transition-all ${zone.anomaly ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span
                            className={`w-14 shrink-0 text-sm font-medium tabular-nums ${zone.anomaly ? 'text-red-500' : 'text-gray-700'}`}
                          >
                            {zone.hours} h
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

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

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-medium text-gray-700 mb-4">
                  Poslední události
                </h2>

                {recentEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Žádné události.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentEvents.map((event) => {
                      const dur = formatDuration(event.durationSeconds)
                      return (
                        <li
                          key={event.id}
                          className="flex items-center gap-4 py-2.5 text-sm"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${event.state === 'zapnuto' ? 'bg-green-500' : 'bg-gray-300'}`}
                          />
                          <span className="text-gray-400 w-28 shrink-0 tabular-nums">
                            {formatTime(event.timestamp)}
                          </span>
                          <span className="flex-1 text-gray-800">
                            {event.zone}{' '}
                            <span className="text-gray-400">·</span>{' '}
                            {event.light}{' '}
                            <span className="text-gray-500">— {event.state}</span>
                          </span>
                          <span
                            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${event.trigger === 'auto'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-yellow-100 text-yellow-700'
                              }`}
                          >
                            {event.trigger}
                          </span>
                          {dur ? (
                            <span className="shrink-0 text-xs text-gray-400 w-20 text-right">
                              trvání: {dur}
                            </span>
                          ) : (
                            <span className="shrink-0 w-20" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          )
        })()}

      </div>
    </div>
  )
}
