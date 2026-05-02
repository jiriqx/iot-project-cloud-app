// Mock data — replace with real Prisma queries when backend is ready

const TIME_PERIODS = ['7 dní', '30 dní', '90 dní', 'Vlastní'] as const
const ZONE_FILTERS = ['Celá budova', 'Chodba A', 'Chodba B', 'Toalety', 'Kanceláře'] as const

const metrics = {
  totalHours: 842,
  totalEvents: 1204,
  avgMinutes: 42,
}

const zoneStats = [
  { name: 'Chodba B', hours: 312, anomaly: true },
  { name: 'Chodba A', hours: 220, anomaly: false },
  { name: 'Kancelář A', hours: 168, anomaly: false },
  { name: 'Kancelář B', hours: 136, anomaly: false },
  { name: 'Toalety', hours: 42, anomaly: false },
]

const recentEvents = [
  { id: '1', time: 'dnes 15:04', zone: 'Chodba B', light: 'Světlo 2', state: 'zapnuto', trigger: 'auto', duration: '9 min' },
  { id: '2', time: 'dnes 14:55', zone: 'Chodba B', light: 'Světlo 2', state: 'zhasnuto', trigger: 'auto', duration: '12 min' },
  { id: '3', time: 'dnes 14:32', zone: 'Chodba A', light: 'Světlo 1', state: 'zapnuto', trigger: 'manuálně', duration: null },
  { id: '4', time: 'dnes 14:10', zone: 'Kancelář A', light: 'Světlo 3', state: 'zhasnuto', trigger: 'auto', duration: '55 min' },
]

const anomalyZone = zoneStats.find((z) => z.anomaly)
const maxHours = Math.max(...zoneStats.map((z) => z.hours))

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

function PillGroup<T extends string>({
  items,
  active,
}: {
  items: readonly T[]
  active: T
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            item === active
              ? 'bg-blue-600 border-blue-600 text-white font-medium'
              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Přehled provozu osvětlení
          </h1>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>↓</span> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <PillGroup items={TIME_PERIODS} active="30 dní" />
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <PillGroup items={ZONE_FILTERS} active="Celá budova" />
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
            Doba svícení per zóna (hod / 30 dní)
          </p>

          <div className="space-y-3">
            {zoneStats.map((zone) => {
              const widthPct = (zone.hours / maxHours) * 100
              return (
                <div key={zone.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-gray-700 text-right">
                    {zone.name}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        zone.anomaly ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span
                    className={`w-14 shrink-0 text-sm font-medium tabular-nums ${
                      zone.anomaly ? 'text-red-500' : 'text-gray-700'
                    }`}
                  >
                    {zone.hours} h
                  </span>
                </div>
              )
            })}
          </div>

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

          <ul className="divide-y divide-gray-100">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-4 py-2.5 text-sm"
              >
                {/* State dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    event.state === 'zapnuto' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />

                {/* Time */}
                <span className="text-gray-400 w-24 shrink-0 tabular-nums">
                  {event.time}
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
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${
                    event.trigger === 'auto'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {event.trigger}
                </span>

                {/* Duration */}
                {event.duration ? (
                  <span className="shrink-0 text-xs text-gray-400 w-16 text-right">
                    trvání: {event.duration}
                  </span>
                ) : (
                  <span className="shrink-0 w-16" />
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
