/** تایپ‌های داده‌ای اپلیکیشن آزمون‌ساز (مطابق پاسخ API داخلی) */

export type QuestionType = "multiple_choice" | "descriptive";
export type SubmissionStatus = "pending" | "graded";

/** بیشینه تعداد گزینه‌های یک سوال چندگزینه‌ای */
export const MAX_OPTIONS = 12;
/** کمینه تعداد گزینه‌های اجباری */
export const MIN_OPTIONS = 2;

export interface Quiz {
  id: number;
  teacher_id: string;
  title: string;
  description: string | null;
  is_timed: boolean;
  duration_minutes: number | null;
  /** بازه دسترسی دانش‌آموزان (ISO) — در صورت تعیین معلم */
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

export interface QuizWithCount extends Quiz {
  submissions: { count: number }[] | null;
}

/** نسخه سوال که دانش‌آموز می‌بیند (بدون گزینه صحیح) */
export interface PublicQuestion {
  id: number;
  quiz_id: number;
  question_type: QuestionType;
  question_text: string;
  options: string[] | null;
  has_canvas: boolean;
  image_data: string | null;
  allow_annotation: boolean;
  order_index: number;
}

/** نسخه کامل سوال که فقط معلم می‌بیند */
export interface FullQuestion extends PublicQuestion {
  correct_option: number | null;
}

export interface TeacherAnswer {
  question_id: number;
  question_type: QuestionType;
  selected_option?: number | null;
  text?: string | null;
  canvas_image?: string | null;
  /** ترسیم/یادداشت دانش‌آموز روی تصویر سوال */
  annotation_image?: string | null;
}

export interface Submission {
  id: number;
  quiz_id: number;
  student_name: string;
  answers_data: TeacherAnswer[];
  auto_score: number | null;
  teacher_score: number | null;
  grades_data: Record<string, number> | null;
  status: SubmissionStatus;
  started_at: string | null;
  submitted_at: string;
}

/** سوال در ویزارد ساخت آزمون (حالت محلی پیش از ذخیره) */
export interface DraftQuestion {
  uid: string;
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_option: number | null;
  has_canvas: boolean;
  image_data: string | null;
  allow_annotation: boolean;
}

/** آمار عملکرد یک دانش‌آموز برای گزارش PDF */
export interface StudentReportStats {
  correct: number;
  incorrect: number;
  unanswered: number;
}
