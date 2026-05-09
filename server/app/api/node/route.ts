import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { zoneId, mac } = body;

    if (!zoneId || !zoneId.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({ error: "zoneId is either missing or in not valid objectId" }, { status: 400 });
    }

    if (mac && !MAC_REGEX.test(mac)) {
        return NextResponse.json({ error: "mac must be a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)" }, { status: 400 });
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } })

    if (!zone) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (mac) {
        const existing = await prisma.node.findUnique({ where: { mac } });
        if (existing) {
            return NextResponse.json({ error: "A node with this MAC address already exists" }, { status: 409 });
        }
    }

    const node = await prisma.node.create({
        data: {
            zoneId: zoneId,
            mac: mac ?? null,
            status: "inactive"
        }
    })

    return NextResponse.json({ node }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { nodeId, mac } = body;

    if (!nodeId || !nodeId.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({ error: "nodeId is either missing or not a valid objectId" }, { status: 400 });
    }

    if (!mac || !MAC_REGEX.test(mac)) {
        return NextResponse.json({ error: "mac must be a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)" }, { status: 400 });
    }

    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const existing = await prisma.node.findUnique({ where: { mac } });
    if (existing && existing.id !== nodeId) {
        return NextResponse.json({ error: "A node with this MAC address already exists" }, { status: 409 });
    }

    const updated = await prisma.node.update({
        where: { id: nodeId },
        data: { mac }
    });

    return NextResponse.json({ node: updated }, { status: 200 });
}