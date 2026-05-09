-- Run this in the Supabase SQL editor for the Gym Tunisia project.
-- Profiles are already used by the app; the tables below move meals,
-- workout progress, and editable macro targets from local device storage
-- to account-scoped Supabase storage.

alter table public.profiles
  add column if not exists experience_level text not null default 'beginner',
  add column if not exists equipment_access text not null default 'gym',
  add column if not exists training_days text not null default '3',
  add column if not exists program_start_date date not null default current_date;

alter table public.profiles
  drop constraint if exists profiles_experience_level_check,
  add constraint profiles_experience_level_check check (experience_level in ('beginner', 'intermediate', 'advanced'));

alter table public.profiles
  drop constraint if exists profiles_equipment_access_check,
  add constraint profiles_equipment_access_check check (equipment_access in ('gym', 'home', 'mixed'));

create table if not exists public.meal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories integer not null default 0,
  protein integer not null default 0,
  carbs integer not null default 0,
  fat integer not null default 0,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_entries_user_date_idx on public.meal_entries(user_id, date desc);

alter table public.meal_entries enable row level security;

drop policy if exists "Users can read their own meals" on public.meal_entries;
create policy "Users can read their own meals"
on public.meal_entries for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meals" on public.meal_entries;
create policy "Users can insert their own meals"
on public.meal_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meals" on public.meal_entries;
create policy "Users can update their own meals"
on public.meal_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own meals" on public.meal_entries;
create policy "Users can delete their own meals"
on public.meal_entries for delete
using (auth.uid() = user_id);

create table if not exists public.workout_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day text not null,
  focus text not null,
  completed boolean not null default false,
  exercises jsonb not null default '[]'::jsonb,
  effort_rating integer check (effort_rating between 1 and 5),
  completed_all_sets boolean,
  feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date, day)
);

alter table public.workout_progress
  add column if not exists effort_rating integer check (effort_rating between 1 and 5),
  add column if not exists completed_all_sets boolean,
  add column if not exists feedback_at timestamptz;

create index if not exists workout_progress_user_date_idx on public.workout_progress(user_id, date desc);

alter table public.workout_progress enable row level security;

drop policy if exists "Users can read their own workout progress" on public.workout_progress;
create policy "Users can read their own workout progress"
on public.workout_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout progress" on public.workout_progress;
create policy "Users can insert their own workout progress"
on public.workout_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workout progress" on public.workout_progress;
create policy "Users can update their own workout progress"
on public.workout_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workout progress" on public.workout_progress;
create policy "Users can delete their own workout progress"
on public.workout_progress for delete
using (auth.uid() = user_id);

create table if not exists public.nutrition_target_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutrition_target_overrides enable row level security;

drop policy if exists "Users can read their own nutrition targets" on public.nutrition_target_overrides;
create policy "Users can read their own nutrition targets"
on public.nutrition_target_overrides for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own nutrition targets" on public.nutrition_target_overrides;
create policy "Users can insert their own nutrition targets"
on public.nutrition_target_overrides for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own nutrition targets" on public.nutrition_target_overrides;
create policy "Users can update their own nutrition targets"
on public.nutrition_target_overrides for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own nutrition targets" on public.nutrition_target_overrides;
create policy "Users can delete their own nutrition targets"
on public.nutrition_target_overrides for delete
using (auth.uid() = user_id);

create table if not exists public.weight_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric(5,1) not null check (weight between 30 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists weight_entries_user_date_idx on public.weight_entries(user_id, date desc);

alter table public.weight_entries enable row level security;

drop policy if exists "Users can read their own weight entries" on public.weight_entries;
create policy "Users can read their own weight entries"
on public.weight_entries for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own weight entries" on public.weight_entries;
create policy "Users can insert their own weight entries"
on public.weight_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own weight entries" on public.weight_entries;
create policy "Users can update their own weight entries"
on public.weight_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own weight entries" on public.weight_entries;
create policy "Users can delete their own weight entries"
on public.weight_entries for delete
using (auth.uid() = user_id);

create table if not exists public.user_xp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  xp_amount integer not null check (xp_amount > 0),
  source text not null,
  description text,
  event_key text,
  created_at timestamptz not null default now()
);

alter table public.user_xp
  add column if not exists event_key text;

create index if not exists user_xp_user_created_idx on public.user_xp(user_id, created_at desc);
create unique index if not exists user_xp_user_event_key_idx on public.user_xp(user_id, event_key) where event_key is not null;

alter table public.user_xp enable row level security;

drop policy if exists "Users can read their own XP" on public.user_xp;
create policy "Users can read their own XP"
on public.user_xp for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own XP" on public.user_xp;
create policy "Users can insert their own XP"
on public.user_xp for insert
with check (auth.uid() = user_id);

create table if not exists public.workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration integer not null default 0,
  total_volume numeric(10,2) not null default 0,
  total_sets integer not null default 0,
  total_reps integer not null default 0,
  calories_estimate integer not null default 0,
  xp_earned integer not null default 0,
  workout_type text not null default 'Workout',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_completed_idx on public.workout_sessions(user_id, completed_at desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "Users can read their own workout sessions" on public.workout_sessions;
create policy "Users can read their own workout sessions"
on public.workout_sessions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout sessions" on public.workout_sessions;
create policy "Users can insert their own workout sessions"
on public.workout_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workout sessions" on public.workout_sessions;
create policy "Users can update their own workout sessions"
on public.workout_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workout sessions" on public.workout_sessions;
create policy "Users can delete their own workout sessions"
on public.workout_sessions for delete
using (auth.uid() = user_id);

create table if not exists public.exercise_logs (
  id text primary key,
  session_id text not null references public.workout_sessions(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  muscle_group text not null,
  notes text,
  tempo text,
  superset_group text,
  created_at timestamptz not null default now()
);

alter table public.exercise_logs
  add column if not exists tempo text,
  add column if not exists superset_group text;

create index if not exists exercise_logs_session_idx on public.exercise_logs(session_id);
create index if not exists exercise_logs_exercise_name_idx on public.exercise_logs(exercise_name);

alter table public.exercise_logs enable row level security;

drop policy if exists "Users can read their own exercise logs" on public.exercise_logs;
create policy "Users can read their own exercise logs"
on public.exercise_logs for select
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = exercise_logs.session_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert their own exercise logs" on public.exercise_logs;
create policy "Users can insert their own exercise logs"
on public.exercise_logs for insert
with check (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = exercise_logs.session_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own exercise logs" on public.exercise_logs;
create policy "Users can update their own exercise logs"
on public.exercise_logs for update
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = exercise_logs.session_id
    and workout_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = exercise_logs.session_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their own exercise logs" on public.exercise_logs;
create policy "Users can delete their own exercise logs"
on public.exercise_logs for delete
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = exercise_logs.session_id
    and workout_sessions.user_id = auth.uid()
  )
);

create table if not exists public.exercise_sets (
  id text primary key,
  exercise_log_id text not null references public.exercise_logs(id) on delete cascade,
  set_number integer not null,
  weight numeric(7,2) not null default 0,
  reps integer not null default 0,
  rpe numeric(3,1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  completed boolean not null default false,
  is_warmup boolean not null default false,
  is_failure boolean not null default false,
  is_drop_set boolean not null default false,
  estimated_1rm numeric(7,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists exercise_sets_log_idx on public.exercise_sets(exercise_log_id, set_number);

alter table public.exercise_sets enable row level security;

drop policy if exists "Users can read their own exercise sets" on public.exercise_sets;
create policy "Users can read their own exercise sets"
on public.exercise_sets for select
using (
  exists (
    select 1 from public.exercise_logs
    join public.workout_sessions on workout_sessions.id = exercise_logs.session_id
    where exercise_logs.id = exercise_sets.exercise_log_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert their own exercise sets" on public.exercise_sets;
create policy "Users can insert their own exercise sets"
on public.exercise_sets for insert
with check (
  exists (
    select 1 from public.exercise_logs
    join public.workout_sessions on workout_sessions.id = exercise_logs.session_id
    where exercise_logs.id = exercise_sets.exercise_log_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own exercise sets" on public.exercise_sets;
create policy "Users can update their own exercise sets"
on public.exercise_sets for update
using (
  exists (
    select 1 from public.exercise_logs
    join public.workout_sessions on workout_sessions.id = exercise_logs.session_id
    where exercise_logs.id = exercise_sets.exercise_log_id
    and workout_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.exercise_logs
    join public.workout_sessions on workout_sessions.id = exercise_logs.session_id
    where exercise_logs.id = exercise_sets.exercise_log_id
    and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their own exercise sets" on public.exercise_sets;
create policy "Users can delete their own exercise sets"
on public.exercise_sets for delete
using (
  exists (
    select 1 from public.exercise_logs
    join public.workout_sessions on workout_sessions.id = exercise_logs.session_id
    where exercise_logs.id = exercise_sets.exercise_log_id
    and workout_sessions.user_id = auth.uid()
  )
);

create table if not exists public.exercise_personal_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  best_weight numeric(7,2) not null default 0,
  best_volume numeric(10,2) not null default 0,
  best_estimated_1rm numeric(7,2) not null default 0,
  best_reps integer not null default 0,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_name)
);

alter table public.exercise_personal_records
  add column if not exists best_reps integer not null default 0;

create index if not exists exercise_pr_user_achieved_idx on public.exercise_personal_records(user_id, achieved_at desc);

alter table public.exercise_personal_records enable row level security;

drop policy if exists "Users can read their own exercise PRs" on public.exercise_personal_records;
create policy "Users can read their own exercise PRs"
on public.exercise_personal_records for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own exercise PRs" on public.exercise_personal_records;
create policy "Users can insert their own exercise PRs"
on public.exercise_personal_records for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own exercise PRs" on public.exercise_personal_records;
create policy "Users can update their own exercise PRs"
on public.exercise_personal_records for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
