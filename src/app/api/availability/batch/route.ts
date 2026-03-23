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
    const removeKeys = Array.from(
      new Set(
        removes
          .map((iso) => new Date(iso))
          .filter((utc) => !Number.isNaN(utc.getTime()))
          .map((utc) => utcSlotKey(utc)),
      ),
    );
    if (removeKeys.length > 0) {
      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("user_name", userName)
        .eq("is_admin_blocked", false)
        .in("utc_time_slot", removeKeys);
      if (error) throw error;
    }

    const addRows = Array.from(
      new Map(
        adds
          .map((iso) => new Date(iso))
          .filter((utc) => !Number.isNaN(utc.getTime()))
          .map((utc) => {
            const key = utcSlotKey(utc);
            const { weekYear, weekNumber } = isoWeekMetaForUtc(utc);
            return [
              key,
              {
                user_name: userName,
                utc_time_slot: key,
                is_admin_blocked: false,
                week_year: weekYear,
                week_number: weekNumber,
              },
            ] as const;
          }),
      ).values(),
    );
    if (addRows.length > 0) {
      const { error } = await supabase
        .from("availability")
        .upsert(addRows, { onConflict: "user_name,utc_time_slot", ignoreDuplicates: false });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, changed: removeKeys.length + addRows.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Batch failed" }, { status: 503 });
  }
}
