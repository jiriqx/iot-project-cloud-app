'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (mode === 'register' && password !== confirmPassword) {
      setError('Hesla musí být stejná')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const err = data.error
        if (err && typeof err === 'object') {
          const fields = Object.values(err.fieldErrors ?? {}).flat()
          setError(fields[0] ?? err.formErrors?.[0] ?? 'Došlo k chybě')
        } else {
          setError(err ?? 'Došlo k chybě')
        }
        return
      }

      if (mode === 'login') {
        localStorage.setItem('token', data.token)
        router.push('/dashboard')
      } else {
        setSuccess('Účet vytvořen — Můžete se nyní přihlásit')
        setPassword('')
        setConfirmPassword('')
        setMode('login')
      }
    } catch {
      setError('Chyba sítě, zkuste to znovu později')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <span className="font-bold text-gray-900 tracking-wide">BIOT DL</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

          <div className="flex border-b border-gray-200">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'text-gray-900 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                }`}
              >
                {m === 'login' ? 'Přihlášení' : 'Registrace'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-gray-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-medium text-gray-700">
                Uživatelské jméno
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Zadejte Uživatelské jméno"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-gray-700">
                Heslo
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'Min. 8 znaků' : 'Zadejte heslo'}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700">
                  Heslo znovu
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Heslo znovu"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
