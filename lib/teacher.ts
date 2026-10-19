import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { Teacher } from "@prisma/client";

/**
 * احراز هویت معلم بر اساس نشست Supabase و ساخت/به‌روزرسانی خودکار
 * رکورد معلم در دیتابیس اپلیکیشن.
 *
 * نکته مهم: این تابع جایگزین تریگر SQL شده است — به‌محض اولین درخواست
 * معلمِ واردشده، رکورد او به‌صورت خودکار ساخته می‌شود؛ بدون هیچ اسکریپتی.
 */
export async function requireTeacher(): Promise<Teacher | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const email = user.email ?? "";
  const teacher = await db.teacher.upsert({
    where: { id: user.id },
    update: { email },
    create: { id: user.id, email },
  });
  return teacher;
}

/** پاسخ استاندارد «نشست منقضی» برای مسیرهای معلم */
export const UNAUTHORIZED_MESSAGE =
  "نشست شما منقضی شده است؛ لطفاً دوباره وارد حساب خود شوید.";
