"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { Logo, Spinner } from "@/components/app/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

/** هدر داشبورد معلم: لوگو، ایمیل، دکمه ساخت آزمون و خروج */
export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/auth");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/new"
            className="btn-gradient hidden items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            ساخت آزمون جدید
          </Link>
          <span
            dir="ltr"
            className="hidden max-w-44 truncate rounded-2xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-600 ring-1 ring-violet-100 md:block"
            title={email}
          >
            {email}
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            title="خروج از حساب"
            aria-label="خروج از حساب"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-500"
          >
            {busy ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
