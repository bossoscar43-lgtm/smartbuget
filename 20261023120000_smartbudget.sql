-- ============================================================================
-- SmartBudget — schéma Supabase complet
-- À exécuter dans SQL Editor (ou via `supabase db push`).
--
-- Contenu :
--   1. Tables, contraintes et index
--   2. Profil + catégories par défaut à l'inscription (trigger auth.users)
--   3. Synchronisation des objectifs d'épargne avec les contributions
--   4. Row Level Security (chaque utilisateur ne voit que ses données)
--   5. RPC delete_my_account
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text not null default '',
  currency     text not null default 'EUR'
                 check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'CAD', 'XOF', 'XAF', 'MAD', 'DZD', 'TND')),
  payday_day   smallint not null default 1 check (payday_day between 1 and 31),
  theme        text not null default 'light' check (theme in ('light', 'dark')),
  needs_pct    numeric(5, 2) not null default 50 check (needs_pct between 0 and 100),
  wants_pct    numeric(5, 2) not null default 30 check (wants_pct between 0 and 100),
  savings_pct  numeric(5, 2) not null default 20 check (savings_pct between 0 and 100),
  created_at   timestamptz not null default now()
);

-- Le projet Supabase peut déjà contenir une table « profiles » issue d'un
-- ancien modèle. On complète alors les colonnes manquantes au lieu d'ignorer
-- silencieusement la création de la table (cause de « Database error saving
-- new user »).
alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text not null default '',
  add column if not exists currency text not null default 'EUR'
    check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'CAD', 'XOF', 'XAF', 'MAD', 'DZD', 'TND')),
  add column if not exists payday_day smallint not null default 1
    check (payday_day between 1 and 31),
  add column if not exists theme text not null default 'light'
    check (theme in ('light', 'dark')),
  add column if not exists needs_pct numeric(5, 2) not null default 50
    check (needs_pct between 0 and 100),
  add column if not exists wants_pct numeric(5, 2) not null default 30
    check (wants_pct between 0 and 100),
  add column if not exists savings_pct numeric(5, 2) not null default 20
    check (savings_pct between 0 and 100),
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  envelope    text not null default 'besoin' check (envelope in ('besoin', 'envie', 'epargne')),
  icon        text not null default '✨',
  color       text not null default '#2f8f72' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now()
);

create table if not exists public.recurring_incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 120),
  amount       numeric(12, 2) not null default 0 check (amount >= 0),
  type         text not null default 'salary' check (type in ('salary', 'freelance', 'investment', 'extra', 'other')),
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 120),
  amount       numeric(12, 2) not null default 0 check (amount >= 0),
  type         text not null default 'salary' check (type in ('salary', 'freelance', 'investment', 'extra', 'other')),
  received_at  date not null default current_date,
  month_key    text check (month_key is null or month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  recurring_id uuid references public.recurring_incomes (id) on delete set null,
  skipped      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.recurring_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 120),
  amount       numeric(12, 2) not null default 0 check (amount >= 0),
  envelope     text not null default 'besoin' check (envelope in ('besoin', 'envie', 'epargne')),
  category_id  uuid references public.categories (id) on delete set null,
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 120),
  amount       numeric(12, 2) not null default 0 check (amount >= 0),
  envelope     text not null default 'besoin' check (envelope in ('besoin', 'envie', 'epargne')),
  category_id  uuid references public.categories (id) on delete set null,
  is_fixed     boolean not null default false,
  is_paid      boolean not null default false,
  due_date     date not null default current_date,
  month_key    text check (month_key is null or month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  recurring_id uuid references public.recurring_expenses (id) on delete set null,
  skipped      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null check (length(trim(title)) between 1 and 120),
  target_amount  numeric(12, 2) not null default 0 check (target_amount >= 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date    date,
  icon           text not null default '🎯',
  color          text not null default '#5b7cf5' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at     timestamptz not null default now()
);

create table if not exists public.savings_contributions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  goal_id        uuid not null references public.savings_goals (id) on delete cascade,
  amount         numeric(12, 2) not null default 0 check (amount >= 0),
  contributed_at date not null default current_date,
  month_key      text check (month_key is null or month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Index
-- ----------------------------------------------------------------------------

create index if not exists categories_user_idx            on public.categories (user_id);
create index if not exists recurring_incomes_user_idx     on public.recurring_incomes (user_id);
create index if not exists incomes_user_month_idx         on public.incomes (user_id, month_key);
create index if not exists incomes_recurring_idx          on public.incomes (recurring_id);
create index if not exists recurring_expenses_user_idx    on public.recurring_expenses (user_id);
create index if not exists expenses_user_month_idx        on public.expenses (user_id, month_key);
create index if not exists expenses_due_idx               on public.expenses (user_id, due_date);
create index if not exists expenses_category_idx          on public.expenses (category_id);
create index if not exists expenses_recurring_idx         on public.expenses (recurring_id);
create index if not exists savings_goals_user_idx         on public.savings_goals (user_id);
create index if not exists contributions_user_month_idx   on public.savings_contributions (user_id, month_key);
create index if not exists contributions_goal_idx         on public.savings_contributions (goal_id);

-- Une seule occurrence matérialisée par modèle et par mois.
create unique index if not exists incomes_recurring_month_uniq
  on public.incomes (user_id, recurring_id, month_key)
  where recurring_id is not null and month_key is not null;

create unique index if not exists expenses_recurring_month_uniq
  on public.expenses (user_id, recurring_id, month_key)
  where recurring_id is not null and month_key is not null;

-- ----------------------------------------------------------------------------
-- 2. Initialisation du compte : profil + catégories par défaut
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, envelope, icon, color) values
    (new.id, 'Logement',              'besoin',  '🏠', '#5b7cf5'),
    (new.id, 'Alimentation',          'besoin',  '🛒', '#2f9e79'),
    (new.id, 'Transport',             'besoin',  '🚗', '#e0a458'),
    (new.id, 'Factures & abonnements','besoin',  '📺', '#7a6ff0'),
    (new.id, 'Santé',                 'besoin',  '💊', '#e0708a'),
    (new.id, 'Éducation',             'besoin',  '📚', '#4ea8de'),
    (new.id, 'Loisirs',               'envie',   '🎬', '#e9b44c'),
    (new.id, 'Restaurants',           'envie',   '🍽️', '#d97757'),
    (new.id, 'Shopping',              'envie',   '🛍️', '#b07cd6'),
    (new.id, 'Épargne',               'epargne', '💰', '#3baa8c'),
    (new.id, 'Autres',                'besoin',  '✨', '#8a9a91');

  return new;
exception
  when others then
    -- Ne jamais bloquer la création du compte si l'initialisation métier échoue.
    -- L'application crée le profil et les catégories à la première connexion.
    raise warning 'SmartBudget handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema public to supabase_auth_admin';
    execute 'grant execute on function public.handle_new_user() to supabase_auth_admin';
  end if;
end;
$$;

-- Complète le mois des lignes créées sans month_key.
create or replace function public.set_month_key()
returns trigger
language plpgsql
as $$
begin
  if new.month_key is null then
    if tg_table_name = 'incomes' then
      new.month_key := to_char(coalesce(new.received_at, current_date), 'YYYY-MM');
    elsif tg_table_name = 'savings_contributions' then
      new.month_key := to_char(coalesce(new.contributed_at, current_date), 'YYYY-MM');
    else
      new.month_key := to_char(coalesce(new.due_date, current_date), 'YYYY-MM');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists incomes_month_key on public.incomes;
create trigger incomes_month_key
  before insert or update on public.incomes
  for each row execute function public.set_month_key();

drop trigger if exists expenses_month_key on public.expenses;
create trigger expenses_month_key
  before insert or update on public.expenses
  for each row execute function public.set_month_key();

drop trigger if exists contributions_month_key on public.savings_contributions;
create trigger contributions_month_key
  before insert or update on public.savings_contributions
  for each row execute function public.set_month_key();

-- ----------------------------------------------------------------------------
-- 3. Objectifs d'épargne : current_amount = somme des contributions
-- ----------------------------------------------------------------------------

create or replace function public.sync_goal_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then
    target := old.goal_id;
  else
    target := new.goal_id;
  end if;

  update public.savings_goals g
     set current_amount = coalesce((
           select sum(c.amount)
             from public.savings_contributions c
            where c.goal_id = g.id
         ), 0)
   where g.id = target;

  if tg_op = 'UPDATE' and old.goal_id is distinct from new.goal_id then
    update public.savings_goals g
       set current_amount = coalesce((
             select sum(c.amount)
               from public.savings_contributions c
              where c.goal_id = g.id
           ), 0)
     where g.id = old.goal_id;
  end if;

  return null;
end;
$$;

drop trigger if exists contributions_sync_goal on public.savings_contributions;
create trigger contributions_sync_goal
  after insert or update or delete on public.savings_contributions
  for each row execute function public.sync_goal_amount();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.recurring_incomes      enable row level security;
alter table public.incomes                enable row level security;
alter table public.recurring_expenses     enable row level security;
alter table public.expenses               enable row level security;
alter table public.savings_goals          enable row level security;
alter table public.savings_contributions  enable row level security;

-- Profil : lecture et mise à jour de sa propre ligne uniquement.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Tables métier : tout est cloisonné par user_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'recurring_incomes', 'incomes',
    'recurring_expenses', 'expenses', 'savings_goals', 'savings_contributions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using (user_id = auth.uid())',
      t || '_select_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (user_id = auth.uid())',
      t || '_insert_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using (user_id = auth.uid())',
      t || '_delete_own', t
    );
  end loop;
end;
$$;

-- Droits pour les clients Supabase (les policies filtrent les lignes).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.categories,
  public.recurring_incomes,
  public.incomes,
  public.recurring_expenses,
  public.expenses,
  public.savings_goals,
  public.savings_contributions
to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Suppression de compte
-- ----------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
