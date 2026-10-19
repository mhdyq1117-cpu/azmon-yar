import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeacher, UNAUTHORIZED_MESSAGE } from "@/lib/teacher";
import { serializeSubmission, serializeFullQuestion } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** GET /api/submissions/[sid] — پاسخ یک دانش‌آموز + سوالات کامل آزمون (ویژه معلم) */
export async function GET(_request: Request, { params }: { params: Promise<{ sid: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const { sid } = await params;
  const submissionId = Number(sid);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "پاسخ موردنظر یافت نشد." }, { status: 404 });
  }

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } } },
  });
  if (!submission || submission.quiz.teacherId !== teacher.id) {
    return NextResponse.json({ error: "پاسخ موردنظر یافت نشد." }, { status: 404 });
  }

  return NextResponse.json({
    submission: serializeSubmission(submission),
    questions: submission.quiz.questions.map(serializeFullQuestion),
  });
}

/** PATCH /api/submissions/[sid] — ثبت نمره دستی معلم برای پاسخ تشریحی */
export async function PATCH(request: Request, { params }: { params: Promise<{ sid: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const { sid } = await params;
  const submissionId = Number(sid);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "پاسخ موردنظر یافت نشد." }, { status: 404 });
  }

  let body: { teacher_score?: unknown; grades_data?: unknown };
  try {
    body = (await request.json()) as { teacher_score?: unknown; grades_data?: unknown };
  } catch {
    return NextResponse.json({ error: "داده ارسالی نامعتبر است." }, { status: 400 });
  }

  // فقط صاحب آزمون مجاز به نمره‌دهی است
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { quiz: { select: { teacherId: true } } },
  });
  if (!submission || submission.quiz.teacherId !== teacher.id) {
    return NextResponse.json({ error: "پاسخ موردنظر یافت نشد." }, { status: 404 });
  }

  let teacherScore: number | null = null;
  if (body.teacher_score !== null && body.teacher_score !== undefined) {
    const n = Number(body.teacher_score);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "نمره واردشده نامعتبر است." }, { status: 400 });
    }
    teacherScore = n;
  }

  let gradesData: Record<string, number> | null = null;
  if (body.grades_data && typeof body.grades_data === "object") {
    gradesData = {};
    for (const [k, v] of Object.entries(body.grades_data as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) gradesData[k] = n;
    }
  }

  await db.submission.update({
    where: { id: submissionId },
    data: { teacherScore, gradesData: gradesData ?? Prisma.DbNull, status: "graded" },
  });

  return NextResponse.json({ ok: true });
}
