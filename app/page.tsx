import Link from "next/link";
import {
  ArrowLeft,
  ListChecks,
  Timer,
  PenTool,
  BarChart3,
  Smartphone,
  Share2,
  Sparkles,
  ShieldCheck,
  MousePointerClick,
  UserCheck,
  SendHorizonal,
} from "lucide-react";
import { Logo } from "@/components/app/shared";

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "ساخت آزمون در ۴ گام ساده",
    text: "عنوان، زمان‌بندی، سوالات؛ تمام! بدون هیچ دانش فنی، آزمون آماده ارسال می‌شود.",
  },
  {
    icon: ListChecks,
    title: "تصحیح خودکار تستی‌ها",
    text: "سوالات چهارگزینه‌ای بلافاصله پس از ارسال پاسخ، توسط سیستم تصحیح و نمره‌گذاری می‌شوند.",
  },
  {
    icon: PenTool,
    title: "بوم دست‌نویس ریاضی",
    text: "دانش‌آموز فرمول‌ها و حل مسئله را با انگشت یا قلم روی تخته سفید می‌نویسد؛ دقیقاً مثل دفتر خودش.",
  },
  {
    icon: Timer,
    title: "تایمر معکوس هوشمند",
    text: "برای آزمون‌های زمان‌دار، شمارش معکوس زیبا با اعداد فارسی و قفل خودکار پس از پایان زمان.",
  },
  {
    icon: Share2,
    title: "ارسال لینک در پیام‌رسان‌ها",
    text: "لینک اختصاصی آزمون را با یک کلی کپی و در تلگرام، شاد، ایتا یا واتساپ برای دانش‌آموزان بفرستید.",
  },
  {
    icon: BarChart3,
    title: "داشبورد نتایج کامل",
    text: "تعداد شرکت‌کننده‌ها، نمرات تستی و پاسخ‌های تشریحی و دست‌نویس، همه در یک پنل یکپارچه.",
  },
];

const STEPS = [
  {
    icon: UserCheck,
    title: "۱. ثبت‌نام معلم",
    text: "با ایمیل و رمز عبور حساب بسازید و وارد داشبورد مدرن خود شوید.",
  },
  {
    icon: ListChecks,
    title: "۲. ساخت آزمون",
    text: "سوالات چهارگزینه‌ای یا تشریحی اضافه کنید؛ حتی با بوم دست‌نویس برای ریاضی.",
  },
  {
    icon: SendHorizonal,
    title: "۳. ارسال لینک",
    text: "لینک اختصاصی آزمون را کپی و برای دانش‌آموزان بفرستید؛ بدون نیاز به نصب اپ!",
  },
  {
    icon: BarChart3,
    title: "۴. مشاهده نتایج",
    text: "پاسخ‌ها را ببینید، دست‌نویس‌ها را تصحیح کنید و نمره نهایی را ثبت کنید.",
  },
];

export default function LandingPage() {
  return (
    <main className="lux-bg flex flex-1 flex-col">
      {/* ناوبری */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              href="/auth"
              className="rounded-2xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:text-violet-600"
            >
              ورود معلم
            </Link>
            <Link
              href="/auth?mode=register"
              className="btn-gradient rounded-2xl px-5 py-2.5 text-sm font-bold text-white"
            >
              شروع رایگان
            </Link>
          </nav>
        </div>
      </header>

      {/* قهرمان صفحه */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-14 text-center sm:pt-20">
        <span className="anim-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-4 py-1.5 text-xs font-bold text-violet-600 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          پلتفرم مدرن آزمون‌های آنلاین برای معلمان ایرانی
        </span>
        <h1 className="anim-fade-up max-w-3xl text-3xl font-black leading-[1.6] text-slate-800 sm:text-5xl sm:leading-[1.6] [animation-delay:100ms]">
          آزمون آنلاین بساز،
          <span className="bg-gradient-to-l from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent"> لینکش را بفرست،</span>
          نتیجه را ببین.
        </h1>
        <p className="anim-fade-up mt-5 max-w-2xl text-base leading-8 text-slate-500 [animation-delay:200ms]">
          بدون نیاز به نصب اپلیکیشن، در چند دقیقه آزمون چهارگزینه‌ای یا تشریحی با بوم دست‌نویس بسازید و لینک آن را
          در پیام‌رسان‌ها برای دانش‌آموزان بفرستید. تصحیح تستی‌ها خودکار است؛ وقت شما برای آموزشِ بیشتر آزاد می‌شود.
        </p>
        <div className="anim-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row [animation-delay:300ms]">
          <Link
            href="/auth?mode=register"
            className="btn-gradient group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold text-white"
          >
            ساخت اولین آزمون
            <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/80 px-8 py-4 text-base font-bold text-violet-700 shadow-sm transition-all duration-300 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-200/60"
          >
            ورود به پنل معلم
          </Link>
        </div>

        {/* کارت پیش‌نمایش */}
        <div className="anim-fade-up anim-float relative mt-14 w-full max-w-3xl [animation-delay:400ms]">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-l from-violet-300/30 via-indigo-300/20 to-sky-300/30 blur-2xl" aria-hidden />
          <div className="lux-card relative overflow-hidden p-4 sm:p-6">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 px-5 py-4 text-white shadow-lg shadow-violet-500/30">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5" />
                <span className="text-sm font-bold">آزمون ریاضی فصل ۳ — تایمر فعال</span>
              </div>
              <span className="rounded-xl bg-white/15 px-3 py-1 text-sm font-black tracking-widest">۱۹:۴۵</span>
            </div>
            <div className="mt-4 grid gap-3 text-start sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-700">سوال ۲ از ۱۰ (چهارگزینه‌ای)</p>
                <p className="mb-4 text-xs leading-6 text-slate-400">حاصل عبارت زیر کدام است؟</p>
                <div className="grid grid-cols-2 gap-2">
                  {["الف", "ب", "ج", "د"].map((o, i) => (
                    <span
                      key={o}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${
                        i === 1 ? "btn-gradient text-white" : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
                      }`}
                    >
                      {o})
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-700">سوال ۳ — تشریحی با بوم دست‌نویس</p>
                <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50">
                  <PenTool className="h-6 w-6 text-violet-400" />
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                  <ShieldCheck className="h-3 w-3" /> پاسخ دست‌نویس ثبت شد
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ویژگی‌ها */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-black text-slate-800 sm:text-3xl">
          همه‌چیز برای یک <span className="text-violet-600">آزمون بی‌نقص</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-slate-400">
          از ساخت سوال تا تصحیح نهایی؛ تمام ابزارهایی که یک معلم مدرن لازم دارد، در یک پلتفرم ساده و زیبا.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <article
              key={title}
              className="lux-card group p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-300/30"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mb-2 text-base font-extrabold text-slate-700">{title}</h3>
              <p className="text-sm leading-7 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* مراحل */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-black text-slate-800 sm:text-3xl">
          از صفر تا <span className="text-violet-600">نتایج</span> در چهار قدم
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="relative lux-card p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                <Icon className="h-6.5 w-6.5" />
              </span>
              <h3 className="mb-2 text-sm font-extrabold text-slate-700">{title}</h3>
              <p className="text-xs leading-6 text-slate-400">{text}</p>
              {i < STEPS.length - 1 && (
                <ArrowLeft className="absolute -left-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-violet-300 lg:block" aria-hidden />
              )}
            </article>
          ))}
        </div>
      </section>

      {/* فراخوان نهایی */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-600 via-indigo-600 to-sky-500 p-10 text-center text-white shadow-2xl shadow-violet-500/40 sm:p-14">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <h2 className="relative text-2xl font-black sm:text-3xl">همین حالا کلاس درس خود را آنلاین کنید</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-8 text-white/85">
            ثبت‌نام رایگان است. اولین آزمون خود را همین امروز بسازید و تفاوت را در اولین جلسه احساس کنید.
          </p>
          <Link
            href="/auth?mode=register"
            className="relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-extrabold text-violet-700 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <Smartphone className="h-5 w-5" />
            شروع رایگان — بدون نیاز به نصب
          </Link>
        </div>
      </section>
    </main>
  );
}
