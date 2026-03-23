"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import type { WeekOption } from "@/lib/weekRange";

type Props = {
  weeks: WeekOption[];
  value: string;
  onChange: (weekStartYmd: string) => void;
};

export const WeekSelector = memo(function WeekSelector({ weeks, value, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 桌機滾輪預設是垂直：在橫向列表上改為捲動左右；到邊界時交還給頁面捲動 */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;

      const dy = e.deltaY;
      const dx = e.deltaX;
      let scrollDelta = 0;
      if (e.shiftKey) {
        scrollDelta = dy;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        scrollDelta = dx;
      } else {
        scrollDelta = dy;
      }

      if (scrollDelta === 0) return;

      const maxLeft = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      if (scrollDelta > 0 && left >= maxLeft - 2) return;
      if (scrollDelta < 0 && left <= 2) return;

      el.scrollLeft += scrollDelta;
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [weeks.length]);

  useLayoutEffect(() => {
    activeBtnRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [value]);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.75, 360) * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  const handleSelectWeek = useCallback(
    (weekStartYmd: string) => {
      if (weekStartYmd === value) return;
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
      setIsMorphing(true);
      onChange(weekStartYmd);
      morphTimerRef.current = setTimeout(() => {
        setIsMorphing(false);
        morphTimerRef.current = null;
      }, 280);
    },
    [onChange, value],
  );

  useEffect(() => {
    return () => {
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    };
  }, []);

  return (
    <div className="flex w-full max-w-full items-stretch gap-1 sm:gap-1.5">
      <button
        type="button"
        aria-label="向左瀏覽週次"
        onClick={() => scrollByPage(-1)}
        className="flex flex-shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 px-2 py-2 text-zinc-700 shadow-sm backdrop-blur-sm transition hover:border-zinc-400 hover:bg-white active:scale-[0.97] sm:px-2.5"
      >
        <ChevronLeft className="h-5 w-5 sm:h-5 sm:w-5" strokeWidth={2} />
      </button>

      <div
        ref={scrollRef}
        className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-2 pt-1 touch-pan-x [-webkit-overflow-scrolling:touch]"
      >
        <LayoutGroup id="week-selector-fluid-pill">
          {weeks.map((w) => {
            const active = w.weekStartYmd === value;
            return (
              <button
                key={w.weekStartYmd}
                ref={active ? activeBtnRef : undefined}
                type="button"
                onClick={() => handleSelectWeek(w.weekStartYmd)}
                className={`relative isolate flex-shrink-0 snap-start overflow-hidden rounded-full border px-4 py-2 text-left transition ${
                  active
                    ? "border-zinc-900/90 text-white shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
                    : "border-zinc-200/90 bg-white/85 text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="week-active-pill"
                    className="pointer-events-none absolute inset-0 rounded-full bg-zinc-900"
                    animate={{ scale: isMorphing ? 1.12 : 1 }}
                    transition={{
                      layout: { type: "spring", stiffness: 430, damping: 30, mass: 0.8 },
                      scale: { type: "spring", stiffness: 420, damping: 24, mass: 0.65 },
                    }}
                  />
                )}
                {!active && (
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-white/45 backdrop-blur-[2px]" />
                )}
                <span className={`relative z-[1] block text-[11px] font-semibold ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                  Week {w.isoWeekNumber}
                </span>
                <span className="relative z-[1] block text-xs tabular-nums">{w.label}</span>
              </button>
            );
          })}
        </LayoutGroup>
      </div>

      <button
        type="button"
        aria-label="向右瀏覽週次"
        onClick={() => scrollByPage(1)}
        className="flex flex-shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 px-2 py-2 text-zinc-700 shadow-sm backdrop-blur-sm transition hover:border-zinc-400 hover:bg-white active:scale-[0.97] sm:px-2.5"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
});
