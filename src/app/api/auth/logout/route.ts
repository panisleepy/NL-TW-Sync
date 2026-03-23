import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin";

export const runtime = "edge";

export async function POST() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
