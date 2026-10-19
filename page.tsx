
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  PartyPopper,
  Check,
  Plus,
  Trash2,
  ListOrdered,
  Type,
  AlignRight,
  Timer,
  TimerOff,
  PenTool,
  ListChecks,
  CircleAlert,

  ExternalLink,
  LayoutGrid,
  CopyPlus,
  ImagePlus,
  CalendarClock,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api-client";
import type { DraftQuestion, QuestionType } from "@/lib/types";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/types";
import { faDigits, enDigits, faNumber, faDateTime, optionLabel } from "@/lib/fa";
import { compressImageFile } from "@/lib/image";

import { LinkBox } from "@/components/app/copy-link";
import { Spinner } from "@/components/app/shared";

const STEP_LABELS = ["مشخصات کلی", "زمان‌بندی", "سوالات آزمون", "انتشار"];

function newUid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `q${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function blankQuestion(type: QuestionType): DraftQuestion {
  return {
    uid: newUid(),
    question_type: type,

    question_text: "",
    options: ["", "", "", ""],
    correct_option: null,
    has_canvas: type === "descriptive",
    image_data: null,
    allow_annotation: false,
  };
}

export default function NewQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isTimed, setIsTimed] = useState<boolean | null>(null);
  const [duration, setDuration] = useState("");
  const [startAt, setStartAt] = 

useState<string | null>(null);
  const [endAt, setEndAt] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [touchedQ, setTouchedQ] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<number | null>(null);
  const uploadingRef = useRef<Record<string, boolean>>({});

  const windowInvalid = useMemo(() => {
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return "ساعت پایان باید بعد از ساعت شروع باشد.";
    }

    return null;
  }, [startAt, endAt]);

  const qErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const q of questions) {
      if (!q.question_text.trim()) errs[q.uid] = "متن سوال را وارد کنید.";
      else if (q.question_type === "multiple_choice") {
        if (q.options.length < MIN_OPTIONS || q.options.length > MAX_OPTIONS)
          errs[q.uid] = `تعداد گزینه‌ها باید بین ${MIN_OPTIONS} تا ${MAX_OPTIONS} باشد.`;
        else if (q.options.some((o) => !o.trim())) errs[q.uid] = "متن همه گزینه‌ها باید پر شود.";
        else if (q.correct_option === null) errs[q.uid] = "پاسخ صحیح را با کلیک روی گزینه مشخص کنید.";
      }

    }
    return errs;
  }, [questions]);

  const canNext = useMemo(() => {
    if (step === 0) return title.trim().length >= 2;
    if (step === 1) {
      if (isTimed === null) return false;
      if (!isTimed) return !windowInvalid;
      const d = parseInt(enDigits(duration), 10);
      return Number.isFinite(d) && d >= 1 && d <= 600 && !windowInvalid;
    }
    if (step === 2) return questions.length >= 1 && Object.keys(qErrors).length === 0;
    return true;
  }, [step, title, isTimed, duration, questions, qErrors, windowInvalid]);

  function next() {
    if (!canNext) {
      if (step === 2) setTouchedQ(Object.fromEntries(questions.map((q) => [q.uid, true])));
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function updateQuestion(uid: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.uid === uid ? { ...q, ...patch } : q)));
  }

  function addOption(uid: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === uid && q.options.length < MAX_OPTIONS ? { ...q, options: 

[...q.options, ""] } : q
      )
    );
  }

  function removeOption(uid: string, oi: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.uid !== uid || q.options.length <= MIN_OPTIONS) return q;
        const options = q.options.filter((_, i) => i !== oi);
        let correct = q.correct_option;
        if (correct === oi) correct = null;
        else if (correct !== null && oi < correct) correct -= 1;
        return { ...q, options, correct_option: correct };
      })
    );

  }

  async function uploadQuestionImage(uid: string, file: File) {
    if (uploadingRef.current[uid]) return;
    uploadingRef.current[uid] = true;
    try {
      const dataUrl = await compressImageFile(file, 1000, 0.85);
      updateQuestion(uid, { image_data: dataUrl });
      toast({ title: "تصویر سوال اضافه شد", duration: 2500 });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "آپلود تصویر ناموفق بود",
        description: err instanceof Error && err.message ? err.message : "فایل تصویر معتبر نیست.",
        duration: 5000,

      });
    } finally {
      uploadingRef.current[uid] = false;
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const quiz = await apiPost<{ id: number }>("/api/quizzes", {
        title: title.trim(),
        description: description.trim() || null,
        is_timed: !!isTimed,
        duration_minutes: isTimed ? parseInt(enDigits(duration), 10) || null : null,
        start_at: startAt,
        end_at: endAt,
        questions: questions.map((q, i) => ({
          question_type: q.question_type,
          question_text: q.question_text.trim(),

          options: q.question_type === "multiple_choice" ? q.options.map((o) => o.trim()) : null,
          correct_option: q.question_type === "multiple_choice" ? q.correct_option : null,
          has_canvas: q.question_type === "descriptive" ? q.has_canvas : false,
          image_data: q.image_data,
          allow_annotation: q.image_data ? q.allow_annotation : false,
          order_index: i,
        })),
      });
      setPublishedId(quiz.id);
      toast({ title: "آزمون منتشر شد", description: "لینک آزمون آماده ارسال است.", duration: 3500 });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "انتشار ناموفق بود",

        description:
          err instanceof Error && err.message
            ? err.message
            : "ذخیره آزمون انجام نشد؛ لطفاً دوباره تلاش کنید.",
        duration: 7000,
      });
    } finally {
      setPublishing(false);
    }
  }

  /* ================= صفحه موفقیت انتشار ================= */
  if (publishedId !== null) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/quiz/${publishedId}` : `/quiz/${publishedId}`;
    return (
      <div className="anim-fade-up mx-

auto max-w-2xl py-6">
        <div className="lux-card p-8 text-center sm:p-12">
          <span className="anim-pop mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-xl shadow-emerald-300/50">
            <svg className="check-draw h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 L9.5 18 L20 6.5" />
            </svg>
          </span>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-black text-slate-800">
            <PartyPopper className="h-6 w-6 

text-amber-500" />
            آزمون شما با موفقیت منتشر شد!
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            لینک اختصاصی آزمون شما آماده است. آن را کپی و در پیام‌رسان‌هایی مثل تلگرام، شاد یا ایتا برای دانش‌آموزان
            بفرستید. با کلیک روی لینک، آزمون مستقیم در مرورگر باز می‌شود.
          </p>
          <div className="mt-6 text-start">
            <p className="mb-2 text-xs font-bold text-slate-500">لینک اختصاصی آزمون:</p>
            <LinkBox link={link} />
          </div>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
            <a
              href={link}

              target="_blank"
              rel="noopener noreferrer"
              className="btn-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
            >
              <ExternalLink className="h-4 w-4" /> مشاهده آزمون
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
            >
              <LayoutGrid className="h-4 w-4" /> داشبورد من
            </Link>

            <button
              type="button"
              onClick={() => {
                setTitle("");
                setDescription("");
                setIsTimed(null);
                setDuration("");
                setStartAt(null);
                setEndAt(null);
                setQuestions([]);
                setPublishedId(null);
                setStep(0);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
            >
              <CopyPlus className="h-4 w-4" /> آزمون دیگر
            </button>

          </div>
        </div>
      </div>
    );
  }

  /* ================= ویزارد ================= */
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {/* سربرگ */}
      <div className="anim-fade-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">ساخت آزمون جدید</h1>
          <p className="mt-1 text-sm text-slate-400">در چهار گام ساده، آزمون آنلاین خود را منتشر کنید.</p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white/70 px-4 py-2.5 text-sm font-bold text-slate-500 ring-1 ring-slate-200 transition hover:text-violet-600"
        >
          <ArrowRight className="h-4 w-4" />
          داشبورد
        </Link>
      </div>

      {/* نوار مراحل */}
      <ol className="lux-card anim-fade-up flex items-center justify-between gap-1 p-4 sm:gap-0" aria-label="مراحل ساخت آزمون">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (

            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-all duration-300 ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "btn-gradient text-white shadow-lg shadow-violet-400/40"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : faDigits(i + 1)}
                </span>

                <span
                  className={`hidden text-xs font-bold sm:block ${
                    active ? "text-violet-700" : done ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span className={`mx-2 h-1 flex-1 rounded-full ${i < step ? "bg-emerald-400" : "bg-slate-100"}`} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <div className="lux-card anim-fade-up p-6 sm:p-8" key={step}>
        {/* ============ گام ۱: مشخصات ============ */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Type className="h-5.5 w-5.5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">مشخصات کلی آزمون</h2>
                <p className="text-xs text-slate-400">عنوان و توضیحی که دانش‌آموزان قبل از شروع می‌بینند.</p>
              </div>

            </div>
            <div>
              <label htmlFor="qtitle" className="mb-1.5 block text-sm font-bold text-slate-600">
                عنوان آزمون <span className="text-rose-400">*</span>
              </label>
              <input
                id="qtitle"
                className="lux-input"
                placeholder="مثال: آزمون ریاضی فصل ۳ — معادله خط"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="qdesc" 

className="mb-1.5 block text-sm font-bold text-slate-600">
                توضیحات آزمون <span className="font-normal text-slate-300">(اختیاری)</span>
              </label>
              <textarea
                id="qdesc"
                className="lux-input min-h-28 resize-y"
                placeholder="مثال: به سوالات با دقت پاسخ دهید. سوالات تشریحی را می‌توانید روی تخته سفید با دست‌خط بنویسید."
                value={description}
                maxLength={600}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}


        {/* ============ گام ۲: زمان‌بندی ============ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Timer className="h-5.5 w-5.5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">زمان‌بندی آزمون</h2>
                <p className="text-xs text-slate-400">آیا آزمون زمان‌دار است؟</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="زمان‌دار بودن آزمون">
              <button
                type="button"
                role="radio"
                aria-checked={isTimed === false}
                onClick={() => setIsTimed(false)}
                className={`group flex items-start gap-3 rounded-2xl border-2 p-5 text-start transition-all duration-300 ${
                  isTimed === false
                    ? "border-violet-500 bg-violet-50/70 shadow-lg shadow-violet-200/50"
                    : "border-slate-200 bg-white hover:border-violet-200"
                }`}
              >
                <span
                  className={`flex h-10 w-10 

shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isTimed === false ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <TimerOff className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-extrabold text-slate-700">خیر، بدون محدودیت زمان</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-400">
                    دانش‌آموز هر چقدر لازم باشد وقت دارد و تایمری به او نشان داده نمی‌شود.
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={isTimed === true}
                onClick={() => setIsTimed(true)}
                className={`group flex items-start gap-3 rounded-2xl border-2 p-5 text-start transition-all duration-300 ${
                  isTimed === true
                    ? "border-violet-500 bg-violet-50/70 shadow-lg shadow-violet-200/50"
                    : "border-slate-200 bg-white hover:border-violet-200"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isTimed === true ? "bg-

violet-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Timer className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-extrabold text-slate-700">بله، آزمون زمان‌دار است</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-400">
                    تایمر معکوس با اعداد فارسی نمایش داده می‌شود و پس از پایان زمان، پاسخ‌ها خودکار ثبت می‌شوند.
                  </span>
                </span>
              </button>
            </div>
            {isTimed && (
              <div className="anim-fade-up">

                <label htmlFor="qdur" className="mb-1.5 block text-sm font-bold text-slate-600">
                  مدت آزمون (دقیقه) <span className="text-rose-400">*</span>
                </label>
                <div className="relative max-w-56">
                  <input
                    id="qdur"
                    inputMode="numeric"
                    className="lux-input pe-14 text-center text-lg font-black"
                    placeholder="۳۰"
                    value={duration}
                    onChange={(e) => setDuration(faDigits(enDigits(e.target.value).replace(/[^0-9]/g, "")))}
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-sm 

font-bold text-slate-400">دقیقه</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  بین ۱ تا ۶۰۰ دقیقه؛ مثلاً ۳۰ دقیقه. پس از پایان زمان، صفحه به‌صورت خودکار قفل و پاسخ‌ها ثبت می‌شوند.
                </p>
              </div>
            )}

            {/* بازه زمانی دسترسی */}
            <div className="anim-fade-up rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <CalendarClock className="h-5 

w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-700">بازه زمانی دسترسی به آزمون (اختیاری)</p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    با تعیین تاریخ و ساعت شروع و پایان، دانش‌آموزان فقط در این بازه می‌توانند وارد آزمون شوند.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600">
                    <CalendarClock 

className="h-4 w-4 text-sky-500" />
                    تاریخ و ساعت شروع
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      className="lux-input w-full text-sm"
                      value={startAt ? new Date(startAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setStartAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                    {startAt && (
                      <button
                        type="button"
                        title="حذف زمان شروع"
                        onClick={() => setStartAt(null)}

                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600">
                    <CalendarClock className="h-4 w-4 text-rose-400" />
                    تاریخ و ساعت پایان
                  </label>
                  <div className="flex items-center gap-2">

                    <input
                      type="datetime-local"
                      className="lux-input w-full text-sm"
                      value={endAt ? new Date(endAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setEndAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                    {endAt && (
                      <button
                        type="button"
                        title="حذف زمان پایان"
                        onClick={() => setEndAt(null)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                      >

                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {windowInvalid && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-rose-500">
                  <CircleAlert className="h-3.5 w-3.5" /> {windowInvalid}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============ گام ۳: سوالات ============ */}
        {step === 2 && (

          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <ListOrdered className="h-5.5 w-5.5" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">
                    سوالات آزمون{" "}
                    {questions.length > 0 && (
                      <span className="text-sm font-bold text-violet-500">({faNumber(questions.length)} سوال)</span>
                    )}

                  </h2>
                  <p className="text-xs text-slate-400">دو نوع سوال: چهارگزینه‌ای (تصحیح خودکار) و تشریحی (نمره دستی).</p>
                </div>
              </div>
            </div>
            {questions.length === 0 && (
              <p className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm leading-7 text-slate-400">
                هنوز سوالی اضافه نشده است. با دکمه‌های زیر اولین سوال را اضافه کنید.
              </p>
            )}
            <ul className="space-y-4">
              {questions.map((q, idx) => (
                <li key={q.uid} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm 

transition-shadow hover:shadow-md">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-600">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs text-violet-700">
                        {faDigits(idx + 1)}
                      </span>
                      {q.question_type === "multiple_choice" ? "سوال چهارگزینه‌ای" : "سوال تشریحی"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="انتقال به بالا"
                        disabled={idx === 0}

                        onClick={() =>
                          setQuestions((prev) => {
                            const arr = [...prev];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            return arr;
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-violet-600 disabled:opacity-30"
                      >
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </button>
                      <button
                        type="button"
                        title="انتقال به پایین"
                        disabled={idx === questions.length - 1}

                        onClick={() =>
                          setQuestions((prev) => {
                            const arr = [...prev];
                            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                            return arr;
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-violet-600 disabled:opacity-30"
                      >
                        <ArrowLeft className="h-4 w-4 rotate-90" />
                      </button>
                      <button
                        type="button"
                        title="حذف سوال"
                        onClick={() => setQuestions((prev) => prev.filter((x) => 

x.uid !== q.uid))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/80 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(q.uid, {
                          question_type: "multiple_choice",
                        })

                      }
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                        q.question_type === "multiple_choice" ? "btn-gradient text-white" : "text-slate-500 hover:bg-white"
                      }`}
                    >
                      <ListChecks className="h-3.5 w-3.5" /> چهارگزینه‌ای
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(q.uid, {
                          question_type: "descriptive",
                        })
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-lg 

py-2 text-xs font-bold transition-all ${
                        q.question_type === "descriptive" ? "btn-gradient text-white" : "text-slate-500 hover:bg-white"
                      }`}
                    >
                      <AlignRight className="h-3.5 w-3.5" /> تشریحی / ریاضی
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={`qt-${q.uid}`}>متن سوال {faDigits(idx + 1)}</label>
                  <textarea
                    id={`qt-${q.uid}`}
                    className="lux-input min-h-20 resize-y"
                    placeholder={
                      q.question_type === "multiple_choice"
                        ? "متن سوال چهارگزینه‌ای را 

بنویسید..."
                        : "سوال تشریحی یا مسئله ریاضی را بنویسید..."
                    }
                    value={q.question_text}
                    maxLength={800}
                    onChange={(e) => updateQuestion(q.uid, { question_text: e.target.value })}
                  />
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-600">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        تصویر سؤال <span 

className="text-[11px] font-normal text-slate-400">(اختیاری)</span>
                      </p>
                      <div className="flex items-center gap-2">
                        {q.image_data && (
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.uid, { image_data: null, allow_annotation: false })}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> حذف تصویر
                          </button>
                        )}
                        <label className="inline-flex 

cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-violet-600 ring-1 ring-violet-200 transition hover:bg-violet-50">
                          <ImagePlus className="h-4 w-4" />
                          آپلود تصویر سؤال
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) void uploadQuestionImage(q.uid, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {q.image_data ? (
                      <div className="anim-pop mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img src={q.image_data} alt={`تصویر سوال ${faDigits(idx + 1)}`} className="mx-auto block max-h-56 w-auto max-w-full object-contain" />
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] leading-5 text-slate-400">
                        می‌توانید عکس سوال، شکل هندسی یا نمودار را پیوست کنید.
                      </p>
                    )}
                    <div className={`mt-3 flex items-start justify-between gap-3 rounded-2xl p-3 ring-1 transition-opacity ${q.image_data ? "bg-violet-50/70 ring-violet-100" : "bg-white/60 ring-slate-100 

opacity-60"}`}>
                      <div>
                        <p className="text-xs font-extrabold text-slate-700">امکان یادداشت‌برداری و ترسیم روی تصویر برای دانش‌آموز</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">
                          {q.image_data
                            ? "دانش‌آموز می‌تواند در آزمون، تصویر را باز کند و حل مسئله یا یادداشت را با دست‌خط روی آن بنویسد."
                            : "ابتدا تصویر سوال را آپلود کنید تا این گزینه فعال شود."}
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(q.image_data && q.allow_annotation)}
                        disabled={!q.image_data}
                        onCheckedChange={(v) => 

updateQuestion(q.uid, { allow_annotation: v })}
                        aria-label="امکان ترسیم روی تصویر"
                        className="data-[state=checked]:bg-violet-600"
                      />
                    </div>
                  </div>
                  {q.question_type === "multiple_choice" ? (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-xs font-bold text-slate-500">
                        گزینه‌ها (حداقل {MIN_OPTIONS} و حداکثر {MAX_OPTIONS}) — برای تعیین پاسخ صحیح، روی دایره کنار گزینه کلیک کنید:
                      </p>
                      {q.options.map((opt, oi) => (
                        <div

                          key={oi}
                          className={`flex items-center gap-2 rounded-2xl border-2 p-1.5 transition-all duration-200 ${
                            q.correct_option === oi
                              ? "border-emerald-400 bg-emerald-50/50"
                              : "border-slate-100 bg-slate-50/50 focus-within:border-violet-300"
                          }`}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={q.correct_option === oi}
                            aria-label={`پاسخ صحیح گزینه ${optionLabel(oi)}`}
                            title="پاسخ صحیح"
                            onClick={() => updateQuestion(q.uid, { correct_option: oi 

})}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                              q.correct_option === oi
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-300"
                                : "bg-white text-slate-400 ring-2 ring-slate-200 hover:ring-violet-300"
                            }`}
                          >
                            {q.correct_option === oi ? <Check className="h-4 w-4" /> : optionLabel(oi)}
                          </button>
                          <input
                            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-300"
                            placeholder={`متن گزینه $

{optionLabel(oi)}`}
                            value={opt}
                            maxLength={200}
                            onChange={(e) => {
                              const options = [...q.options];
                              options[oi] = e.target.value;
                              updateQuestion(q.uid, { options });
                            }}
                          />
                          <button
                            type="button"
                            title={q.options.length <= MIN_OPTIONS ? "حداقل ۲ گزینه لازم است" : "حذف این گزینه"}
                            aria-label={`حذف گزینه ${optionLabel(oi)}`}
                            disabled={q.options.length <= MIN_OPTIONS}

                            onClick={() => removeOption(q.uid, oi)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {q.options.length < MAX_OPTIONS && (
                        <button
                          type="button"
                          onClick={() => addOption(q.uid)}
                          className="group flex w-

full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-2.5 text-xs font-extrabold text-emerald-600 transition-all hover:border-emerald-400 hover:bg-emerald-50"
                        >
                          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                          افزودن گزینه
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl bg-violet-50/60 p-4 ring-1 ring-violet-100">
                      <div>
                        <p className="text-sm font-

extrabold text-slate-700">فعال‌سازی بوم نقاشی / تخته سفید برای پاسخ‌دهی دانش‌آموز</p>
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          اگر فعال باشد، دانش‌آموز می‌تواند پاسخ را با دست‌خط روی تخته سفید بنویسد یا رسم کند.
                        </p>
                      </div>
                      <Switch
                        checked={q.has_canvas}
                        onCheckedChange={(v) => updateQuestion(q.uid, { has_canvas: v })}
                        aria-label="فعال‌سازی بوم نقاشی"
                        className="data-[state=checked]:bg-violet-600"
                      />
                    </div>
                  )}
                  {touchedQ[q.uid] && qErrors[q.uid] && (

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-rose-500">
                      <CircleAlert className="h-3.5 w-3.5" /> {qErrors[q.uid]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setQuestions((prev) => [...prev, blankQuestion("multiple_choice")]);
                  setTouchedQ((t) => ({ ...t, [questions.length]: false }));
                }}
                className="group flex items-

center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 px-5 py-4 text-sm font-extrabold text-violet-600 transition-all hover:border-violet-400 hover:bg-violet-50"
              >
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                افزودن سوال چهارگزینه‌ای
              </button>
              <button
                type="button"
                onClick={() => setQuestions((prev) => [...prev, blankQuestion("descriptive")])}
                className="group flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 px-5 py-4 text-sm font-extrabold text-sky-600 transition-all hover:border-

sky-400 hover:bg-sky-50"
              >
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                افزودن سوال تشریحی / ریاضی
              </button>
            </div>
          </div>
        )}

        {/* ============ گام ۴: انتشار ============ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <PenTool className="h-5.5 

w-5.5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">بازبینی نهایی و انتشار</h2>
                <p className="text-xs text-slate-400">خلاصه آزمون را بررسی کنید و منتشر کنید.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[11px] font-bold text-slate-400">عنوان آزمون</p>
                <p className="mt-1 truncate text-sm font-extrabold text-slate-700">{title}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[11px] font-bold text-slate-400">زمان‌بندی</p>
                <p className="mt-1 text-sm font-extrabold text-slate-700">
                  {isTimed ? `زمان‌دار — ${faNumber(parseInt(enDigits(duration), 10))} دقیقه` : "بدون محدودیت زمان"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[11px] font-bold text-slate-400">تعداد سوالات</p>
                <p className="mt-1 text-sm font-extrabold text-slate-700">
                  {faNumber(questions.length)} سوال ({faNumber(questions.filter((q) => q.question_type === "descriptive").length)} تشریحی)

                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[11px] font-bold text-slate-400">بازه زمانی دسترسی</p>
                <p className="mt-1 text-xs font-extrabold leading-6 text-slate-700">
                  {startAt || endAt ? (
                    <span className="space-y-0.5">
                      <span className="block">شروع: {startAt ? faDateTime(startAt) : "—"}</span>
                      <span className="block">پایان: {endAt ? faDateTime(endAt) : "—"}</span>
                    </span>
                  ) : (
                    "بدون محدودیت — همیشه در دسترس"
                  )}

                </p>
              </div>
            </div>
            <ol className="space-y-2">
              {questions.map((q, i) => (
                <li key={q.uid} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-[11px] font-black text-violet-700">
                    {faDigits(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-600">{q.question_text}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">

                      {q.question_type === "multiple_choice"
                        ? `${faNumber(q.options.length)} گزینه‌ای — پاسخ صحیح: ${q.correct_option !== null ? optionLabel(q.correct_option) : "—"}`
                        : `تشریحی${q.has_canvas ? " — با بوم دست‌نویس" : ""}`}
                      {q.image_data ? " — دارای تصویر" : ""}
                      {q.image_data && q.allow_annotation ? " (قابل ترسیم توسط دانش‌آموز)" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="rounded-2xl bg-violet-50/70 p-4 text-xs leading-6 text-violet-700 ring-1 ring-violet-100">

              پس از انتشار، لینک اختصاصی آزمون ساخته می‌شود تا در پیام‌رسان‌ها برای دانش‌آموزان ارسال کنید. تصحیح سوالات
              چهارگزینه‌ای بلافاصله و خودکار انجام می‌شود.
            </p>
          </div>
        )}

        {/* ناوبری گام‌ها */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || publishing}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-500 transition 

hover:bg-slate-200 disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" /> قبلی
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-7 py-3 text-sm font-extrabold text-white transition-all ${
                canNext ? "btn-gradient" : "cursor-not-allowed bg-slate-300 text-white"
              }`}
            >
              بعدی <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (

            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-extrabold text-white"
            >
              {publishing ? <Spinner className="h-4.5 w-4.5" /> : <Check className="h-5 w-5" />}
              {publishing ? "در حال انتشار..." : "ذخیره و انتشار آزمون"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
