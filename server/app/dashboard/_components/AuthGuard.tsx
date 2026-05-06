'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/'); return }

    fetchWithAuth('/api/auth/verify').then(res => {
      if (!res.ok) { localStorage.removeItem('token'); router.replace('/') }
      else setVerified(true)
    }).catch(() => router.replace('/'))
  }, [router])

  if (!verified) return null

  return <>{children}</>
}
