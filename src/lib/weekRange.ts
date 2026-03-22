import { addDays, eachWeekOfInterval, getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TZ_NL, TZ_TW } from "@/lib/timeUtils";

/** 產品開放區間：2026/03–07（台北行事曆） */
export const RANGE_START_YMD = "2026-03-01";
export const RANGE_END_YMD = "2026-07-31";

/** 週次選擇器第一週：03/23（一）～ 03/29（日） */
export const SEASON_FIRST_WEEK_MONDAY_YMD = "2026-03-23";

export type WeekOption = {
  weekStartYmd: string;
  label: string;
  isoWeekYear: number;
  isoWeekNumber: number;
};

/** 台北時間整點 → UTC（+08:00 固定，無 DST） */
export function taipeiSlotUtcFromYmd(ymd: string, hour: number): Date {
  return parseISO(`${ymd}T${String(hour).padStart(2, "0")}:00:00+08:00`);
}

export function getWeekTaipeiDays(weekMondayYmd: string): string[] {
  const mondayNoon = parseISO(`${weekMondayYmd}T12:00:00+08:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mondayNoon, i);
    return formatInTimeZone(d, TZ_TW, "yyyy-MM-dd");
  });
}

/** 週一～週日 × 24 小時 = 168 格（列 = 台北當日 00:00–23:00） */
export function getWeekSlotMatrix(weekMondayYmd: string): {
  utc: Date;
  dayIndex: number;
  hour: number;
  key: string;
}[] {
  const days = getWeekTaipeiDays(weekMondayYmd);
  const cells: { utc: Date; dayIndex: number; hour: number; key: string }[] = [];
  days.forEach((ymd, dayIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const utc = taipeiSlotUtcFromYmd(ymd, hour);
      cells.push({ utc, dayIndex, hour, key: utc.toISOString() });
    }
  });
  return cells;
}

/**
 * 管理員格線：欄仍為同一週（台北週一～日），列 = 阿姆斯特丹當地 00:00–23:00。
 * 每欄取「該台北日正午」對應的阿姆斯特丹曆日，再展開 24 個 AMS 整點 → UTC。
 */
export function getWeekSlotMatrixAmsterdamPrimary(weekMondayYmd: string): {
  utc: Date;
  dayIndex: number;
  hour: number;
  key: string;
}[] {
  const days = getWeekTaipeiDays(weekMondayYmd);
  const cells: { utc: Date; dayIndex: number; hour: number; key: string }[] = [];
  days.forEach((tpeYmd, dayIndex) => {
    const noonTpe = parseISO(`${tpeYmd}T12:00:00+08:00`);
    const amsYmd = formatInTimeZone(noonTpe, TZ_NL, "yyyy-MM-dd");
    for (let amsHour = 0; amsHour < 24; amsHour++) {
      const wall = `${amsYmd}T${String(amsHour).padStart(2, "0")}:00:00`;
      const utc = fromZonedTime(wall, TZ_NL);
      cells.push({ utc, dayIndex, hour: amsHour, key: utc.toISOString() });
    }
  });
  return cells;
}

/** 單週內所有可能出現在格線上的 UTC slot 鍵（台北主軸 ∪ 阿姆斯特丹主軸） */
export function getWeekAvailabilitySlotKeys(weekMondayYmd: string): string[] {
  const a = getWeekSlotMatrix(weekMondayYmd).map((c) => c.key);
  const b = getWeekSlotMatrixAmsterdamPrimary(weekMondayYmd).map((c) => c.key);
  return Array.from(new Set([...a, ...b]));
}

export function isoWeekMetaForUtc(utc: Date): { weekYear: number; weekNumber: number } {
  const ymd = formatInTimeZone(utc, TZ_TW, "yyyy-MM-dd");
  const noon = parseISO(`${ymd}T12:00:00+08:00`);
  return {
    weekYear: getISOWeekYear(noon),
    weekNumber: getISOWeek(noon),
  };
}

/** 3/23 起至 7 月底、每週一開始的週次列表（不含 3/23 之前） */
export function enumerateWeeksInSeason(): WeekOption[] {
  const start = parseISO(`${SEASON_FIRST_WEEK_MONDAY_YMD}T12:00:00+08:00`);
  const end = parseISO(`${RANGE_END_YMD}T23:59:59+08:00`);
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  return weeks.map((monday) => {
    const weekStartYmd = formatInTimeZone(monday, TZ_TW, "yyyy-MM-dd");
    const sun = addDays(monday, 6);
    const label = `${formatInTimeZone(monday, TZ_TW, "MM/dd")} – ${formatInTimeZone(sun, TZ_TW, "MM/dd")}`;
    return {
      weekStartYmd,
      label,
      isoWeekYear: getISOWeekYear(monday),
      isoWeekNumber: getISOWeek(monday),
    };
  });
}

/** 預設選取「今天（台北）」所屬週；早於首週則首週，晚於末週則末週 */
export function defaultWeekStartYmd(): string {
  const list = enumerateWeeksInSeason();
  if (list.length === 0) return SEASON_FIRST_WEEK_MONDAY_YMD;

  const today = formatInTimeZone(new Date(), TZ_TW, "yyyy-MM-dd");
  const firstStart = list[0]!.weekStartYmd;
  const lastStart = list[list.length - 1]!.weekStartYmd;
  const lastEnd = getWeekTaipeiDays(lastStart)[6]!;

  if (today < firstStart) return firstStart;
  if (today > lastEnd) return lastStart;

  const hit = list.find((w) => {
    const end = getWeekTaipeiDays(w.weekStartYmd)[6]!;
    return w.weekStartYmd <= today && today <= end;
  });
  return hit?.weekStartYmd ?? firstStart;
}
