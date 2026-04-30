import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
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

export default async function ZoneDetailPage(
  props: PageProps<'/dashboard/zones/[id]'>
) {
  const { id } = await props.params

  if (!id.match(/^[a-f\d]{24}$/i)) notFound()

  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      nodes: {
        include: {
          lights: {
            include: {
              events: {
                orderBy: { timestamp: 'desc' },
                take: 50,
              },
            },
          },
        },
      },
    },
  })

  if (!zone) notFound()

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
          timestamp: e.timestamp.toISOString(),
          durationSeconds: e.durationSeconds,
        }))
      )
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 20)

  const nodeLabel = nodeMetaLabel(zone.nodes.length)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
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
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                modeBadge[zone.lightingMode] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {modeLabel[zone.lightingMode] ?? zone.lightingMode}
            </span>
          </div>
        </div>
        <SwitchToAutoButton zoneId={zone.id} />
      </div>

      {/* Config row */}
      <div className="flex items-center gap-3 mb-6 text-xs text-gray-400">
        <span>Timeout: {zone.timeoutSeconds} s</span>
        <span>·</span>
        <span>
          Citlivost:{' '}
          {sensitivityLabel[zone.sensorSensitivity] ?? zone.sensorSensitivity}
        </span>
        {zone.nightModeStart && zone.nightModeEnd && (
          <>
            <span>·</span>
            <span>
              Noční režim: {zone.nightModeStart} – {zone.nightModeEnd}
            </span>
          </>
        )}
      </div>

      {/* Lights */}
      {zone.nodes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-gray-500">
            Zóna nemá žádné nody
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Přidejte node a připojte k němu světla.
          </p>
        </div>
      ) : (
        <LightGrid lights={lights} nodes={nodes} />
      )}

      {events.length > 0 && <EventLog events={events} />}
    </div>
  )
}
