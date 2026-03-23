import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin";
import { ADMIN_BLOCK_USER } from "@/types/timebridge";
import { utcSlotKey } from "@/lib/timeUtils";
import { isoWeekMetaForUtc } from "@/lib/weekRange";

export const runtime = "edge";

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const utcIso = String(body.utcIso ?? "");
    const utc = new Date(utcIso);
    if (Number.isNaN(utc.getTime())) {
      return NextResponse.json({ error: "Invalid utcIso" }, { status: 400 });
    }
    const key = utcSlotKey(utc);
    const { weekYear, weekNumber } = isoWeekMetaForUtc(utc);
    const supabase = getSupabaseServer();
    const { data: existing } = await supabase
      .from("availability")
      .select("id")
      .eq("user_name", ADMIN_BLOCK_USER)
      .eq("utc_time_slot", key)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("availability").delete().eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, action: "unblocked" });
    }
    const { error } = await supabase.from("availability").insert({
      user_name: ADMIN_BLOCK_USER,
      utc_time_slot: key,
      is_admin_blocked: true,
      week_year: weekYear,
      week_number: weekNumber,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, action: "blocked" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 503 });
  }
}
