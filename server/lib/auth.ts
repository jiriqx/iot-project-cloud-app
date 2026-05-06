import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getUserId(request: NextRequest): Promise<string> {
  const token = request.headers.get("Authorization")!.slice(7);
  const { payload } = await jwtVerify(token, secret);
  return payload.sub as string;
}
