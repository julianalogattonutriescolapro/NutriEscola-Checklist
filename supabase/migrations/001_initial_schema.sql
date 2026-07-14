-- ============================================================
-- NUTRIESCOLA-CHECKLIST — SCHEMA SUPABASE
-- Execute este arquivo inteiro em: Supabase > SQL Editor > New Query > Run
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------- PERFIS DE USUÁRIO (estende auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin','nutricionista','visualizador')) default 'nutricionista',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ESCOLAS ----------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  address text,
  neighborhood text,
  director text,
  phone text,
  cooks text,
  students int,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CARDÁPIOS MENSAIS ----------
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  days jsonb not null default '{}'::jsonb, -- { "Segunda-feira": {breakfast, morningSnack, lunch, afternoonSnack, dinner}, ... }
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, month, year)
);

create table if not exists public.menu_history (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  user_id uuid references public.profiles(id),
  reason text,
  at timestamptz not null default now()
);

-- ---------- VISITAS TÉCNICAS ----------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  nutritionist_id uuid references public.profiles(id),
  nutritionist_name text,
  date date not null,
  start_time time,
  end_time time,
  planned_menu text,
  executed_menu text,
  menu_change_reason text,
  menu_change_other text,
  status text not null check (status in ('rascunho','finalizada')) default 'rascunho',
  classification text check (classification in ('Adequada','Parcialmente Adequada','Inadequada')),
  signature_nutritionist text, -- data URL ou path no Storage
  signature_director text,
  signature_school_responsible text,
  ai_summary jsonb, -- resumo técnico, conclusão, recomendações etc. gerados por IA
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists idx_visits_school on public.visits(school_id);
create index if not exists idx_visits_date on public.visits(date);

-- ---------- ITENS DO CHECKLIST (respostas por visita) ----------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  section text not null,
  item_order int not null default 0,
  text text not null,
  status text check (status in ('ok','nc','na')),
  observation text,
  guidance_types text[] default '{}',
  guidance_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_checklist_visit on public.checklist_items(visit_id);

-- ---------- FOTOGRAFIAS ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid references public.checklist_items(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  storage_path text not null, -- caminho no Supabase Storage (bucket "photos")
  caption text,
  taken_by uuid references public.profiles(id),
  taken_at timestamptz not null default now()
);
create index if not exists idx_photos_school on public.photos(school_id);
create index if not exists idx_photos_visit on public.photos(visit_id);

-- ---------- PLANO DE AÇÃO / PENDÊNCIAS ----------
create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  checklist_item_id uuid references public.checklist_items(id) on delete set null,
  problem text not null,
  recommendation text,
  responsible text,
  deadline date,
  priority text check (priority in ('Baixa','Média','Alta','Urgente')),
  status text not null check (status in ('Em aberto','Em andamento','Concluído')) default 'Em aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_actionplans_school on public.action_plans(school_id);

-- ---------- LOG DE AUDITORIA ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  details text,
  at timestamptz not null default now()
);

-- ---------- CONFIGURAÇÕES DO APP (linha única) ----------
create table if not exists public.settings (
  id int primary key default 1,
  app_name text default 'NutriEscola-Checklist',
  municipio text,
  secretaria text,
  responsavel_tecnico text,
  logo_url text,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_schools_updated on public.schools;
create trigger trg_schools_updated before update on public.schools
  for each row execute function public.set_updated_at();

drop trigger if exists trg_menus_updated on public.menus;
create trigger trg_menus_updated before update on public.menus
  for each row execute function public.set_updated_at();

drop trigger if exists trg_actionplans_updated on public.action_plans;
create trigger trg_actionplans_updated before update on public.action_plans
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile ao cadastrar um usuário no Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'nutricionista');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Regra geral: qualquer usuário autenticado e ativo pode ler.
-- Escrita: nutricionista e admin podem criar/editar; só admin apaga e mexe em usuários.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.menus enable row level security;
alter table public.menu_history enable row level security;
alter table public.visits enable row level security;
alter table public.checklist_items enable row level security;
alter table public.photos enable row level security;
alter table public.action_plans enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

create or replace function public.current_role_active()
returns table(role text, active boolean) as $$
  select role, active from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "profiles_admin_write" on public.profiles for insert
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "profiles_admin_update" on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or id=auth.uid());

-- Generic helper policies applied per table below
create policy "schools_select" on public.schools for select using (auth.uid() is not null);
create policy "schools_write" on public.schools for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "schools_update" on public.schools for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "schools_delete" on public.schools for delete using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role='admin'));

create policy "menus_select" on public.menus for select using (auth.uid() is not null);
create policy "menus_write" on public.menus for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "menus_update" on public.menus for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));

create policy "menu_history_select" on public.menu_history for select using (auth.uid() is not null);
create policy "menu_history_write" on public.menu_history for insert with check (auth.uid() is not null);

create policy "visits_select" on public.visits for select using (auth.uid() is not null);
create policy "visits_write" on public.visits for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "visits_update" on public.visits for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));

create policy "checklist_select" on public.checklist_items for select using (auth.uid() is not null);
create policy "checklist_write" on public.checklist_items for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "checklist_update" on public.checklist_items for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));

create policy "photos_select" on public.photos for select using (auth.uid() is not null);
create policy "photos_write" on public.photos for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "photos_delete" on public.photos for delete using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role='admin'));

create policy "actionplans_select" on public.action_plans for select using (auth.uid() is not null);
create policy "actionplans_write" on public.action_plans for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));
create policy "actionplans_update" on public.action_plans for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','nutricionista')));

create policy "auditlogs_select" on public.audit_logs for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "auditlogs_write" on public.audit_logs for insert with check (auth.uid() is not null);

create policy "settings_select" on public.settings for select using (auth.uid() is not null);
create policy "settings_update" on public.settings for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- ============================================================
-- STORAGE — bucket para fotos e assinaturas
-- ============================================================
insert into storage.buckets (id, name, public) values ('photos','photos', true)
  on conflict (id) do nothing;

create policy "photos_bucket_read" on storage.objects for select using (bucket_id = 'photos');
create policy "photos_bucket_insert" on storage.objects for insert with check (
  bucket_id = 'photos' and auth.uid() is not null);
create policy "photos_bucket_delete" on storage.objects for delete using (
  bucket_id = 'photos' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
