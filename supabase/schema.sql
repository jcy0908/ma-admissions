begin;

create table public.bootcamp_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id text not null check (
    site_id in ('fluid-landing', 'ma-admissions', 'my-blog', 'invitation')
  ),
  data_key text not null check (
    data_key ~ '^[a-z][a-z0-9_-]{0,63}$'
  ),
  value jsonb not null default '{}'::jsonb check (
    jsonb_typeof(value) = 'object'
    and octet_length(value::text) <= 65536
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, site_id, data_key)
);

alter table public.bootcamp_user_data enable row level security;

revoke all on public.bootcamp_user_data from public, anon, authenticated;
grant select, insert, update, delete
  on public.bootcamp_user_data to authenticated;

create policy "Users read own site data"
  on public.bootcamp_user_data for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own site data"
  on public.bootcamp_user_data for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own site data"
  on public.bootcamp_user_data for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own site data"
  on public.bootcamp_user_data for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;

-- Additive concurrency safeguard: clients update only the revision they read.
alter table public.bootcamp_user_data add column revision integer not null default 0 check (revision >= 0);
