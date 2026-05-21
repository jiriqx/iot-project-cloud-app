'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ZoneOption = { id: string; name: string }
type ZoneStat = { id: string; name: string; hours: number; onCount: number }

function today(): string {
  return new Date().toISOString().split('T')[0]
}

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

export default function StatisticsPage() {
  const [date, setDate] = useState(today)
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [allZoneStats, setAllZoneStats] = useState<ZoneStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/zone')
      .then(r => r.json())
      .then(data => {
        setZones((data.zones ?? []).map((z: ZoneOption) => ({ id: z.id, name: z.name })))
      })
      .catch(() => {})
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetch(`/api/stats/${date}`).then(r => r.ok ? r.json() : { zones: [] })

      setAllZoneStats(
        (result.zones ?? []).map((z: { zoneId: string; totalOnHours: number; onCount: number }) => ({
          id: z.zoneId,
          name: z.zoneId,
          hours: Math.round(z.totalOnHours * 100) / 100,
          onCount: z.onCount,
        }))
      )
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Resolve zone names
  const statsWithNames: ZoneStat[] = allZoneStats.map(s => ({
    ...s,
    name: zones.find(z => z.id === s.id)?.name ?? s.id,
  }))

  // Local filtering by selected zone
  const filteredStats = zoneId
    ? statsWithNames.filter(s => s.id === zoneId)
    : statsWithNames

  const totalHours = Math.round(filteredStats.reduce((sum, z) => sum + z.hours, 0) * 100) / 100
  const totalEvents = filteredStats.reduce((sum, z) => sum + z.onCount, 0)

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl space-y-6">

        <h1 className="text-xl font-semibold text-gray-900">Přehled provozu osvětlení</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <select
            value={zoneId ?? ''}
            onChange={e => setZoneId(e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Celá budova</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            label="Celková doba svícení"
            value={totalHours.toLocaleString('cs-CZ')}
            unit="hod"
          />
          <MetricCard
            label="Počet sepnutí"
            value={totalEvents.toLocaleString('cs-CZ')}
            unit=""
          />
        </div>

        {/* Charts */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
            Načítám data...
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
            Žádná data pro vybrané období.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Hours per zone */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                Celková doba svícení per zóna (hod)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredStats} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} hod`, 'Svícení']} />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activations per zone */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                Počet sepnutí per zóna
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredStats} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v}×`, 'Sepnutí']} />
                  <Bar dataKey="onCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
