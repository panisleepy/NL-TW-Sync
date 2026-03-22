"use client";

import { useMemo } from "react";
import type { AvailabilityRow } from "@/types/timebridge";
import {
  formatMergedRangeInZone,
  getContinuousRanges,
  mergedRangesForSummary,
  mergeUtcSlotKeysWithSlotMs,
} from "@/lib/mergeTimeSlots";
import { TZ_NL, TZ_TW, utcSlotKey } from "@/lib/timeUtils";

const SLOT_MS_DEFAULT = 60 * 60 * 1000;

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
    const nick = nickname.trim();

    if (!admin && !nick) {
      return { kind: "hidden" as const };
    }

    if (!admin && nick === adminDisplayName) {
      return { kind: "hidden" as const };
    }

    if (admin && filterUser && filterUser === adminDisplayName) {
      return { kind: "hidden" as const };
    }

    if (admin && !filterUser) {
      return { kind: "hint" as const };
    }

    const aName = admin ? adminDisplayName : nick;
    const bName = admin ? filterUser! : adminDisplayName;
    const overlapKeys = intersectKeys(keysForName(rows, aName), keysForName(rows, bName));
    const merged = mergeUtcSlotKeysWithSlotMs(overlapKeys, SLOT_MS_DEFAULT);
    const summaryZone = admin ? TZ_NL : TZ_TW;
    const displayRanges = mergedRangesForSummary(merged, summaryZone, SLOT_MS_DEFAULT);
    const lines = displayRanges.map((r) => formatMergedRangeInZone(r, summaryZone));
    const mergedLine = getContinuousRanges(overlapKeys, summaryZone, 60);

    const partnerLabel = admin
      ? filterUser!
      : /管理員/.test(adminDisplayName)
        ? adminDisplayName
        : `${adminDisplayName}（管理員）`;
    const lead = `你與 ${partnerLabel} 的重疊時間：`;

    return {
      kind: "data" as const,
      lead,
      mergedLine,
      displayRanges,
      lines,
      summaryZone,
    };
  }, [rows, admin, adminDisplayName, nickname, filterUser]);

  if (block.kind === "hidden") return null;

  if (block.kind === "hint") {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white/85 p-4 shadow-sm tb-sidebar-glass">
        <h3 className="text-sm font-semibold text-zinc-900">重疊時間分析</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          請在左側朋友列表點選一位朋友，會顯示你與對方「同時有空」的合併時段。點下方區間可讓網格對應格子閃爍提示。
        </p>
      </div>
    );
  }

  if (block.kind !== "data") return null;

  const { lead, mergedLine, displayRanges, lines, summaryZone } = block;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white/85 p-4 shadow-sm tb-sidebar-glass">
      <h3 className="text-sm font-semibold text-zinc-900">重疊時間分析</h3>
      <p className="mt-1 text-sm text-zinc-700">{lead}</p>
      <p className="mt-1 text-[10px] text-zinc-400">
        {summaryZone === TZ_NL ? "以下時間為阿姆斯特丹（AMS）當地" : "以下時間為台北（TPE）當地"}
      </p>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">目前沒有重疊時段。</p>
      ) : (
        <>
          <p className="mt-3 text-base font-bold leading-snug text-zinc-950">
            <span className="mr-1.5" aria-hidden>
              🕒
            </span>
            {mergedLine}
          </p>
          <p className="mt-2 text-[11px] font-medium text-zinc-500">點選區間以在網格上標示</p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-700">
            {displayRanges.map((r, i) => (
              <li key={`${r.start.toISOString()}-${i}`}>
                <button
                  type="button"
                  className="text-left font-medium underline decoration-[#E5E7EB] underline-offset-2 transition hover:decoration-orange-400"
                  onClick={() => onPulseKeys(r.keys)}
                >
                  {lines[i]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
