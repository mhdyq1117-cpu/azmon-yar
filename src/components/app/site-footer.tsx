// پاصفحه سراسری — اعتبار طراحان در پایین همه صفحات با فونت ریز
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/50 bg-white/60 py-3 text-center backdrop-blur-xl">
      <div className="mx-auto flex w-full flex-col items-center gap-0.5 px-4">
        <p className="text-[11px] font-medium leading-5 text-slate-500">
          طراحان: امیر رضا و امیر مهدی قلی پور
        </p>
        <p className="text-[11px] leading-4 text-slate-400">
          آزمون‌ساز آنلاین — ساخته‌شده برای معلمان و دانش‌آموزان ایران
        </p>
      </div>
    </footer>
  );
}
