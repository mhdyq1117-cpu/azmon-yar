"use client";

import type { FullQuestion, Submission, StudentReportStats } from "@/lib/types";

/**
 * محاسبه آمار عملکرد دانش‌آموز:
 * تعداد پاسخ درست / نادرست (تستی‌ها) و تعداد سوالات بی‌پاسخ (نزده)
 */
export function computeStats(submission: Submission, questions: FullQuestion[]): StudentReportStats {
  const answers = submission.answers_data ?? [];
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  for (const q of questions) {
    const a = answers.find((x) => x.question_id === q.id);
    if (q.question_type === "multiple_choice") {
      if (a && a.selected_option !== null && a.selected_option !== undefined) {
        if (a.selected_option === q.correct_option) correct++;
        else incorrect++;
      } else {
        unanswered++;
      }
    } else {
      const hasText = Boolean(a?.text && a.text.trim());
      const hasCanvas = Boolean(a?.canvas_image);
      const hasAnnotation = Boolean(a?.annotation_image);
      if (!hasText && !hasCanvas && !hasAnnotation) unanswered++;
    }
  }

  return { correct, incorrect, unanswered };
}

/** نمره نهایی نمایشی: نمره خودکار تستی + نمره دستی تشریحی (در صورت تصحیح) */
export function finalScore(submission: Submission): number | null {
  if (submission.status !== "graded") return null;
  const auto = submission.auto_score ?? 0;
  const manual = submission.teacher_score ?? 0;
  return auto + manual;
}
