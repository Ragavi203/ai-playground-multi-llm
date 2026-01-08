-- PostgreSQL schema for AI Playground

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  external_id text unique, -- e.g. NextAuth user id or OAuth subject
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  title text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists prompt_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references prompts (id),
  user_id uuid references users (id),
  prompt_text text not null,
  total_cost_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

create table if not exists prompt_run_models (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references prompt_runs (id) on delete cascade,
  provider_id text not null,
  provider_label text not null,
  model_id text not null,
  model_label text not null,
  output text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  cost_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references prompt_runs (id) on delete cascade,
  model_row_id uuid not null references prompt_run_models (id) on delete cascade,
  user_id uuid references users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_prompt_runs_prompt_id on prompt_runs (prompt_id);
create index if not exists idx_prompt_runs_user_id on prompt_runs (user_id);
create index if not exists idx_prompt_run_models_run_id on prompt_run_models (run_id);
create index if not exists idx_votes_run_id on votes (run_id);
create index if not exists idx_votes_model_row_id on votes (model_row_id);


