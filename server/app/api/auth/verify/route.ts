import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await getUserId(request);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
