import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("diaries")
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const title = body.title != null ? String(body.title) : null;
    const content = body.content != null ? String(body.content) : null;
    const image_url = body.image_url != null ? String(body.image_url) : null;
    const event_date = body.event_date != null ? String(body.event_date) : null;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("diaries")
      .insert({ title, content, image_url, event_date })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ row: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 503 });
  }
}
