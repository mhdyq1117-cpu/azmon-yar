"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * کلاینت سمت مرورگر (Publishable Key) — نشست‌ها در کوکی ذخیره می‌شوند
 * تا میدل‌ور و اجزای سرور هم به آن دسترسی داشته باشند.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
