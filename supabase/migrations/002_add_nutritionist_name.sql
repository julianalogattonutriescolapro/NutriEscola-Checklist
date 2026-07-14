-- Migração adicional — rode isso também no SQL Editor do Supabase
-- (o schema.sql original já foi executado; isso só adiciona 1 coluna que faltou)

alter table public.visits add column if not exists nutritionist_name text;
