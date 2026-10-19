import type { Prisma } from "@prisma/client";

/**
 * تبدیل رکورد پاسخ دانش‌آموز به شکل snake_case مورد استفاده سمت کلاینت
 * (قابل استفاده در چند مسیر API)
 */
export function serializeSubmission(s: {
  id: number;
  quizId: number;
  studentName: string;
  answersData: Prisma.JsonValue;
  autoScore: number | null;
  teacherScore: number | null;
  gradesData: Prisma.JsonValue;
  status: string;
  startedAt: Date | null;
  submittedAt: Date;
}) {
  return {
    id: s.id,
    quiz_id: s.quizId,
    student_name: s.studentName,
    answers_data: s.answersData,
    auto_score: s.autoScore,
    teacher_score: s.teacherScore,
    grades_data: s.gradesData,
    status: s.status,
    started_at: s.startedAt ? s.startedAt.toISOString() : null,
    submitted_at: s.submittedAt.toISOString(),
  };
}

/** تبدیل سوال به شکل کامل (فقط برای معلم — شامل گزینه صحیح) */
export function serializeFullQuestion(q: {
  id: number;
  quizId: number;
  questionType: string;
  questionText: string;
  options: Prisma.JsonValue;
  correctOption: number | null;
  hasCanvas: boolean;
  imageData: string | null;
  allowAnnotation: boolean;
  orderIndex: number;
}) {
  return {
    id: q.id,
    quiz_id: q.quizId,
    question_type: q.questionType,
    question_text: q.questionText,
    options: q.options,
    correct_option: q.correctOption,
    has_canvas: q.hasCanvas,
    image_data: q.imageData,
    allow_annotation: q.allowAnnotation,
    order_index: q.orderIndex,
  };
}

/** تبدیل سوال به شکل عمومی (بدون گزینه صحیح — برای دانش‌آموز) */
export function serializePublicQuestion(q: {
  id: number;
  quizId: number;
  questionType: string;
  questionText: string;
  options: Prisma.JsonValue;
  hasCanvas: boolean;
  imageData: string | null;
  allowAnnotation: boolean;
  orderIndex: number;
}) {
  return {
    id: q.id,
    quiz_id: q.quizId,
    question_type: q.questionType,
    question_text: q.questionText,
    options: q.options,
    has_canvas: q.hasCanvas,
    image_data: q.imageData,
    allow_annotation: q.allowAnnotation,
    order_index: q.orderIndex,
  };
}

/** سریال‌سازی آزمون برای معلم */
export function serializeTeacherQuiz(q: {
  id: number;
  teacherId: string;
  title: string;
  description: string | null;
  isTimed: boolean;
  durationMinutes: number | null;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: q.id,
    teacher_id: q.teacherId,
    title: q.title,
    description: q.description,
    is_timed: q.isTimed,
    duration_minutes: q.durationMinutes,
    start_at: q.startAt ? q.startAt.toISOString() : null,
    end_at: q.endAt ? q.endAt.toISOString() : null,
    created_at: q.createdAt.toISOString(),
  };
}
