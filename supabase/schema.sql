-- VitalFlow Supabase schema
-- Run this in the Supabase SQL editor for a new project.
-- It creates the tables used by the app and enables per-user Row Level Security.

create extension if not exists pgcrypto;

-- User profile data, one row per auth user.
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  name text,
  email text,
  phone text,
  date_of_birth date,
  age integer,
  gender text,
  blood_type text,
  height numeric,
  weight numeric,
  address text,
  medical_notes text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  insurance_provider text,
  insurance_number text,
  organ_donor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  heart_rate integer,
  spo2 numeric,
  temperature numeric,          -- degrees Celsius
  gsr_value numeric,            -- galvanic skin response (sweat sensor)
  heart_attack_risk numeric,    -- model output, 0..1
  latitude double precision,
  longitude double precision,
  sweat_level text,
  risk_level text,
  systolic integer,
  diastolic integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  type text not null default 'system' check (type in ('vital', 'risk', 'emergency', 'system')),
  read boolean not null default false,
  snoozed_until timestamptz,
  source text,
  tags text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  phone text not null,
  country_code text default '+91',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  time text,
  instructions text,
  start_date date,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  severity text,
  diagnosed_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allergies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  allergen text,
  reaction text,
  severity text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path: adds columns the app needs to projects created from an older
-- version of this file (safe to re-run).
alter table public.user_profiles add column if not exists emergency_contact_relationship text;
alter table public.user_profiles add column if not exists insurance_provider text;
alter table public.user_profiles add column if not exists insurance_number text;
alter table public.user_profiles add column if not exists organ_donor boolean not null default false;
alter table public.health_readings add column if not exists gsr_value numeric;
alter table public.health_readings add column if not exists heart_attack_risk numeric;
alter table public.health_readings add column if not exists latitude double precision;
alter table public.health_readings add column if not exists longitude double precision;
alter table public.alerts add column if not exists source text;
alter table public.alerts add column if not exists tags text[] not null default '{}';
alter table public.alerts add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.medications add column if not exists notes text;

create index if not exists health_readings_user_created_idx on public.health_readings(user_id, created_at desc);
create index if not exists alerts_user_created_idx on public.alerts(user_id, created_at desc);
create index if not exists alerts_user_read_idx on public.alerts(user_id, read);
create index if not exists emergency_contacts_user_idx on public.emergency_contacts(user_id);
create index if not exists medications_user_idx on public.medications(user_id);
create index if not exists medical_conditions_user_idx on public.medical_conditions(user_id);
create index if not exists allergies_user_idx on public.allergies(user_id);

-- Keep updated_at fresh on updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_emergency_contacts_updated_at on public.emergency_contacts;
create trigger set_emergency_contacts_updated_at before update on public.emergency_contacts
for each row execute function public.set_updated_at();

drop trigger if exists set_medications_updated_at on public.medications;
create trigger set_medications_updated_at before update on public.medications
for each row execute function public.set_updated_at();

drop trigger if exists set_medical_conditions_updated_at on public.medical_conditions;
create trigger set_medical_conditions_updated_at before update on public.medical_conditions
for each row execute function public.set_updated_at();

drop trigger if exists set_allergies_updated_at on public.allergies;
create trigger set_allergies_updated_at before update on public.allergies
for each row execute function public.set_updated_at();

-- Enable RLS.
alter table public.user_profiles enable row level security;
alter table public.health_readings enable row level security;
alter table public.alerts enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.medications enable row level security;
alter table public.medical_conditions enable row level security;
alter table public.allergies enable row level security;

-- Per-user table policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_profiles',
    'health_readings',
    'alerts',
    'emergency_contacts',
    'medications',
    'medical_conditions',
    'allergies'
  ] loop
    execute format('drop policy if exists "Users can select own %1$s" on public.%1$I', table_name);
    execute format('create policy "Users can select own %1$s" on public.%1$I for select using (auth.uid() = user_id)', table_name);

    execute format('drop policy if exists "Users can insert own %1$s" on public.%1$I', table_name);
    execute format('create policy "Users can insert own %1$s" on public.%1$I for insert with check (auth.uid() = user_id)', table_name);

    execute format('drop policy if exists "Users can update own %1$s" on public.%1$I', table_name);
    execute format('create policy "Users can update own %1$s" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);

    execute format('drop policy if exists "Users can delete own %1$s" on public.%1$I', table_name);
    execute format('create policy "Users can delete own %1$s" on public.%1$I for delete using (auth.uid() = user_id)', table_name);
  end loop;
end $$;

-- Avatar storage bucket and policies.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects
for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects
for insert with check (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects
for update using (bucket_id = 'avatars' and name like auth.uid()::text || '-%')
with check (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects
for delete using (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

-- Required for Supabase Realtime change feeds. Also enable Realtime for these tables in the Supabase Dashboard if needed.
alter publication supabase_realtime add table public.health_readings;
alter publication supabase_realtime add table public.alerts;

-- Realtime: the app subscribes to inserts/updates on these tables.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'health_readings'
  ) then
    alter publication supabase_realtime add table public.health_readings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts'
  ) then
    alter publication supabase_realtime add table public.alerts;
  end if;
end;
$$;
