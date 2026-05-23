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

    // Compute isOnline from pings collection
    const allMacs = zone.nodes
        .map((n) => n.mac)
        .filter((m): m is string => !!m);

    const pingMap = new Map<string, number>();

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