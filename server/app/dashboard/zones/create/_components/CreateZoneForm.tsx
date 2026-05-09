'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createZoneSchema } from '@/lib/schemas'

type FieldErrors = Partial<Record<string, string>>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

export function CreateZoneForm() {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const fd = new FormData(e.currentTarget)
    const raw = {
      name: fd.get('name') as string,
      timeoutSeconds: Number(fd.get('timeoutSeconds')),
      sensorSensitivity: fd.get('sensorSensitivity') as string,
      lightingMode: fd.get('lightingMode') as string,
      nightModeStart: (fd.get('nightModeStart') as string) || undefined,
      nightModeEnd: (fd.get('nightModeEnd') as string) || undefined,
    }

    const result = createZoneSchema.safeParse(raw)
    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setServerError(data.error ?? 'Nepodařilo se vytvořit zónu.')
        return
      }

      const { zone } = await res.json()
      router.push(`/dashboard/zones/${zone.id}`)
      router.refresh()
    } catch {
      setServerError('Nepodařilo se vytvořit zónu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Název zóny
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="např. Chodba A — 1. patro"
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label
          htmlFor="timeoutSeconds"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Timeout (sekundy)
        </label>
        <input
          id="timeoutSeconds"
          name="timeoutSeconds"
          type="number"
          min={1}
          placeholder="např. 60"
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.timeoutSeconds ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <FieldError message={errors.timeoutSeconds} />
      </div>

      <div>
        <label
          htmlFor="sensorSensitivity"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Citlivost senzoru
        </label>
        <select
          id="sensorSensitivity"
          name="sensorSensitivity"
          defaultValue="MEDIUM"
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.sensorSensitivity ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          <option value="LOW">Nízká</option>
          <option value="MEDIUM">Střední</option>
          <option value="HIGH">Vysoká</option>
        </select>
        <FieldError message={errors.sensorSensitivity} />
      </div>

      <div>
        <label
          htmlFor="lightingMode"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Režim osvětlení
        </label>
        <select
          id="lightingMode"
          name="lightingMode"
          defaultValue="automatic"
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.lightingMode ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          <option value="automatic">Automatický</option>
          <option value="manual">Manuální</option>
          <option value="off">Vypnuto</option>
        </select>
        <FieldError message={errors.lightingMode} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">
          Noční režim{' '}
          <span className="font-normal text-gray-400">(volitelné)</span>
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="nightModeStart"
              className="block text-xs text-gray-500 mb-1"
            >
              Začátek
            </label>
            <input
              id="nightModeStart"
              name="nightModeStart"
              type="time"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nightModeStart ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            <FieldError message={errors.nightModeStart} />
          </div>
          <div>
            <label
              htmlFor="nightModeEnd"
              className="block text-xs text-gray-500 mb-1"
            >
              Konec
            </label>
            <input
              id="nightModeEnd"
              name="nightModeEnd"
              type="time"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nightModeEnd ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            <FieldError message={errors.nightModeEnd} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Ukládám…' : 'Vytvořit zónu'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Zrušit
        </button>
      </div>
    </form>
  )
}
