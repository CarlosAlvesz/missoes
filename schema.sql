-- =========================================================
-- Missões — banco de dados (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Pode rodar de novo sem medo: tudo é "if not exists".
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- famílias ----------
create table if not exists public.grupos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null default 'Família',
  codigo     text not null unique,
  criado_em  timestamptz not null default now()
);

create table if not exists public.membros (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  grupo_id   uuid not null references public.grupos(id) on delete cascade,
  email      text,
  criado_em  timestamptz not null default now()
);
create index if not exists membros_grupo_idx on public.membros(grupo_id);

-- ---------- crianças ----------
create table if not exists public.perfis (
  id          text primary key,
  grupo_id    uuid not null references public.grupos(id) on delete cascade,
  nome        text not null default '',
  avatar      text not null default '🚀',
  letra       text not null default 'bastao',
  niveis      jsonb not null default '{}'::jsonb,
  estrelas    integer not null default 0,
  removido    boolean not null default false,
  atualizado  bigint not null default 0
);
create index if not exists perfis_grupo_idx on public.perfis(grupo_id);

-- ---------- atividades ----------
create table if not exists public.sessoes (
  id          text primary key,
  grupo_id    uuid not null references public.grupos(id) on delete cascade,
  perfil_id   text not null,
  ts          bigint not null,
  dia         text,
  area        text,
  tipo        text default 'quiz',
  acertos     integer default 0,
  total       integer default 0,
  seg         integer default 0,
  estrelas    integer default 0,
  nivel       integer default 1,
  tags        jsonb not null default '{}'::jsonb,
  texto       text default '',
  autonomia   integer,
  foco        integer,
  fluencia    integer,
  obs         text default '',
  avaliador   text default '',
  atualizado  bigint not null default 0
);
-- colunas acrescentadas depois; rodar de novo não faz mal
alter table public.sessoes add column if not exists treino   text    default '';
alter table public.sessoes add column if not exists removido boolean default false;
alter table public.perfis  add column if not exists meta     integer default 2;

create index if not exists sessoes_grupo_idx on public.sessoes(grupo_id);
create index if not exists sessoes_perfil_idx on public.sessoes(perfil_id);

-- =========================================================
-- quem sou eu
-- =========================================================
create or replace function public.meu_grupo()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select grupo_id from public.membros where user_id = auth.uid();
$$;

-- =========================================================
-- criar uma família nova (quem chama vira membro)
-- =========================================================
create or replace function public.criar_grupo(p_nome text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'precisa estar logado';
  end if;

  if exists (select 1 from public.membros where user_id = auth.uid()) then
    select g.codigo into v_codigo
      from public.grupos g join public.membros m on m.grupo_id = g.id
     where m.user_id = auth.uid();
    return v_codigo;
  end if;

  loop
    v_codigo := upper(
      substr(encode(gen_random_bytes(6),'hex'),1,4) || '-' ||
      substr(encode(gen_random_bytes(6),'hex'),1,4)
    );
    exit when not exists (select 1 from public.grupos where codigo = v_codigo);
  end loop;

  insert into public.grupos (nome, codigo)
  values (coalesce(nullif(trim(p_nome),''),'Família'), v_codigo)
  returning id into v_id;

  insert into public.membros (user_id, grupo_id, email)
  values (auth.uid(), v_id, (select email from auth.users where id = auth.uid()));

  return v_codigo;
end;
$$;

-- =========================================================
-- entrar numa família existente pelo código
-- =========================================================
create or replace function public.entrar_no_grupo(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'precisa estar logado';
  end if;

  select id into v_id from public.grupos
   where upper(codigo) = upper(trim(p_codigo));

  if v_id is null then
    raise exception 'código não encontrado';
  end if;

  insert into public.membros (user_id, grupo_id, email)
  values (auth.uid(), v_id, (select email from auth.users where id = auth.uid()))
  on conflict (user_id) do update set grupo_id = excluded.grupo_id;

  return v_id;
end;
$$;

-- =========================================================
-- regras de acesso: cada um só enxerga a própria família
-- =========================================================
alter table public.grupos  enable row level security;
alter table public.membros enable row level security;
alter table public.perfis  enable row level security;
alter table public.sessoes enable row level security;

drop policy if exists grupos_ler on public.grupos;
create policy grupos_ler on public.grupos
  for select to authenticated using (id = public.meu_grupo());

drop policy if exists membros_ler on public.membros;
create policy membros_ler on public.membros
  for select to authenticated using (user_id = auth.uid() or grupo_id = public.meu_grupo());

drop policy if exists perfis_tudo on public.perfis;
create policy perfis_tudo on public.perfis
  for all to authenticated
  using (grupo_id = public.meu_grupo())
  with check (grupo_id = public.meu_grupo());

drop policy if exists sessoes_tudo on public.sessoes;
create policy sessoes_tudo on public.sessoes
  for all to authenticated
  using (grupo_id = public.meu_grupo())
  with check (grupo_id = public.meu_grupo());

grant execute on function public.criar_grupo(text)      to authenticated;
grant execute on function public.entrar_no_grupo(text)   to authenticated;
grant execute on function public.meu_grupo()             to authenticated;
