/**
 * ابزارهای استانداردسازی فارسی: تبدیل ارقام، تاریخ شمسی و قالب‌بندی
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const EN_DIGITS = "0123456789";

/** تبدیل همه ارقام لاتین یک رشته به ارقام فارسی */
export function faDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین (برای پردازش ورودی کاربر) */
export function enDigits(value: string): string {
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(EN_DIGITS.indexOf(d)));
}

/** نمایش عدد به‌صورت فارسی */
export function faNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "۰";
  return faDigits(value.toLocaleString("en-US"));
}

/** تاریخ و ساعت شمسی خوانا، مثل «۱۲ مهر ۱۴۰۴ ساعت ۱۸:۳۰» */
export function faDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const date = d.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = d.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} ساعت ${time}`;
  } catch {
    return "—";
  }
}

/** قالب‌بندی ثانیه‌های باقیمانده به «مم:اس» فارسی */
export function faClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return faDigits(`${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
}

/** برچسب‌های گزینه‌های چندگزینه‌ای به فارسی (تا ۱۲ گزینه) */
export const OPTION_LABELS = ["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی", "ک", "ل"] as const;

/** برچسب ایمن گزینه بر اساس اندیس (حتی اگر بیشتر از لیست باشد) */
export function optionLabel(index: number): string {
  return OPTION_LABELS[index] ?? faDigits(index + 1);
}

/** اعتبارسنجی ساده ایمیل */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
