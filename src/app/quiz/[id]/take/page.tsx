"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CloudAlert,
  ListChecks,
  AlignRight,
  PenTool,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Timer,
  SendHorizonal,
  TriangleAlert,
  Check,
  ImagePlus,
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
import { apiGet, apiPost } from "@/lib/api-client";
import type { PublicQuestion, Quiz, TeacherAnswer } from "@/lib/types";
import { faDigits, faClock, faNumber, optionLabel } from "@/lib/fa";
import { CanvasPad } from "@/components/app/canvas-pad";
import { Spinner } from "@/components/app/shared";
import { useToast } from "@/hooks/use-toast";

export default function TakeExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const quizId = Number(params.id);

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [name, setName] = useState<string>("");

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<TeacherAnswer[]>([]);
  const [canvasOpen, setCanvasOpen] = useState(false);
  /** نوع بوم بازشده: تخته سفید پاسخ یا یادداشت روی تصویر سوال */
  const [canvasMode, setCanvasMode] = useState<"whiteboard" | "annotation">("whiteboard");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const submittingRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  /* ---------- بارگذاری آزمون ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let studentName = "";
        try {
          studentName = sessionStorage.getItem(`quiz_student_name_${quizId}`) ?? "";
        } catch {
          /* ignore */
        }
        if (!studentName) {
          router.replace(`/quiz/${quizId}`);
          return;
        }
        const data = await apiGet<{ quiz: Quiz; questions: PublicQuestion[] }>(
          `/api/public/quizzes/${quizId}`
        );
        if (!data.quiz) throw new Error("notfound");

        if (!alive) return;
        setName(studentName);
        setQuiz(data.quiz);
        const list = data.questions ?? [];
        setQuestions(list);
        setAnswers(list.map(() => ({ question_id: 0, question_type: "descriptive" as const })));

        if (data.quiz.is_timed && data.quiz.duration_minutes) {
          const key = `quiz_deadline_${quizId}`;
          let deadline: number | null = null;
          try {
            const raw = sessionStorage.getItem(key);
            if (raw) deadline = Number(raw);
          } catch {
            /* ignore */
          }
          if (!deadline || deadline < Date.now()) {
            deadline = Date.now() + data.quiz.duration_minutes * 60_000;
            try {
              sessionStorage.setItem(key, String(deadline));
            } catch {
              /* ignore */
            }
          }
          deadlineRef.current = deadline;
          setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
        }
        // ثبت زمان ورود به آزمون (برای گزارش معلم) — با رفرش صفحه حفظ می‌شود
        try {
          const entryKey = `quiz_started_${quizId}`;
          const raw = sessionStorage.getItem(entryKey);
          const prev = raw ? Number(raw) : 0;
          if (prev && prev <= Date.now()) {
            startedAtRef.current = new Date(prev).toISOString();
          } else {
            startedAtRef.current = new Date().toISOString();
            sessionStorage.setItem(entryKey, String(Date.now()));
          }
        } catch {
          startedAtRef.current = new Date().toISOString();
        }
        setPhase("ready");
      } catch (err) {
        if (!alive) return;
        setErrMsg(
          err instanceof Error && err.message === "notfound"
            ? "آزمونی با این لینک پیدا نشد."
            : "بارگذاری آزمون ناموفق بود. لطفاً صفحه را دوباره باز کنید."
        );
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId, router]);

  /* ---------- تایمر معکوس ---------- */
  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current || submitted) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const answers_data = questions.map((q, i) => {
          const a = answers[i];
          return q.question_type === "multiple_choice"
            ? {
                question_id: q.id,
                question_type: q.question_type,
                selected_option: a?.selected_option ?? null,
                annotation_image: a?.annotation_image || null,
              }
            : {
                question_id: q.id,
                question_type: q.question_type,
                text: a?.text?.trim() || null,
                canvas_image: a?.canvas_image || null,
                annotation_image: a?.annotation_image || null,
              };
        });
        await apiPost(`/api/public/quizzes/${quizId}/submit`, {
          student_name: name,
          answers_data,
          started_at: startedAtRef.current,
        });

        try {
          sessionStorage.removeItem(`quiz_student_name_${quizId}`);
          sessionStorage.removeItem(`quiz_deadline_${quizId}`);
          sessionStorage.removeItem(`quiz_started_${quizId}`);
        } catch {
          /* ignore */
        }
        setSubmitted(true);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: auto ? "ارسال خودکار ناموفق بود" : "ثبت پاسخ‌ها ناموفق بود",
          description:
            err instanceof Error && err.message
              ? err.message
              : "اتصال اینترنت را بررسی کنید و دوباره تلاش کنید. پاسخ‌های شما روی همین صفحه حفظ شده‌اند.",
          duration: 6000,
        });
        if (auto) setConfirmOpen(true);
      }
    },
    [answers, name, questions, quizId, submitted, toast]
  );

  useEffect(() => {
    if (phase !== "ready" || !quiz?.is_timed) return;
    const t = setInterval(() => {
      if (deadlineRef.current) {
        const r = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
        setRemaining(r);
      }
    }, 500);
    return () => clearInterval(t);
  }, [phase, quiz?.is_timed]);

  useEffect(() => {
    if (remaining === 0 && phase === "ready" && !submitted && !submittingRef.current) {
      void doSubmit(true);
    }
  }, [remaining, phase, submitted, doSubmit]);

  /* ---------- هشدار خروج در میانه آزمون ---------- */
  useEffect(() => {
    if (phase !== "ready" || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, submitted]);

  /* ---------- وضعیت پاسخ‌ها ---------- */
  const answeredCount = useMemo(
    () =>
      questions.reduce((n, q, i) => {
        const a = answers[i];
        if (q.question_type === "multiple_choice") return n + (a?.selected_option != null ? 1 : 0);
        return n + (a?.text?.trim() || a?.canvas_image || a?.annotation_image ? 1 : 0);
      }, 0),
    [questions, answers]
  );

  const setAnswer = (i: number, patch: Partial<TeacherAnswer>) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  /* ---------- صفحه تشکر (بدون هیچ نمره‌ای) ---------- */
  if (submitted) {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center px-4">
        <div className="anim-fade-up max-w-md text-center">
          <span className="anim-pop mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-2xl shadow-emerald-300/50">
            <svg className="check-draw h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 L9.5 18 L20 6.5" />
            </svg>
          </span>
          <h1 className="text-2xl font-black leading-relaxed text-slate-800">
            {name} عزیز، آزمون شما ثبت شد
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-500">
            پاسخ‌های شما با موفقیت ثبت شد. از شرکت در آزمون سپاسگزاریم.
          </p>
          <p className="mt-6 text-xs text-slate-300">می‌توانید این صفحه را ببندید.</p>
        </div>
      </main>
    );
  }

  /* ---------- حالت خطا / بارگذاری ---------- */
  if (phase === "error") {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center px-4">
        <div className="lux-card anim-fade-up flex max-w-md flex-col items-center gap-4 p-10 text-center">
          <CloudAlert className="h-12 w-12 text-rose-400" />
          <h1 className="text-lg font-black text-slate-700">خطا در بازکردن آزمون</h1>
          <p className="text-sm leading-7 text-slate-400">{errMsg}</p>
        </div>
      </main>
    );
  }

  if (phase !== "ready" || !quiz) {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Spinner className="h-8 w-8 text-violet-500" />
          <p className="text-sm font-medium">در حال آماده‌سازی سوالات...</p>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="lux-bg flex flex-1 items-center justify-center px-4">
        <div className="lux-card anim-fade-up flex max-w-md flex-col items-center gap-4 p-10 text-center">
          <CloudAlert className="h-12 w-12 text-amber-400" />
          <h1 className="text-lg font-black text-slate-700">این آزمون هنوز سوالی ندارد</h1>
          <p className="text-sm leading-7 text-slate-400">لطفاً با معلم خود تماس بگیرید.</p>
        </div>
      </main>
    );
  }

  const q = questions[idx];
  const a = answers[idx];
  const progress = (answeredCount / questions.length) * 100;

  const timerTone =
    remaining === null
      ? ""
      : remaining <= 60
        ? "bg-rose-600 text-white anim-danger-pulse"
        : remaining <= 300
          ? "bg-amber-500 text-white"
          : "bg-violet-50 text-violet-700 ring-1 ring-violet-200";

  return (
    <main className="lux-bg flex-1 pb-32">
      {/* سربرگ ثابت: نام، پیشرفت و تایمر */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-400/40">
              <SendHorizonal className="h-4 w-4 -scale-x-100" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold text-slate-700">{quiz.title}</p>
              <p className="truncate text-[11px] text-slate-400">{name}</p>
            </div>
          </div>
          {quiz.is_timed && remaining !== null && (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 font-black tabular-nums transition-colors duration-500 ${timerTone}`}
              role="timer"
              aria-label={`زمان باقیمانده ${faClock(remaining)}`}
            >
              <Timer className="h-4 w-4" />
              <span dir="ltr">{faClock(remaining)}</span>
            </span>
          )}
        </div>
        {/* نوار پیشرفت */}
        <div className="mx-auto w-full max-w-3xl px-4 pb-2.5">
          <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-[10px] font-bold text-slate-400">
            پاسخ داده‌شده: {faNumber(answeredCount)} از {faNumber(questions.length)}
          </p>
        </div>
      </header>

      {/* کارت سوال */}
      <div className="mx-auto mt-6 w-full max-w-3xl px-4">
        <article key={q.id} className="lux-card anim-fade-up p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex h-8 items-center rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 px-3 text-xs font-black text-white shadow-md shadow-violet-300/40">
                سوال {faNumber(idx + 1)} از {faNumber(questions.length)}
              </span>
              {q.question_type === "multiple_choice" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
                  <ListChecks className="h-3 w-3" /> چهارگزینه‌ای
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-600 ring-1 ring-sky-200">
                  <AlignRight className="h-3 w-3" /> تشریحی
                </span>
              )}
            </span>
            {q.has_canvas && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                <PenTool className="h-3 w-3" /> امکان پاسخ با دست‌خط
              </span>
            )}
          </div>

          <p className="whitespace-pre-wrap text-[17px] font-bold leading-9 text-slate-800">{q.question_text}</p>

          {/* تصویر سوال + امکان یادداشت و ترسیم روی آن */}
          {q.image_data && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
              <img src={q.image_data} alt={`تصویر سوال ${faNumber(idx + 1)}`} className="block max-h-96 w-full object-contain" />
              {q.allow_annotation && (
                <div className="border-t border-slate-100 bg-violet-50/60 p-3">
                  {a?.annotation_image ? (
                    <div className="anim-pop overflow-hidden rounded-xl border border-violet-200 bg-white">
                      <img src={a.annotation_image} alt="یادداشت و ترسیم شما روی تصویر" className="block max-h-72 w-full object-contain" />
                    </div>
                  ) : (
                    <p className="mb-2.5 text-center text-[11px] leading-5 text-slate-400">
                      می‌توانید حل مسئله یا یادداشت را با دست‌خط روی همین تصویر بنویسید.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCanvasMode("annotation");
                        setCanvasOpen(true);
                      }}
                      className="btn-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-white"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {a?.annotation_image ? "ویرایش ترسیم روی تصویر" : "یادداشت‌برداری و ترسیم روی تصویر"}
                    </button>
                    {a?.annotation_image && (
                      <button
                        type="button"
                        onClick={() => setAnswer(idx, { annotation_image: null })}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> حذف
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* پاسخ چهارگزینه‌ای */}
          {q.question_type === "multiple_choice" && (
            <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label="گزینه‌های سوال">
              {(q.options ?? []).map((opt, oi) => {
                const selected = a?.selected_option === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAnswer(idx, { selected_option: oi })}
                    className={`group flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-start transition-all duration-200 ${
                      selected
                        ? "border-transparent btn-gradient text-white shadow-lg shadow-violet-400/40"
                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                        selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600"
                      }`}
                    >
                      {optionLabel(oi)}
                    </span>
                    <span className="flex-1 text-[15px] font-bold leading-7">{opt}</span>
                    {selected && <Check className="h-5 w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* پاسخ تشریحی */}
          {q.question_type === "descriptive" && (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor={`ans-${q.id}`} className="mb-1.5 block text-sm font-bold text-slate-600">
                  پاسخ متنی
                </label>
                <textarea
                  id={`ans-${q.id}`}
                  className="lux-input min-h-32 resize-y leading-8"
                  placeholder="پاسخ خود را اینجا بنویسید..."
                  value={a?.text ?? ""}
                  maxLength={2000}
                  onChange={(e) => setAnswer(idx, { text: e.target.value })}
                />
              </div>

              {q.has_canvas && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-extrabold text-violet-700">
                      <PenTool className="h-4 w-4" /> پاسخ با دست‌خط (تخته سفید)
                    </p>
                    {a?.canvas_image && (
                      <button
                        type="button"
                        onClick={() => setAnswer(idx, { canvas_image: null })}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> حذف تصویر
                      </button>
                    )}
                  </div>

                  {a?.canvas_image ? (
                    <div className="anim-pop overflow-hidden rounded-xl border border-violet-200 bg-white shadow-inner">
                      <img
                        src={a.canvas_image}
                        alt="پیش‌نمایش پاسخ دست‌نویس"
                        className="block max-h-72 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <p className="rounded-xl bg-white/60 px-4 py-5 text-center text-xs leading-6 text-slate-400">
                      می‌توانید فرمول‌ها، محاسبات یا شکل‌های هندسی را با انگشت یا قلم روی تخته سفید بنویسید.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCanvasMode("whiteboard");
                      setCanvasOpen(true);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-400/35 transition-all hover:shadow-xl"
                  >
                    <Pencil className="h-4.5 w-4.5" />
                    {a?.canvas_image ? "ویرایش نوشته با دست" : "بازکردن تخته سفید و نوشتن با دست"}
                  </button>
                </div>
              )}
            </div>
          )}
        </article>

        {/* ناوبری */}
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="ناوبری سوالات">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-white disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" /> سوال قبلی
          </button>

          {idx < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
              className="btn-gradient inline-flex items-center gap-1.5 rounded-2xl px-6 py-3 text-sm font-extrabold text-white"
            >
              سوال بعدی <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-400/40 transition-all hover:shadow-xl"
            >
              <Check className="h-4.5 w-4.5" /> ثبت نهایی و پایان آزمون
            </button>
          )}
        </nav>

        {/* نمایشگر شماره‌ها */}
        <div className="nice-scroll mt-5 flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="پرش به سوال">
          {questions.map((_, i) => {
            const answered =
              questions[i].question_type === "multiple_choice"
                ? answers[i]?.selected_option != null
                : Boolean(answers[i]?.text?.trim()) ||
                  Boolean(answers[i]?.canvas_image) ||
                  Boolean(answers[i]?.annotation_image);
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                title={`سوال ${faNumber(i + 1)}`}
                onClick={() => setIdx(i)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all ${
                  i === idx
                    ? "btn-gradient scale-105 text-white"
                    : answered
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-white/80 text-slate-400 ring-1 ring-slate-200 hover:ring-violet-300"
                }`}
              >
                {faDigits(i + 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* تخته سفید / ویرایشگر یادداشت روی تصویر */}
      {canvasOpen && q.image_data && canvasMode === "annotation" ? (
        <CanvasPad
          title={`یادداشت روی تصویر سوال — سوال ${faNumber(idx + 1)}`}
          initialImage={q.image_data}
          annotationMode
          onSave={(dataUrl) => {
            setAnswer(idx, { annotation_image: dataUrl });
            setCanvasOpen(false);
            toast({ title: "یادداشت شما روی تصویر ذخیره شد", duration: 2500 });
          }}
          onCancel={() => setCanvasOpen(false)}
        />
      ) : canvasOpen ? (
        <CanvasPad
          title={`پاسخ دست‌نویس — سوال ${faNumber(idx + 1)}`}
          initialImage={a?.canvas_image ?? null}
          onSave={(dataUrl) => {
            setAnswer(idx, { canvas_image: dataUrl });
            setCanvasOpen(false);
            toast({ title: "پاسخ دست‌نویس ذخیره شد", duration: 2500 });
          }}
          onCancel={() => setCanvasOpen(false)}
        />
      ) : null}

      {/* گفتگوی تأیید ثبت نهایی */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-3xl border-0 bg-white p-6 text-right shadow-2xl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              ثبت نهایی و پایان آزمون؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-7 text-slate-500">
              {answeredCount < questions.length ? (
                <>
                  شما به <b className="text-rose-500">{faNumber(questions.length - answeredCount)}</b> سوال از{" "}
                  <b>{faNumber(questions.length)}</b> سوال پاسخ نداده‌اید. سوالات بی‌پاسخ نمره‌ای دریافت نمی‌کنند.
                </>
              ) : (
                <>به همه سوالات پاسخ داده‌اید. عالی بود!</>
              )}{" "}
              پس از ثبت نهایی، امکان بازگشت و تغییر پاسخ‌ها وجود ندارد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              بازگشت به آزمون
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doSubmit(false);
              }}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-sm font-bold text-white transition hover:brightness-105"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" /> در حال ثبت...
                </span>
              ) : (
                "بله، ثبت نهایی شود"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
