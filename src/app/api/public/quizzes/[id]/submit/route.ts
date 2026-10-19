import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface IncomingAnswer {
  question_id?: unknown;
  question_type?: unknown;
  selected_option?: unknown;
  text?: unknown;
  canvas_image?: unknown;
  annotation_image?: unknown;
}

/** حداکثر حجم تصویر دست‌نویس هر پاسخ (تقریباً ۲ مگابایت به‌صورت Data URL) */
const MAX_CANVAS_DATAURL = 2 * 1024 * 1024;

function validImage(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("data:image/") && value.length <= MAX_CANVAS_DATAURL
    ? value
    : null;
}

/**
 * POST /api/public/quizzes/[id]/submit — ثبت پاسخ‌های دانش‌آموز
 * نمره‌دهی خودکار بخش چهارگزینه‌ای همین‌جا در سرور انجام می‌شود
 * (جایگزین تریگر دیتابیس) و گزینه‌های صحیح هرگز برای دانش‌آموز
 * بازگردانده نمی‌شوند.
 * بازه زمانی دسترسی آزمون نیز در سرور کنترل می‌شود.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quizId = Number(id);
  if (!Number.isInteger(quizId)) {
    return NextResponse.json({ error: "آزمونی با این لینک پیدا نشد." }, { status: 404 });
  }

  let body: { student_name?: unknown; answers_data?: unknown; started_at?: unknown };
  try {
    body = (await request.json()) as { student_name?: unknown; answers_data?: unknown; started_at?: unknown };
  } catch {
    return NextResponse.json({ error: "داده ارسالی نامعتبر است." }, { status: 400 });
  }

  const studentName = typeof body.student_name === "string" ? body.student_name.trim() : "";
  if (studentName.length < 3 || studentName.length > 60) {
    return NextResponse.json({ error: "نام و نام خانوادگی معتبر نیست." }, { status: 400 });
  }

  const rawAnswers = Array.isArray(body.answers_data) ? (body.answers_data as IncomingAnswer[]) : [];

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!quiz) {
    return NextResponse.json({ error: "آزمونی با این لینک پیدا نشد." }, { status: 404 });
  }
  if (quiz.questions.length === 0) {
    return NextResponse.json({ error: "این آزمون هنوز سوالی ندارد." }, { status: 400 });
  }

  // کنترل بازه زمانی دسترسی در سرور (منبع حقیقت: ساعت سرور)
  const now = Date.now();
  if (quiz.startAt && now < quiz.startAt.getTime()) {
    return NextResponse.json({ error: "آزمون هنوز شروع نشده است.", code: "not_started" }, { status: 403 });
  }
  if (quiz.endAt && now > quiz.endAt.getTime()) {
    return NextResponse.json({ error: "مهلت شرکت در این آزمون به پایان رسیده است.", code: "expired" }, { status: 403 });
  }

  // زمان ورود دانش‌آموز (اعتبارسنجی: نه خیلی در آینده، حداکثر ۲۴ ساعت گذشته)
  let startedAt: Date | null = null;
  if (typeof body.started_at === "string" && body.started_at) {
    const d = new Date(body.started_at);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now + 5 * 60_000 && now - d.getTime() <= 24 * 3600_000) {
      startedAt = d;
    }
  }
  if (!startedAt && quiz.startAt && now >= quiz.startAt.getTime()) {
    startedAt = quiz.startAt; // جایگزین منطقی: زمان باز شدن آزمون
  }

  const validQuestionIds = new Set(quiz.questions.map((q) => q.id));

  // پاک‌سازی پاسخ‌ها: فقط سوالات همین آزمون و فقط فیلدهای مجاز
  const cleanAnswers: {
    question_id: number;
    question_type: string;
    selected_option?: number | null;
    text?: string | null;
    canvas_image?: string | null;
    annotation_image?: string | null;
  }[] = [];

  for (const a of rawAnswers) {
    const qid = Number(a.question_id);
    if (!Number.isInteger(qid) || !validQuestionIds.has(qid)) continue;
    const question = quiz.questions.find((q) => q.id === qid)!;
    const annotation = validImage(a.annotation_image);

    if (question.questionType === "multiple_choice") {
      const sel = Number(a.selected_option);
      const optionCount = Array.isArray(question.options) ? (question.options as unknown[]).length : 0;
      cleanAnswers.push({
        question_id: qid,
        question_type: "multiple_choice",
        selected_option:
          Number.isInteger(sel) && sel >= 0 && (optionCount === 0 || sel < optionCount) ? sel : null,
        annotation_image: annotation,
      });
    } else {
      const text = typeof a.text === "string" && a.text.trim() ? a.text.trim().slice(0, 2000) : null;
      cleanAnswers.push({
        question_id: qid,
        question_type: "descriptive",
        text,
        canvas_image: validImage(a.canvas_image),
        annotation_image: annotation,
      });
    }
  }

  // نمره‌دهی خودکار بخش چهارگزینه‌ای
  const mcqQuestions = quiz.questions.filter((q) => q.questionType === "multiple_choice");
  let autoScore: number | null = null;
  if (mcqQuestions.length > 0) {
    autoScore = mcqQuestions.reduce((score, q) => {
      const given = cleanAnswers.find((a) => a.question_id === q.id);
      return score + (given && given.selected_option !== null && given.selected_option === q.correctOption ? 1 : 0);
    }, 0);
  }

  const submission = await db.submission.create({
    data: {
      quizId,
      studentName,
      answersData: cleanAnswers,
      autoScore,
      status: "pending",
      startedAt,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, submission_id: submission.id }, { status: 201 });
}
