import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/admin";

export async function POST(req: Request) {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const password = String(body.password ?? "");
    if (password !== pwd) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const jar = await cookies();
    jar.set(ADMIN_COOKIE_NAME, "1", adminCookieOptions());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
