import prisma from "./prisma";

export async function getZoneIdsByOwner(ownerId: string): Promise<string[]> {
  const zones = await prisma.zone.findMany({
    where: { ownerId },
    select: { id: true },
  });
  return zones.map((z) => z.id);
}
