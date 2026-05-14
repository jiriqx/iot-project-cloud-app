'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ZoneEditForm } from './_components/ZoneEditForm'

type Zone = {
  id: string
  name: string
  timeoutSeconds: number
  sensorSensitivity: string
  lightingMode: string
  nightModeStart: string | null
  nightModeEnd: string | null
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function fetchZones() {
    const res = await fetch('/api/zone')
    const data = await res.json()
    setZones(data.zones ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchZones() }, [])

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Správa zón</h1>
          <Link
            href="/dashboard/zones/create"
            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Nová zóna
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Načítám…</p>
        ) : zones.length === 0 ? (
          <p className="text-sm text-gray-500">Žádné zóny. Vytvořte první zónu.</p>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => {
              const isEditing = editingId === zone.id
              return (
                <div key={zone.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  {isEditing ? (
                    <ZoneEditForm
                      zone={zone}
                      onSaved={() => { setEditingId(null); fetchZones() }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                        <p className="text-xs text-gray-500">
                          Timeout: {zone.timeoutSeconds}s · Citlivost: {zone.sensorSensitivity} · Režim: {zone.lightingMode}
                        </p>
                        {zone.nightModeStart && zone.nightModeEnd && (
                          <p className="text-xs text-gray-400">Noční režim: {zone.nightModeStart} – {zone.nightModeEnd}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingId(zone.id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Upravit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
