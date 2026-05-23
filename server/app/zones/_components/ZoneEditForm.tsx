'use client'

import { useState } from 'react'

type ZoneFields = {
  id: string
  name: string
  timeoutSeconds: number
  sensorSensitivity: string
  lightingMode: string
  nightModeStart: string | null
  nightModeEnd: string | null
}

type Props = {
  zone: ZoneFields
  onSaved: () => void
  onCancel: () => void
}

export function ZoneEditForm({ zone, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: zone.name,
    timeoutSeconds: zone.timeoutSeconds,
    sensorSensitivity: zone.sensorSensitivity,
    lightingMode: zone.lightingMode,
    nightModeStart: zone.nightModeStart ?? '',
    nightModeEnd: zone.nightModeEnd ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/zone/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timeoutSeconds: Number(form.timeoutSeconds),
          nightModeStart: form.nightModeStart || null,
          nightModeEnd: form.nightModeEnd || null,
        }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Název zóny</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Timeout (sekundy)</label>
        <input
          type="number"
          value={form.timeoutSeconds}
          onChange={e => setForm(f => ({ ...f, timeoutSeconds: Number(e.target.value) }))}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Citlivost senzoru</label>
        <select
          value={form.sensorSensitivity}
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
          value={form.lightingMode}
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
            value={form.nightModeStart}
            onChange={e => setForm(f => ({ ...f, nightModeStart: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Noční režim — konec</label>
          <input
            type="time"
            value={form.nightModeEnd}
            onChange={e => setForm(f => ({ ...f, nightModeEnd: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
        >
          Zrušit
        </button>
      </div>
    </div>
  )
}
