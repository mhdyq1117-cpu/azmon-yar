import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePublicQuestion } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/quizzes/[id] — اطلاعات عمومی آزمون برای دانش‌آموز
 * ⚠️ گزینه صحیح سوالات هرگز در این پاسخ ارسال نمی‌شود.
 * بازه زمانی دسترسی (start_at / end_at) برای نمایش پیام مناسب برگردانده می‌شود.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quizId = Number(id);
  if (!Number.isInteger(quizId)) {
    return NextResponse.json({ error: "آزمونی با این لینک پیدا نشد." }, { status: 404 });
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!quiz) {
    return NextResponse.json({
      error: "آزمونی با این لینک پیدا نشد. لطفاً لینک را از معلم خود دوباره دریافت کنید.",
    }, { status: 404 });
  }

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      is_timed: quiz.isTimed,
      duration_minutes: quiz.durationMinutes,
      start_at: quiz.startAt ? quiz.startAt.toISOString() : null,
      end_at: quiz.endAt ? quiz.endAt.toISOString() : null,
    },
    questions: quiz.questions.map(serializePublicQuestion),
    counts: {
      mcq: quiz.questions.filter((q) => q.questionType === "multiple_choice").length,
      descriptive: quiz.questions.filter((q) => q.questionType === "descriptive").length,
    },
  });
}
