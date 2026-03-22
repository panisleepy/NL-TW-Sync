"use client";

import { useMemo } from "react";
import type { AvailabilityRow } from "@/types/timebridge";
import { formatMergedRangeInZone, mergedRangesForSummary, mergeUtcSlotKeys } from "@/lib/mergeTimeSlots";
import { TZ_NL, TZ_TW, utcSlotKey } from "@/lib/timeUtils";

function keysForName(rows: AvailabilityRow[], name: string): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    if (r.is_admin_blocked) continue;
    if (r.user_name === name) s.add(utcSlotKey(new Date(r.utc_time_slot)));
  }
  return s;
}

function intersectKeys(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  Array.from(a).forEach((k) => {
    if (b.has(k)) out.push(k);
  });
  return out.sort((x, y) => new Date(x).getTime() - new Date(y).getTime());
}

type Props = {
  rows: AvailabilityRow[];
  admin: boolean;
  adminDisplayName: string;
  nickname: string;
  filterUser: string | null;
  onPulseKeys: (keys: string[]) => void;
};

export function MatchingSummary({
  rows,
  admin,
  adminDisplayName,
  nickname,
  filterUser,
  onPulseKeys,
}: Props) {
  const block = useMemo(() => {
    if (admin && !filterUser) {
      return { kind: "hint" as const };
    }
    if (!admin && !nickname.trim()) {
      return { kind: "hidden" as const };
    }

    const aName = admin ? adminDisplayName : nickname.trim();
    const bName = admin ? filterUser! : adminDisplayName;
    const heading = admin ? `你與 ${filterUser} 重疊的時間` : `你與 ${adminDisplayName} 重疊的時間`;

    const merged = mergeUtcSlotKeys(intersectKeys(keysForName(rows, aName), keysForName(rows, bName)));
    const summaryZone = admin ? TZ_NL : TZ_TW;
    const displayRanges = mergedRangesForSummary(merged, summaryZone);
    const lines = displayRanges.map((r) => formatMergedRangeInZone(r, summaryZone));
    return { kind: "data" as const, heading, displayRanges, lines, summaryZone };
  }, [rows, admin, adminDisplayName, nickname, filterUser]);

  if (block.kind === "hidden") return null;

  if (block.kind === "hint") {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 p-4 shadow-sm tb-sidebar-glass">
        <h3 className="text-sm font-semibold text-zinc-900">Matching Summary</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          點選左側朋友名字，會顯示你與對方「同時有空」的時段（已合併連續格子）。點時間可讓網格對應格子閃爍提示。
        </p>
      </div>
    );
  }

  if (block.kind !== "data") return null;

  const { heading, displayRanges, lines, summaryZone } = block;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 p-4 shadow-sm tb-sidebar-glass">
      <h3 className="text-sm font-semibold text-zinc-900">Matching Summary</h3>
      <p className="mt-1 text-xs text-zinc-500">{heading}</p>
      <p className="mt-0.5 text-[10px] text-zinc-400">
        {summaryZone === TZ_NL ? "以下時間為阿姆斯特丹（AMS）當地" : "以下時間為台北（TPE）當地"}
      </p>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">目前沒有重疊時段。</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-zinc-800">
          {displayRanges.map((r, i) => (
            <li key={`${r.start.toISOString()}-${i}`}>
              <button
                type="button"
                className="text-left underline decoration-[#E5E7EB] underline-offset-2 transition hover:decoration-orange-400"
                onClick={() => onPulseKeys(r.keys)}
              >
                {lines[i]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
