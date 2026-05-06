import { TopNav } from './_components/TopNav'
import { AuthGuard } from './_components/AuthGuard'

export default function DashboardLayout({
  children,
}: LayoutProps<'/dashboard'>) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <TopNav />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </div>
    </AuthGuard>
  )
}
