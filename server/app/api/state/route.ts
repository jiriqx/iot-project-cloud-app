import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/state
// Called by the gateway when a device reports a state change.
// Body: { gatewayId: string, deviceId: string, state: boolean }
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { gatewayId, deviceId, state } = body;

    if (!gatewayId || !deviceId || typeof state !== "boolean") {
        return NextResponse.json(
            { error: "gatewayId, deviceId and state are required" },
            { status: 400 }
        );
    }

    const externalId = `${gatewayId}/${deviceId}`;

    const node = await prisma.node.findUnique({ where: { externalId } });

    if (!node) {
        return NextResponse.json(
            { error: `Node with externalId '${externalId}' not found` },
            { status: 404 }
        );
    }

    const light = await prisma.light.findFirst({ where: { nodeId: node.id } });

    if (!light) {
        return NextResponse.json(
            { error: "No light found for this node" },
            { status: 404 }
        );
    }

    await prisma.light.update({
        where: { id: light.id },
        data: { status: state ? "on" : "off" },
    });

    const event = await prisma.lightEvent.create({
        data: {
            lightId: light.id,
            nodeId: node.id,
            eventType: state ? "on" : "off",
            trigger: "auto",
        },
    });

    return NextResponse.json({ event }, { status: 201 });
}
