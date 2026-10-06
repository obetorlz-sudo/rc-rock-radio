create extension if not exists pgcrypto;

create table if not exists rc360_companies(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text not null unique,
  email text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists rc360_users(
  id uuid primary key default gen_random_uuid(),
  company_id uuid references rc360_companies(id) on delete cascade,
  rut text not null unique,
  full_name text not null,
  role text not null check(role in ('admin','psychologist','company')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists rc360_supervisors(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references rc360_companies(id) on delete cascade,
  rut text not null,
  full_name text not null,
  position text,
  area text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id,rut)
);

create table if not exists rc360_assessments(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references rc360_companies(id) on delete cascade,
  supervisor_id uuid not null references rc360_supervisors(id) on delete cascade,
  cycle_name text not null,
  status text not null default 'open' check(status in ('open','closed')),
  team_survey_open boolean not null default true,
  self_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rc360_self_results(
  assessment_id uuid primary key references rc360_assessments(id) on delete cascade,
  disc jsonb not null,
  competencies jsonb not null,
  primary_profile text not null,
  secondary_profile text not null,
  completed_at timestamptz not null default now()
);

create table if not exists rc360_self_answers(
  assessment_id uuid not null references rc360_assessments(id) on delete cascade,
  item_id int not null,
  score int not null check(score between 1 and 5),
  primary key(assessment_id,item_id)
);

create table if not exists rc360_team_responses(
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references rc360_assessments(id) on delete cascade,
  worker_hash text not null,
  disc jsonb not null,
  competencies jsonb not null,
  comment text,
  created_at timestamptz not null default now(),
  unique(assessment_id,worker_hash)
);

create table if not exists rc360_team_answers(
  response_id uuid not null references rc360_team_responses(id) on delete cascade,
  item_id int not null,
  score int not null check(score between 1 and 5),
  primary key(response_id,item_id)
);

create table if not exists rc360_psychologist_notes(
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references rc360_assessments(id) on delete cascade,
  author_id uuid references rc360_users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists rc360_development_plans(
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references rc360_assessments(id) on delete cascade,
  competency text not null,
  objective text not null,
  action text not null,
  horizon_days int not null default 30,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rc360_supervisors_rut_idx on rc360_supervisors(rut);
create index if not exists rc360_assessments_company_idx on rc360_assessments(company_id);
create index if not exists rc360_assessments_supervisor_idx on rc360_assessments(supervisor_id);
create index if not exists rc360_team_assessment_idx on rc360_team_responses(assessment_id);


create table if not exists rc360_final_reports(
  assessment_id uuid primary key references rc360_assessments(id) on delete cascade,
  author_id uuid references rc360_users(id) on delete set null,
  strengths jsonb not null default '[]'::jsonb,
  development_areas jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  executive_summary text,
  status text not null default 'draft' check(status in ('draft','finalized')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rc360_final_reports_status_idx on rc360_final_reports(status);

alter table rc360_psychologist_notes add column if not exists context_position text;
alter table rc360_psychologist_notes add column if not exists interview_observations text;
alter table rc360_psychologist_notes add column if not exists strengths_observed text;
alter table rc360_psychologist_notes add column if not exists development_observed text;
alter table rc360_psychologist_notes add column if not exists environment_factors text;
alter table rc360_psychologist_notes add column if not exists professional_recommendations text;
