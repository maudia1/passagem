-- Tabelas e políticas RLS para o projeto "Controle de Passagens"
-- AVISO: As políticas abaixo liberam acesso para o papel 'anon' (público)
-- Ajuste conforme sua necessidade de segurança.

-- Extensões úteis (apenas se ainda não ativas)
create extension if not exists pgcrypto;

-- =========================
-- Tabela de Passagens
-- =========================
create table if not exists public.passagens (
  assento integer primary key,
  pagamento text check (pagamento in ('pix','dinheiro')),
  total numeric(10,2),
  updated_at timestamptz not null default now()
);

-- Índice por pagamento (consultas futuras)
create index if not exists passagens_pagamento_idx on public.passagens (pagamento);

-- Habilita RLS
alter table public.passagens enable row level security;

-- Políticas (demo): permitir SELECT/UPSERT/UPDATE/DELETE ao papel anon
drop policy if exists passagens_select on public.passagens;
drop policy if exists passagens_write on public.passagens;

create policy passagens_select on public.passagens
  for select using (true);

create policy passagens_write on public.passagens
  for all using (true) with check (true);

-- =========================
-- Tabela de Abastecimentos
-- =========================
create table if not exists public.abastecimentos (
  id uuid primary key default gen_random_uuid(),
  quando timestamptz not null default now(),
  litros numeric(10,2) not null check (litros > 0),
  total numeric(10,2) not null check (total >= 0),
  preco_litro numeric(10,4), -- opcional, calculado no cliente
  tipo text check (tipo in ('gasolina','etanol')),
  obs text,
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists abastecimentos_quando_idx on public.abastecimentos (quando desc);
create index if not exists abastecimentos_created_idx on public.abastecimentos (created_at desc);

-- Habilita RLS
alter table public.abastecimentos enable row level security;

-- Políticas (demo): permitir SELECT/INSERT/UPDATE/DELETE ao papel anon
drop policy if exists abast_select on public.abastecimentos;
drop policy if exists abast_write on public.abastecimentos;

create policy abast_select on public.abastecimentos
  for select using (true);

create policy abast_write on public.abastecimentos
  for all using (true) with check (true);

-- =========================
-- Corridas (passagens) e passagens por corrida
-- =========================
create table if not exists public.corridas (
  id uuid primary key default gen_random_uuid(),
  quando timestamptz not null default now(),
  periodo text check (periodo in ('manha','noite','outro')),
  total_assentos integer not null,
  ocupados integer not null default 0,
  total numeric(10,2) not null default 0
);

create table if not exists public.corrida_passagens (
  id uuid primary key default gen_random_uuid(),
  corrida_id uuid not null references public.corridas(id) on delete cascade,
  assento integer not null,
  pagamento text check (pagamento in ('pix','dinheiro')),
  total numeric(10,2)
);

create index if not exists corridas_quando_idx on public.corridas (quando desc);
create index if not exists corrida_passagens_corrida_idx on public.corrida_passagens (corrida_id);

alter table public.corridas enable row level security;
alter table public.corrida_passagens enable row level security;

drop policy if exists corridas_select on public.corridas;
drop policy if exists corridas_write on public.corridas;
create policy corridas_select on public.corridas for select using (true);
create policy corridas_write on public.corridas for all using (true) with check (true);

drop policy if exists corrida_pax_select on public.corrida_passagens;
drop policy if exists corrida_pax_write on public.corrida_passagens;
create policy corrida_pax_select on public.corrida_passagens for select using (true);
create policy corrida_pax_write on public.corrida_passagens for all using (true) with check (true);

-- Fim
