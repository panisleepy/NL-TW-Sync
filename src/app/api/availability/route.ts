import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getWeekAvailabilitySlotKeys, isoWeekMetaForUtc } from "@/lib/weekRange";
import { utcSlotKey } from "@/lib/timeUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "Invalid weekStart (Monday yyyy-MM-dd)" }, { status: 400 });
  }
  try {
    const supabase = getSupabaseServer();
    const keys = getWeekAvailabilitySlotKeys(weekStart);
    const { data, error } = await supabase.from("availability").select("*").in("utc_time_slot", keys);
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });
  }
}

/** 單格切換（相容舊行為） */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userName = String(body.userName ?? "").trim();
    const utcIso = String(body.utcIso ?? "");
    if (!userName || !utcIso) {
      return NextResponse.json({ error: "userName and utcIso required" }, { status: 400 });
    }
    const utc = new Date(utcIso);
    if (Number.isNaN(utc.getTime())) {
      return NextResponse.json({ error: "Invalid utcIso" }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const key = utcSlotKey(utc);
    const { weekYear, weekNumber } = isoWeekMetaForUtc(utc);
    const { data: existing } = await supabase
      .from("availability")
      .select("id")
      .eq("user_name", userName)
      .eq("utc_time_slot", key)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("availability").delete().eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, action: "removed" });
    }
    const { error } = await supabase.from("availability").insert({
      user_name: userName,
      utc_time_slot: key,
      is_admin_blocked: false,
      week_year: weekYear,
      week_number: weekNumber,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, action: "added" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to toggle" }, { status: 503 });
  }
}
