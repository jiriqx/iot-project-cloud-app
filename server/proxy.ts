import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function proxy(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await jwtVerify(token, secret);
  } catch {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/zone/:path*"],
};
