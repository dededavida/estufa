-- Estufa Inteligente — schema alinhado ao firmware ESP32
-- Rode no SQL Editor do Supabase (https://supabase.com/dashboard)

-- Status atual (1 linha por estufa) — UPSERT por device_id
create table if not exists public.greenhouse_status (
  device_id text primary key,
  temperature double precision,
  air_humidity double precision,
  soil_moisture integer,
  soil_raw integer,
  light integer,
  light_raw integer,
  pump boolean not null default false,
  lamp boolean not null default false,
  fan boolean not null default false,
  online boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Comandos do app → ESP32 lê a cada ~2s
create table if not exists public.greenhouse_commands (
  device_id text primary key,
  pump boolean not null default false,
  lamp boolean not null default false,
  fan boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Histórico para gráficos / tabela
-- O app (Expo) insere 1 linha ~a cada 1h a partir do STATUS Bluetooth
-- (ver src/services/metrics-sync.ts). device_id = EXPO_PUBLIC_DEVICE_ID.
create table if not exists public.sensor_history (
  id bigint generated always as identity primary key,
  device_id text not null,
  temperature double precision,
  air_humidity double precision,
  soil_moisture integer,
  light integer,
  created_at timestamptz not null default now()
);

create index if not exists sensor_history_device_created_idx
  on public.sensor_history (device_id, created_at desc);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists greenhouse_status_set_updated_at on public.greenhouse_status;
create trigger greenhouse_status_set_updated_at
  before update on public.greenhouse_status
  for each row execute function public.set_updated_at();

drop trigger if exists greenhouse_commands_set_updated_at on public.greenhouse_commands;
create trigger greenhouse_commands_set_updated_at
  before update on public.greenhouse_commands
  for each row execute function public.set_updated_at();

-- Linha inicial de comandos (ESP32 espera um registro)
insert into public.greenhouse_commands (device_id, pump, lamp, fan)
values ('estufa-01', false, false, false)
on conflict (device_id) do nothing;

-- Acesso público de leitura/escrita para o protótipo (anon key)
-- Em produção, restrinja com RLS + auth.
alter table public.greenhouse_status enable row level security;
alter table public.greenhouse_commands enable row level security;
alter table public.sensor_history enable row level security;

drop policy if exists "anon full greenhouse_status" on public.greenhouse_status;
create policy "anon full greenhouse_status"
  on public.greenhouse_status
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon full greenhouse_commands" on public.greenhouse_commands;
create policy "anon full greenhouse_commands"
  on public.greenhouse_commands
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon full sensor_history" on public.sensor_history;
create policy "anon full sensor_history"
  on public.sensor_history
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Realtime — necessário para a tela Histórico (postgres_changes em sensor_history).
-- RLS já permite SELECT para anon; sem isso o Realtime não entrega eventos.
-- Se a tabela já estiver na publication, este ALTER pode falhar (ignore).
-- Alternativa: Dashboard → Database → Publications → supabase_realtime → adicione sensor_history.
alter publication supabase_realtime add table public.sensor_history;

-- Realtime (opcional) — Status & Commands
-- Dashboard → Database → Publications → supabase_realtime → habilite as tabelas
