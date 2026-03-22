"use client";

import { memo } from "react";
import type { WeekOption } from "@/lib/weekRange";

type Props = {
  weeks: WeekOption[];
  value: string;
  onChange: (weekStartYmd: string) => void;
};

export const WeekSelector = memo(function WeekSelector({ weeks, value, onChange }: Props) {
  return (
    <div className="no-scrollbar -mx-1 flex w-full max-w-full gap-2 overflow-x-auto pb-2 pt-1 sm:-mx-0 sm:px-0">
      {weeks.map((w) => {
        const active = w.weekStartYmd === value;
        return (
          <button
            key={w.weekStartYmd}
            type="button"
            onClick={() => onChange(w.weekStartYmd)}
            className={`flex-shrink-0 snap-start rounded-full border px-4 py-2 text-left transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
                : "border-zinc-200/90 bg-white/90 text-zinc-700 hover:border-zinc-400"
            }`}
          >
            <div className={`text-[11px] font-semibold ${active ? "text-zinc-200" : "text-zinc-500"}`}>
              Week {w.isoWeekNumber}
            </div>
            <div className="text-xs tabular-nums">{w.label}</div>
          </button>
        );
      })}
    </div>
  );
});
