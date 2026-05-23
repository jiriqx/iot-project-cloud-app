'use client'

export default function ZoneDetailError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="p-6 max-w-4xl">
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
        <span>Stránka se nepodařila načíst. Zkuste to znovu.</span>
        <button
          onClick={unstable_retry}
          className="ml-4 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  )
}
