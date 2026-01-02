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

-- Indexes and constraints to improve performance
-- Use budget_id here (table uses budget_id for scoping expenses)
create index if not exists idx_expenses_budget_date on public.expenses (budget_id, created_at);

-- Ensure budget_access has appropriate indexes/unique constraint (create if missing)
-- Adjust table/column names if your DB uses different naming
create index if not exists idx_budget_access_budget on public.budget_access (budget_id);
create index if not exists idx_budget_access_user on public.budget_access (user_id);
create unique index if not exists uq_budget_access_budget_user on public.budget_access (budget_id, user_id);

-- Indexes for budgets and income
create index if not exists idx_budgets_owner on public.budgets (owner_id);
create index if not exists idx_income_budget_date on public.income (budget_id, date);