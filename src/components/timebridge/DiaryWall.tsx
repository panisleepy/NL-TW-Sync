"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { DiaryRow } from "@/types/timebridge";
import { Bookmark, Calendar, ImageIcon, Pencil, Trash2, X } from "lucide-react";

type Props = {
  rows: DiaryRow[];
  isAdmin: boolean;
  onEdit: (row: DiaryRow) => void;
  onDelete: (id: string) => void;
};

export function DiaryWall({ rows, isAdmin, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState<DiaryRow | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? "")),
    [rows],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <section className="mt-16">
      <h2 className="mb-6 text-center font-display text-2xl font-bold text-zinc-900">
        日記牆
      </h2>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {sorted.map((d) => (
          <motion.article
            layout
            key={d.id}
            className="mb-4 break-inside-avoid cursor-pointer rounded-2xl bg-white p-4 shadow-md ring-1 ring-zinc-200/90"
            whileHover={{ y: -3, rotate: -0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={() => setOpen(d)}
          >
            <div className="relative overflow-hidden rounded-lg bg-zinc-100 shadow-inner">
              {d.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.image_url}
                  alt=""
                  className="max-h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-zinc-100 text-zinc-300">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1">
              <h3 className="font-semibold text-zinc-900">{d.title ?? "未命名"}</h3>
              {d.event_date && (
                <p className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {d.event_date}
                </p>
              )}
              {d.content && (
                <p className="tb-diary-excerpt text-sm text-zinc-600">{d.content}</p>
              )}
            </div>
            {isAdmin && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(d);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> 編輯
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(d.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> 刪除
                </button>
              </div>
            )}
          </motion.article>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setOpen(null)}
          >
            {/* 粉紫 × 淡粉 柔光背景 + 霧化後方頁面 */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#ebe4f5]/92 via-[#f5e8ee]/88 to-[#e8e4f8]/90 backdrop-blur-[14px]"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-tr from-[#f9d4e8]/25 via-transparent to-[#dcd6f7]/35"
              aria-hidden
            />

            {/* 頂部：標題 + 柔邊關閉（類手機 chrome） */}
            <div
              className="relative z-20 flex h-14 shrink-0 items-center justify-center px-4 pt-[env(safe-area-inset-top,0px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-[15px] font-semibold tracking-wide text-zinc-700">
                日記牆
              </p>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/75 text-zinc-600 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl transition hover:border-zinc-200/90 hover:bg-white hover:text-zinc-900 active:scale-[0.97] sm:right-5"
                onClick={() => setOpen(null)}
                aria-label="關閉"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </button>
            </div>

            {/* 主卡片 */}
            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-6 pt-1 sm:px-6 sm:pb-10">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="diary-lightbox-title"
                className="flex w-full max-w-[min(96vw,52rem)] flex-col overflow-y-auto rounded-[28px] bg-[#faf8f6] shadow-[0_28px_90px_-12px_rgba(55,40,80,0.22),0_12px_40px_-16px_rgba(0,0,0,0.12)] ring-[5px] ring-white/95 md:max-h-[min(calc(100vh-9rem),640px)] md:flex-row md:overflow-hidden"
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.99 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 左：圖片（md+ 固定欄寬，與右欄並排；手機在上、限高避免擠掉文字） */}
                {open.image_url ? (
                  <div className="relative flex w-full shrink-0 flex-col overflow-hidden rounded-t-[28px] bg-gradient-to-b from-[#e8e2ef] to-[#ddd5e8] md:h-full md:min-h-0 md:w-[min(42%,300px)] md:rounded-bl-[28px] md:rounded-tr-none md:rounded-tl-[28px] lg:w-[min(42%,340px)]">
                    <div className="flex max-h-[38vh] min-h-[11rem] items-center justify-center p-4 md:max-h-none md:min-h-0 md:flex-1 md:py-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={open.image_url}
                        alt=""
                        className="max-h-full max-w-full object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="tb-diary-lightbox-paper flex min-h-[10rem] shrink-0 flex-col items-center justify-center rounded-t-[28px] px-6 py-12 md:h-full md:min-h-0 md:w-[min(42%,300px)] md:rounded-bl-[28px] md:rounded-tr-none md:rounded-tl-[28px] lg:w-[min(42%,340px)]">
                    <ImageIcon className="h-14 w-14 text-zinc-300" strokeWidth={1.2} />
                    <span className="mt-3 text-sm text-zinc-400">此篇沒有圖片</span>
                  </div>
                )}

                {/* 右：文字（可獨立捲動，不會被大圖頂出畫面） */}
                <div
                  className="tb-diary-lightbox-paper flex min-h-0 flex-1 flex-col border-t border-white/70 px-6 pb-8 pt-5 sm:px-8 sm:pb-9 sm:pt-6 md:max-h-[min(calc(100vh-9rem),640px)] md:overflow-y-auto md:border-l md:border-t-0 md:rounded-br-[28px] md:rounded-tr-[28px] custom-scrollbar"
                >
                  <div className="mb-4 flex items-center gap-2.5 text-zinc-600">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/60 shadow-sm">
                      <Bookmark className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="text-[13px] font-medium tracking-wide text-zinc-600">日記</span>
                  </div>

                  <h3
                    id="diary-lightbox-title"
                    className="text-[1.35rem] font-bold leading-tight tracking-tight text-zinc-800 sm:text-[1.5rem]"
                  >
                    {open.title ?? "未命名"}
                  </h3>

                  {open.event_date && (
                    <div className="mt-4 flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200/70 bg-white/70 shadow-sm">
                        <Calendar className="h-[17px] w-[17px] text-zinc-500" strokeWidth={1.75} />
                      </span>
                      <span className="text-[15px] tabular-nums text-zinc-500">{open.event_date}</span>
                    </div>
                  )}

                  {open.content && (
                    <div className="mt-6 border-l-[3px] border-zinc-200/80 pl-5">
                      <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-zinc-600">{open.content}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* 底部霧面 + home 指示條 */}
            <div
              className="pointer-events-none relative z-20 mt-auto h-[calc(3.25rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-gradient-to-t from-white/55 via-[#f3ebf8]/40 to-transparent backdrop-blur-[20px]"
              aria-hidden
            >
              <div className="flex h-full items-start justify-center pt-2">
                <div className="h-1 w-[5.5rem] rounded-full bg-zinc-400/35" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
