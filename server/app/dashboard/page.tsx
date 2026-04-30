import prisma from '@/lib/prisma'
import { ClusterSidebar } from './_components/ClusterSidebar'
import { NodeCard } from './_components/NodeCard'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const { zone: zoneParam } = await searchParams
  const selectedZoneId = typeof zoneParam === 'string' ? zoneParam : null

  const zones = await prisma.zone.findMany({
    include: {
      nodes: {
        include: {
          lights: true,
          events: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const now = Date.now()

  const filteredZones = selectedZoneId
    ? zones.filter((z) => z.id === selectedZoneId)
    : zones

  const displayNodes = filteredZones.flatMap((zone) =>
    zone.nodes.map((node, i) => {
      const latestEvent = node.events[0] ?? null

      const lightStatus: 'on' | 'off' | 'offline' | 'unknown' =
        node.lights.length === 0
          ? 'unknown'
          : node.lights.some((l) => l.status === 'on')
          ? 'on'
          : node.lights.every((l) => l.status === 'offline')
          ? 'offline'
          : 'off'

      let remainingSeconds: number | null = null
      if (latestEvent && node.status === 'active') {
        const elapsed = (now - latestEvent.timestamp.getTime()) / 1000
        remainingSeconds = Math.max(0, Math.round(zone.timeoutSeconds - elapsed))
      }

      return {
        id: node.id,
        name: `Node ${i + 1} — ${zone.name}`,
        status: node.status,
        lightStatus,
        lastEventAt: latestEvent?.timestamp.toISOString() ?? null,
        lastTrigger: (latestEvent?.trigger as 'auto' | 'manual' | null) ?? null,
        timeoutSeconds: zone.timeoutSeconds,
        remainingSeconds,
      }
    })
  )

  const clusterHeading = selectedZoneId
    ? (() => {
        const z = zones.find((z) => z.id === selectedZoneId)
        const i = zones.findIndex((z) => z.id === selectedZoneId)
        return z ? `Cluster ${i + 1} — ${z.name}` : 'Neznámý cluster'
      })()
    : 'Všechny nody'

  return (
    <div className="flex flex-1 min-h-0">
      <ClusterSidebar
        zones={zones.map((z) => ({ id: z.id, name: z.name }))}
        selectedZoneId={selectedZoneId}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-md bg-orange-50 border border-orange-200 px-4 py-3 mb-6 text-sm text-gray-700">
          <span className="text-orange-500 shrink-0 mt-0.5">⚡</span>
          <p>
            Tento scénář probíhá plně automaticky na úrovni nodů — bez zásahu
            uživatele. PIR senzor detekuje pohyb → Node zapne světlo → po
            vypršení timeoutu bez pohybu světlo zhasne. Tato obrazovka slouží
            pouze ke sledování live stavu nodů a jejich zón.
          </p>
        </div>

        {/* Heading */}
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Live stav nodů —{' '}
          <span className="font-normal text-gray-600">{clusterHeading}</span>
        </h2>

        {/* Node grid */}
        {displayNodes.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {selectedZoneId
              ? 'Tento cluster nemá žádné nody.'
              : 'Žádné nody nejsou registrovány.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayNodes.map((node) => (
              <NodeCard key={node.id} {...node} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
