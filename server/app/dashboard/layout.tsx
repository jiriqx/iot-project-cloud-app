import { TopNav } from './_components/TopNav'

export default function DashboardLayout({
  children,
}: LayoutProps<'/dashboard'>) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNav />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  )
}
