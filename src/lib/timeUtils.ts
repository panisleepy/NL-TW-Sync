import { formatInTimeZone } from "date-fns-tz";
import { fromZonedTime } from "date-fns-tz";

export const TZ_TW = "Asia/Taipei";
export const TZ_NL = "Europe/Amsterdam";

/** 以台北行事曆日的 24 個整點，回傳對應的 UTC instant（IANA 自動處理 DST） */
export function getTaipeiDaySlotUtcInstants(dateYmd: string): Date[] {
  const parts = dateYmd.split("-").map(Number);
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = parts[2]!;
  const slots: Date[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(fromZonedTime(new Date(y, mo - 1, d, h, 0, 0, 0), TZ_TW));
  }
  return slots;
}

export function formatUtcInZone(utc: Date, zone: string, pattern: string): string {
  return formatInTimeZone(utc, zone, pattern);
}

/** 與後端 / DB 比對用的穩定鍵 */
export function utcSlotKey(utc: Date): string {
  return utc.toISOString();
}

/** 依台北「當日小時」回傳 header 圖示 */
export function taipeiHourMoodIcon(hour: number): string {
  if (hour >= 6 && hour <= 11) return "☀️";
  if (hour === 12 || hour === 13) return "🍱";
  if (hour >= 14 && hour <= 17) return "☕";
  if (hour >= 18 && hour <= 22) return "🌙";
  return "🌙";
}

/** 台北比阿姆斯特丹「快」幾小時（含歐洲 DST，台北固定 +8） */
export function taipeiAheadOfAmsterdamHours(utc: Date): number {
  const parseOff = (s: string) => {
    const m = s.match(/([+-])(\d{2}):(\d{2})/);
    if (!m) return 0;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (parseInt(m[2]!, 10) + parseInt(m[3]!, 10) / 60);
  };
  const tw = parseOff(formatInTimeZone(utc, TZ_TW, "XXX"));
  const nl = parseOff(formatInTimeZone(utc, TZ_NL, "XXX"));
  return tw - nl;
}
