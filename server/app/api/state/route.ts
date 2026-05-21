import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/state
// Called by the gateway when a device reports a state change.
// Body: { gatewayId: string, deviceMac: string, state: boolean }
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { gatewayId, deviceMac, state } = body;

    if (!gatewayId || !deviceMac || typeof state !== "boolean") {
        return NextResponse.json(
            { error: "gatewayId, deviceMac and state are required" },
            { status: 400 }
        );
    }

    const node = await prisma.node.findUnique({ where: { mac: deviceMac } });

    if (!node) {
        return NextResponse.json(
            { error: `Node with mac '${deviceMac}' not found` },
            { status: 404 }
        );
    }

    const event = await prisma.lightEvent.create({
        data: {
            zoneId: node.zoneId,
            nodeId: node.id,
            eventType: state ? "on" : "off",
            trigger: "auto",
        },
    });

    return NextResponse.json({ event }, { status: 201 });
}
