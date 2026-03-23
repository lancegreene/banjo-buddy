-- ─────────────────────────────────────────────────────────────────────────────
-- Banjo Buddy — Supabase Schema Migration
-- Mirrors the Dexie/IndexedDB schema for cloud sync.
-- All tables use Row Level Security (RLS) so users only see their own data.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  path text not null default 'newby',
  role text not null default 'solo',
  teacher_id uuid references public.profiles(id) on delete set null,
  has_seen_tour boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Skill Records ──────────────────────────────────────────────────────────
create table public.skill_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null,
  status text not null default 'locked',
  current_bpm integer,
  best_bpm integer,
  practice_count integer not null default 0,
  last_practiced timestamptz,
  unlocked_at timestamptz,
  progressed_at timestamptz,
  mastered_at timestamptz,
  sr_interval integer,
  sr_next_review timestamptz,
  fsrs_state jsonb,
  fsrs_next_review timestamptz,
  mastery_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, skill_id)
);

alter table public.skill_records enable row level security;
create policy "Users own their skill records" on public.skill_records for all using (auth.uid() = user_id);

-- ─── Practice Sessions ──────────────────────────────────────────────────────
create table public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;
create policy "Users own their sessions" on public.practice_sessions for all using (auth.uid() = user_id);

-- ─── Session Items ──────────────────────────────────────────────────────────
create table public.session_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null,
  type text not null default 'roll',
  target_bpm integer,
  achieved_bpm integer,
  self_rating text,
  rhythm_score integer,
  pitch_score integer,
  tempo_score integer,
  composite_score integer,
  has_recording boolean not null default false,
  recording_key text,
  completed_at timestamptz not null default now()
);

alter table public.session_items enable row level security;
create policy "Users own their session items" on public.session_items for all using (auth.uid() = user_id);

-- ─── Streak Records ─────────────────────────────────────────────────────────
create table public.streak_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table public.streak_records enable row level security;
create policy "Users own their streaks" on public.streak_records for all using (auth.uid() = user_id);

-- ─── Note Accuracy Records ──────────────────────────────────────────────────
create table public.note_accuracy_records (
  id uuid primary key default uuid_generate_v4(),
  session_item_id uuid not null references public.session_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null,
  pattern_id text not null,
  position integer not null,
  expected_string integer,
  played_string integer,
  is_hit boolean not null default false,
  timing_error_ms integer,
  created_at timestamptz not null default now()
);

alter table public.note_accuracy_records enable row level security;
create policy "Users own their accuracy records" on public.note_accuracy_records for all using (auth.uid() = user_id);

-- ─── Achievements ────────────────────────────────────────────────────────────
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  achievement_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

alter table public.achievements enable row level security;
create policy "Users own their achievements" on public.achievements for all using (auth.uid() = user_id);

-- ─── Custom Roll Patterns ───────────────────────────────────────────────────
create table public.custom_roll_patterns (
  id text primary key,
  name text not null,
  strings jsonb not null,
  fingers jsonb not null,
  description text not null default '',
  add_as_skill boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_roll_patterns enable row level security;
create policy "Users own their roll patterns" on public.custom_roll_patterns for all using (auth.uid() = created_by);

-- ─── Teacher Configs ─────────────────────────────────────────────────────────
create table public.teacher_configs (
  id uuid primary key references public.profiles(id) on delete cascade,
  disabled_skill_ids jsonb not null default '[]',
  student_overrides jsonb,
  media_display jsonb,
  skill_order jsonb,
  updated_at timestamptz not null default now()
);

alter table public.teacher_configs enable row level security;
create policy "Teachers own their config" on public.teacher_configs for all using (auth.uid() = id);

-- ─── Sync Metadata ──────────────────────────────────────────────────────────
-- Tracks the last sync timestamp per user to enable incremental sync.
create table public.sync_metadata (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_synced_at timestamptz not null default '1970-01-01T00:00:00Z',
  updated_at timestamptz not null default now()
);

alter table public.sync_metadata enable row level security;
create policy "Users own their sync metadata" on public.sync_metadata for all using (auth.uid() = user_id);

-- ─── Indexes for common queries ─────────────────────────────────────────────
create index idx_skill_records_user on public.skill_records(user_id);
create index idx_skill_records_lookup on public.skill_records(user_id, skill_id);
create index idx_practice_sessions_user on public.practice_sessions(user_id);
create index idx_session_items_session on public.session_items(session_id);
create index idx_session_items_skill on public.session_items(user_id, skill_id, completed_at);
create index idx_streak_records_user_date on public.streak_records(user_id, date);
create index idx_note_accuracy_lookup on public.note_accuracy_records(skill_id, pattern_id, position);
create index idx_achievements_user on public.achievements(user_id);

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.skill_records for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.custom_roll_patterns for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.teacher_configs for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.sync_metadata for each row execute function public.update_updated_at();
