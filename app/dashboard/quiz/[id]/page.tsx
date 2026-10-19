"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Users,
  CheckCheck,
  Hourglass,
  CalendarDays,
  ClipboardList,
  CloudAlert,
  UserRound,
  RefreshCw,
  Eye,
  FileDown,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { FullQuestion, Quiz, Submission } from "@/lib/types";
import { faDateTime, faNumber, faDigits } from "@/lib/fa";
import { buildReportRows, generateResultsPdf, pdfFileName } from "@/lib/pdf-report";
import { CopyLinkButton, LinkBox } from "@/components/app/copy-link";
import { EmptyState, LoadingScreen, StatusBadge, Spinner } from "@/components/app/shared";
import { useToast } from "@/hooks/use-toast";

export default function QuizResultsPage() {
  const params = useParams<{ id: string }>();
  const quizId = Number(params.id);
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<FullQuestion[]>([]);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setQuiz(null);
    setSubmissions(null);
    try {
      const data = await apiGet<{ quiz: Quiz; questions: FullQuestion[]; submissions: Submission[] }>(
        `/api/quizzes/${quizId}`
      );
      setQuiz(data.quiz);
      setQuestions(data.questions ?? []);
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "بارگذاری نتایج ناموفق بود.");
    }
  }, [quizId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      // شکستن زنجیره همگام برای جلوگیری از setState همگام درون افکت
      await Promise.resolve();
      if (alive) await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  /** ردیف‌های گزارش PDF (پیش از بازگشت‌های شرطی برای حفظ ترتیب هوک‌ها) */
  const reportRows = useMemo(
    () => (submissions && quiz ? buildReportRows(submissions, questions) : []),
    [submissions, quiz, questions]
  );

  async function downloadPdf() {
    if (!reportRef.current || pdfBusy || !quiz || !submissions) return;
    setPdfBusy(true);
    try {
      await generateResultsPdf({
        quizTitle: quiz.title,
        submissions,
        questions,
        reportEl: reportRef.current,
        fileName: pdfFileName(quiz.title),
      });
      toast({ title: "فایل PDF دانلود شد", description: "گزارش کامل نتایج با قالب A4 ذخیره شد.", duration: 4000 });
    } catch {
      toast({
        variant: "destructive",
        title: "تولید PDF ناموفق بود",
        description: "لطفاً دوباره تلاش کنید.",
        duration: 5000,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  if (error) {
    return (
      <div className="anim-fade-up mx-auto max-w-lg py-10 text-center">
        <div className="lux-card flex flex-col items-center gap-4 p-10">
          <CloudAlert className="h-10 w-10 text-rose-400" />
          <p className="font-bold text-rose-600">{error}</p>
          <Link href="/dashboard" className="btn-gradient rounded-2xl px-6 py-3 text-sm font-bold text-white">
            بازگشت به داشبورد
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz || submissions === null) return <LoadingScreen text="در حال دریافت نتایج..." />;

  const graded = submissions.filter((s) => s.status === "graded").length;
  const pending = submissions.length - graded;

  return (
    <div className="space-y-7">
      {/* سربرگ آزمون */}
      <section className="anim-fade-up">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition hover:text-violet-600"
        >
          <ArrowRight className="h-4 w-4" /> بازگشت به داشبورد
        </Link>

        <div className="lux-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-800 sm:text-2xl">{quiz.title}</h1>
              {quiz.description && <p className="mt-1.5 text-sm leading-6 text-slate-400">{quiz.description}</p>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                ساخته‌شده در {faDateTime(quiz.created_at)}
              </p>
            </div>
            <CopyLinkButton link={`${typeof window !== "undefined" ? window.location.origin : ""}/quiz/${quiz.id}`} />
          </div>
          <div className="mt-4">
            <LinkBox link={`${typeof window !== "undefined" ? window.location.origin : ""}/quiz/${quiz.id}`} />
          </div>
        </div>
      </section>

      {/* آمار + خروجی PDF */}
      <section className="anim-fade-up grid grid-cols-3 gap-3 sm:gap-4" aria-label="آمار آزمون">
        <div className="lux-card flex flex-col items-center gap-1.5 p-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Users className="h-5 w-5" />
          </span>
          <p className="text-xl font-black text-slate-800">{faNumber(submissions.length)}</p>
          <p className="text-[11px] font-semibold text-slate-400">شرکت‌کننده</p>
        </div>
        <div className="lux-card flex flex-col items-center gap-1.5 p-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCheck className="h-5 w-5" />
          </span>
          <p className="text-xl font-black text-slate-800">{faNumber(graded)}</p>
          <p className="text-[11px] font-semibold text-slate-400">تصحیح‌شده</p>
        </div>
        <div className="lux-card flex flex-col items-center gap-1.5 p-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Hourglass className="h-5 w-5" />
          </span>
          <p className="text-xl font-black text-slate-800">{faNumber(pending)}</p>
          <p className="text-[11px] font-semibold text-slate-400">در انتظار تصحیح</p>
        </div>
      </section>

      {/* دکمه اصلی خروجی PDF */}
      {submissions.length > 0 && (
        <section className="anim-fade-up">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={pdfBusy}
            className="btn-gradient group flex w-full items-center justify-center gap-3 rounded-3xl px-6 py-5 text-base font-black text-white shadow-xl shadow-violet-300/40 transition-all hover:shadow-2xl disabled:opacity-70 sm:text-lg"
          >
            {pdfBusy ? (
              <>
                <Spinner className="h-5 w-5" />
                در حال ساخت فایل PDF...
              </>
            ) : (
              <>
                <FileDown className="h-6 w-6 transition-transform group-hover:translate-y-0.5" />
                دانلود خروجی PDF نتایج
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            فایل PDF فارسی و آماده چاپ (A4) شامل نام، زمان ورود و پایان، تعداد درست/نادرست/نزده و نمره نهایی همه
            دانش‌آموزان به ترتیب شرکت در آزمون.
          </p>
        </section>
      )}

      {/* لیست پاسخ‌ها */}
      <section className="space-y-3" aria-label="لیست پاسخ‌های دانش‌آموزان">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
          <ClipboardList className="h-5 w-5 text-violet-500" />
          پاسخ‌های دانش‌آموزان
        </h2>

        {submissions.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="هنوز هیچ پاسخی ثبت نشده"
            description="لینک آزمون را برای دانش‌آموزان بفرستید؛ به‌محض ارسال پاسخ‌ها، نتیجه‌ها همین‌جا ظاهر می‌شوند."
          />
        ) : (
          submissions.map((s, i) => (
            <Link
              key={s.id}
              href={`/dashboard/quiz/${quiz.id}/grade/${s.id}`}
              className="lux-card anim-fade-up group flex items-center gap-4 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/40 sm:p-5"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-600">
                <UserRound className="h-5.5 w-5.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-slate-700">{s.student_name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{faDateTime(s.submitted_at)}</p>
              </div>
              <div className="hidden flex-col items-end gap-1.5 sm:flex">
                {s.auto_score !== null && (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
                    نمره تستی: {faNumber(s.auto_score)}
                  </span>
                )}
                {s.teacher_score !== null && (
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-600 ring-1 ring-sky-200">
                    نمره تشریحی: {faNumber(s.teacher_score)}
                  </span>
                )}
                <StatusBadge status={s.status} />
              </div>
              <span className="btn-gradient inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold text-white">
                <Eye className="h-3.5 w-3.5" /> مشاهده و تصحیح
              </span>
            </Link>
          ))
        )}
      </section>

      {submissions.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-slate-400">
          <RefreshCw className="h-3 w-3" />
          برای بروزرسانی لیست، صفحه را دوباره باز کنید.
        </p>
      )}

      {/* گزارش مخفی برای تولید PDF — با استایل ثابت A4 */}
      <div
        aria-hidden
        style={{ position: "fixed", insetInlineStart: -10000, top: 0, width: 794, visibility: "hidden" }}
      >
        <div
          ref={reportRef}
          dir="rtl"
          style={{
            width: 794,
            minHeight: 1123,
            backgroundColor: "#ffffff",
            color: "#1e293b",
            fontFamily: "Vazirmatn, Tahoma, sans-serif",
            padding: "40px 36px",
            boxSizing: "border-box",
            visibility: "visible",
          }}
        >
          {/* سربرگ سند */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderBottom: "3px solid #7c3aed",
              paddingBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{quiz.title}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>گزارش کامل نتایج شرکت‌کنندگان</div>
            </div>
            <div style={{ textAlign: "left", fontSize: 12, color: "#475569", lineHeight: 2 }}>
              <div>
                تعداد شرکت‌کنندگان: <b>{faNumber(submissions.length)}</b> نفر
              </div>
              <div>تاریخ تهیه گزارش: {faDateTime(new Date().toISOString())}</div>
            </div>
          </div>

          {/* جدول نتایج */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 20,
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}>
                {[
                  "ردیف",
                  "نام و نام خانوادگی",
                  "زمان ورود به آزمون",
                  "زمان پایان آزمون",
                  "درست",
                  "نادرست",
                  "نزده",
                  "نمره نهایی",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      border: "1px solid #ddd6fe",
                      padding: "9px 6px",
                      fontSize: 12,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.map((r, i) => (
                <tr
                  key={r.row}
                  style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8f7ff" }}
                >
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center", fontWeight: 700 }}>
                    {faDigits(r.row)}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: 700 }}>{r.name}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center", fontSize: 11.5 }}>
                    {r.entryAt}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center", fontSize: 11.5 }}>
                    {r.submitAt}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "8px 6px",
                      textAlign: "center",
                      color: "#16a34a",
                      fontWeight: 800,
                    }}
                  >
                    {faNumber(r.correct)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "8px 6px",
                      textAlign: "center",
                      color: "#dc2626",
                      fontWeight: 800,
                    }}
                  >
                    {faNumber(r.incorrect)}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center", color: "#d97706", fontWeight: 800 }}>
                    {faNumber(r.unanswered)}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center" }}>
                    {r.score !== null ? (
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: 42,
                          padding: "3px 10px",
                          borderRadius: 999,
                          backgroundColor: "#ecfdf5",
                          color: "#059669",
                          fontWeight: 900,
                          fontSize: 13,
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        {faNumber(Number(r.score.toFixed(2)))}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: 42,
                          padding: "3px 10px",
                          borderRadius: 999,
                          backgroundColor: "#fff7ed",
                          color: "#d97706",
                          fontWeight: 800,
                          fontSize: 11,
                          border: "1px solid #fed7aa",
                        }}
                      >
                        بررسی نشده
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* پاصفحه سند */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 12,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            <span>آزمون‌ساز آنلاین — گزارش نتایج</span>
            <span>درصد صحت پاسخ‌ها صرفاً شامل سوالات چهارگزینه‌ای است؛ نمره نهایی پس از تصحیح بخش تشریحی کامل می‌شود.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
