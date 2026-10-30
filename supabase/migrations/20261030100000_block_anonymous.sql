-- Pas de comptes anonymes : seuls les comptes connectés par email accèdent aux données.
-- Les connexions anonymes sont déjà désactivées dans Supabase ; ce verrou tient même si
-- l'option est activée un jour par erreur.

create function private.is_permanent_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false;
$$;

revoke execute on function private.is_permanent_user() from public, anon;
grant execute on function private.is_permanent_user() to authenticated;

-- Politique restrictive : s'ajoute (ET) à toutes les autres règles de chaque table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'challenges', 'challenge_members', 'goals', 'goal_reviews',
    'training_sessions', 'proofs', 'votes'
  ] loop
    execute format(
      'create policy "Pas de comptes anonymes" on public.%I as restrictive for all to authenticated
         using (private.is_permanent_user()) with check (private.is_permanent_user())',
      t
    );
  end loop;
end;
$$;

-- Les fonctions appelées par l'appli refusent aussi les comptes anonymes.
create or replace function public.create_challenge(p_name text, p_end_date date, p_stake text)
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

create or replace function public.get_invite(p_code text)
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
  where c.invite_code = p_code
    and private.is_permanent_user();
$$;

create or replace function public.join_challenge(p_code text)
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
