-- Migração 003 — rode também no SQL Editor do Supabase
-- Corrige uma falha: a policy "profiles_admin_update" original permitia que
-- qualquer usuário autenticado alterasse o próprio "role" (inclusive para 'admin')
-- via chamada direta à API, e não só pela interface do app.
--
-- Regra nova:
--  - Qualquer usuário pode atualizar seu próprio nome.
--  - Só um admin pode alterar "role" ou "active" de qualquer perfil (inclusive o próprio).
--  - EXCEÇÃO de inicialização: se ainda não existir nenhum admin no sistema, o próprio
--    usuário pode se promover a admin uma única vez (necessário para o primeiro acesso).

create or replace function public.guard_profile_role_change()
returns trigger as $$
declare
  is_admin boolean;
  any_admin_exists boolean;
begin
  if new.role is distinct from old.role or new.active is distinct from old.active then
    select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into is_admin;
    select exists(select 1 from public.profiles where role = 'admin') into any_admin_exists;

    if is_admin then
      return new; -- admin pode alterar qualquer perfil
    elsif not any_admin_exists and new.id = auth.uid() and new.role = 'admin' then
      return new; -- bootstrap: primeiro admin do sistema
    else
      raise exception 'Apenas administradores podem alterar perfil/status de usuários.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();
