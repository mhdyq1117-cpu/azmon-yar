import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacher, UNAUTHORIZED_MESSAGE } from "@/lib/teacher";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** حداکثر حجم تصویر پیوست سوال (تقریباً ۱.۵ مگابایت به‌صورت Data URL) */
const MAX_QUESTION_IMAGE = 1536 * 1024;

/** GET /api/quizzes — لیست همه آزمون‌های معلم واردشده همراه با تعداد شرکت‌کننده‌ها */
export async function GET() {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const quizzes = await db.quiz.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  // شکل خروجی دقیقاً مطابق تایپ QuizWithCount سمت کلاینت
  const data = quizzes.map((q) => ({
    id: q.id,
    teacher_id: q.teacherId,
    title: q.title,
    description: q.description,
    is_timed: q.isTimed,
    duration_minutes: q.durationMinutes,
    start_at: q.startAt ? q.startAt.toISOString() : null,
    end_at: q.endAt ? q.endAt.toISOString() : null,
    created_at: q.createdAt.toISOString(),
    submissions: [{ count: q._count.submissions }],
  }));

  return NextResponse.json(data);
}

interface IncomingQuestion {
  question_type?: unknown;
  question_text?: unknown;
  options?: unknown;
  correct_option?: unknown;
  has_canvas?: unknown;
  image_data?: unknown;
  allow_annotation?: unknown;
  order_index?: unknown;
}

interface IncomingQuiz {
  title?: unknown;
  description?: unknown;
  is_timed?: unknown;
  duration_minutes?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  questions?: unknown;
}

/** اعتبارسنجی Data URL تصویر پیوست */
function cleanImageData(value: unknown): string | null | false {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !value.startsWith("data:image/")) return false;
  if (value.length > MAX_QUESTION_IMAGE) return false;
  return value;
}

/** تبدیل ورودی تاریخ به Date معتبر */
function parseDate(value: unknown): Date | null | false {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d;
}

/** POST /api/quizzes — ساخت آزمون جدید همراه با سوالات */
export async function POST(request: Request) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  let body: IncomingQuiz;
  try {
    body = (await request.json()) as IncomingQuiz;
  } catch {
    return NextResponse.json({ error: "داده ارسالی نامعتبر است." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json({ error: "عنوان آزمون را وارد کنید (حداکثر ۲۰۰ حرف)." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null;

  const isTimed = body.is_timed === true;
  let durationMinutes: number | null = null;
  if (isTimed) {
    const d = Number(body.duration_minutes);
    if (!Number.isInteger(d) || d < 1 || d > 600) {
      return NextResponse.json({ error: "مدت زمان آزمون باید عددی بین ۱ تا ۶۰۰ دقیقه باشد." }, { status: 400 });
    }
    durationMinutes = d;
  }

  // بازه زمانی دسترسی (تاریخ شمسی در UI، ISO در API)
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  if (body.start_at !== undefined && body.start_at !== null && body.start_at !== "") {
    const parsed = parseDate(body.start_at);
    if (parsed === false) {
      return NextResponse.json({ error: "تاریخ و ساعت شروع نامعتبر است." }, { status: 400 });
    }
    startAt = parsed;
  }
  if (body.end_at !== undefined && body.end_at !== null && body.end_at !== "") {
    const parsed = parseDate(body.end_at);
    if (parsed === false) {
      return NextResponse.json({ error: "تاریخ و ساعت پایان نامعتبر است." }, { status: 400 });
    }
    endAt = parsed;
  }
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "ساعت پایان باید بعد از ساعت شروع باشد." }, { status: 400 });
  }

  const rawQuestions = Array.isArray(body.questions) ? (body.questions as IncomingQuestion[]) : [];
  if (rawQuestions.length === 0) {
    return NextResponse.json({ error: "حداقل یک سوال به آزمون اضافه کنید." }, { status: 400 });
  }
  if (rawQuestions.length > 200) {
    return NextResponse.json({ error: "تعداد سوالات نمی‌تواند بیش از ۲۰۰ باشد." }, { status: 400 });
  }

  const rows: {
    questionType: string;
    questionText: string;
    options?: string[];
    correctOption: number | null;
    hasCanvas: boolean;
    imageData: string | null;
    allowAnnotation: boolean;
    orderIndex: number;
  }[] = [];

  for (const [i, q] of rawQuestions.entries()) {
    const text = typeof q.question_text === "string" ? q.question_text.trim() : "";
    if (!text || text.length > 5000) {
      return NextResponse.json(
        { error: `متن سوال شماره ${i + 1} نامعتبر است (بین ۱ تا ۵۰۰۰ حرف).` },
        { status: 400 }
      );
    }

    const image = cleanImageData(q.image_data);
    if (image === false) {
      return NextResponse.json(
        { error: `سوال شماره ${i + 1}: فایل تصویر بزرگ‌تر از حد مجاز است یا فرمت آن پشتیبانی نمی‌شود.` },
        { status: 400 }
      );
    }
    const allowAnnotation = image !== null && q.allow_annotation === true;

    if (q.question_type === "multiple_choice") {
      const options = Array.isArray(q.options) ? (q.options as unknown[]) : [];
      const clean = options.map((o) => (typeof o === "string" ? o.trim() : ""));
      if (clean.length < MIN_OPTIONS || clean.length > MAX_OPTIONS || clean.some((o) => !o)) {
        return NextResponse.json(
          { error: `سوال شماره ${i + 1}: همه گزینه‌ها باید پر شوند (بین ${MIN_OPTIONS} تا ${MAX_OPTIONS} گزینه).` },
          { status: 400 }
        );
      }
      const correct = Number(q.correct_option);
      if (!Number.isInteger(correct) || correct < 0 || correct >= clean.length) {
        return NextResponse.json(
          { error: `سوال شماره ${i + 1}: گزینه صحیح انتخاب نشده است.` },
          { status: 400 }
        );
      }
      rows.push({
        questionType: "multiple_choice",
        questionText: text,
        options: clean,
        correctOption: correct,
        hasCanvas: false,
        imageData: image,
        allowAnnotation,
        orderIndex: i,
      });
    } else if (q.question_type === "descriptive") {
      rows.push({
        questionType: "descriptive",
        questionText: text,
        correctOption: null,
        hasCanvas: q.has_canvas === true,
        imageData: image,
        allowAnnotation,
        orderIndex: i,
      });
    } else {
      return NextResponse.json({ error: `سوال شماره ${i + 1}: نوع سوال نامعتبر است.` }, { status: 400 });
    }
  }

  const quiz = await db.quiz.create({
    data: {
      teacherId: teacher.id,
      title,
      description,
      isTimed,
      durationMinutes,
      startAt,
      endAt,
      questions: { create: rows },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: quiz.id }, { status: 201 });
}
