"use client";

import { memo } from "react";

type Props = {
  utcKey: string;
  peopleCount: number;
  filterMode: boolean;
  blocked: boolean;
  preview: boolean;
  adminPickStripe: boolean;
  pulse: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerLeave: () => void;
};

function discreteBg(count: number, filterMode: boolean): string {
  if (count <= 0) return "#FFFFFF";
  if (filterMode) return "#FFEDD5";
  if (count === 1) return "#FFEDD5";
  if (count === 2) return "#FDBA74";
  return "#FB923C";
}

export const WeekCell = memo(function WeekCell({
  utcKey,
  peopleCount,
  filterMode,
  blocked: blockedCell,
  preview,
  adminPickStripe,
  pulse,
  onPointerDown,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const bg = blockedCell ? "#E5E7EB" : discreteBg(peopleCount, filterMode);

  return (
    <div
      role="gridcell"
      data-slot={utcKey}
      className={`relative h-full min-h-[1.5rem] min-w-0 cursor-pointer touch-manipulation rounded-none sm:min-h-[1.75rem] ${
        preview ? "ring-2 ring-zinc-800 ring-offset-0" : ""
      } ${pulse ? "tb-slot-pulse" : ""} ${adminPickStripe ? "tb-admin-slot" : ""}`}
      style={{
        backgroundColor: bg,
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    />
  );
});
