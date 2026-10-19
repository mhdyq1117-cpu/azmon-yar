-- ============================================================================
-- اسکریپت راه‌اندازی کامل دیتابیس «آزمون‌ساز آنلاین پیشرفته»
-- ----------------------------------------------------------------------------
-- محل اجرا: پنل Supabase → SQL Editor → New query → کل این فایل را Paste کنید
-- و دکمه Run را بزنید. (این اسکریپت idempotent است؛ اجرای مکرر خطا نمی‌دهد)
-- ============================================================================

-- ==========================================================================
-- ۱) جداول
-- ==========================================================================

-- جدول معلمان (با احراز هویت Supabase هماهنگ است؛ id همان auth.users.id است)
create table if not exists public.teachers (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- جدول آزمون‌ها
create table if not exists public.quizzes (
  id               bigint generated always as identity primary key,
  teacher_id       uuid not null references public.teachers (id) on delete cascade,
  title            text not null,
  description      text,
  is_timed         boolean not null default false,
  duration_minutes integer check (duration_minutes is null or (duration_minutes >= 1 and duration_minutes <= 600)),
  created_at       timestamptz not null default now()
);

-- جدول سوالات
create table if not exists public.questions (
  id            bigint generated always as identity primary key,
  quiz_id       bigint not null references public.quizzes (id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice', 'descriptive')),
  question_text text not null,
  options       jsonb,          -- آرایه ۴ گزینه برای سوال چهارگزینه‌ای
  correct_option integer,       -- ایندکس گزینه صحیح (0..3) — فقط برای معلم قابل مشاهده
  has_canvas    boolean not null default false,
  order_index   integer not null default 0,
  created_at    timestamptz not null default now()
);

-- جدول پاسخ‌های دانش‌آموزان
create table if not exists public.submissions (
  id           bigint generated always as identity primary key,
  quiz_id      bigint not null references public.quizzes (id) on delete cascade,
  student_name text not null,
  answers_data jsonb not null default '[]'::jsonb,
  auto_score   numeric,                        -- نمره خودکار بخش چهارگزینه‌ای (توسط تریگر)
  teacher_score numeric,                       -- نمره دستی معلم برای بخش تشریحی
  grades_data  jsonb,                          -- نمره دستی هر سوال تشریحی
  status       text not null default 'pending' check (status in ('pending', 'graded')),
  submitted_at timestamptz not null default now()
);

-- ایندکس‌های کاربردی
create index if not exists quizzes_teacher_idx   on public.quizzes (teacher_id);
create index if not exists questions_quiz_idx    on public.questions (quiz_id);
create index if not exists submissions_quiz_idx  on public.submissions (quiz_id);

-- ==========================================================================
-- ۲) فعال‌سازی Row Level Security
-- ==========================================================================
alter table public.teachers    enable row level security;
alter table public.quizzes     enable row level security;
alter table public.questions   enable row level security;
alter table public.submissions enable row level security;

-- ==========================================================================
-- ۳) سیاست‌های دسترسی
-- ==========================================================================

-- معلمان: فقط رکورد خودشان
drop policy if exists "teachers_select_own" on public.teachers;
create policy "teachers_select_own" on public.teachers
  for select to authenticated using (auth.uid() = id);

drop policy if exists "teachers_insert_own" on public.teachers;
create policy "teachers_insert_own" on public.teachers
  for insert to authenticated with check (auth.uid() = id);

-- آزمون‌ها: معلم صاحب آزمون کنترل کامل دارد
drop policy if exists "quizzes_insert_own" on public.quizzes;
create policy "quizzes_insert_own" on public.quizzes
  for insert to authenticated with check (auth.uid() = teacher_id);

drop policy if exists "quizzes_select_own" on public.quizzes;
create policy "quizzes_select_own" on public.quizzes
  for select to authenticated using (auth.uid() = teacher_id);

drop policy if exists "quizzes_update_own" on public.quizzes;
create policy "quizzes_update_own" on public.quizzes
  for update to authenticated using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "quizzes_delete_own" on public.quizzes;
create policy "quizzes_delete_own" on public.quizzes
  for delete to authenticated using (auth.uid() = teacher_id);

-- آزمون‌ها: هر کسی (دانش‌آموز بدون حساب) می‌تواند مشخصات آزمون را از طریق لینک ببیند
drop policy if exists "quizzes_select_public" on public.quizzes;
create policy "quizzes_select_public" on public.quizzes
  for select to anon, authenticated using (true);

-- سوالات: معلم صاحب آزمون کنترل کامل دارد
drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own" on public.questions
  for insert to authenticated with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "questions_select_own" on public.questions;
create policy "questions_select_own" on public.questions
  for select to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "questions_update_own" on public.questions;
create policy "questions_update_own" on public.questions
  for update to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "questions_delete_own" on public.questions;
create policy "questions_delete_own" on public.questions
  for delete to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

-- سوالات: دانش‌آموز (ناشناس) برای آزمون‌دادن سوالات را می‌بیند
-- (توجه: ستون correct_option در بخش ۴ از دسترسی ناشناس خارج شده است)
drop policy if exists "questions_select_public" on public.questions;
create policy "questions_select_public" on public.questions
  for select to anon, authenticated using (true);

-- پاسخ‌ها: دانش‌آموز فقط می‌تواند پاسخ «ثبت» کند (بدون خواندن)
drop policy if exists "submissions_insert_public" on public.submissions;
create policy "submissions_insert_public" on public.submissions
  for insert to anon, authenticated with check (true);

-- پاسخ‌ها: معلم فقط پاسخ‌های آزمون‌های خودش را می‌بیند و تصحیح می‌کند
drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own" on public.submissions
  for select to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own" on public.submissions
  for update to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

-- ==========================================================================
-- ۴) مخفی‌سازی پاسخ صحیح از دانش‌آموزان (سطح ستون)
-- کاربر ناشناس هرگز correct_option را در پاسخ API نمی‌بیند
-- ==========================================================================
revoke select on public.questions from anon;
grant select (id, quiz_id, question_type, question_text, options, has_canvas, order_index, created_at)
  on public.questions to anon;
grant select on public.questions to authenticated;

-- ==========================================================================
-- ۵) تریگر ساخت خودکار پروفایل معلم پس از ثبت‌نام در Supabase Auth
-- ==========================================================================
create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teachers (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_teacher();

-- ==========================================================================
-- ۶) تریگر تصحیح خودکار سوالات چهارگزینه‌ای
-- بلافاصله پس از ثبت پاسخ دانش‌آموز، نمره تستی محاسبه و ذخیره می‌شود
-- ==========================================================================
create or replace function public.calc_auto_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q   record;
  a   record;
  cnt integer := 0;
begin
  for q in
    select id, correct_option
    from public.questions
    where quiz_id = new.quiz_id
      and question_type = 'multiple_choice'
      and correct_option is not null
  loop
    for a in
      select elem->>'selected_option' as sel
      from jsonb_array_elements(new.answers_data) elem
      where (elem->>'question_id')::bigint = q.id
    loop
      if a.sel is not null and a.sel <> '' and a.sel <> 'null' then
        begin
          if (a.sel)::integer = q.correct_option then
            cnt := cnt + 1;
          end if;
        exception when others then
          null; -- مقدار نامعتبر نادیده گرفته می‌شود
        end;
      end if;
    end loop;
  end loop;

  new.auto_score := cnt;
  new.status := 'pending';
  return new;
end;
$$;

drop trigger if exists submissions_auto_score on public.submissions;
create trigger submissions_auto_score
  before insert on public.submissions
  for each row execute function public.calc_auto_score();

-- ==========================================================================
-- ۷) مهم: بازگرداندن حساب‌های معلمی که «قبل از اجرای این اسکریپت» ثبت‌نام کرده‌اند
-- بدون این بخش، داشبورد آن حساب‌ها خالی می‌ماند و ساخت آزمون خطا می‌دهد
-- ==========================================================================
insert into public.teachers (id, email)
select u.id, u.email
from auth.users u
where u.email is not null
  and not exists (select 1 from public.teachers t where t.id = u.id)
on conflict (id) do nothing;

-- ==========================================================================
-- پایان — حالا اپلیکیشن آماده استفاده است
-- ==========================================================================
