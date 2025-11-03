-- Criação das tabelas de corridas e passagens da corrida (para bases existentes)
create table if not exists public.corridas (
  id uuid primary key default gen_random_uuid(),
  quando timestamptz not null default now(),
  periodo text check (periodo in ('manhã','noite','outro','manha')),
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
create policy corridas_select on public.corridas for select using (true);

drop policy if exists corridas_write on public.corridas;
create policy corridas_write on public.corridas for all using (true) with check (true);

drop policy if exists corrida_pax_select on public.corrida_passagens;
create policy corrida_pax_select on public.corrida_passagens for select using (true);

drop policy if exists corrida_pax_write on public.corrida_passagens;
create policy corrida_pax_write on public.corrida_passagens for all using (true) with check (true);
