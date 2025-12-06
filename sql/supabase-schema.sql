create table if not exists public.expenses (
id bigserial primary key,
user_id uuid references auth.users on delete cascade,
title text,
amount numeric(12,2),
created_at timestamptz default now()
);


alter table public.expenses enable row level security;


create policy "Users can manage their expenses" on public.expenses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);