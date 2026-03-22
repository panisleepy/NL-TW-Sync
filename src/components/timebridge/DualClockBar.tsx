"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { taipeiAheadOfAmsterdamHours, TZ_NL, TZ_TW } from "@/lib/timeUtils";

function isNightHourInZone(utc: Date, zone: string): boolean {
  const h = parseInt(formatInTimeZone(utc, zone, "H"), 10);
  return h < 6 || h >= 22;
}

export function DualClockBar() {
  /** 避免 SSR 與客戶端時間/Intl 不一致造成 hydration mismatch，掛載後才顯示即時內容 */
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const userTz = useMemo(
    () =>
      mounted ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown") : "…",
    [mounted],
  );

  const ams = mounted ? formatInTimeZone(now, TZ_NL, "HH:mm:ss") : "--:--:--";
  const tpe = mounted ? formatInTimeZone(now, TZ_TW, "HH:mm:ss") : "--:--:--";
  const nlNight = mounted ? isNightHourInZone(now, TZ_NL) : false;
  const twNight = mounted ? isNightHourInZone(now, TZ_TW) : false;
  const diffH = mounted ? taipeiAheadOfAmsterdamHours(now) : null;

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200/80 bg-[#F9F8F3]/95 px-3 py-3 backdrop-blur-md sm:px-4 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-y-2">
      <div className="order-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 md:order-1 md:max-w-[40%]">
        <span className="hidden sm:inline">你的裝置時區：</span>
        <span className="sm:hidden">裝置時區</span>
        <span className="font-mono text-[11px] text-zinc-800">{userTz}</span>
      </div>
      <div className="order-1 flex w-full flex-wrap justify-center gap-2 sm:justify-start md:order-2 md:w-auto md:flex-1 md:justify-center">
        <div
          className={`flex min-w-[9.25rem] flex-1 items-center gap-2 rounded-[12px] border border-zinc-200/90 px-2.5 py-2 shadow-sm sm:min-w-[10rem] sm:flex-none sm:px-3 ${
            nlNight ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"
          }`}
        >
          <span className="text-base sm:text-lg">{nlNight ? "🌙" : "☀️"}</span>
          <div>
            <div className="text-[9px] uppercase opacity-70 sm:text-[10px]">AMS</div>
            <div className="font-mono text-base font-semibold tabular-nums sm:text-lg">{ams}</div>
          </div>
        </div>
        <div
          className={`flex min-w-[9.25rem] flex-1 items-center gap-2 rounded-[12px] border border-zinc-200/90 px-2.5 py-2 shadow-sm sm:min-w-[10rem] sm:flex-none sm:px-3 ${
            twNight ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"
          }`}
        >
          <span className="text-base sm:text-lg">{twNight ? "🌙" : "☀️"}</span>
          <div>
            <div className="text-[9px] uppercase opacity-70 sm:text-[10px]">TPE</div>
            <div className="font-mono text-base font-semibold tabular-nums sm:text-lg">{tpe}</div>
          </div>
        </div>
      </div>
      <div className="order-3 w-full space-y-1 text-center text-xs leading-snug text-zinc-600 md:max-w-[min(100%,20rem)] md:text-right">
        <p>
          台北比阿姆斯特丹快{" "}
          <span className="font-semibold text-zinc-900">{diffH ?? "—"}</span> 小時（含歐洲 DST）
        </p>
        <p className="text-zinc-600">
          阿姆斯特丹比台北慢 <span className="font-semibold text-zinc-900">{diffH ?? "—"}</span> 小時
        </p>
      </div>
    </div>
  );
}
