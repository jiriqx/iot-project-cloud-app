import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createZoneSchema } from "@/lib/schemas";

// CREATE ZONE
export async function POST(request: NextRequest) {
  try {
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