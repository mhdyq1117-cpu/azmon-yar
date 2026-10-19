import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacher, UNAUTHORIZED_MESSAGE } from "@/lib/teacher";
import { serializeSubmission, serializeFullQuestion, serializeTeacherQuiz } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** GET /api/quizzes/[id] — جزئیات آزمون معلم + سوالات + همه پاسخ‌های دانش‌آموزان */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const { id } = await params;
  const quizId = Number(id);
  if (!Number.isInteger(quizId)) {
    return NextResponse.json({ error: "این آزمون یافت نشد یا به حساب شما تعلق ندارد." }, { status: 404 });
  }

  const quiz = await db.quiz.findFirst({
    where: { id: quizId, teacherId: teacher.id },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      submissions: { orderBy: { submittedAt: "desc" } },
    },
  });
  if (!quiz) {
    return NextResponse.json({ error: "این آزمون یافت نشد یا به حساب شما تعلق ندارد." }, { status: 404 });
  }

  return NextResponse.json({
    quiz: serializeTeacherQuiz(quiz),
    questions: quiz.questions.map(serializeFullQuestion),
    submissions: quiz.submissions.map(serializeSubmission),
  });
}

/** DELETE /api/quizzes/[id] — حذف آزمون همراه با سوالات و پاسخ‌ها */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const { id } = await params;
  const quizId = Number(id);
  if (!Number.isInteger(quizId)) {
    return NextResponse.json({ error: "حذف آزمون ناموفق بود؛ دوباره تلاش کنید." }, { status: 400 });
  }

  // فقط آزمونِ خودِ معلم حذف می‌شود
  const deleted = await db.quiz.deleteMany({ where: { id: quizId, teacherId: teacher.id } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "این آزمون یافت نشد یا به حساب شما تعلق ندارد." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
