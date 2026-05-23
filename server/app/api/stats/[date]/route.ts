import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

function parseMongoDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  const obj = raw as Record<string, unknown> | undefined;
  const d = obj?.$date;
  if (typeof d === "string") return new Date(d);
  if (typeof (d as Record<string, string>)?.$numberLong === "string")
    return new Date(parseInt((d as Record<string, string>).$numberLong));
  return new Date(raw as string);
}

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

  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);

  // Get zones belonging to the user, with node MACs
  const zones = await prisma.zone.findMany({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      nodes: { select: { id: true, mac: true } },
    },
  });

  const macToZone = new Map<string, { zoneId: string; zoneName: string }>();
  const allMacs: string[] = [];

  for (const z of zones) {
    for (const n of z.nodes) {
      if (n.mac) {
        macToZone.set(n.mac, { zoneId: z.id, zoneName: z.name });
        allMacs.push(n.mac);
      }
    }
  }

  if (allMacs.length === 0)
    return NextResponse.json({
      date,
      summary: { totalOnHours: 0, totalOnCount: 0 },
      zones: [],
      events: [],
    });

  // Query statechanges collection for the given day
  const result = (await prisma.$runCommandRaw({
    aggregate: "statechanges",
    pipeline: [
      {
        $match: {
          deviceMac: { $in: allMacs },
          timestamp: {
            $gte: { $date: start.toISOString() },
            $lte: { $date: end.toISOString() },
          },
        },
      },
      { $sort: { deviceMac: 1, timestamp: 1 } },
    ],
    cursor: {},
  })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

  const docs = result.cursor?.firstBatch ?? [];

  // Group by MAC, ordered by timestamp
  const byMac = new Map<string, Array<{ state: boolean; timestamp: Date }>>();
  for (const doc of docs) {
    const mac = doc.deviceMac as string;
    const ts = parseMongoDate(doc.timestamp);
    const state = doc.state as boolean;
    if (!byMac.has(mac)) byMac.set(mac, []);
    byMac.get(mac)!.push({ state, timestamp: ts });
  }

  // Calculate durations: for each "on" event, find the next "off" (or cap)
  const cap = end < new Date() ? end : new Date();
  const zoneOnSecs = new Map<string, number>();
  const zoneOnCount = new Map<string, number>();

  for (const [mac, events] of byMac) {
    const info = macToZone.get(mac);
    if (!info) continue;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.state) continue; // only process "on" events

      zoneOnCount.set(info.zoneId, (zoneOnCount.get(info.zoneId) ?? 0) + 1);

      let offTime = cap;
      for (let j = i + 1; j < events.length; j++) {
        if (!events[j].state) {
          offTime = events[j].timestamp;
          break;
        }
      }
      const secs = Math.max(0, (offTime.getTime() - e.timestamp.getTime()) / 1000);
      zoneOnSecs.set(info.zoneId, (zoneOnSecs.get(info.zoneId) ?? 0) + secs);
    }
  }

  const allZoneIds = [...new Set([...zoneOnSecs.keys(), ...zoneOnCount.keys()])];
  const zoneStats = allZoneIds.map((zId) => ({
    zoneId: zId,
    totalOnHours: Math.round((zoneOnSecs.get(zId) ?? 0) / 36) / 100,
    onCount: zoneOnCount.get(zId) ?? 0,
  }));

  const totalOnHours = Math.round(zoneStats.reduce((s, z) => s + z.totalOnHours, 0) * 100) / 100;
  const totalOnCount = zoneStats.reduce((s, z) => s + z.onCount, 0);

  return NextResponse.json({
    date,
    summary: { totalOnHours, totalOnCount },
    zones: zoneStats,
  });
}
