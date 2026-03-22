"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { AvailabilityRow, DiaryRow } from "@/types/timebridge";
import { ADMIN_BLOCK_USER, NICKNAME_STORAGE_KEY } from "@/types/timebridge";
import { defaultWeekStartYmd, enumerateWeeksInSeason, isoWeekMetaForUtc } from "@/lib/weekRange";
import { utcSlotKey } from "@/lib/timeUtils";
import { DualClockBar } from "./DualClockBar";
import { DiaryWall } from "./DiaryWall";
import { WeekSelector } from "./WeekSelector";
import { WeeklyGrid } from "./WeeklyGrid";
import { MatchingSummary } from "./MatchingSummary";
import { Check, Lock, LogOut, Menu, RefreshCw, RotateCcw, Save, Shield, Users, X } from "lucide-react";

function extractKeysForUser(rows: AvailabilityRow[], name: string): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    if (r.is_admin_blocked) continue;
    if (r.user_name === name) s.add(utcSlotKey(new Date(r.utc_time_slot)));
  }
  return s;
}

type SidebarPanelsProps = {
  userNames: string[];
  filterUser: string | null;
  onSelectFilterUser: (u: string | null) => void;
  nickname: string;
  onOpenNick: () => void;
  admin: boolean;
  adminDisplayName: string;
  otherFriendCount: number;
};

function SidebarPanels({
  userNames,
  filterUser,
  onSelectFilterUser,
  nickname,
  onOpenNick,
  admin,
  adminDisplayName,
  otherFriendCount,
}: SidebarPanelsProps) {
  return (
    <>
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white/70 p-4 shadow-sm tb-sidebar-glass">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Users className="h-4 w-4 text-zinc-600" />
          {admin ? "朋友列表" : "本週參與"}
        </div>
        {admin ? (
          <>
            <p className="mt-1 text-xs text-zinc-500">點名字可只看該人；再點「全部」回到熱圖。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectFilterUser(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filterUser === null
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "border border-zinc-200/90 bg-white/80 text-zinc-800 backdrop-blur-sm"
                }`}
              >
                全部（疊加）
              </button>
              {userNames.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onSelectFilterUser(filterUser === u ? null : u)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    filterUser === u
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "border border-zinc-200/90 bg-white/80 text-zinc-800 backdrop-blur-sm"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-xs leading-relaxed text-zinc-600">
            目前線上有 <span className="font-semibold text-zinc-900">{otherFriendCount}</span>{" "}
            位朋友已填寫此週。網格僅顯示匿名熱度，名單僅管理員可見。
          </p>
        )}
      </div>
      <div className="mt-4 rounded-[14px] border border-[#E5E7EB] bg-white/70 p-4 text-sm shadow-sm tb-sidebar-glass">
        <button type="button" className="text-zinc-800 underline-offset-2 hover:underline" onClick={onOpenNick}>
          暱稱：{nickname || "未設定"}
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          {admin ? (
            <>已登入管理時，格子以「{adminDisplayName}」寫入有空時段，不會再用你的暱稱。</>
          ) : (
            <>暱稱存在此裝置（localStorage），免註冊即可持續編輯你的時段。</>
          )}
        </p>
      </div>
    </>
  );
}

export function HomeClient() {
  const adminDisplayName = useMemo(
    () => (process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAME ?? "Hami（管理員）").trim(),
    [],
  );

  const [weekStart, setWeekStart] = useState(defaultWeekStartYmd);
  const [nickname, setNickname] = useState("");
  const [nickOpen, setNickOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [diaries, setDiaries] = useState<DiaryRow[]>([]);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loginPwd, setLoginPwd] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [diaryForm, setDiaryForm] = useState({
    title: "",
    content: "",
    image_url: "",
    event_date: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configError, setConfigError] = useState(false);
  const [pulseKeys, setPulseKeys] = useState<Set<string>>(new Set());
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const pulseClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set());
  const draftDirtyRef = useRef(false);
  const prevWeekStartRef = useRef<string | null>(null);

  const effectiveName = admin ? adminDisplayName : nickname.trim();

  const hasEnv = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    return Boolean(typeof process !== "undefined" && url && key);
  }, []);

  useEffect(() => {
    try {
      const n = localStorage.getItem(NICKNAME_STORAGE_KEY);
      if (n) setNickname(n);
      else setNickOpen(true);
    } catch {
      setNickOpen(true);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/session");
      const j = await r.json();
      setAdmin(Boolean(j.admin));
    } catch {
      setAdmin(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    try {
      const r = await fetch(`/api/availability?weekStart=${encodeURIComponent(weekStart)}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setAvailability(j.rows ?? []);
      setLastUpdated(new Date());
    } catch {
      setConfigError(true);
    }
  }, [weekStart]);

  const loadDiaries = useCallback(async () => {
    try {
      const r = await fetch("/api/diaries");
      if (!r.ok) throw new Error();
      const j = await r.json();
      setDiaries(j.rows ?? []);
    } catch {
      setConfigError(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!admin) setFilterUser(null);
  }, [admin]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    loadDiaries();
  }, [loadDiaries]);

  useEffect(() => {
    if (prevWeekStartRef.current !== weekStart) {
      prevWeekStartRef.current = weekStart;
      setAvailability([]);
      draftDirtyRef.current = false;
    }
  }, [weekStart]);

  useEffect(() => {
    draftDirtyRef.current = false;
  }, [effectiveName]);

  useEffect(() => {
    if (draftDirtyRef.current) return;
    if (!effectiveName) return;
    setDraftKeys(extractKeysForUser(availability, effectiveName));
  }, [availability, effectiveName, weekStart]);

  const availRtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAvailabilitySync = useCallback(() => {
    if (availRtTimer.current) clearTimeout(availRtTimer.current);
    availRtTimer.current = setTimeout(() => {
      loadAvailability();
      setLastUpdated(new Date());
    }, 420);
  }, [loadAvailability]);

  useEffect(() => {
    if (!hasEnv) return;
    let sb: ReturnType<typeof getSupabaseBrowser>;
    try {
      sb = getSupabaseBrowser();
    } catch {
      return undefined;
    }
    const ch1 = sb
      .channel("tb-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability" },
        () => scheduleAvailabilitySync(),
      )
      .subscribe();
    const ch2 = sb
      .channel("tb-diaries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "diaries" },
        () => {
          loadDiaries();
          setLastUpdated(new Date());
        },
      )
      .subscribe();
    return () => {
      if (availRtTimer.current) clearTimeout(availRtTimer.current);
      sb.removeChannel(ch1);
      sb.removeChannel(ch2);
    };
  }, [hasEnv, loadDiaries, scheduleAvailabilitySync]);

  const userNames = useMemo(() => {
    const s = new Set<string>();
    for (const r of availability) {
      if (!r.is_admin_blocked && r.user_name !== ADMIN_BLOCK_USER) s.add(r.user_name);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [availability]);

  const otherFriendCount = useMemo(() => {
    const me = nickname.trim();
    const s = new Set<string>();
    for (const r of availability) {
      if (r.is_admin_blocked || r.user_name === ADMIN_BLOCK_USER) continue;
      if (me && r.user_name === me) continue;
      s.add(r.user_name);
    }
    return s.size;
  }, [availability, nickname]);

  const displayRows = useMemo(() => {
    const base = availability.filter((r) => !r.is_admin_blocked);
    const others = base.filter((r) => r.user_name !== effectiveName);
    const mine: AvailabilityRow[] = Array.from(draftKeys).map((k) => ({
      id: `draft-${k}`,
      user_name: effectiveName,
      utc_time_slot: k,
      is_admin_blocked: false,
      created_at: new Date().toISOString(),
    }));
    return [...others, ...mine];
  }, [availability, draftKeys, effectiveName]);

  const serverKeys = useMemo(
    () => extractKeysForUser(availability, effectiveName),
    [availability, effectiveName],
  );

  const hasDraftChanges = useMemo(() => {
    if (serverKeys.size !== draftKeys.size) return true;
    return Array.from(draftKeys).some((k) => !serverKeys.has(k));
  }, [serverKeys, draftKeys]);

  const weekEmpty = useMemo(() => {
    const hasServer = availability.some((r) => !r.is_admin_blocked);
    const hasMyDraft = draftKeys.size > 0;
    return !hasServer && !hasMyDraft;
  }, [availability, draftKeys]);

  const triggerPulseKeys = useCallback((keys: string[]) => {
    if (pulseClearRef.current) clearTimeout(pulseClearRef.current);
    setPulseKeys(new Set(keys));
    pulseClearRef.current = setTimeout(() => {
      setPulseKeys(new Set());
      pulseClearRef.current = null;
    }, 3300);
  }, []);

  const handleSelectFilterUser = useCallback((u: string | null) => {
    setFilterUser(u);
    setMobilePanelOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseClearRef.current) clearTimeout(pulseClearRef.current);
    };
  }, []);

  const saveNickname = (n: string) => {
    const t = n.trim();
    if (!t) return;
    localStorage.setItem(NICKNAME_STORAGE_KEY, t);
    setNickname(t);
    setNickOpen(false);
  };

  const batchUser = useCallback(
    async (userName: string, adds: string[], removes: string[]) => {
      const r = await fetch("/api/availability/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, adds, removes }),
      });
      if (!r.ok) {
        await loadAvailability();
        return;
      }
      draftDirtyRef.current = false;
      setAvailability((prev) => {
        let next = prev.filter((row) => {
          if (row.is_admin_blocked || row.user_name === ADMIN_BLOCK_USER) return true;
          if (row.user_name !== userName) return true;
          const k = utcSlotKey(new Date(row.utc_time_slot));
          return !removes.includes(k);
        });
        for (const iso of adds) {
          const utc = new Date(iso);
          const k = utcSlotKey(utc);
          const dup = next.some(
            (row) =>
              utcSlotKey(new Date(row.utc_time_slot)) === k &&
              row.user_name === userName &&
              !row.is_admin_blocked,
          );
          if (dup) continue;
          const meta = isoWeekMetaForUtc(utc);
          next.push({
            id: `local-${k}`,
            user_name: userName,
            utc_time_slot: k,
            is_admin_blocked: false,
            created_at: new Date().toISOString(),
            week_year: meta.weekYear,
            week_number: meta.weekNumber,
          });
        }
        return next;
      });
      setLastUpdated(new Date());
    },
    [loadAvailability],
  );

  const onGestureComplete = useCallback((keys: string[], mode: "add" | "remove") => {
    draftDirtyRef.current = true;
    setDraftKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (mode === "add") next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }, []);

  const handleConfirmAvailability = useCallback(async () => {
    if (!effectiveName) return;
    const adds = Array.from(draftKeys).filter((k) => !serverKeys.has(k));
    const removes = Array.from(serverKeys).filter((k) => !draftKeys.has(k));
    if (!adds.length && !removes.length) return;
    await batchUser(effectiveName, adds, removes);
  }, [effectiveName, draftKeys, serverKeys, batchUser]);

  const handleDiscardDraft = useCallback(() => {
    draftDirtyRef.current = false;
    setDraftKeys(extractKeysForUser(availability, effectiveName));
  }, [availability, effectiveName]);

  const adminLogin = async () => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPwd }),
    });
    if (r.ok) {
      setLoginPwd("");
      setLoginOpen(false);
      await refreshSession();
    } else {
      alert("密碼錯誤或未設定 ADMIN_PASSWORD");
    }
  };

  const adminLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshSession();
  };

  const submitDiary = async () => {
    if (editingId) {
      const r = await fetch(`/api/diaries/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diaryForm),
      });
      if (r.ok) {
        setEditingId(null);
        setDiaryForm({ title: "", content: "", image_url: "", event_date: "" });
        await loadDiaries();
      }
      return;
    }
    const r = await fetch("/api/diaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diaryForm),
    });
    if (r.ok) {
      setDiaryForm({ title: "", content: "", image_url: "", event_date: "" });
      await loadDiaries();
    }
  };

  const onEditDiary = (row: DiaryRow) => {
    setEditingId(row.id);
    setDiaryForm({
      title: row.title ?? "",
      content: row.content ?? "",
      image_url: row.image_url ?? "",
      event_date: row.event_date ?? "",
    });
  };

  const onDeleteDiary = async (id: string) => {
    if (!confirm("確定刪除這則日記？")) return;
    await fetch(`/api/diaries/${id}`, { method: "DELETE" });
    await loadDiaries();
  };

  const weeks = useMemo(() => enumerateWeeksInSeason(), []);

  return (
    <div className="tb-paper min-h-screen pb-28 text-zinc-900 lg:pb-20">
      <DualClockBar />
      <header className="border-b border-zinc-200/80 bg-[#F9F8F3]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-5 sm:px-4 sm:py-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              TimeBridge NL–TW
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
              Hami
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              台北 ⟷ 荷蘭（含夏令時間）· 拖曳標示<strong className="font-medium text-zinc-900">有空</strong>
              ，熱度為重疊人數
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-zinc-500">
                <button
                  type="button"
                  title="重新整理資料"
                  className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-900"
                  onClick={() => loadAvailability()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <span>{format(lastUpdated, "M/d HH:mm")}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!admin ? (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm backdrop-blur-md"
                >
                  <Lock className="h-4 w-4" />
                  管理模式
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <Shield className="h-3.5 w-3.5" />
                    已登入管理 · 以「{adminDisplayName}」標示有空
                  </span>
                  <button
                    type="button"
                    onClick={adminLogout}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-300/90 bg-white/80 px-3 py-2 text-sm text-zinc-900 backdrop-blur-md"
                  >
                    <LogOut className="h-4 w-4" />
                    登出
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {configError && (
        <div className="mx-auto max-w-6xl px-4 pt-4 text-sm text-red-700">
          無法連線資料庫：請確認 `.env.local` 已設定 Supabase，並已在 Supabase 執行 `supabase/schema.sql`。
        </div>
      )}

      {!hasEnv && (
        <div className="mx-auto max-w-6xl px-4 pt-4 text-sm text-zinc-700">
          請複製 `.env.local.example` 為 `.env.local` 並填入 Supabase 專案網址與 anon key。
        </div>
      )}

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-3 pt-6 sm:gap-8 sm:px-4 sm:pt-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="order-2 hidden space-y-0 lg:sticky lg:top-4 lg:order-1 lg:block lg:self-start xl:top-6">
          <SidebarPanels
            userNames={userNames}
            filterUser={filterUser}
            onSelectFilterUser={handleSelectFilterUser}
            nickname={nickname}
            onOpenNick={() => setNickOpen(true)}
            admin={admin}
            adminDisplayName={adminDisplayName}
            otherFriendCount={otherFriendCount}
          />
        </aside>

        <section className="order-1 min-w-0 w-full lg:order-2">
          <div className="mb-3 sm:mb-4">
            <div className="border-l-[3px] border-zinc-300/90 pl-4">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                週次選擇
              </p>
              <h2 className="mt-1.5 font-sans text-[1.05rem] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg">
                2026 年 3/23 起 · 週次（至 7 月底）
              </h2>
            </div>
            <p className="mt-3 max-w-prose text-[13px] leading-[1.65] text-zinc-600 sm:text-sm">
              請先選好週次，在格子上拖曳或單點標示你有空的時間。請盡量一次選好本週後再按「確認送出」，才會寫入資料庫；未送出前可「還原」。
            </p>
            <div className="mt-2 sm:mt-3">
              <WeekSelector weeks={weeks} value={weekStart} onChange={setWeekStart} />
            </div>
          </div>

          {!effectiveName && (
            <div className="mb-3 rounded-2xl border border-zinc-300/90 bg-zinc-100/90 px-4 py-3 text-sm text-zinc-800 backdrop-blur-sm">
              請先設定暱稱（或登入管理），才能標示有空時段。
            </div>
          )}

          <WeeklyGrid
            weekStartYmd={weekStart}
            rows={displayRows}
            draftKeys={draftKeys}
            effectiveName={effectiveName}
            filterUser={admin ? filterUser : null}
            primaryZone={admin ? "amsterdam" : "taipei"}
            admin={admin}
            anonymousHeatmap={!admin}
            pulseKeys={pulseKeys}
            weekEmpty={weekEmpty}
            onGestureComplete={onGestureComplete}
          />

          <div className="mt-4">
            <MatchingSummary
              rows={displayRows}
              admin={admin}
              adminDisplayName={adminDisplayName}
              nickname={nickname}
              filterUser={filterUser}
              onPulseKeys={triggerPulseKeys}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/55 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-800">
              {hasDraftChanges ? (
                <span className="font-medium text-zinc-950">本週有未送出的變更</span>
              ) : (
                <span className="text-zinc-500">與伺服器同步</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDiscardDraft}
                disabled={!hasDraftChanges}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-900 backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
                還原
              </button>
              <button
                type="button"
                onClick={handleConfirmAvailability}
                disabled={!effectiveName || !hasDraftChanges}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                確認送出
              </button>
            </div>
          </div>

          {admin && (
            <div className="mt-10 rounded-2xl border border-zinc-200/80 bg-white/60 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                {editingId ? "編輯日記" : "新增日記"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  標題
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 backdrop-blur-sm"
                    value={diaryForm.title}
                    onChange={(e) => setDiaryForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  事件日期
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 backdrop-blur-sm"
                    value={diaryForm.event_date}
                    onChange={(e) => setDiaryForm((f) => ({ ...f, event_date: e.target.value }))}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  圖片 URL
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 backdrop-blur-sm"
                    placeholder="https://..."
                    value={diaryForm.image_url}
                    onChange={(e) => setDiaryForm((f) => ({ ...f, image_url: e.target.value }))}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  心得
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 backdrop-blur-sm"
                    value={diaryForm.content}
                    onChange={(e) => setDiaryForm((f) => ({ ...f, content: e.target.value }))}
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitDiary}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-md"
                >
                  <Save className="h-4 w-4" />
                  {editingId ? "儲存變更" : "發佈日記"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDiaryForm({ title: "", content: "", image_url: "", event_date: "" });
                    }}
                    className="rounded-full border border-zinc-300/90 bg-white/80 px-4 py-2 text-sm backdrop-blur-sm"
                  >
                    取消編輯
                  </button>
                )}
              </div>
            </div>
          )}

          <DiaryWall
            rows={diaries}
            isAdmin={admin}
            onEdit={onEditDiary}
            onDelete={onDeleteDiary}
          />
        </section>
      </main>

      {nickOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="font-display text-xl font-bold text-zinc-900">你好，怎麼稱呼？</h2>
            <p className="mt-2 text-sm text-zinc-600">
              暱稱只存在你的瀏覽器，請盡量使用同樣的暱稱。
            </p>
            <input
              className="mt-4 w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-lg backdrop-blur-sm"
              placeholder="例如：小安"
              defaultValue={nickname}
              id="nick-input"
            />
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-zinc-900 py-3 font-semibold text-white shadow-lg"
              onClick={() => {
                const el = document.getElementById("nick-input") as HTMLInputElement | null;
                saveNickname(el?.value ?? "");
              }}
            >
              開始使用
            </button>
          </div>
        </div>
      )}

      {loginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="font-semibold text-zinc-900">管理員登入</h2>
            <input
              type="password"
              className="mt-3 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2"
              placeholder="密碼"
              value={loginPwd}
              onChange={(e) => setLoginPwd(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full bg-zinc-900 py-2 font-semibold text-white shadow"
                onClick={adminLogin}
              >
                登入
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-zinc-300/90 bg-white py-2"
                onClick={() => setLoginOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {mobilePanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            aria-label="關閉面板"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[min(88vh,640px)] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-[#F9F8F3]/98 px-4 pb-10 pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] tb-sidebar-glass lg:hidden">
            <div className="mb-3 flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-sm font-semibold text-zinc-900">
                {admin ? "朋友與設定" : "設定與本週統計"}
              </span>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200/80"
                aria-label="關閉"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarPanels
              userNames={userNames}
              filterUser={filterUser}
              onSelectFilterUser={handleSelectFilterUser}
              nickname={nickname}
              onOpenNick={() => setNickOpen(true)}
              admin={admin}
              adminDisplayName={adminDisplayName}
              otherFriendCount={otherFriendCount}
            />
          </div>
        </>
      )}

      <button
        type="button"
        className="fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition hover:bg-zinc-800 lg:hidden"
        onClick={() => setMobilePanelOpen(true)}
        aria-label="開啟側邊欄"
      >
        <Menu className="h-6 w-6" />
      </button>
    </div>
  );
}
