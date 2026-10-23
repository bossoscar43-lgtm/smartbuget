-- ============================================================================
-- SmartBudget — correctif d'inscription
-- À exécuter dans Supabase → SQL Editor si l'inscription affiche :
--   « Database error saving new user »
--
-- Le trigger ne bloque plus la création du compte. Si l'initialisation du
-- profil ou des catégories échoue, l'application les recrée à la première
-- connexion (voir DB._loadCloudUser dans assets/core.js).
-- ============================================================================

-- Cause fréquente : une ancienne table « profiles » existe déjà sans les
-- colonnes SmartBudget. Le « create table if not exists » du schéma initial
-- ne corrige pas ce cas. On ajoute donc les colonnes manquantes.
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

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

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
    -- L'inscription doit réussir même si l'initialisation échoue.
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

-- Vérification : le trigger doit être présent une seule fois.
select tgname as trigger_name, proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal;
