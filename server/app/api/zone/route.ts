import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// CREATE ZONE
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      timeoutSeconds,
      sensorSensitivity,
      lightingMode,
      nightModeStart,
      nightModeEnd,
    } = body;

   //valiidace 
    if (!name || timeoutSeconds === undefined || !sensorSensitivity || !lightingMode) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, timeoutSeconds, sensorSensitivity, lightingMode",
        },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.create({
      data: {
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
export async function GET() {
  try {
    const zones = await prisma.zone.findMany();

    return NextResponse.json({ zones }, { status: 200 });
  } catch (error) {
    console.error("GET /api/zone error:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}