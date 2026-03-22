import { formatInTimeZone } from "date-fns-tz";
import { zhTW } from "date-fns/locale";
import { TZ_TW } from "@/lib/timeUtils";

const HOUR_MS = 60 * 60 * 1000;

function slotMsFromMinutes(slotDurationMinutes: number): number {
  return Math.max(1, slotDurationMinutes) * 60 * 1000;
}

export type MergedUtcRange = {
  start: Date;
  /** 最後一格之後的瞬間（與下一段不連續），顯示結束時間用此點的 HH:mm */
  endExclusive: Date;
  keys: string[];
};

/**
 * 將 UTC ISO 鍵合併為連續區間（每格長度 slotMs，[start, endExclusive)）。
 */
export function mergeUtcSlotKeysWithSlotMs(isoKeys: string[], slotMs: number): MergedUtcRange[] {
  if (isoKeys.length === 0 || slotMs <= 0) return [];
  const sorted = Array.from(new Set(isoKeys)).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const out: MergedUtcRange[] = [];
  let runKeys = [sorted[0]!];
  let runStart = new Date(sorted[0]!);
  let runEndEx = new Date(runStart.getTime() + slotMs);

  for (let i = 1; i < sorted.length; i++) {
    const k = sorted[i]!;
    const t = new Date(k);
    if (t.getTime() === runEndEx.getTime()) {
      runKeys.push(k);
      runEndEx = new Date(runEndEx.getTime() + slotMs);
    } else {
      out.push({ start: runStart, endExclusive: runEndEx, keys: runKeys });
      runKeys = [k];
      runStart = t;
      runEndEx = new Date(t.getTime() + slotMs);
    }
  }
  out.push({ start: runStart, endExclusive: runEndEx, keys: runKeys });
  return out;
}

/**
 * 將整點 UTC ISO 鍵合併為連續區間（每格代表 1 小時 [start, start+1h)）。
 */
export function mergeUtcSlotKeys(isoKeys: string[]): MergedUtcRange[] {
  return mergeUtcSlotKeysWithSlotMs(isoKeys, HOUR_MS);
}

/** 依指定時區的曆日切分（跨日連續 UTC 格拆成多段） */
export function splitMergedRangesByZoneDay(
  ranges: MergedUtcRange[],
  zone: string,
  slotMs: number = HOUR_MS,
): MergedUtcRange[] {
  const out: MergedUtcRange[] = [];
  for (const r of ranges) {
    if (r.keys.length === 0) continue;
    let chunk: string[] = [];
    let prevYmd: string | null = null;
    const flush = () => {
      if (chunk.length === 0) return;
      const start = new Date(chunk[0]!);
      const endExclusive = new Date(new Date(chunk[chunk.length - 1]!).getTime() + slotMs);
      out.push({ start, endExclusive, keys: [...chunk] });
      chunk = [];
    };
    for (const k of r.keys) {
      const ymd = formatInTimeZone(new Date(k), zone, "yyyy-MM-dd");
      if (prevYmd !== null && ymd !== prevYmd) {
        flush();
      }
      chunk.push(k);
      prevYmd = ymd;
    }
    flush();
  }
  return out;
}

/** @deprecated 使用 splitMergedRangesByZoneDay(ranges, TZ_TW) */
export function splitMergedRangesByTaipeiDay(ranges: MergedUtcRange[]): MergedUtcRange[] {
  return splitMergedRangesByZoneDay(ranges, TZ_TW);
}

/** 單一區間，日期與時間皆依指定時區 */
export function formatMergedRangeInZone(r: MergedUtcRange, zone: string): string {
  const datePart = formatInTimeZone(r.start, zone, "M/d (EEE)", { locale: zhTW });
  const t0 = formatInTimeZone(r.start, zone, "HH:mm");
  const t1 = formatInTimeZone(r.endExclusive, zone, "HH:mm");
  return `${datePart} ${t0}~${t1}`;
}

export function formatMergedRangeTaipeiLine(r: MergedUtcRange): string {
  return formatMergedRangeInZone(r, TZ_TW);
}

export function formatMergedRangesTaipeiLines(ranges: MergedUtcRange[]): string[] {
  return splitMergedRangesByZoneDay(ranges, TZ_TW).map(formatMergedRangeTaipeiLine);
}

export function mergedRangesForSummary(
  ranges: MergedUtcRange[],
  zone: string,
  slotMs: number = HOUR_MS,
): MergedUtcRange[] {
  return splitMergedRangesByZoneDay(ranges, zone, slotMs);
}

/** 例：星期二 → 週二 */
export function weekdayShortZhInZone(isoOrDate: string | Date, zone: string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const s = formatInTimeZone(d, zone, "EEEE", { locale: zhTW });
  return s.replace(/^星期/, "週");
}

/**
 * 將重疊時段的 ISO 鍵轉成可讀連續區間字串（依指定時區的週幾與當日時間）。
 * @param slotDurationMinutes 每格長度；預設 60 與目前網格一致。
 * @example slotDurationMinutes=30 且四格為 17:00、17:30、18:00、21:00 → 「週二 17:00 ~ 18:30, 21:00 ~ 21:30」
 */
export function getContinuousRanges(
  isoKeys: string[],
  zone: string,
  slotDurationMinutes: number = 60,
): string {
  if (isoKeys.length === 0) return "";
  const slotMs = slotMsFromMinutes(slotDurationMinutes);
  const merged = mergeUtcSlotKeysWithSlotMs(isoKeys, slotMs);
  const byDay = splitMergedRangesByZoneDay(merged, zone, slotMs);

  const byYmd = new Map<string, MergedUtcRange[]>();
  for (const r of byDay) {
    const ymd = formatInTimeZone(r.start, zone, "yyyy-MM-dd");
    if (!byYmd.has(ymd)) byYmd.set(ymd, []);
    byYmd.get(ymd)!.push(r);
  }

  const ymds = Array.from(byYmd.keys()).sort();
  const lines: string[] = [];
  for (const ymd of ymds) {
    const ranges = byYmd.get(ymd)!;
    ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const wd = weekdayShortZhInZone(ranges[0]!.start, zone);
    const parts = ranges.map((r) => {
      const t0 = formatInTimeZone(r.start, zone, "HH:mm");
      const t1 = formatInTimeZone(r.endExclusive, zone, "HH:mm");
      return `${t0} ~ ${t1}`;
    });
    lines.push(`${wd} ${parts.join(", ")}`);
  }
  return lines.join("　");
}
