"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TZ_NL, TZ_TW, formatUtcInZone, utcSlotKey } from "@/lib/timeUtils";
import type { AvailabilityRow } from "@/types/timebridge";
import {
  getWeekSlotMatrix,
  getWeekSlotMatrixAmsterdamPrimary,
  getWeekTaipeiDays,
} from "@/lib/weekRange";
import { WeekCell } from "./WeekCell";

const DAYS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

function buildMaps(rows: AvailabilityRow[]) {
  const namesBySlot = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.is_admin_blocked) continue;
    const k = utcSlotKey(new Date(r.utc_time_slot));
    if (!namesBySlot.has(k)) namesBySlot.set(k, new Set());
    namesBySlot.get(k)!.add(r.user_name);
  }
  return { namesBySlot };
}

type Props = {
  weekStartYmd: string;
  rows: AvailabilityRow[];
  draftKeys: Set<string>;
  effectiveName: string;
  filterUser: string | null;
  primaryZone: "taipei" | "amsterdam";
  admin: boolean;
  /** 一般使用者：熱度可見，但 tooltip 不顯示他人暱稱 */
  anonymousHeatmap?: boolean;
  pulseKeys: Set<string>;
  weekEmpty: boolean;
  onGestureComplete: (keys: string[], mode: "add" | "remove") => void;
};

export const WeeklyGrid = memo(function WeeklyGrid({
  weekStartYmd,
  rows,
  draftKeys,
  effectiveName,
  filterUser,
  primaryZone,
  admin,
  anonymousHeatmap = false,
  pulseKeys,
  weekEmpty,
  onGestureComplete,
}: Props) {
  const slotMatrix = useMemo(() => {
    return primaryZone === "amsterdam"
      ? getWeekSlotMatrixAmsterdamPrimary(weekStartYmd)
      : getWeekSlotMatrix(weekStartYmd);
  }, [weekStartYmd, primaryZone]);
  const dayLabels = useMemo(() => getWeekTaipeiDays(weekStartYmd), [weekStartYmd]);

  const slotAt = useMemo(() => {
    const m = new Map<string, (typeof slotMatrix)[0]>();
    for (const x of slotMatrix) m.set(`${x.dayIndex}-${x.hour}`, x);
    return m;
  }, [slotMatrix]);

  const { namesBySlot } = useMemo(() => buildMaps(rows), [rows]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const filterMode = Boolean(filterUser);

  const countAt = useCallback(
    (k: string) => {
      const set = namesBySlot.get(k);
      if (filterUser) return set?.has(filterUser) ? 1 : 0;
      return set?.size ?? 0;
    },
    [namesBySlot, filterUser],
  );

  const draftKeysRef = useRef(draftKeys);
  draftKeysRef.current = draftKeys;

  const [dragPreview, setDragPreview] = useState<Set<string> | null>(null);
  const anchorRef = useRef<string | null>(null);
  const enteredOtherRef = useRef(false);
  const dragSetRef = useRef<Set<string>>(new Set());
  const modeRef = useRef<"add" | "remove">("add");

  const onGestureRef = useRef(onGestureComplete);
  onGestureRef.current = onGestureComplete;

  const resetDrag = useCallback(() => {
    anchorRef.current = null;
    enteredOtherRef.current = false;
    dragSetRef.current = new Set();
    setDragPreview(null);
  }, []);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const tooltipText = useCallback(
    (k: string) => {
      const names = namesBySlot.get(k);
      const arr = names ? Array.from(names) : [];
      if (arr.length === 0) return "尚無人標示有空";
      if (anonymousHeatmap) return `此時段共有 ${arr.length} 人標示有空（名單已隱藏）`;
      return `有空：${arr.join("、")}`;
    },
    [namesBySlot, anonymousHeatmap],
  );

  useEffect(() => {
    const up = () => {
      if (!anchorRef.current) return;
      const entered = enteredOtherRef.current;
      const keys = Array.from(dragSetRef.current);
      if (!effectiveName.trim()) {
        resetDrag();
        return;
      }

      if (!entered && keys.length === 1) {
        const k = keys[0]!;
        const has = draftKeysRef.current.has(k);
        onGestureRef.current([k], has ? "remove" : "add");
        resetDrag();
        return;
      }

      if (modeRef.current === "add") {
        const toAdd = keys.filter((k) => !draftKeysRef.current.has(k));
        if (toAdd.length) onGestureRef.current(toAdd, "add");
      } else {
        const toRemove = keys.filter((k) => draftKeysRef.current.has(k));
        if (toRemove.length) onGestureRef.current(toRemove, "remove");
      }
      resetDrag();
    };

    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [effectiveName, resetDrag]);

  const onCellDown = (key: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!effectiveName.trim()) return;
    const has = draftKeys.has(key);
    modeRef.current = has ? "remove" : "add";
    anchorRef.current = key;
    enteredOtherRef.current = false;
    dragSetRef.current = new Set([key]);
    setDragPreview(new Set([key]));
  };

  const onCellEnter = (key: string) => () => {
    if (!anchorRef.current) return;
    if (key !== anchorRef.current) enteredOtherRef.current = true;
    dragSetRef.current.add(key);
    setDragPreview(new Set(dragSetRef.current));
  };

  const axisHint =
    primaryZone === "taipei"
      ? "左側時間對齊每列頂端格線（該整點區間起點）；列為台北 00:00–23:59"
      : "左側時間對齊每列頂端格線（該整點區間起點）；列為阿姆斯特丹 00:00–23:59";

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9F8F3] p-1.5 shadow-sm sm:p-3 md:p-4">
      <p className="mb-2 px-0.5 font-light text-[10px] leading-snug tracking-tight text-zinc-500 sm:text-[11px]">
        {axisHint}
      </p>

      {weekEmpty && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#F9F8F3]/88 px-4"
          aria-hidden
        >
          <p className="max-w-[16rem] text-center text-sm font-medium text-zinc-600">
            這週還沒約好唷！☕️
          </p>
        </div>
      )}

      <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <div
          className="relative inline-grid min-w-[520px] w-full gap-px rounded-lg bg-[#E5E7EB] p-px md:min-w-full"
          style={{
            gridTemplateColumns: "minmax(4.75rem, 5.25rem) repeat(7, minmax(0, 1fr))",
            gridTemplateRows: `auto repeat(24, minmax(1.5rem, 1.75rem))`,
          }}
        >
          <div
            className="sticky left-0 z-20 flex flex-col justify-center bg-white px-1 py-2 font-light text-[10px] leading-tight text-zinc-600 sm:px-1.5 sm:text-[11px]"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            <span className="font-medium text-zinc-700">時間</span>
            <span className="text-[9px] leading-tight">
              {primaryZone === "amsterdam" ? (
                <>
                  <span className="font-semibold text-sky-700">AMS</span>
                  <span className="text-zinc-400">|</span>
                  <span className="text-zinc-500">TPE</span>
                </>
              ) : (
                <>
                  <span className="text-zinc-500">AMS</span>
                  <span className="text-zinc-400">|</span>
                  <span className="font-semibold text-emerald-700">TPE</span>
                </>
              )}
            </span>
          </div>
          {DAYS.map((d, i) => (
            <div
              key={d}
              className="flex flex-col items-center justify-center bg-[#FAFAF8] px-0.5 py-1.5 text-center font-light text-[9px] leading-tight text-zinc-700 sm:text-[10px]"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className="font-normal">{d}</span>
              <span className="text-[8px] text-zinc-500 sm:text-[9px]">
                {dayLabels[i]?.slice(5).replace("-", "/")}
              </span>
            </div>
          ))}

          {hours.map((hour) => {
            const ref = slotAt.get(`0-${hour}`);
            const nl = ref ? formatUtcInZone(ref.utc, TZ_NL, "HH:mm") : "";
            const tw = ref ? formatUtcInZone(ref.utc, TZ_TW, "HH:mm") : "";
            return (
              <Fragment key={hour}>
                <div
                  className="sticky left-0 z-10 flex items-start bg-white px-1 pb-0 pt-0.5 font-extralight tabular-nums text-[9px] leading-tight sm:text-[10px]"
                  style={{ gridColumn: 1, gridRow: hour + 2 }}
                >
                  {primaryZone === "amsterdam" ? (
                    <>
                      <span className="font-medium text-sky-700">{nl}</span>
                      <span className="mx-px text-zinc-300">|</span>
                      <span className="font-extralight text-zinc-500">{tw}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-extralight text-zinc-500">{nl}</span>
                      <span className="mx-px text-zinc-300">|</span>
                      <span className="font-medium text-emerald-700">{tw}</span>
                    </>
                  )}
                </div>
                {DAYS.map((_, dayIndex) => {
                  const cell = slotAt.get(`${dayIndex}-${hour}`);
                  if (!cell) return null;
                  const k = cell.key;
                  const n = countAt(k);
                  return (
                    <div key={k} className="min-h-0 min-w-0 bg-white" style={{ gridColumn: dayIndex + 2, gridRow: hour + 2 }}>
                      <WeekCell
                        utcKey={k}
                        peopleCount={n}
                        filterMode={filterMode}
                        blocked={false}
                        preview={dragPreview?.has(k) ?? false}
                        adminPickStripe={admin && draftKeys.has(k)}
                        pulse={pulseKeys.has(k)}
                        onPointerDown={onCellDown(k)}
                        onPointerEnter={onCellEnter(k)}
                        onPointerMove={(e) => {
                          setTooltip({ x: e.clientX, y: e.clientY, text: tooltipText(k) });
                        }}
                        onPointerLeave={() => setTooltip(null)}
                      />
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-[220px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-zinc-800 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
});
