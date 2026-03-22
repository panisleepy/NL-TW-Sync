import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin";

export async function GET() {
  return NextResponse.json({ admin: isAdminSession() });
}
