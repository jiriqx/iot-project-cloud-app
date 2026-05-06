import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params as {id: string};

    //verifies that id param is mongodb objectId
    if (!id.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const ownerId = await getUserId(request);

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