-- ============================================================
-- Migração 005 — Correção crítica: recursão infinita em RLS
-- Rode no SQL Editor do Supabase, depois da 004.
-- ============================================================
--
-- O QUE ESTAVA ERRADO:
-- Praticamente toda política de RLS criada nas migrações 001/004 verifica
-- permissão assim:
--   exists (select 1 from public.profiles p where p.id = auth.uid() and ...)
-- O problema: isso é uma subconsulta na própria tabela "profiles" dentro de
-- uma política (a de "profiles" verifica "profiles", e as políticas de
-- schools/visits/checklist_items/etc. também consultam "profiles", que por
-- sua vez tem que reaplicar a própria política de novo). O Postgres entra em
-- loop e devolve o erro "infinite recursion detected in policy for relation
-- profiles" para qualquer consulta que dependa dessa checagem — ou seja,
-- praticamente qualquer leitura/escrita no sistema. Isso é consistente com
-- os sintomas relatados (tela em branco, "Failed to fetch"/erros genéricos
-- de comunicação com o Supabase).
--
-- A CORREÇÃO:
-- Trocar toda subconsulta em "profiles" por chamadas a duas funções
-- SECURITY DEFINER (is_approved/is_admin). Funções SECURITY DEFINER rodam
-- com privilégio do dono da função, então não reaplicam RLS — quebrando o
-- ciclo. É o padrão recomendado pela própria documentação do Supabase para
-- esse caso.
-- ============================================================

create or replace function public.is_approved()
returns boolean
language sql security definer stable
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'aprovado');
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'aprovado');
$$;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select using (
  id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles for insert with check (public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update
  using (public.is_admin() or id = auth.uid());

-- ---------- SCHOOLS ----------
drop policy if exists "schools_select" on public.schools;
drop policy if exists "schools_write" on public.schools;
drop policy if exists "schools_update" on public.schools;
drop policy if exists "schools_delete" on public.schools;
create policy "schools_select" on public.schools for select using (public.is_approved());
create policy "schools_write" on public.schools for insert with check (public.is_admin());
create policy "schools_update" on public.schools for update using (public.is_admin());
create policy "schools_delete" on public.schools for delete using (public.is_admin());

-- ---------- MENUS ----------
drop policy if exists "menus_select" on public.menus;
drop policy if exists "menus_write" on public.menus;
drop policy if exists "menus_update" on public.menus;
create policy "menus_select" on public.menus for select using (public.is_approved());
create policy "menus_write" on public.menus for insert with check (public.is_admin());
create policy "menus_update" on public.menus for update using (public.is_admin());

-- ---------- MENU HISTORY ----------
drop policy if exists "menu_history_select" on public.menu_history;
drop policy if exists "menu_history_write" on public.menu_history;
create policy "menu_history_select" on public.menu_history for select using (public.is_approved());
create policy "menu_history_write" on public.menu_history for insert with check (public.is_approved());

-- ---------- VISITS ----------
drop policy if exists "visits_select" on public.visits;
drop policy if exists "visits_insert" on public.visits;
drop policy if exists "visits_write" on public.visits;
drop policy if exists "visits_update" on public.visits;
drop policy if exists "visits_delete" on public.visits;
create policy "visits_select" on public.visits for select using (
  public.is_admin() or nutritionist_id = auth.uid());
create policy "visits_insert" on public.visits for insert with check (
  public.is_approved() and nutritionist_id = auth.uid());
create policy "visits_update" on public.visits for update using (public.is_admin());
create policy "visits_delete" on public.visits for delete using (public.is_admin());

-- ---------- CHECKLIST ITEMS ----------
drop policy if exists "checklist_select" on public.checklist_items;
drop policy if exists "checklist_write" on public.checklist_items;
drop policy if exists "checklist_update" on public.checklist_items;
drop policy if exists "checklist_delete" on public.checklist_items;
create policy "checklist_select" on public.checklist_items for select using (
  exists (select 1 from public.visits v where v.id = checklist_items.visit_id
          and (public.is_admin() or v.nutritionist_id = auth.uid())));
create policy "checklist_write" on public.checklist_items for insert with check (
  exists (select 1 from public.visits v where v.id = checklist_items.visit_id and v.nutritionist_id = auth.uid())
  and public.is_approved());
create policy "checklist_update" on public.checklist_items for update using (public.is_admin());
create policy "checklist_delete" on public.checklist_items for delete using (public.is_admin());

-- ---------- PHOTOS ----------
drop policy if exists "photos_select" on public.photos;
drop policy if exists "photos_write" on public.photos;
drop policy if exists "photos_delete" on public.photos;
create policy "photos_select" on public.photos for select using (
  exists (select 1 from public.visits v where v.id = photos.visit_id
          and (public.is_admin() or v.nutritionist_id = auth.uid())));
create policy "photos_write" on public.photos for insert with check (
  exists (select 1 from public.visits v where v.id = photos.visit_id and v.nutritionist_id = auth.uid())
  and public.is_approved());
create policy "photos_delete" on public.photos for delete using (public.is_admin());

-- ---------- ACTION PLANS ----------
drop policy if exists "actionplans_select" on public.action_plans;
drop policy if exists "actionplans_write" on public.action_plans;
drop policy if exists "actionplans_update" on public.action_plans;
create policy "actionplans_select" on public.action_plans for select using (
  public.is_admin() or
  exists (select 1 from public.visits v where v.id = action_plans.visit_id and v.nutritionist_id = auth.uid()));
create policy "actionplans_write" on public.action_plans for insert with check (public.is_approved());
create policy "actionplans_update" on public.action_plans for update using (public.is_admin());

-- ---------- SETTINGS ----------
drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;
create policy "settings_select" on public.settings for select using (public.is_approved());
create policy "settings_update" on public.settings for update using (public.is_admin());

-- ---------- AUDIT LOGS ----------
drop policy if exists "auditlogs_select" on public.audit_logs;
drop policy if exists "auditlogs_write" on public.audit_logs;
create policy "auditlogs_select" on public.audit_logs for select using (public.is_admin());
create policy "auditlogs_write" on public.audit_logs for insert with check (auth.uid() is not null);

-- ---------- STORAGE (bucket "photos") ----------
drop policy if exists "photos_bucket_delete" on storage.objects;
create policy "photos_bucket_delete" on storage.objects for delete using (
  bucket_id = 'photos' and public.is_admin());

-- ============================================================
-- ADMINISTRADORA PRINCIPAL — reconhecimento automático por e-mail
-- ============================================================
-- Quando julianalogatto@gmail.com criar a própria conta pelo app (tela
-- "Criar conta"), ela entra direto como administradora aprovada, sem
-- precisar de nenhuma aprovação nem comando manual. Qualquer outro e-mail
-- continua nascendo nutricionista pendente, como antes.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, active, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    case when lower(new.email) = 'julianalogatto@gmail.com' then 'admin' else 'nutricionista' end,
    case when lower(new.email) = 'julianalogatto@gmail.com' then true else false end,
    case when lower(new.email) = 'julianalogatto@gmail.com' then 'aprovado' else 'pendente' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Se julianalogatto@gmail.com já tiver criado a conta ANTES desta migração
-- (e por isso entrou como pendente), promove automaticamente agora:
update public.profiles
set role = 'admin', active = true, status = 'aprovado'
where lower(email) = 'julianalogatto@gmail.com';

-- ============================================================
-- FIM DA MIGRAÇÃO 005
-- ============================================================
