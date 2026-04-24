-- 1. Create the user_data table
create table user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  key text not null,
  data jsonb not null,
  updated_at timestamp with time zone default now(),
  
  -- This ensures a user can only have one entry per specific key (e.g., 'simpl_edital')
  unique(user_id, key)
);

-- 2. Enable Row Level Security (RLS)
-- This is critical! Without this, anyone could read/write anyone else's data.
alter table user_data enable row level security;

-- 3. Create Security Policies
-- These policies ensure that users can only see and edit their own rows.

create policy "Users can insert their own data."
  on user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data."
  on user_data for update
  using (auth.uid() = user_id);

create policy "Users can select their own data."
  on user_data for select
  using (auth.uid() = user_id);

create policy "Users can delete their own data."
  on user_data for delete
  using (auth.uid() = user_id);
