create table if not exists public.user_reminders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 push_subscription jsonb not null,
 reminder_time time not null,
 timezone text not null default 'UTC',
 created_at timestamptz not null default now()
);
alter table public.user_reminders enable row level security;
drop policy if exists "Users can manage their own reminders" on public.user_reminders;
create policy "Users can manage their own reminders" on public.user_reminders for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select,insert,update,delete on public.user_reminders to authenticated;
revoke all on public.user_reminders from anon;
alter table public.user_reminders add column if not exists task_enabled boolean not null default true;
alter table public.user_reminders add column if not exists journal_enabled boolean not null default true;
alter table public.user_reminders add column if not exists sound_enabled boolean not null default true;
create table if not exists public.reminder_deliveries (
 user_id uuid not null references auth.users(id) on delete cascade,
 delivery_key text not null,
 delivered_at timestamptz not null default now(),
 primary key(user_id,delivery_key)
);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from anon, authenticated;
