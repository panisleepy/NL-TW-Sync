import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const patch: Record<string, string | null> = {};
    if ("title" in body) patch.title = body.title != null ? String(body.title) : null;
    if ("content" in body) patch.content = body.content != null ? String(body.content) : null;
    if ("image_url" in body) patch.image_url = body.image_url != null ? String(body.image_url) : null;
    if ("event_date" in body) patch.event_date = body.event_date != null ? String(body.event_date) : null;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("diaries").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ row: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 503 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("diaries").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 503 });
  }
}
