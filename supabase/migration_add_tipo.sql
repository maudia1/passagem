-- Migração: adicionar coluna tipo e remover/aposentar posto
alter table public.abastecimentos
  add column if not exists tipo text check (tipo in (''gasolina'',''etanol''));

-- opcional: migrar valores existentes de posto para tipo (tentativa por palavra)
update public.abastecimentos
set tipo = case
  when coalesce(lower(posto),'') like '%etan%' then 'etanol'
  when coalesce(lower(posto),'') like '%gas%' then 'gasolina'
  else null
end
where tipo is null;

-- opcional: manter coluna posto por compatibilidade, ou removê-la:
-- alter table public.abastecimentos drop column posto;
