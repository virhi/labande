-- Lot 3 : séances chiffrées et bravos. Lot 4 : rejouer avec la même bande.

-- Séances chiffrées -----------------------------------------------------------
-- Un objectif « 100 km » peut additionner les séances : chacune ajoute sa quantité.
alter table public.goals add column track_progress boolean not null default false;
alter table public.goals add constraint goals_track_needs_number
  check (not track_progress or (target_value ~ '^[0-9]+([.,][0-9]+)?$' and unit is not null));

alter table public.training_sessions add constraint training_sessions_value_range
  check (value is null or (value > 0 and value <= 100000));

-- Bravos sur les séances ------------------------------------------------------
create table public.session_cheers (
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_cheers_challenge_idx on public.session_cheers (challenge_id);
create index session_cheers_user_idx on public.session_cheers (user_id);

alter table public.session_cheers enable row level security;
revoke all on public.session_cheers from anon;
revoke update on public.session_cheers from authenticated;

create policy "Pas de comptes anonymes" on public.session_cheers as restrictive for all to authenticated
  using (private.is_permanent_user()) with check (private.is_permanent_user());
create policy "Voir les bravos de ses défis" on public.session_cheers
  for select to authenticated using (private.is_member(challenge_id));
-- On félicite la séance d'un autre membre, dans le défi de cette séance.
create policy "Dire bravo" on public.session_cheers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_member(challenge_id)
    and exists (
      select 1 from public.training_sessions s
      where s.id = session_id and s.challenge_id = session_cheers.challenge_id and s.user_id <> (select auth.uid())
    )
  );
create policy "Retirer son bravo" on public.session_cheers
  for delete to authenticated using (user_id = (select auth.uid()));

-- Quitter ou être retiré efface aussi ses bravos.
create or replace function private.purge_member(p_challenge_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.session_cheers where challenge_id = p_challenge_id and user_id = p_user_id;
  delete from public.goal_reviews r
  using public.goals g
  where r.goal_id = g.id and g.challenge_id = p_challenge_id
    and (r.reviewer_id = p_user_id or g.user_id = p_user_id);
  delete from public.goals where challenge_id = p_challenge_id and user_id = p_user_id;
  delete from public.training_sessions where challenge_id = p_challenge_id and user_id = p_user_id;
  delete from public.proofs where challenge_id = p_challenge_id and user_id = p_user_id;
  delete from public.votes where challenge_id = p_challenge_id and (voter_id = p_user_id or target_id = p_user_id);
  delete from public.challenge_members where challenge_id = p_challenge_id and user_id = p_user_id;
end;
$$;

-- Rejouer avec la même bande --------------------------------------------------
-- Le nouveau défi garde le lien vers le précédent : c'est l'historique de la bande.
alter table public.challenges add column replayed_from uuid references public.challenges (id) on delete set null;
create index challenges_replayed_from_idx on public.challenges (replayed_from);

create function public.replay_challenge(p_from uuid, p_name text, p_end_date date, p_stake text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if not private.is_permanent_user() then
    raise exception 'Non connecté';
  end if;
  if not private.is_member(p_from) then
    raise exception 'Tu ne fais pas partie de ce défi';
  end if;
  if exists (select 1 from public.challenges where id = p_from and end_date > current_date + 1) then
    raise exception 'On peut rejouer à partir du jour J';
  end if;

  cid := public.create_challenge(p_name, p_end_date, p_stake);
  update public.challenges set replayed_from = p_from where id = cid;
  insert into public.challenge_members (challenge_id, user_id)
  select cid, user_id from public.challenge_members where challenge_id = p_from and user_id <> uid;
  return cid;
end;
$$;

revoke execute on function public.replay_challenge(uuid, text, date, text) from public, anon;
grant execute on function public.replay_challenge(uuid, text, date, text) to authenticated;
