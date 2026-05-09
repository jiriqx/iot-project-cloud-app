'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Zone = {
  id: string
  name: string
  timeoutSeconds: number
  sensorSensitivity: string
  lightingMode: string
  nightModeStart: string | null
  nightModeEnd: string | null
}

export function ConfigurationClient({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Zone>>({})
  const [loading, setLoading] = useState(false)

  function startEdit(zone: Zone) {
    setEditingId(zone.id)
    setForm({
      name: zone.name,
      timeoutSeconds: zone.timeoutSeconds,
      sensorSensitivity: zone.sensorSensitivity,
      lightingMode: zone.lightingMode,
      nightModeStart: zone.nightModeStart ?? '',
      nightModeEnd: zone.nightModeEnd ?? '',
    })
  }

  function cancel() {
    setEditingId(null)
    setForm({})
  }

  async function save(id: string) {
    setLoading(true)
    try {
      await fetch(`/api/zone/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timeoutSeconds: Number(form.timeoutSeconds),
          nightModeStart: form.nightModeStart || null,
          nightModeEnd: form.nightModeEnd || null,
        }),
      })
      setEditingId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (zones.length === 0) {
    return <p className="text-sm text-gray-500">Žádné zóny. Vytvořte zónu ve Správě zón.</p>
  }

  return (
    <div className="space-y-4">
      {zones.map((zone) => {
        const isEditing = editingId === zone.id
        return (
          <div key={zone.id} className="bg-white border border-gray-200 rounded-lg p-5">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Název zóny</label>
                  <input
                    type="text"
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Timeout (sekundy)</label>
                  <input
                    type="number"
                    value={form.timeoutSeconds ?? ''}
                    onChange={e => setForm(f => ({ ...f, timeoutSeconds: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Citlivost senzoru</label>
                  <select
                    value={form.sensorSensitivity ?? ''}
                    onChange={e => setForm(f => ({ ...f, sensorSensitivity: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                  >
                    <option value="LOW">Nízká</option>
                    <option value="MEDIUM">Střední</option>
                    <option value="HIGH">Vysoká</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Režim osvětlení</label>
                  <select
                    value={form.lightingMode ?? ''}
                    onChange={e => setForm(f => ({ ...f, lightingMode: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                  >
                    <option value="automatic">Automatický</option>
                    <option value="manual">Manuální</option>
                    <option value="off">Vypnuto</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Noční režim — začátek</label>
                    <input
                      type="time"
                      value={form.nightModeStart ?? ''}
                      onChange={e => setForm(f => ({ ...f, nightModeStart: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Noční režim — konec</label>
                    <input
                      type="time"
                      value={form.nightModeEnd ?? ''}
                      onChange={e => setForm(f => ({ ...f, nightModeEnd: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => save(zone.id)}
                    disabled={loading}
                    className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    {loading ? 'Ukládám…' : 'Uložit'}
                  </button>
                  <button
                    onClick={cancel}
                    className="px-4 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
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
                  onClick={() => startEdit(zone)}
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
  )
}