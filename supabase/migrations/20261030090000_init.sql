-- La Bande : schéma initial (profils, défis, membres, objectifs, avis, séances, preuves, votes)

-- Profils ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'Moi'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Défis -----------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  end_date date not null,
  stake text check (char_length(stake) <= 200),
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_members_user_idx on public.challenge_members (user_id);

-- Objectifs et avis du groupe --------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  target_value text check (char_length(target_value) <= 40),
  unit text check (char_length(unit) <= 40),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create table public.goal_reviews (
  goal_id uuid not null references public.goals (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  verdict text not null check (verdict in ('ok', 'too_easy')),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  primary key (goal_id, reviewer_id)
);
create index goal_reviews_reviewer_idx on public.goal_reviews (reviewer_id);

-- Une nouvelle version de l'objectif repart en validation : on efface les avis.
create function public.reset_goal_reviews()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title is distinct from old.title
     or new.target_value is distinct from old.target_value
     or new.unit is distinct from old.unit then
    delete from public.goal_reviews where goal_id = new.id;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger goals_reset_reviews
  before update on public.goals
  for each row execute function public.reset_goal_reviews();

-- Séances, preuves et votes ----------------------------------------------
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  done_on date not null default current_date,
  kind text check (char_length(kind) <= 40),
  duration_min integer check (duration_min between 0 and 1440),
  value numeric,
  note text check (char_length(note) <= 500),
  photo_path text,
  created_at timestamptz not null default now()
);
create index training_sessions_challenge_idx on public.training_sessions (challenge_id, done_on desc);
create index training_sessions_user_idx on public.training_sessions (user_id);

create table public.proofs (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 500),
  photo_path text,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index proofs_user_idx on public.proofs (user_id);

create table public.votes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  verdict text not null check (verdict in ('success', 'fail')),
  created_at timestamptz not null default now(),
  primary key (challenge_id, voter_id, target_id),
  check (voter_id <> target_id)
);
create index votes_voter_idx on public.votes (voter_id);
create index votes_target_idx on public.votes (target_id);

-- Fonctions d'accès ------------------------------------------------------
create function public.is_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenge_members
    where challenge_id = cid and user_id = (select auth.uid())
  );
$$;

create function public.shares_challenge(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.challenge_members a
    join public.challenge_members b on b.challenge_id = a.challenge_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- Crée un défi et y inscrit son créateur.
create function public.create_challenge(p_name text, p_end_date date, p_stake text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Non connecté';
  end if;
  if p_end_date <= current_date then
    raise exception 'La date de fin doit être dans le futur';
  end if;
  insert into public.challenges (name, end_date, stake, invite_code, created_by)
  values (
    trim(p_name), p_end_date, nullif(trim(p_stake), ''),
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), uid
  )
  returning id into cid;
  insert into public.challenge_members (challenge_id, user_id) values (cid, uid);
  return cid;
end;
$$;

-- Aperçu d'un défi depuis son lien d'invitation (avant de le rejoindre).
create function public.get_invite(p_code text)
returns table (id uuid, name text, end_date date, stake text, creator_name text, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.end_date, c.stake, p.display_name,
         (select count(*) from public.challenge_members m where m.challenge_id = c.id)
  from public.challenges c
  join public.profiles p on p.id = c.created_by
  where c.invite_code = p_code;
$$;

-- Rejoint un défi avec son code d'invitation.
create function public.join_challenge(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Non connecté';
  end if;
  select id into cid from public.challenges where invite_code = p_code;
  if cid is null then
    raise exception 'Invitation introuvable';
  end if;
  insert into public.challenge_members (challenge_id, user_id)
  values (cid, uid)
  on conflict do nothing;
  return cid;
end;
$$;

revoke execute on function public.create_challenge(text, date, text) from public, anon;
revoke execute on function public.join_challenge(text) from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
grant execute on function public.create_challenge(text, date, text) to authenticated;
grant execute on function public.join_challenge(text) to authenticated;
grant execute on function public.get_invite(text) to authenticated;

-- Règles d'accès (RLS) ---------------------------------------------------
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.goals enable row level security;
alter table public.goal_reviews enable row level security;
alter table public.training_sessions enable row level security;
alter table public.proofs enable row level security;
alter table public.votes enable row level security;

create policy "Voir son profil et ceux de sa bande" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_challenge(id));
create policy "Modifier son profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Voir ses défis" on public.challenges
  for select to authenticated using (public.is_member(id));
create policy "Le créateur modifie le défi" on public.challenges
  for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy "Voir les membres de ses défis" on public.challenge_members
  for select to authenticated using (public.is_member(challenge_id));
create policy "Quitter un défi" on public.challenge_members
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Voir les objectifs de ses défis" on public.goals
  for select to authenticated using (public.is_member(challenge_id));
create policy "Écrire son objectif" on public.goals
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(challenge_id));
create policy "Modifier son objectif" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Voir les avis de ses défis" on public.goal_reviews
  for select to authenticated
  using (exists (select 1 from public.goals g where g.id = goal_id and public.is_member(g.challenge_id)));
create policy "Donner son avis" on public.goal_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id <> (select auth.uid()) and public.is_member(g.challenge_id)
    )
  );
create policy "Changer son avis" on public.goal_reviews
  for update to authenticated
  using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()));
create policy "Retirer son avis" on public.goal_reviews
  for delete to authenticated using (reviewer_id = (select auth.uid()));

create policy "Voir les séances de ses défis" on public.training_sessions
  for select to authenticated using (public.is_member(challenge_id));
create policy "Marquer ses séances" on public.training_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(challenge_id));
create policy "Modifier ses séances" on public.training_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Supprimer ses séances" on public.training_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Voir les preuves de ses défis" on public.proofs
  for select to authenticated using (public.is_member(challenge_id));
create policy "Envoyer sa preuve" on public.proofs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(challenge_id));
create policy "Modifier sa preuve" on public.proofs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Voir les votes de ses défis" on public.votes
  for select to authenticated using (public.is_member(challenge_id));
create policy "Voter" on public.votes
  for insert to authenticated
  with check (voter_id = (select auth.uid()) and public.is_member(challenge_id));
create policy "Changer son vote" on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid())) with check (voter_id = (select auth.uid()));
