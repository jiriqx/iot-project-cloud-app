import prisma from '@/lib/prisma'
import { ZoneSidebar } from './_components/ZoneSidebar'

export default async function ZonesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="flex flex-1 min-h-0">
      <ZoneSidebar zones={zones.map((z) => ({ id: z.id, name: z.name }))} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
