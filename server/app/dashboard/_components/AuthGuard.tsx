import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/')
  return <>{children}</>
}
