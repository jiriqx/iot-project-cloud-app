import { AuthGuard } from '@/app/_components/AuthGuard'
import { TopNav } from '@/app/_components/TopNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <TopNav />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </div>
    </AuthGuard>
  )
}
