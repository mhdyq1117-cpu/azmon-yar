"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  CloudAlert,
  CheckCircle2,
  XCircle,
  CircleCheck,
  PenLine,
  Image as ImageIcon,
  UserRound,
  CalendarDays,
  Save,
  ListChecks,
  AlignRight,
  BadgeCheck,
  LogIn,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api-client";
import type { FullQuestion, Submission, TeacherAnswer } from "@/lib/types";
import { faDigits, faDateTime, faNumber, enDigits, optionLabel } from "@/lib/fa";
import { LoadingScreen, StatusBadge } from "@/components/app/shared";
import { useToast } from "@/hooks/use-toast";

export default function GradeSubmissionPage() {
  const params = useParams<{ id: string; sid: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<FullQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ submission: Submission; questions: FullQuestion[] }>(`/api/submissions/${params.sid}`);
      setSubmission(data.submission);
      const saved = (data.submission.grades_data ?? {}) as Record<string, number>;
      setGrades(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])));
      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "بارگذاری پاسخ دانش‌آموز ناموفق بود.");
    }
  }, [params.sid]);

  useEffect(() => {
    load();
  }, [load]);

  const answerMap = useMemo(() => {
    const m = new Map<number, TeacherAnswer>();
    for (const a of submission?.answers_data ?? []) m.set(a.question_id, a);
    return m;
  }, [submission]);

  const teacherTotal = useMemo(
    () =>
      Object.values(grades).reduce((sum, v) => {
        const n = parseFloat(enDigits(v));
        return Number.isFinite(n) ? sum + n : sum;
      }, 0),
    [grades]
  );

  async function saveGrades() {
    if (!submission) return;
    setSaving(true);
    try {
      const gradesData: Record<string, number> = {};
      for (const [k, v] of Object.entries(grades)) {
        const n = parseFloat(enDigits(v));
        if (Number.isFinite(n)) gradesData[k] = n;
      }
      await apiPatch(`/api/submissions/${submission.id}`, {
        teacher_score: teacherTotal,
        grades_data: gradesData,
      });
      toast({
        title: "تصحیح ثبت شد",
        description: `نمره نهایی این دانش‌آموز ذخیره شد.`,
        duration: 4000,
      });
      router.push(`/dashboard/quiz/${params.id}`);
    } catch {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "ثبت نمرات ناموفق بود؛ دوباره تلاش کنید.",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="anim-fade-up mx-auto max-w-lg py-10 text-center">
        <div className="lux-card flex flex-col items-center gap-4 p-10">
          <CloudAlert className="h-10 w-10 text-rose-400" />
          <p className="font-bold text-rose-600">{error}</p>
          <Link href={`/dashboard/quiz/${params.id}`} className="btn-gradient rounded-2xl px-6 py-3 text-sm font-bold text-white">
            بازگشت به نتایج
          </Link>
        </div>
      </div>
    );
  }

  if (!submission || questions === null) return <LoadingScreen text="در حال بازکردن پاسخ‌ها..." />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      {/* سربرگ */}
      <div className="anim-fade-up">
        <Link
          href={`/dashboard/quiz/${params.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition hover:text-violet-600"
        >
          <ArrowRight className="h-4 w-4" /> بازگشت به نتایج آزمون
        </Link>
        <div className="lux-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-400/40">
              <UserRound className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-800">{submission.student_name}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> پایان: {faDateTime(submission.submitted_at)}
                </span>
                {submission.started_at && (
                  <span className="flex items-center gap-1">
                    <LogIn className="h-3 w-3" /> ورود: {faDateTime(submission.started_at)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={submission.status} />
            {submission.auto_score !== null && (
              <span className="rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-600 ring-1 ring-violet-200">
                نمره خودکار تستی: {faNumber(submission.auto_score)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* کارت سوالات */}
      {questions.map((q, i) => {
        const ans = answerMap.get(q.id);
        const isMCQ = q.question_type === "multiple_choice";
        return (
          <article key={q.id} className="lux-card anim-fade-up p-5 sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-black text-violet-700">
                  {faDigits(i + 1)}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  {isMCQ ? (
                    <>
                      <ListChecks className="h-3.5 w-3.5" /> چهارگزینه‌ای (تصحیح خودکار)
                    </>
                  ) : (
                    <>
                      <AlignRight className="h-3.5 w-3.5" /> تشریحی (نیازمند نمره‌دهی)
                    </>
                  )}
                </span>
              </span>
              {isMCQ && ans?.selected_option !== undefined && ans?.selected_option !== null && (
                ans.selected_option === q.correct_option ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> پاسخ درست
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200">
                    <XCircle className="h-3.5 w-3.5" /> پاسخ نادرست
                  </span>
                )
              )}
            </div>

            <p className="mb-4 whitespace-pre-wrap text-[15px] font-bold leading-8 text-slate-700">{q.question_text}</p>

            {/* تصویر سوال */}
            {q.image_data && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <p className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-400">
                  <ImageIcon className="h-3.5 w-3.5" /> تصویر پیوست سؤال
                </p>
                <img src={q.image_data} alt={`تصویر سوال ${faDigits(i + 1)}`} className="block max-h-80 w-full object-contain" />
              </div>
            )}

            {/* ترسیم/یادداشت دانش‌آموز روی تصویر سوال */}
            {q.image_data && q.allow_annotation && ans?.annotation_image && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40">
                <p className="flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-600">
                  <PenLine className="h-3.5 w-3.5" /> یادداشت و ترسیم دانش‌آموز روی تصویر سؤال
                </p>
                <img
                  src={ans.annotation_image}
                  alt={`یادداشت دانش‌آموز روی تصویر سوال ${faDigits(i + 1)}`}
                  className="block max-h-96 w-full bg-white object-contain"
                />
              </div>
            )}

            {isMCQ ? (
              <ul className="space-y-2">
                {(q.options ?? []).map((opt, oi) => {
                  const isCorrect = q.correct_option === oi;
                  const isChosen = ans?.selected_option === oi;
                  return (
                    <li
                      key={oi}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm transition-all ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/70"
                          : isChosen
                            ? "border-rose-300 bg-rose-50/70"
                            : "border-slate-100 bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                          isCorrect
                            ? "bg-emerald-500 text-white"
                            : isChosen
                              ? "bg-rose-500 text-white"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {optionLabel(oi)}
                      </span>
                      <span className={`flex-1 font-semibold ${isCorrect ? "text-emerald-700" : isChosen ? "text-rose-700" : "text-slate-600"}`}>
                        {opt}
                      </span>
                      {isCorrect && (
                        <span className="text-[11px] font-bold text-emerald-600">پاسخ صحیح</span>
                      )}
                      {isChosen && !isCorrect && (
                        <span className="text-[11px] font-bold text-rose-500">انتخاب دانش‌آموز</span>
                      )}
                      {isChosen && isCorrect && (
                        <span className="text-[11px] font-bold text-emerald-600">انتخاب دانش‌آموز</span>
                      )}
                    </li>
                  );
                })}
                {(ans === undefined || ans?.selected_option == null) && (
                  <li className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-400">
                    دانش‌آموز هیچ گزینه‌ای را انتخاب نکرده است.
                  </li>
                )}
              </ul>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <PenLine className="h-3.5 w-3.5" /> پاسخ متنی دانش‌آموز
                  </p>
                  {ans?.text ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{ans.text}</p>
                  ) : (
                    <p className="text-sm text-slate-300">متنی وارد نشده است.</p>
                  )}
                </div>

                {q.has_canvas && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-violet-500">
                      <ImageIcon className="h-3.5 w-3.5" /> پاسخ دست‌نویس / رسم‌شده روی تخته سفید
                    </p>
                    {ans?.canvas_image ? (
                      <div className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-inner">
                        { }
                        <img
                          src={ans.canvas_image}
                          alt={`پاسخ دست‌نویس دانش‌آموز برای سوال ${faDigits(i + 1)}`}
                          className="block max-h-[480px] w-full object-contain"
                        />
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white/70 px-4 py-6 text-center text-sm text-slate-300">
                        تصویری از تخته سفید ثبت نشده است.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-2xl bg-sky-50/70 p-4 ring-1 ring-sky-100">
                  <label htmlFor={`grade-${q.id}`} className="shrink-0 text-sm font-extrabold text-sky-700">
                    نمره این سوال:
                  </label>
                  <input
                    id={`grade-${q.id}`}
                    inputMode="decimal"
                    className="lux-input max-w-28 bg-white text-center font-black"
                    placeholder="مثلاً ۱.۵"
                    value={grades[String(q.id)] ?? ""}
                    onChange={(e) =>
                      setGrades((g) => ({ ...g, [String(q.id)]: faDigits(enDigits(e.target.value).replace(/[^0-9.]/g, "")) }))
                    }
                  />
                </div>
              </div>
            )}
          </article>
        );
      })}

      {/* نوار ثبت نهایی چسبان */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/85 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400">جمع نمره تشریحی شما</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-violet-700">{faNumber(Number(teacherTotal.toFixed(2)))}</span>
              {submission.auto_score !== null && (
                <span className="text-xs font-bold text-slate-400">+ {faNumber(submission.auto_score)} نمره خودکار تستی</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={saveGrades}
            disabled={saving}
            className="btn-gradient inline-flex shrink-0 items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-extrabold text-white"
          >
            {saving ? <Save className="h-4.5 w-4.5 animate-pulse" /> : <BadgeCheck className="h-5 w-5" />}
            {saving ? "در حال ثبت..." : "ثبت نهایی تصحیح"}
          </button>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
        پس از ثبت، وضعیت این پاسخ به «تصحیح‌شده» تغییر می‌کند.
      </p>
    </div>
  );
}
