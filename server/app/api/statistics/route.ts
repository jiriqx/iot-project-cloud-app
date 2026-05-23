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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get("days") || 30), 365);
    const zoneId = searchParams.get("zoneId"); // optional filter

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all zones belonging to the user, with node MACs
    const zones = await prisma.zone.findMany({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        nodes: { select: { id: true, mac: true } },
      },
    });

    const zoneMap = new Map(zones.map((z) => [z.id, z.name]));
    const macToZone = new Map<string, { zoneId: string; zoneName: string }>();
    const allMacs: string[] = [];

    const targetZones = zoneId ? zones.filter((z) => z.id === zoneId) : zones;
    for (const z of targetZones) {
      for (const n of z.nodes) {
        if (n.mac) {
          macToZone.set(n.mac, { zoneId: z.id, zoneName: z.name });
          allMacs.push(n.mac);
        }
      }
    }

    if (allMacs.length === 0) {
      return NextResponse.json({
        metrics: { totalHours: 0, totalEvents: 0, avgMinutes: 0 },
        zoneStats: [],
        recentEvents: [],
      });
    }

    // Query statechanges collection for all relevant MACs since the time window
    const result = (await prisma.$runCommandRaw({
      aggregate: "statechanges",
      pipeline: [
        {
          $match: {
            deviceMac: { $in: allMacs },
            timestamp: { $gte: { $date: since.toISOString() } },
          },
        },
        { $sort: { timestamp: -1 } },
      ],
      cursor: { batchSize: 50000 },
    })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

    const docs = result.cursor?.firstBatch ?? [];

    // Sort ascending for duration calculation
    docs.sort(
      (a, b) =>
        parseMongoDate(a.timestamp).getTime() -
        parseMongoDate(b.timestamp).getTime()
    );

    // Group by MAC, ordered by timestamp
    const byMac = new Map<
      string,
      Array<{ state: boolean; timestamp: Date }>
    >();
    for (const doc of docs) {
      const mac = doc.deviceMac as string;
      const ts = parseMongoDate(doc.timestamp);
      const state = doc.state as boolean;
      if (!byMac.has(mac)) byMac.set(mac, []);
      byMac.get(mac)!.push({ state, timestamp: ts });
    }

    // Calculate durations: for each "on" event, find the next "off" (or use now)
    const now = new Date();
    let totalOnSeconds = 0;
    let totalOnEvents = 0;
    const zoneSecondsMap = new Map<string, number>();

    for (const [mac, events] of byMac) {
      const info = macToZone.get(mac);
      if (!info) continue;

      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.state) {
          totalOnEvents++;

          let offTime = now;
          for (let j = i + 1; j < events.length; j++) {
            if (!events[j].state) {
              offTime = events[j].timestamp;
              break;
            }
          }
          const durationSec = Math.max(
            0,
            (offTime.getTime() - e.timestamp.getTime()) / 1000
          );
          totalOnSeconds += durationSec;
          zoneSecondsMap.set(
            info.zoneId,
            (zoneSecondsMap.get(info.zoneId) ?? 0) + durationSec
          );
        }
      }
    }

    // ── Metrics ──
    const totalHours = Math.round(totalOnSeconds / 3600);
    const avgMinutes =
      totalOnEvents > 0
        ? Math.round(totalOnSeconds / 60 / totalOnEvents)
        : 0;

    // ── Per-zone stats ──
    const zoneStatsRaw = [...zoneSecondsMap.entries()]
      .map(([zId, secs]) => ({
        id: zId,
        name: zoneMap.get(zId) ?? zId,
        hours: Math.round(secs / 3600),
      }))
      .sort((a, b) => b.hours - a.hours);

    const avgZoneHours =
      zoneStatsRaw.length > 0
        ? zoneStatsRaw.reduce((s, z) => s + z.hours, 0) / zoneStatsRaw.length
        : 0;

    const zoneStats = zoneStatsRaw.map((z) => ({
      ...z,
      anomaly: avgZoneHours > 0 && z.hours > avgZoneHours * 2,
    }));

    // ── Recent events (last 20, newest first) ──
    const recentEvents = docs
      .slice()
      .sort(
        (a, b) =>
          parseMongoDate(b.timestamp).getTime() -
          parseMongoDate(a.timestamp).getTime()
      )
      .slice(0, 20)
      .map((doc) => {
        const mac = doc.deviceMac as string;
        const info = macToZone.get(mac);
        const rawId = doc._id as Record<string, unknown> | string;
        const id =
          typeof rawId === "string"
            ? rawId
            : (rawId as Record<string, string>)?.$oid ?? String(rawId);
        const ts = parseMongoDate(doc.timestamp);
        const state = doc.state as boolean;

        // Calculate duration for "on" events
        let durationSeconds: number | null = null;
        if (state) {
          const macEvents = byMac.get(mac) ?? [];
          const idx = macEvents.findIndex(
            (e) => e.timestamp.getTime() === ts.getTime() && e.state
          );
          if (idx >= 0) {
            let offTime = now;
            for (let j = idx + 1; j < macEvents.length; j++) {
              if (!macEvents[j].state) {
                offTime = macEvents[j].timestamp;
                break;
              }
            }
            durationSeconds = Math.round(
              (offTime.getTime() - ts.getTime()) / 1000
            );
          }
        }

        return {
          id,
          timestamp: ts.toISOString(),
          zone: info?.zoneName ?? "",
          light: mac,
          state: state ? "zapnuto" : "zhasnuto",
          trigger: (doc.trigger as string) === "manual" ? "manuálně" : "auto",
          durationSeconds,
        };
      });

    return NextResponse.json({
      metrics: { totalHours, totalEvents: totalOnEvents, avgMinutes },
      zoneStats,
      recentEvents,
    });
  } catch (error) {
    console.error("GET /api/statistics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
