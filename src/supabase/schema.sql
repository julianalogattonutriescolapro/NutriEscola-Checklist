-- ============================================================================
-- LOGATTO FLOW FINANCE — Schema do banco de dados (v2 — especificação oficial)
-- ============================================================================
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase existente.
-- Seguro para rodar de novo: usa IF NOT EXISTS / OR REPLACE, não apaga dados.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. USUÁRIOS (perfil)
-- ============================================================================
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null,
  avatar_url text,
  admin boolean not null default false,
  status_aprovacao text not null default 'pendente' check (status_aprovacao in ('pendente', 'aprovado', 'recusado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade: garante as colunas mesmo se a tabela já existia de uma versão anterior
alter table public.usuarios add column if not exists admin boolean not null default false;
alter table public.usuarios add column if not exists status_aprovacao text not null default 'pendente';
alter table public.usuarios drop constraint if exists usuarios_status_aprovacao_check;
alter table public.usuarios add constraint usuarios_status_aprovacao_check check (status_aprovacao in ('pendente', 'aprovado', 'recusado'));

-- ⚠️ E-mail da administradora: cadastros feitos com este e-mail são aprovados
-- e promovidos a administrador automaticamente. Troque aqui se necessário.
-- Se você já criou sua conta ANTES de rodar esta seção, rode manualmente:
--   update public.usuarios set admin = true, status_aprovacao = 'aprovado' where email = 'julianalogatto@gmail.com';
create or replace function public.handle_new_user()
returns trigger as $$
declare
  eh_admin boolean;
begin
  eh_admin := (lower(new.email) = lower('julianalogatto@gmail.com'));

  insert into public.usuarios (id, nome, email, admin, status_aprovacao)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.email,
    eh_admin,
    case when eh_admin then 'aprovado' else 'pendente' end
  )
  on conflict (id) do nothing;

  -- Categorias iniciais de receita, exigidas pela especificação
  insert into public.categorias (user_id, nome, tipo) values
    (new.id, 'Salário 1', 'receita'),
    (new.id, 'Salário 2', 'receita'),
    (new.id, 'Receita Extra', 'receita')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. CATEGORIAS (receita ou despesa, o usuário pode criar novas livremente)
-- ============================================================================
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  cor text not null default '#A8C3A0',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. RECEITAS
-- ============================================================================
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  recorrente boolean not null default false,
  status text not null default 'recebido' check (status in ('recebido','pendente')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. DESPESAS
-- Forma de pagamento e dados do cartão (quando "credito") ficam embutidos
-- aqui — a especificação pede para NÃO criar um módulo de cartões separado.
-- ============================================================================
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  data_vencimento date,
  observacoes text,
  recorrente boolean not null default false,
  situacao text not null default 'pendente' check (situacao in ('paga','pendente')),
  forma_pagamento text not null default 'pix'
    check (forma_pagamento in ('dinheiro','dinheiro_fisico','pix','debito','credito','transferencia','outro')),
  cartao_nome text,        -- só usado quando forma_pagamento = 'credito'
  cartao_vencimento date,  -- só usado quando forma_pagamento = 'credito'
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. RESERVA FINANCEIRA (Cofre, Cofre Online, ou nomes personalizados)
-- ============================================================================
create table if not exists public.reserva_financeira (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,               -- ex: "Cofre", "Cofre Online", "Nubank"
  valor_guardado numeric(14,2) not null default 0,
  objetivo text,
  observacoes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. ALERTAS (gerados pela regra de negócio; consumidos pelo módulo de Alertas)
-- ============================================================================
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('vencimento','saldo_baixo','resumo_mes','contas_pendentes')),
  titulo text not null,
  mensagem text not null,
  referencia_id uuid,   -- id da despesa/receita relacionada, se houver
  disparar_em timestamptz not null,  -- 12:20 do dia anterior ao vencimento, etc.
  lido boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. CALENDÁRIO FINANCEIRO — view unificada (não precisa de tabela própria)
-- ============================================================================
create or replace view public.calendario_financeiro as
select
  id, user_id, 'despesa' as tipo, descricao,
  coalesce(data_vencimento, data) as data_evento,
  valor,
  case when situacao = 'paga' then 'paga'
       when coalesce(data_vencimento, data) < current_date then 'vencida'
       else 'a_vencer' end as status_evento
from public.despesas
union all
select
  id, user_id, 'receita' as tipo, descricao,
  data as data_evento,
  valor,
  case when status = 'recebido' then 'recebida' else 'prevista' end as status_evento
from public.receitas;

-- ============================================================================
-- APROVAÇÃO DE USUÁRIOS — funções auxiliares (usadas nas policies abaixo)
-- ============================================================================

-- Retorna true se o usuário logado é administrador
create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select admin from public.usuarios where id = auth.uid()), false);
$$;

-- Retorna true se o usuário logado já foi aprovado pela administradora
create or replace function public.esta_aprovado()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select status_aprovacao = 'aprovado' from public.usuarios where id = auth.uid()), false);
$$;

-- Impede que um usuário comum edite os próprios campos "admin" e
-- "status_aprovacao" ao salvar o perfil (só a administradora pode alterar isso)
create or replace function public.impedir_auto_aprovacao()
returns trigger as $$
begin
  if not public.eh_admin() then
    new.admin := old.admin;
    new.status_aprovacao := old.status_aprovacao;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_impedir_auto_aprovacao on public.usuarios;
create trigger trg_impedir_auto_aprovacao
  before update on public.usuarios
  for each row execute procedure public.impedir_auto_aprovacao();

-- ============================================================================
-- RLS — cada usuário só acessa os próprios dados, e só depois de aprovado
-- ============================================================================
alter table public.usuarios enable row level security;
alter table public.categorias enable row level security;
alter table public.receitas enable row level security;
alter table public.despesas enable row level security;
alter table public.reserva_financeira enable row level security;
alter table public.alertas enable row level security;

-- USUÁRIOS: cada um vê/edita o próprio perfil (campos admin/status protegidos
-- pelo trigger acima); a administradora vê e edita todos os perfis (para aprovar)
drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own" on public.usuarios for select using (auth.uid() = id);
drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own" on public.usuarios for update using (auth.uid() = id);
drop policy if exists "usuarios_admin_select_all" on public.usuarios;
create policy "usuarios_admin_select_all" on public.usuarios for select using (public.eh_admin());
drop policy if exists "usuarios_admin_update_all" on public.usuarios;
create policy "usuarios_admin_update_all" on public.usuarios for update using (public.eh_admin());

-- DEMAIS TABELAS: além de pertencer ao usuário, exige status_aprovacao = 'aprovado'
drop policy if exists "categorias_all_own" on public.categorias;
create policy "categorias_all_own" on public.categorias for all using (auth.uid() = user_id and public.esta_aprovado()) with check (auth.uid() = user_id and public.esta_aprovado());

drop policy if exists "receitas_all_own" on public.receitas;
create policy "receitas_all_own" on public.receitas for all using (auth.uid() = user_id and public.esta_aprovado()) with check (auth.uid() = user_id and public.esta_aprovado());

drop policy if exists "despesas_all_own" on public.despesas;
create policy "despesas_all_own" on public.despesas for all using (auth.uid() = user_id and public.esta_aprovado()) with check (auth.uid() = user_id and public.esta_aprovado());

drop policy if exists "reserva_all_own" on public.reserva_financeira;
create policy "reserva_all_own" on public.reserva_financeira for all using (auth.uid() = user_id and public.esta_aprovado()) with check (auth.uid() = user_id and public.esta_aprovado());

drop policy if exists "alertas_all_own" on public.alertas;
create policy "alertas_all_own" on public.alertas for all using (auth.uid() = user_id and public.esta_aprovado()) with check (auth.uid() = user_id and public.esta_aprovado());

-- ============================================================================
-- ÍNDICES
-- ============================================================================
create index if not exists idx_categorias_user on public.categorias(user_id);
create index if not exists idx_receitas_user_data on public.receitas(user_id, data);
create index if not exists idx_despesas_user_data on public.despesas(user_id, data);
create index if not exists idx_despesas_vencimento on public.despesas(user_id, data_vencimento);
create index if not exists idx_reserva_user on public.reserva_financeira(user_id);
create index if not exists idx_alertas_user_disparo on public.alertas(user_id, disparar_em);
create index if not exists idx_usuarios_status_aprovacao on public.usuarios(status_aprovacao);

-- ============================================================================
-- Fim do schema v2 (com aprovação de usuários por administradora).
-- ============================================================================
