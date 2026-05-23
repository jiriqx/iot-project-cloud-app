type NodeCardProps = {
  id: string
  name: string
  mac: string | null
  externalId: string | null
  status: string
  lightStatus: 'on' | 'off' | 'unknown'
  lightingMode: string
  lastEventAt: string | null
  lastTrigger: 'auto' | 'manual' | null
  timeoutSeconds: number
  remainingSeconds: number | null
  onRefresh?: () => void
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
  id,
  name,
  mac,
  status,
  lightStatus,
  lightingMode,
  lastEventAt,
  lastTrigger,
  timeoutSeconds,
  onRefresh,
}: NodeCardProps) {
  const isOffline = status !== 'active'
  const nodeCfg = nodeStatusConfig[status] ?? { label: status, badge: 'bg-gray-100 text-gray-500' }
  const lightCfg = lightStatusConfig[lightStatus]

  const showTimeout = !isOffline && lastEventAt !== null

  const isManual = lightingMode === 'manual'

  async function handleCommand(command: 'on' | 'off') {
    await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayId: 'gateway-1', nodeId: id, command }),
    })
    onRefresh?.()
  }

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${isOffline ? 'border-red-200' : 'border-gray-200'
        }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="truncate pr-2">
          <span className="text-sm font-semibold text-gray-900">{name}</span>
          {mac && (
            <span className="block text-xs text-gray-400 font-mono">{mac}</span>
          )}
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${nodeCfg.badge}`}
        >
          {nodeCfg.label}
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        <Row label="Stav">
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
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${lastTrigger === 'auto'
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
          </div>
        </div>
      )}

      {/* Manual on/off control */}
      {isManual && !isOffline && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleCommand('on')}
            disabled={lightStatus === 'on'}
            className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Zapnout
          </button>
          <button
            onClick={() => handleCommand('off')}
            disabled={lightStatus === 'off'}
            className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Vypnout
          </button>
        </div>
      )}
    </div>
  )
}
