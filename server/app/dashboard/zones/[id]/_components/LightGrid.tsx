'use client'

import { useState, useTransition } from 'react'

type Light = {
  id: string
  label: string
  status: 'on' | 'off' | 'offline'
  nodeId: string
}

type Node = {
  id: string
  externalId: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  on: { label: 'svítí', className: 'bg-green-100 text-green-700' },
  off: { label: 'zhasnuto', className: 'bg-gray-100 text-gray-500' },
  offline: { label: 'offline', className: 'bg-red-100 text-red-500' },
}

function BulbIcon({ status }: { status: 'on' | 'off' | 'offline' }) {
  const color =
    status === 'on'
      ? 'text-yellow-400'
      : status === 'offline'
      ? 'text-gray-200'
      : 'text-gray-300'
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={color}
      aria-hidden
    >
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  )
}

async function sendCommand(externalId: string, command: 'on' | 'off') {
  const [gatewayId, deviceId] = externalId.split('/')
  if (!gatewayId || !deviceId) return
  await fetch('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gatewayId, deviceId, command }),
  })
}

export function LightGrid({
  lights,
  nodes,
}: {
  lights: Light[]
  nodes: Node[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCommand(lightIds: string[], command: 'on' | 'off') {
    const nodeIds = [
      ...new Set(
        lightIds
          .map((id) => lights.find((l) => l.id === id)?.nodeId)
          .filter(Boolean) as string[]
      ),
    ]
    startTransition(async () => {
      await Promise.all(
        nodeIds
          .map((nid) => nodeById.get(nid))
          .filter((n): n is Node => !!n?.externalId)
          .map((n) => sendCommand(n.externalId, command))
      )
    })
  }

  const allIds = lights.map((l) => l.id)
  const selectedIds = [...selected]
  const selectedLabels = lights
    .filter((l) => selected.has(l.id))
    .map((l) => l.label)

  if (lights.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-gray-500">
          Node nemá žádná světla
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Přidejte světla do nodu v konfiguraci.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-gray-700">
        Světla — vyberte pro ovládání
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {lights.map((light) => {
          const isSelected = selected.has(light.id)
          const isOffline = light.status === 'offline'
          const cfg = statusConfig[light.status] ?? statusConfig.off

          return (
            <button
              key={light.id}
              onClick={() => !isOffline && toggle(light.id)}
              disabled={isOffline}
              className={[
                'flex flex-col items-center gap-3 px-4 py-5 rounded-lg border-2 transition-all text-center',
                isOffline
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-white'
                  : isSelected
                  ? 'border-blue-400 bg-blue-50 cursor-pointer'
                  : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer',
              ].join(' ')}
            >
              <BulbIcon status={light.status} />
              <span className="text-sm font-medium text-gray-800 leading-tight">
                {light.label}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}
              >
                {cfg.label}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">
        {selected.size > 0
          ? `Vybráno: ${selectedLabels.join(', ')} · Klikněte na světlo pro výběr`
          : 'Klikněte na světlo pro výběr'}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => handleCommand(selectedIds, 'on')}
          disabled={selected.size === 0 || isPending}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Zapnout vybrané
        </button>
        <button
          onClick={() => handleCommand(selectedIds, 'off')}
          disabled={selected.size === 0 || isPending}
          className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Vypnout vybrané
        </button>
        <button
          onClick={() => handleCommand(allIds, 'on')}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Zapnout vše
        </button>
        <button
          onClick={() => handleCommand(allIds, 'off')}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          Vypnout vše
        </button>
      </div>
    </div>
  )
}
