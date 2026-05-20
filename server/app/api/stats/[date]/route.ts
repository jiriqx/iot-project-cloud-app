import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { getZoneIdsByOwner } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;

  const day = new Date(date);
  if (isNaN(day.getTime()))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const zoneIds = await getZoneIdsByOwner(session.user.id);

  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);

  if (zoneIds.length === 0)
    return NextResponse.json({
      date,
      summary: { totalOnSeconds: 0, totalOnCount: 0 },
      zones: [],
      events: [],
    });

  const events = await prisma.lightEvent.findMany({
    where: { zoneId: { in: zoneIds }, timestamp: { gte: start, lte: end } },
    orderBy: { timestamp: "asc" },
  });

  // Pair on/off per node to compute durations
  const byNode = new Map<string, typeof events>();
  for (const e of events) {
    if (!byNode.has(e.nodeId)) byNode.set(e.nodeId, []);
    byNode.get(e.nodeId)!.push(e);
  }

  const cap = end < new Date() ? end : new Date();

  const zoneOnSecs = new Map<string, number>();
  const zoneOnCount = new Map<string, number>();

  for (const nodeEvents of byNode.values()) {
    for (let i = 0; i < nodeEvents.length; i++) {
      const e = nodeEvents[i];
      if (e.eventType !== "on") continue;

      zoneOnCount.set(e.zoneId, (zoneOnCount.get(e.zoneId) ?? 0) + 1);

      const next = nodeEvents.slice(i + 1).find((x) => x.eventType === "off");
      const offTime = next ? next.timestamp : cap;
      const secs = Math.max(0, (offTime.getTime() - e.timestamp.getTime()) / 1000);
      zoneOnSecs.set(e.zoneId, (zoneOnSecs.get(e.zoneId) ?? 0) + secs);
    }
  }

  const allZoneIds = [...new Set([...zoneOnSecs.keys(), ...zoneOnCount.keys()])];
  const zones = allZoneIds.map((zId) => ({
    zoneId: zId,
    totalOnHours: Math.round((zoneOnSecs.get(zId) ?? 0) / 36) / 100,
    onCount: zoneOnCount.get(zId) ?? 0,
  }));

  const totalOnHours = Math.round(zones.reduce((s, z) => s + z.totalOnHours, 0) * 100) / 100;
  const totalOnCount = zones.reduce((s, z) => s + z.onCount, 0);

  return NextResponse.json({
    date,
    summary: { totalOnHours, totalOnCount },
    zones,
    events,
  });
}
