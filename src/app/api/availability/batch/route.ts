import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { utcSlotKey } from "@/lib/timeUtils";
import { isoWeekMetaForUtc } from "@/lib/weekRange";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userName = String(body.userName ?? "").trim();
    const adds = Array.isArray(body.adds) ? (body.adds as string[]) : [];
    const removes = Array.isArray(body.removes) ? (body.removes as string[]) : [];
    if (!userName) {
      return NextResponse.json({ error: "userName required" }, { status: 400 });
    }
    if (adds.length === 0 && removes.length === 0) {
      return NextResponse.json({ ok: true, changed: 0 });
    }
    const supabase = getSupabaseServer();

    for (const iso of removes) {
      const utc = new Date(iso);
      if (Number.isNaN(utc.getTime())) continue;
      const key = utcSlotKey(utc);
      await supabase
        .from("availability")
        .delete()
        .eq("user_name", userName)
        .eq("utc_time_slot", key)
        .eq("is_admin_blocked", false);
    }

    for (const iso of adds) {
      const utc = new Date(iso);
      if (Number.isNaN(utc.getTime())) continue;
      const key = utcSlotKey(utc);
      const { data: existing } = await supabase
        .from("availability")
        .select("id")
        .eq("user_name", userName)
        .eq("utc_time_slot", key)
        .maybeSingle();
      if (existing) continue;
      const { weekYear, weekNumber } = isoWeekMetaForUtc(utc);
      const { error } = await supabase.from("availability").insert({
        user_name: userName,
        utc_time_slot: key,
        is_admin_blocked: false,
        week_year: weekYear,
        week_number: weekNumber,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Batch failed" }, { status: 503 });
  }
}
