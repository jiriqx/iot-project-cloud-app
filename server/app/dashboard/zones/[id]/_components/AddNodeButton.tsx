'use client'

import { useState } from 'react'

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

export function AddNodeButton({ zoneId, onAdded }: { zoneId: string; onAdded?: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [mac, setMac] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setOpen(false)
    setMac('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!MAC_REGEX.test(mac)) {
      setError('Neplatná MAC adresa. Zadejte ve formátu AA:BB:CC:DD:EE:FF.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, mac }),
      })
      if (res.ok) {
        await onAdded?.()
        handleClose()
        return
      }
      if (res.status === 409) {
        setError('Node s touto MAC adresou již existuje.')
        return
      }
      setError('Nepodařilo se přidat node. Zkuste to znovu.')
    } catch {
      setError('Nepodařilo se přidat node. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Přidat node
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Přidat node</h2>
            <form onSubmit={handleSubmit}>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="mac-input">
                MAC adresa
              </label>
              <input
                id="mac-input"
                type="text"
                value={mac}
                onChange={e => setMac(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="text-sm text-white bg-blue-600 rounded px-3 py-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Přidávám…' : 'Přidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}