"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CloudAlert,
  ListChecks,
  AlignRight,
  Timer,
  TimerOff,
  ArrowLeft,
  UserRound,
  Sparkles,
  ClipboardList,
  PenTool,
  CalendarClock,
  Hourglass,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { Quiz } from "@/lib/types";
import { faNumber, faDateTime } from "@/lib/fa";
import { LoadingScreen, Logo } from "@/components/app/shared";

export default function StudentEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [mcqCount, setMcqCount] = useState<number | null>(null);
  const [descCount, setDescCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  /** وضعیت بازه زمانی دسترسی: شروع‌نشده / منقضی / باز */
  const availability = useMemo<"not_started" | "expired" | "open">(() => {
    if (!quiz) return "open";
    const now = Date.now();
    if (quiz.start_at && now < new Date(quiz.start_at).getTime()) return "not_started";
    if (quiz.end_at && now > new Date(quiz.end_at).getTime()) return "expired";
    return "open";
  }, [quiz]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGet<{
          quiz: Quiz;
          questions: unknown[];
          counts: { mcq: number; descriptive: number };
        }>(`/api/public/quizzes/${quizId}`);
        if (!alive) return;
        setQuiz(data.quiz);
        setMcqCount(data.counts.mcq);
        setDescCount(data.counts.descriptive);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error && err.message
            ? err.message
            : "بارگذاری اطلاعات آزمون ناموفق بود. لطفاً اتصال اینترنت را بررسی و صفحه را دوباره باز کنید."
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId]);

  function start() {
    if (availability !== "open") return;
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setNameError("لطفاً نام و نام خانوادگی خود را کامل وارد کنید (حداقل ۳ حرف).");
      return;
    }
    setNameError(null);
    setStarting(true);
    try {
      sessionStorage.setItem(`quiz_student_name_${quizId}`, trimmed);
    } catch {
      /* حالت خصوصی مرورگر */
    }
    router.push(`/quiz/${quizId}/take`);
  }

  if (error) {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center px-4">
        <div className="lux-card anim-fade-up flex max-w-md flex-col items-center gap-4 p-10 text-center">
          <CloudAlert className="h-12 w-12 text-rose-400" />
          <h1 className="text-lg font-black text-slate-700">آزمون یافت نشد</h1>
          <p className="text-sm leading-7 text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center">
        <LoadingScreen text="در حال آماده‌سازی آزمون..." />
      </main>
    );
  }

  /* ---------- انسداد ورود بر اساس بازه زمانی ---------- */
  if (availability !== "open") {
    const isNotStarted = availability === "not_started";
    return (
      <main className="lux-bg flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="lux-card anim-fade-up flex w-full max-w-lg flex-col items-center p-8 text-center sm:p-12">
          <span
            className={`anim-pop mb-5 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl ${
              isNotStarted
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-300/50"
                : "bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-300/50"
            }`}
          >
            {isNotStarted ? <Hourglass className="h-9 w-9" /> : <CalendarClock className="h-9 w-9" />}
          </span>
          <h1 className="text-xl font-black leading-relaxed text-slate-800">
            {isNotStarted ? "آزمون هنوز شروع نشده است" : "مهلت شرکت در این آزمون به پایان رسیده است"}
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">{quiz.title}</p>

          <div className="mt-6 w-full rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
              <CalendarClock className="h-4.5 w-4.5 text-sky-500" />
              {isNotStarted ? "زمان شروع آزمون:" : "زمان پایان آزمون:"}
            </p>
            <p className="mt-1.5 text-base font-black text-slate-800">
              {faDateTime(isNotStarted ? quiz.start_at : quiz.end_at)}
            </p>
          </div>

          <p className="mt-5 text-xs leading-6 text-slate-400">
            {isNotStarted
              ? "لطفاً در زمان مقرر دوباره به همین لینک مراجعه کنید."
              : "برای اطلاع از آزمون‌های بعدی با معلم خود تماس بگیرید."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="lux-bg flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="anim-fade-up w-full max-w-lg">
        <div className="lux-card overflow-hidden">
          {/* سربرگ گرادیانی */}
          <div className="relative overflow-hidden bg-gradient-to-l from-violet-600 via-indigo-600 to-sky-500 p-7 text-white">
            <div className="absolute -left-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <span className="relative mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-bold backdrop-blur">
              <Sparkles className="h-3 w-3" /> آزمون آنلاین
            </span>
            <h1 className="relative text-2xl font-black leading-relaxed">{quiz.title}</h1>
            {quiz.description && (
              <p className="relative mt-2 text-sm leading-7 text-white/85">{quiz.description}</p>
            )}
          </div>

          {/* اطلاعات آزمون */}
          <div className="grid grid-cols-3 gap-3 border-b border-slate-100 p-5">
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-3.5 text-center">
              <ListChecks className="h-5 w-5 text-violet-500" />
              <p className="text-lg font-black text-slate-700">{mcqCount === null ? "…" : faNumber(mcqCount)}</p>
              <p className="text-[10px] font-bold text-slate-400">چهارگزینه‌ای</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-3.5 text-center">
              <AlignRight className="h-5 w-5 text-sky-500" />
              <p className="text-lg font-black text-slate-700">{descCount === null ? "…" : faNumber(descCount)}</p>
              <p className="text-[10px] font-bold text-slate-400">تشریحی</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-3.5 text-center">
              {quiz.is_timed ? (
                <Timer className="h-5 w-5 text-amber-500" />
              ) : (
                <TimerOff className="h-5 w-5 text-slate-400" />
              )}
              <p className="text-lg font-black text-slate-700">
                {quiz.is_timed ? faNumber(quiz.duration_minutes ?? 0) : "∞"}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                {quiz.is_timed ? "دقیقه زمان" : "بدون محدودیت"}
              </p>
            </div>
          </div>

          {/* فرم نام */}
          <div className="p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-violet-50/70 p-4 ring-1 ring-violet-100">
              <PenTool className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
              <p className="text-xs leading-6 text-violet-700">
                این آزمون در مرورگر گوشی یا کامپیوتر شما باز شده است و نیازی به نصب هیچ برنامه‌ای نیست. برای سوالات
                تشریحی، می‌توانید پاسخ را با دست‌خط روی تخته سفید بنویسید.
              </p>
            </div>

            <label htmlFor="student-name" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600">
              <UserRound className="h-4 w-4 text-violet-500" />
              نام و نام خانوادگی
            </label>
            <input
              id="student-name"
              className={`lux-input ${nameError ? "!border-rose-400" : ""}`}
              placeholder="مثال: زهرا محمدی"
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && start()}
              autoFocus
            />
            {nameError && <p className="mt-1.5 text-xs font-bold text-rose-500">{nameError}</p>}

            <button
              type="button"
              onClick={start}
              disabled={starting}
              className="btn-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white"
            >
              <ClipboardList className="h-5 w-5" />
              شروع آزمون
              <ArrowLeft className="h-5 w-5" />
            </button>

            <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
              پس از شروع، در صورت زمان‌دار بودن آزمون، تایمر معکوس فعال می‌شود؛ لطفاً تا پایان، صفحه را نبندید.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
