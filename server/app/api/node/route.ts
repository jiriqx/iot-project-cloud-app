import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const {zoneId} = body;

    //verifies that zoneId is received and is a valid mongodb objectId
    if(!zoneId || !zoneId.match(/^[a-f\d]{24}$/i)) {
        return NextResponse.json({error: "zoneId is either missing or in not valid objectId"}, {status: 400});
    }

    const zone = await prisma.zone.findUnique({where: {id: zoneId}})

    //making sure that zone exists
    if (!zone) {
        return NextResponse.json({error: "Zone not found"}, {status: 404});
    }

    const node = await prisma.node.create({
        data: {
            zoneId: zoneId,
            status: "inactive"
        }
    })

    return NextResponse.json({node}, {status: 201});
}