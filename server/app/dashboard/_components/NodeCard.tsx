type NodeCardProps = {
  name: string
  status: string
  lightStatus: 'on' | 'off' | 'offline' | 'unknown'
  lastEventAt: string | null
  lastTrigger: 'auto' | 'manual' | null
  timeoutSeconds: number
  remainingSeconds: number | null
}

const nodeStatusConfig: Record<string, { label: string; badge: string }> = {
  active: { label: 'aktivní', badge: 'bg-green-100 text-green-700' },
  inactive: { label: 'offline', badge: 'bg-red-100 text-red-500' },
  service: { label: 'servis', badge: 'bg-yellow-100 text-yellow-700' },
}

const lightStatusConfig: Record<string, { label: string; badge: string }> = {
  on: { label: 'svítí', badge: 'bg-green-100 text-green-700' },
  off: { label: 'zhasnuto', badge: 'bg-gray-100 text-gray-500' },
  offline: { label: 'neznámý', badge: 'bg-red-100 text-red-400' },
  unknown: { label: '—', badge: 'bg-gray-100 text-gray-400' },
}

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `před ${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `před ${minutes} min`
  return `před ${Math.round(minutes / 60)} h`
}

function progressBarColor(pct: number): string {
  if (pct > 60) return 'bg-green-500'
  if (pct > 25) return 'bg-orange-400'
  return 'bg-red-400'
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

export function NodeCard({
  name,
  status,
  lightStatus,
  lastEventAt,
  lastTrigger,
  timeoutSeconds,
  remainingSeconds,
}: NodeCardProps) {
  const isOffline = status !== 'active'
  const nodeCfg = nodeStatusConfig[status] ?? { label: status, badge: 'bg-gray-100 text-gray-500' }
  const lightCfg = lightStatusConfig[lightStatus]

  const pct =
    remainingSeconds !== null ? (remainingSeconds / timeoutSeconds) * 100 : 0

  const showTimeout = !isOffline && lastEventAt !== null

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        isOffline ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900 truncate pr-2">
          {name}
        </span>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${nodeCfg.badge}`}
        >
          {nodeCfg.label}
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        <Row label="Světlo">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${lightCfg.badge}`}
          >
            {lightCfg.label}
          </span>
        </Row>

        <Row label={isOffline ? 'Poslední ping' : 'Poslední pohyb'}>
          <span className="font-medium text-gray-800">
            {lastEventAt ? relativeTime(lastEventAt) : '—'}
          </span>
        </Row>

        <Row label="Trigger">
          {lastTrigger ? (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                lastTrigger === 'auto'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {lastTrigger === 'auto' ? 'auto (PIR)' : 'manuálně'}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </Row>
      </div>

      {/* Timeout progress bar */}
      {showTimeout && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">
              Timeout ({timeoutSeconds} s)
            </span>
            <span className="text-xs text-gray-400">
              {remainingSeconds! > 0 ? `${remainingSeconds} s zbývá` : 'vypršel'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            {pct > 0 && (
              <div
                className={`h-full rounded-full ${progressBarColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
