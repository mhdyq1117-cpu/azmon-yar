"use client";

import { useState, useRef } from "react";
import { Check, Copy, Link2 } from "lucide-react";

interface CopyLinkProps {
  link: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

/** دکمه «کپی لینک» با انیمیشن موفقیت و پشتیبانی از حافظه موقت قدیمی */
export function CopyLinkButton({ link, label = "کپی لینک آزمون", className = "", compact = false }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
        copied
          ? "bg-emerald-50 text-emerald-700 ring-1.5 ring-emerald-400/60 anim-pop"
          : "bg-violet-50 text-violet-700 ring-1.5 ring-violet-200 hover:bg-violet-100 hover:ring-violet-300"
      } ${className}`}
      aria-live="polite"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 transition-transform group-hover:scale-110" />}
      <span>{copied ? "کپی شد!" : label}</span>
      {!copied && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      )}
    </button>
  );
}

/** جعبه نمایش لینک آزمون */
export function LinkBox({ link }: { link: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-2 pe-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
        <Link2 className="h-4.5 w-4.5" />
      </span>
      <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-sm text-slate-600" title={link}>
        {link}
      </span>
      <CopyLinkButton link={link} label="کپی" compact />
    </div>
  );
}
