import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params as {id: string};

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
                    lights: {
                        include: {
                            events: {
                                orderBy: { timestamp: 'desc' },
                                take: 50,
                            },
                        },
                    },
                },
            },
        },
    });

    if (!zone || zone.ownerId !== ownerId) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json(zone);
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