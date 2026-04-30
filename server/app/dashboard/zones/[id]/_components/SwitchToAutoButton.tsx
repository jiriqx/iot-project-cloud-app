'use client'

export function SwitchToAutoButton({ zoneId }: { zoneId: string }) {
  function handleClick() {
    // TODO: implement PATCH /api/zone/[id] to set lightingMode = 'automatic'
    console.log('TODO: switch zone', zoneId, 'to automatic mode')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
    >
      <span className="text-base leading-none">↺</span>
      Přepnout na automatiku
    </button>
  )
}
