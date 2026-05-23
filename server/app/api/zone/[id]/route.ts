import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params as { id: string };

    //verifies that id param is mongodb objectId
    if (!id.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = session.user.id;

    const zone = await prisma.zone.findUnique({
        where: { id },
        include: {
            nodes: {
                include: {
                    events: {
                        orderBy: { timestamp: 'desc' },
                        take: 50,
                    },
                },
            },
        },
    });

    if (!zone || zone.ownerId !== ownerId) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    // Compute isOnline and lastStateChange from gateway collections
    const allMacs = zone.nodes
        .map((n) => n.mac)
        .filter((m): m is string => !!m);

    const pingMap = new Map<string, number>();
    const stateMap = new Map<string, { state: boolean; timestamp: string; trigger: string }>();

    if (allMacs.length > 0) {
        const pingResult = (await prisma.$runCommandRaw({
            aggregate: "pings",
            pipeline: [
                { $match: { deviceMac: { $in: allMacs } } },
            ],
            cursor: {},
        })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

        for (const doc of pingResult.cursor?.firstBatch ?? []) {
            const ts = (doc.lastPing as Record<string, unknown>)?.$date;
            let epoch: number;
            if (typeof ts === "string") {
                epoch = new Date(ts).getTime();
            } else if (typeof (ts as Record<string, string>)?.$numberLong === "string") {
                epoch = parseInt((ts as Record<string, string>).$numberLong);
            } else {
                epoch = new Date(doc.lastPing as string).getTime();
            }
            pingMap.set(doc.deviceMac as string, epoch);
        }

        // Query statechanges for latest state per MAC
        const stateResult = (await prisma.$runCommandRaw({
            aggregate: "statechanges",
            pipeline: [
                { $match: { deviceMac: { $in: allMacs } } },
                { $sort: { timestamp: -1 } },
                {
                    $group: {
                        _id: "$deviceMac",
                        state: { $first: "$state" },
                        timestamp: { $first: "$timestamp" },
                        trigger: { $first: "$trigger" },
                    },
                },
            ],
            cursor: {},
        })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

        for (const doc of stateResult.cursor?.firstBatch ?? []) {
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
                trigger: (doc.trigger as string) ?? "auto",
            });
        }
    }

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const nowMs = Date.now();

    const enrichedZone = {
        ...zone,
        nodes: zone.nodes.map((node) => ({
            ...node,
            isOnline: node.mac
                ? (pingMap.has(node.mac) && nowMs - pingMap.get(node.mac)! < FIVE_MINUTES_MS)
                : false,
            lastStateChange: node.mac ? stateMap.get(node.mac) ?? null : null,
        })),
    };

    return NextResponse.json(enrichedZone);
}
//p
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params as { id: string };

    if (!id.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = session.user.id;

    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone || zone.ownerId !== ownerId) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, timeoutSeconds, sensorSensitivity, lightingMode, nightModeStart, nightModeEnd } = body;

    const updated = await prisma.zone.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(timeoutSeconds && { timeoutSeconds }),
            ...(sensorSensitivity && { sensorSensitivity }),
            ...(lightingMode && { lightingMode }),
            ...(nightModeStart !== undefined && { nightModeStart }),
            ...(nightModeEnd !== undefined && { nightModeEnd }),
        }
    });

    return NextResponse.json(updated);
}