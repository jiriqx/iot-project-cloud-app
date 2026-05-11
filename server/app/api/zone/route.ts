import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createZoneSchema } from "@/lib/schemas";
import { auth } from "@/auth";

// CREATE ZONE
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = session.user.id;
    const body = await request.json();
    const parsed = createZoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, timeoutSeconds, sensorSensitivity, lightingMode, nightModeStart, nightModeEnd } =
      parsed.data;

    const zone = await prisma.zone.create({
      data: {
        ownerId,
        name,
        timeoutSeconds,
        sensorSensitivity,
        lightingMode,
        nightModeStart,
        nightModeEnd,
      },
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create zone" },
      { status: 500 }
    );
  }
}

// GET ALL ZONES
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = session.user.id;
    const zones = await prisma.zone.findMany({
      where: { ownerId },
      include: {
        nodes: {
          include: {
            lights: true,
            events: { orderBy: { timestamp: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Collect all node MACs and query the gateway's statechanges collection
    const allMacs = zones
      .flatMap((z) => z.nodes.map((n) => n.mac))
      .filter((m): m is string => !!m);

    const stateMap = new Map<string, { state: boolean; timestamp: string }>();
    const pingMap = new Map<string, string>();

    if (allMacs.length > 0) {
      const result = (await prisma.$runCommandRaw({
        aggregate: "statechanges",
        pipeline: [
          { $match: { deviceMac: { $in: allMacs } } },
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: "$deviceMac",
              state: { $first: "$state" },
              timestamp: { $first: "$timestamp" },
            },
          },
        ],
        cursor: {},
      })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

      for (const doc of result.cursor?.firstBatch ?? []) {
        const ts = (doc.timestamp as Record<string, unknown>)?.$date;
        const timestamp =
          typeof ts === "string"
            ? ts
            : typeof (ts as Record<string, string>)?.$numberLong === "string"
              ? new Date(parseInt((ts as Record<string, string>).$numberLong)).toISOString()
              : new Date(doc.timestamp as string).toISOString();
        stateMap.set(doc._id as string, {
          state: doc.state as boolean,
          timestamp,
        });
      }

      // Query pings collection for lastPing per MAC
      const pingResult = (await prisma.$runCommandRaw({
        aggregate: "pings",
        pipeline: [
          { $match: { deviceMac: { $in: allMacs } } },
        ],
        cursor: {},
      })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

      for (const doc of pingResult.cursor?.firstBatch ?? []) {
        const ts = (doc.lastPing as Record<string, unknown>)?.$date;
        const timestamp =
          typeof ts === "string"
            ? ts
            : typeof (ts as Record<string, string>)?.$numberLong === "string"
              ? new Date(parseInt((ts as Record<string, string>).$numberLong)).toISOString()
              : new Date(doc.lastPing as string).toISOString();
        pingMap.set(doc.deviceMac as string, timestamp);
      }
    }

    const enrichedZones = zones.map((zone) => ({
      ...zone,
      nodes: zone.nodes.map((node) => ({
        ...node,
        lastStateChange: node.mac ? stateMap.get(node.mac) ?? null : null,
        lastPing: node.mac ? pingMap.get(node.mac) ?? null : null,
      })),
    }));

    return NextResponse.json({ zones: enrichedZones }, { status: 200 });
  } catch (error) {
    console.error("GET /api/zone error:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}