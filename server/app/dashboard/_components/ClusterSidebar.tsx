import Link from 'next/link'

type Zone = { id: string; name: string }

export function ClusterSidebar({
  zones,
  selectedZoneId,
}: {
  zones: Zone[]
  selectedZoneId: string | null
}) {
  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Node Clustery
        </p>
        <ul className="space-y-0.5">
          {zones.map((zone, i) => {
            const isActive = selectedZoneId === zone.id
            return (
              <li key={zone.id}>
                <Link
                  href={`/dashboard?zone=${zone.id}`}
                  className={`block px-3 py-2 rounded text-sm transition-colors truncate ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={`Cluster ${i + 1} — ${zone.name}`}
                >
                  Cluster {i + 1} — {zone.name}
                </Link>
              </li>
            )
          })}
          <li>
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded text-sm transition-colors mt-1 ${
                selectedZoneId === null
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Všechny nody
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  )
}
