"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorToFa } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/fa";
import { Logo, Spinner } from "@/components/app/shared";
import { useToast } from "@/hooks/use-toast";

function AuthPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; password2?: string }>({});
  const [confirmHint, setConfirmHint] = useState<string | null>(null);

  const nextPath = params.get("next") || "/dashboard";

  useEffect(() => {
    setMode(params.get("mode") === "register" ? "register" : "login");
  }, [params]);

  function validate(): boolean {
    const fe: typeof fieldErrors = {};
    if (!email.trim()) fe.email = "ایمیل را وارد کنید.";
    else if (!isValidEmail(email)) fe.email = "قالب ایمیل صحیح نیست؛ مثال: name@gmail.com";
    if (!password) fe.password = "رمز عبور را وارد کنید.";
    else if (mode === "register" && password.length < 6) fe.password = "رمز عبور باید حداقل ۶ کاراکتر باشد.";
    if (mode === "register" && password2 !== password) fe.password2 = "تکرار رمز عبور با رمز اصلی یکسان نیست.";
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setConfirmHint(null);
    const supabase = getSupabaseBrowserClient();

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmHint(
            "ثبت‌نام شما انجام شد. یک لینک تأیید به ایمیل‌تان ارسال شد؛ پس از کلیک روی آن می‌توانید وارد شوید."
          );
          toast({ title: "ثبت‌نام انجام شد", description: "لطفاً ایمیل خود را برای تأیید بررسی کنید.", duration: 5000 });
        } else {
          toast({ title: "خوش آمدید!", description: "حساب شما با موفقیت ساخته شد.", duration: 3000 });
          router.replace(nextPath);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "ورود موفق", description: "در حال انتقال به داشبورد شما...", duration: 2500 });
        router.replace(nextPath);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: authErrorToFa(err),
        duration: 6000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lux-bg flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="anim-fade-up w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-5">
          <Logo />
          <h1 className="text-center text-2xl font-extrabold text-slate-800">
            {mode === "login" ? "ورود پنل معلم" : "ساخت حساب معلم جدید"}
          </h1>
          <p className="text-center text-sm leading-6 text-slate-400">
            {mode === "login"
              ? "برای مدیریت آزمون‌ها و مشاهده نتایج، وارد حساب خود شوید."
              : "با ساخت حساب، در کمتر از یک دقیقه اولین آزمون آنلاین خود را منتشر کنید."}
          </p>
        </div>

        <div className="lux-card p-6 sm:p-8">
          {/* تب ورود / ثبت‌نام */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100/80 p-1.5" role="tablist" aria-label="ورود یا ثبت‌نام">
            {(
              [
                { key: "login", label: "ورود", icon: LogIn },
                { key: "register", label: "ثبت‌نام", icon: UserPlus },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => {
                  setMode(key);
                  setFieldErrors({});
                  setConfirmHint(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 ${
                  mode === key
                    ? "btn-gradient text-white"
                    : "text-slate-500 hover:bg-white hover:text-violet-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Mail className="h-4 w-4 text-violet-500" /> ایمیل
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                inputMode="email"
                autoComplete="email"
                placeholder="name@gmail.com"
                className={`lux-input text-left ${fieldErrors.email ? "!border-rose-400" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Lock className="h-4 w-4 text-violet-500" /> رمز عبور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className={`lux-input text-left pl-11 ${fieldErrors.password ? "!border-rose-400" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "پنهان‌کردن رمز" : "نمایش رمز"}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-violet-600"
                >
                  {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.password}</p>}
            </div>

            {mode === "register" && (
              <div className="anim-fade-up">
                <label htmlFor="password2" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-violet-500" /> تکرار رمز عبور
                </label>
                <input
                  id="password2"
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`lux-input text-left ${fieldErrors.password2 ? "!border-rose-400" : ""}`}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                />
                {fieldErrors.password2 && <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.password2}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-extrabold text-white"
            >
              {busy ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <>
                  {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  {mode === "login" ? "ورود به داشبورد" : "ایجاد حساب و شروع"}
                </>
              )}
            </button>
          </form>

          {confirmHint && (
            <div className="anim-fade-up mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-700">
              {confirmHint}
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          با ورود، <Link href="/" className="font-semibold text-violet-500 hover:underline">صفحه اصلی</Link> را هم ببینید.
        </p>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AuthPageInner />
    </Suspense>
  );
}

function LoadingPage() {
  return (
    <main className="lux-bg flex flex-1 items-center justify-center">
      <Spinner className="h-8 w-8 text-violet-500" />
    </main>
  );
}
