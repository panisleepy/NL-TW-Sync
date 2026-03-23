import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin";
import { ADMIN_BLOCK_USER } from "@/types/timebridge";
import { utcSlotKey } from "@/lib/timeUtils";
import { isoWeekMetaForUtc } from "@/lib/weekRange";

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const adds = Array.isArray(body.adds) ? (body.adds as string[]) : [];
    const removes = Array.isArray(body.removes) ? (body.removes as string[]) : [];
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
        .eq("user_name", ADMIN_BLOCK_USER)
        .eq("is_admin_blocked", true)
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
                user_name: ADMIN_BLOCK_USER,
                utc_time_slot: key,
                is_admin_blocked: true,
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
    return NextResponse.json({ error: "Failed" }, { status: 503 });
  }
}
