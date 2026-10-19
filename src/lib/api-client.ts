"use client";

/**
 * لایه ارتباط با API اپلیکیشن — جایگزین فراخوانی‌های مستقیم دیتابیس.
 * همه پاسخ‌ها JSON هستند و خطاها با پیام فارسی پرتاب می‌شوند.
 */

async function handle<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* پاسخ بدون بدنه */
  }
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error;
    if (res.status === 401) {
      throw new Error("نشست شما منقضی شده است؛ لطفاً دوباره وارد حساب خود شوید.");
    }
    throw new Error(msg || "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.");
  }
  return body as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: "no-store" }).then((r) => handle<T>(r));
}

export function apiPost<T>(url: string, data: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => handle<T>(r));
}

export function apiPatch<T>(url: string, data: unknown): Promise<T> {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => handle<T>(r));
}

export function apiDelete<T>(url: string): Promise<T> {
  return fetch(url, { method: "DELETE" }).then((r) => handle<T>(r));
}
