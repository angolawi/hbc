-- ============================================================
-- HBC ESTUDOS - CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
-- Este script configura:
-- 1. Armazenamento de Dados (user_data)
-- 2. Perfis e Papéis (Profiles & Roles)
-- 3. Sistema de Mentoria (Mentorships & Whitelist)
-- 4. Segurança (RLS Políticas)
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA PRINCIPAL DE DADOS (USER_DATA)
-- ------------------------------------------------------------
create table if not exists public.user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  key text not null,
  data jsonb not null,
  updated_at timestamp with time zone default now(),
  unique(user_id, key)
);

alter table public.user_data enable row level security;

-- ------------------------------------------------------------
-- 2. PERFIS E PAPEIS (PROFILES)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  target_contest text
);

do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    alter table public.profiles add column role text not null default 'student' check (role in ('student', 'mentor'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. MENTORIA E WHITELIST
-- ------------------------------------------------------------
create table if not exists public.mentor_whitelist (
  email text primary key
);

create table if not exists public.mentorships (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references auth.users not null,
  student_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(mentor_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.mentorships enable row level security;

-- ------------------------------------------------------------
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- ------------------------------------------------------------

-- USER_DATA: Acesso Próprio
drop policy if exists "Users can manage their own data" on user_data;
create policy "Users can manage their own data" 
  on user_data for all 
  using (auth.uid() = user_id);

-- USER_DATA: Acesso do Mentor
drop policy if exists "Mentors can manage assigned user data" on user_data;
create policy "Mentors can manage assigned user data"
  on user_data for all
  using (
    auth.uid() IN (select mentor_id from mentorships where student_id = user_id)
  );

-- PROFILES: Visualização e Edição
drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- MENTORSHIPS: Gestão
drop policy if exists "Mentors manage mentorships" on mentorships;
create policy "Mentors manage mentorships" on mentorships for all using (auth.uid() = mentor_id);

drop policy if exists "Students see mentor" on mentorships;
create policy "Students see mentor" on mentorships for select using (auth.uid() = student_id);

-- ------------------------------------------------------------
-- 5. AUTOMAÇÃO (TRIGGERS)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_whitelisted boolean;
begin
  select exists(select 1 from public.mentor_whitelist where email = new.email) into is_whitelisted;

  if is_whitelisted then
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'mentor')
    on conflict (id) do update set role = 'mentor';
  else
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'student')
    on conflict (id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 6. SINCRONIZAÇÃO INICIAL
-- ------------------------------------------------------------
insert into public.profiles (id, email, role)
select id, email, 'student' from auth.users
on conflict (id) do nothing;
