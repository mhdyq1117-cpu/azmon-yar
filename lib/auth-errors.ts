/** تبدیل خطاهای Supabase Auth به پیام‌های فارسی روان */

const RULES: { match: RegExp; message: string }[] = [
  {
    match: /already registered|already exists|User already/i,
    message: "این ایمیل قبلاً ثبت‌نام کرده است؛ وارد شوید یا ایمیل دیگری امتحان کنید.",
  },
  {
    match: /invalid login credentials|email.*password/i,
    message: "ایمیل یا رمز عبور اشتباه است.",
  },
  {
    match: /email not confirmed|not confirmed/i,
    message: "ایمیل شما هنوز تأیید نشده است. لطفاً صندوق ورودی خود را بررسی کنید و روی لینک تأیید کلیک کنید.",
  },
  {
    match: /at least 6|password.*short|weak password/i,
    message: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
  },
  {
    match: /rate limit|too many/i,
    message: "تلاش‌های مکرر شناسایی شد. لطفاً چند دقیقه بعد دوباره امتحان کنید.",
  },
  {
    match: /invalid email|valid email|email[^.]*invalid|invalid[^.]*email|email_address_invalid/i,
    message: "ایمیل واردشده معتبر نیست یا پذیرفته نمی‌شود؛ لطفاً از ایمیل معتبر دیگری استفاده کنید.",
  },
  {
    match: /signups not allowed/i,
    message: "فعلاً امکان ثبت‌نام جدید وجود ندارد. با پشتیبانی تماس بگیرید.",
  },
  {
    match: /network|fetch|Failed to fetch/i,
    message: "اتصال به سرور برقرار نشد. اینترنت خود را بررسی و دوباره تلاش کنید.",
  },
];

export function authErrorToFa(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  for (const rule of RULES) {
    if (rule.match.test(raw)) return rule.message;
  }
  return "عملیات ناموفق بود؛ لطفاً دوباره تلاش کنید.";
}
