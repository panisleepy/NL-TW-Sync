"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { DiaryRow } from "@/types/timebridge";
import { BookOpen, Calendar, ImageIcon, Pencil, Trash2, X } from "lucide-react";

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
                <p className="line-clamp-3 text-sm text-zinc-600">{d.content}</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xl"
              initial={{ rotateY: -18, scale: 0.92, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              exit={{ rotateY: 12, scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{ transformStyle: "preserve-3d", perspective: 1200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full border border-zinc-200 bg-white/90 p-2 text-zinc-800 shadow"
                onClick={() => setOpen(null)}
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-4 flex items-center gap-2 text-zinc-600">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-semibold">翻開這一頁</span>
              </div>
              {open.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={open.image_url}
                  alt=""
                  className="max-h-[45vh] w-full rounded-xl object-cover shadow-inner"
                />
              )}
              <div className="mt-4 space-y-2">
                <h3 className="text-xl font-bold text-zinc-900">{open.title ?? ""}</h3>
                {open.event_date && (
                  <p className="text-sm text-zinc-500">{open.event_date}</p>
                )}
                <p className="whitespace-pre-wrap text-zinc-800">{open.content ?? ""}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
