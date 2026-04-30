export type ZoneEvent = {
  id: string
  lightLabel: string
  eventType: 'on' | 'off'
  trigger: 'auto' | 'manual'
  timestamp: string
  durationSeconds: number | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.round(seconds / 60)} min`
}

export function EventLog({ events }: { events: ZoneEvent[] }) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Poslední události v zóně
      </h2>
      <ul>
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-4 py-2.5 border-b border-gray-100 text-sm"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                e.eventType === 'on' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-gray-400 w-10 shrink-0 tabular-nums">
              {formatTime(e.timestamp)}
            </span>
            <span className="text-gray-800 flex-1">
              {e.lightLabel} —{' '}
              {e.eventType === 'on' ? 'zapnuto' : 'zhasnuto'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                e.trigger === 'manual'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {e.trigger === 'manual' ? 'manuálně' : 'auto'}
            </span>
            {e.durationSeconds != null && (
              <span className="text-xs text-gray-400 shrink-0">
                trvání: {formatDuration(e.durationSeconds)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
