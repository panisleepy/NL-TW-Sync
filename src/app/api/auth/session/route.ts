import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ admin: await isAdminSession() });
}
