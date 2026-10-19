"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Users,
  Timer,
  TimerOff,
  CalendarDays,
  BarChart3,
  Trash2,
  RefreshCw,
  CloudAlert,
  FileQuestion,
  Hourglass,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiDelete } from "@/lib/api-client";
import type { QuizWithCount } from "@/lib/types";
import { faDateTime, faNumber } from "@/lib/fa";
import { CopyLinkButton } from "@/components/app/copy-link";
import { EmptyState, LoadingScreen } from "@/components/app/shared";

export default function TeacherDashboard() {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setQuizzes(null);
    try {
      // هر معلم فقط آزمون‌های خودش را می‌بیند (بررسی در سرور انجام می‌شود)
      const data = await apiGet<QuizWithCount[]>("/api/quizzes");
      setQuizzes(data ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "بارگذاری آزمون‌ها ناموفق بود.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const list = quizzes ?? [];
    const participants = list.reduce((sum, q) => sum + (q.submissions?.[0]?.count ?? 0), 0);
    return { total: list.length, participants };
  }, [quizzes]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/quizzes/${deleteTarget.id}`);
      setQuizzes((prev) => prev?.filter((q) => q.id !== deleteTarget.id) ?? null);
      toast({ title: "حذف شد", description: `آزمون «${deleteTarget.title}» همراه با همه سوالات و پاسخ‌ها حذف شد.`, duration: 4000 });
    } catch {
      toast({ variant: "destructive", title: "خطا", description: "حذف آزمون ناموفق بود؛ دوباره تلاش کنید.", duration: 4000 });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function quizLink(q: QuizWithCount) {
    if (typeof window === "undefined") return `/quiz/${q.id}`;
    return `${window.location.origin}/quiz/${q.id}`;
  }

  return (
    <div className="space-y-7">
      {/* سربرگ خوش‌آمد + آمار */}
      <section className="anim-fade-up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">داشبورد معلم</h1>
            <p className="mt-1 text-sm text-slate-400">آزمون‌های خود را مدیریت کنید و نتایج را دنبال کنید.</p>
          </div>
          <Link
            href="/dashboard/new"
            className="btn-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold text-white sm:hidden"
          >
            <Plus className="h-4.5 w-4.5" /> ساخت آزمون جدید
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="lux-card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <ClipboardList className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-800">{faNumber(stats.total)}</p>
              <p className="text-xs font-semibold text-slate-400">آزمون ساخته‌شده</p>
            </div>
          </div>
          <div className="lux-card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-800">{faNumber(stats.participants)}</p>
              <p className="text-xs font-semibold text-slate-400">شرکت‌کننده در آزمون‌ها</p>
            </div>
          </div>
        </div>
      </section>

      {/* محتوا */}
      {quizzes === null && !error && <LoadingScreen text="در حال دریافت آزمون‌ها..." />}

      {error && (
        <div className="anim-fade-up flex flex-col items-center gap-4 rounded-3xl border border-rose-100 bg-rose-50/70 p-10 text-center">
          <CloudAlert className="h-10 w-10 text-rose-400" />
          <p className="font-bold text-rose-600">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-100/60"
          >
            <RefreshCw className="h-4 w-4" /> تلاش دوباره
          </button>
        </div>
      )}

      {quizzes !== null && !error && quizzes.length === 0 && (
        <EmptyState
          icon={<FileQuestion className="h-8 w-8" />}
          title="هنوز آزمونی نساخته‌اید"
          description="اولین آزمون آنلاین خود را در کمتر از یک دقیقه بسازید و لینک آن را برای دانش‌آموزان بفرستید."
          action={
            <Link
              href="/dashboard/new"
              className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-extrabold text-white"
            >
              <Plus className="h-5 w-5" /> ساخت آزمون جدید
            </Link>
          }
        />
      )}

      {quizzes !== null && quizzes.length > 0 && (
        <section className="grid gap-4" aria-label="لیست آزمون‌ها">
          {quizzes.map((q, i) => {
            const count = q.submissions?.[0]?.count ?? 0;
            return (
              <article
                key={q.id}
                className="lux-card anim-fade-up group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-300/25 sm:p-6"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/quiz/${q.id}`}
                        className="truncate text-lg font-extrabold text-slate-800 transition-colors hover:text-violet-600"
                      >
                        {q.title}
                      </Link>
                      {q.is_timed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
                          <Timer className="h-3 w-3" />
                          زمان‌دار — {faNumber(q.duration_minutes ?? 0)} دقیقه
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                          <TimerOff className="h-3 w-3" />
                          بدون محدودیت زمان
                        </span>
                      )}
                    </div>
                    {q.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-400">{q.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                        {faDateTime(q.created_at)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 font-bold ${count > 0 ? "text-sky-600" : ""}`}>
                        <Users className="h-3.5 w-3.5 text-sky-400" />
                        {faNumber(count)} دانش‌آموز آزمون داده
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CopyLinkButton link={quizLink(q)} />
                    <Link
                      href={`/dashboard/quiz/${q.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/35"
                    >
                      <BarChart3 className="h-4 w-4" />
                      نتایج و تصحیح
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(q)}
                      title="حذف آزمون"
                      aria-label={`حذف آزمون ${q.title}`}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/70 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* گفتگوی تأیید حذف */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-3xl border-0 bg-white p-6 text-right shadow-2xl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <Hourglass className="h-5 w-5 text-rose-500" />
              حذف آزمون «{deleteTarget?.title}»؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-7 text-slate-500">
              با حذف این آزمون، همه سوالات و پاسخ‌های ثبت‌شده دانش‌آموزان نیز برای همیشه حذف می‌شوند و امکان بازگرداندن
              آن‌ها وجود ندارد. آیا مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 rounded-2xl bg-rose-600 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              {deleting ? "در حال حذف..." : "بله، حذف شود"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
