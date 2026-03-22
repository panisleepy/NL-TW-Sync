import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin";
import { ADMIN_BLOCK_USER } from "@/types/timebridge";
import { utcSlotKey } from "@/lib/timeUtils";
import { isoWeekMetaForUtc } from "@/lib/weekRange";

export async function POST(req: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const adds = Array.isArray(body.adds) ? (body.adds as string[]) : [];
    const removes = Array.isArray(body.removes) ? (body.removes as string[]) : [];
    const supabase = getSupabaseServer();

    for (const iso of removes) {
      const utc = new Date(iso);
      if (Number.isNaN(utc.getTime())) continue;
      const key = utcSlotKey(utc);
      await supabase
        .from("availability")
        .delete()
        .eq("user_name", ADMIN_BLOCK_USER)
        .eq("utc_time_slot", key)
        .eq("is_admin_blocked", true);
    }

    for (const iso of adds) {
      const utc = new Date(iso);
      if (Number.isNaN(utc.getTime())) continue;
      const key = utcSlotKey(utc);
      const { data: existing } = await supabase
        .from("availability")
        .select("id")
        .eq("user_name", ADMIN_BLOCK_USER)
        .eq("utc_time_slot", key)
        .maybeSingle();
      if (existing) continue;
      const { weekYear, weekNumber } = isoWeekMetaForUtc(utc);
      const { error } = await supabase.from("availability").insert({
        user_name: ADMIN_BLOCK_USER,
        utc_time_slot: key,
        is_admin_blocked: true,
        week_year: weekYear,
        week_number: weekNumber,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 503 });
  }
}
