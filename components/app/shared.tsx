"use client";

import Link from "next/link";
import { Loader2, GraduationCap } from "lucide-react";

/** لوگوی اپلیکیشن */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-violet-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
        <GraduationCap className="h-5.5 w-5.5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-extrabold text-slate-800">آزمون‌ساز آنلاین</span>
          <span className="text-[11px] font-medium text-slate-400">پلتفرم مدرن آزمون‌های تعاملی</span>
        </span>
      )}
    </Link>
  );
}

/** اسپینر بارگذاری */
export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} aria-hidden />;
}

/** صفحه بارگذاری مرکزی */
export function LoadingScreen({ text = "در حال بارگذاری..." }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-slate-400">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 text-white shadow-xl shadow-violet-500/30">
        <Spinner className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

/** حالت خالی زیبا */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="anim-fade-up flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200/70 bg-white/60 px-6 py-14 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-500">
        {icon}
      </span>
      <h3 className="mb-1.5 text-lg font-bold text-slate-700">{title}</h3>
      <p className="max-w-sm text-sm leading-7 text-slate-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** نشان وضعیت */
export function StatusBadge({ status }: { status: "pending" | "graded" }) {
  return status === "graded" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200">
      <CheckMini /> تصحیح‌شده
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-200">
      <ClockMini /> در انتظار تصحیح
    </span>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 5.2 L4 7.6 L8.5 2.6" />
    </svg>
  );
}
function ClockMini() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="6" cy="6" r="4.6" />
      <path d="M6 3.6 V6 L7.8 7.2" />
    </svg>
  );
}
