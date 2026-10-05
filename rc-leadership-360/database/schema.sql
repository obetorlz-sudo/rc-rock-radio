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