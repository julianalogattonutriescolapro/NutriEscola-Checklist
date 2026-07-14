-- ============================================================
-- Migração 004 — Aprovação de acesso, 2 perfis, permissões restritas
-- Rode no SQL Editor do Supabase, depois das migrações 002 e 003.
-- ============================================================

-- ---------- STATUS DE APROVAÇÃO ----------
alter table public.profiles add column if not exists status text
  not null default 'pendente' check (status in ('pendente','aprovado','desativado'));

-- migra quem já estava ativo/admin para 'aprovado' (não regride ninguém que já usava o sistema)
update public.profiles set status = 'aprovado' where active = true and status = 'pendente';

-- perfis: só existem admin e nutricionista a partir de agora
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'nutricionista' where role = 'visualizador';
alter table public.profiles add constraint profiles_role_check check (role in ('admin','nutricionista'));

-- ---------- E-MAIL VISÍVEL PARA A ADMINISTRADORA ----------
alter table public.profiles add column if not exists email text;
update public.profiles pr set email = au.email from auth.users au where au.id = pr.id and pr.email is null;

-- novo cadastro nunca nasce admin nem aprovado, independente do que mandarem no signUp
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, active, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'nutricionista', false, 'pendente');
  return new;
end;
$$ language plpgsql security definer;

-- guarda contra auto-promoção também no campo status (além de role/active já protegidos na migração 003)
create or replace function public.guard_profile_role_change()
returns trigger as $$
declare
  is_admin boolean;
  any_admin_exists boolean;
begin
  if new.role is distinct from old.role or new.active is distinct from old.active or new.status is distinct from old.status then
    select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into is_admin;
    select exists(select 1 from public.profiles where role = 'admin') into any_admin_exists;
    if is_admin then
      return new;
    elsif not any_admin_exists and new.id = auth.uid() and new.role = 'admin' then
      return new; -- bootstrap do primeiro admin
    else
      raise exception 'Apenas a administradora pode alterar perfil, aprovação ou status de usuários.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- mantém "active" sincronizado com "status" para não quebrar código antigo que ainda olhe active
create or replace function public.sync_active_from_status()
returns trigger as $$
begin
  new.active := (new.status = 'aprovado');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_active on public.profiles;
create trigger trg_sync_active before insert or update on public.profiles
  for each row execute function public.sync_active_from_status();

-- ---------- CABEÇALHO EDITÁVEL DO RELATÓRIO ----------
alter table public.settings add column if not exists prefeitura_nome text default '';
alter table public.settings add column if not exists prefeitura_logo_url text default '';
alter table public.settings add column if not exists secretaria_nome text default '';
alter table public.settings add column if not exists secretaria_logo_url text default '';
alter table public.settings add column if not exists juliana_logo_url text default '';

-- ============================================================
-- RLS — nutricionista só vê o que é dela; admin vê tudo
-- ============================================================

-- SCHOOLS: leitura para qualquer aprovado; escrita só admin
drop policy if exists "schools_write" on public.schools;
drop policy if exists "schools_update" on public.schools;
drop policy if exists "schools_select" on public.schools;
create policy "schools_select" on public.schools for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado'));
create policy "schools_write" on public.schools for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));
create policy "schools_update" on public.schools for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- MENUS: leitura para aprovados (nutricionista precisa ver cardápio previsto); escrita só admin
drop policy if exists "menus_write" on public.menus;
drop policy if exists "menus_update" on public.menus;
drop policy if exists "menus_select" on public.menus;
create policy "menus_select" on public.menus for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado'));
create policy "menus_write" on public.menus for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));
create policy "menus_update" on public.menus for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- VISITS: nutricionista só enxerga/insere as próprias; admin vê e edita todas
drop policy if exists "visits_select" on public.visits;
drop policy if exists "visits_write" on public.visits;
drop policy if exists "visits_update" on public.visits;
create policy "visits_select" on public.visits for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and (p.role='admin' or public.visits.nutritionist_id=auth.uid())));
create policy "visits_insert" on public.visits for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado')
  and nutritionist_id = auth.uid());
create policy "visits_update" on public.visits for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));
create policy "visits_delete" on public.visits for delete using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- CHECKLIST ITEMS: segue a visita correspondente
drop policy if exists "checklist_select" on public.checklist_items;
drop policy if exists "checklist_write" on public.checklist_items;
drop policy if exists "checklist_update" on public.checklist_items;
create policy "checklist_select" on public.checklist_items for select using (
  exists (select 1 from public.visits v join public.profiles p on p.id=auth.uid()
          where v.id=checklist_items.visit_id and p.status='aprovado' and (p.role='admin' or v.nutritionist_id=auth.uid())));
create policy "checklist_write" on public.checklist_items for insert with check (
  exists (select 1 from public.visits v join public.profiles p on p.id=auth.uid()
          where v.id=checklist_items.visit_id and p.status='aprovado' and v.nutritionist_id=auth.uid()));
create policy "checklist_update" on public.checklist_items for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));
create policy "checklist_delete" on public.checklist_items for delete using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- PHOTOS: segue a visita correspondente
drop policy if exists "photos_select" on public.photos;
drop policy if exists "photos_write" on public.photos;
drop policy if exists "photos_delete" on public.photos;
create policy "photos_select" on public.photos for select using (
  exists (select 1 from public.visits v join public.profiles p on p.id=auth.uid()
          where v.id=photos.visit_id and p.status='aprovado' and (p.role='admin' or v.nutritionist_id=auth.uid())));
create policy "photos_write" on public.photos for insert with check (
  exists (select 1 from public.visits v join public.profiles p on p.id=auth.uid()
          where v.id=photos.visit_id and p.status='aprovado' and v.nutritionist_id=auth.uid()));
create policy "photos_delete" on public.photos for delete using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- ACTION PLANS: segue a escola/visita; leitura restrita, escrita só admin (plano de ação é gerado/gerido pela administradora)
drop policy if exists "actionplans_select" on public.action_plans;
drop policy if exists "actionplans_write" on public.action_plans;
drop policy if exists "actionplans_update" on public.action_plans;
create policy "actionplans_select" on public.action_plans for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin')
  or exists (select 1 from public.visits v join public.profiles p on p.id=auth.uid()
             where v.id=action_plans.visit_id and p.status='aprovado' and v.nutritionist_id=auth.uid()));
create policy "actionplans_write" on public.action_plans for insert with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado')); -- criado automaticamente ao finalizar visita
create policy "actionplans_update" on public.action_plans for update using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado' and p.role='admin'));

-- SETTINGS: leitura para aprovados; escrita só admin (já coberto na migração original, reforçando aqui)
drop policy if exists "settings_select" on public.settings;
create policy "settings_select" on public.settings for select using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.status='aprovado'));

-- PROFILES: nutricionista vê a própria linha; admin vê e mexe em todas (já coberto por 003, reforçando select)
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select using (
  id = auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- ============================================================
-- REALTIME — habilita publicação para a tabela visits
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.visits;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.checklist_items;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- FIM DA MIGRAÇÃO 004
-- ============================================================
