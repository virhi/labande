-- Quitter un défi, supprimer son compte, et ne pas laisser de photos derrière soi.

-- Quitter passe par une fonction qui efface aussi ses traces dans le défi
-- (objectif, avis, séances, preuve, votes) : sinon un objectif orphelin bloquerait le lancement.
drop policy "Quitter un défi" on public.challenge_members;

create function public.leave_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if not private.is_permanent_user() then
    raise exception 'Non connecté';
  end if;
  if not exists (select 1 from public.challenge_members where challenge_id = p_challenge_id and user_id = uid) then
    raise exception 'Tu ne fais pas partie de ce défi';
  end if;
  if exists (select 1 from public.challenges where id = p_challenge_id and created_by = uid) then
    raise exception 'Le créateur ne peut pas quitter son défi : il peut le supprimer';
  end if;

  delete from public.goal_reviews r
  using public.goals g
  where r.goal_id = g.id and g.challenge_id = p_challenge_id
    and (r.reviewer_id = uid or g.user_id = uid);
  delete from public.goals where challenge_id = p_challenge_id and user_id = uid;
  delete from public.training_sessions where challenge_id = p_challenge_id and user_id = uid;
  delete from public.proofs where challenge_id = p_challenge_id and user_id = uid;
  delete from public.votes where challenge_id = p_challenge_id and (voter_id = uid or target_id = uid);
  delete from public.challenge_members where challenge_id = p_challenge_id and user_id = uid;
end;
$$;

-- Supprimer son compte : ses défis partagés passent au plus ancien des autres membres,
-- ceux où il est seul disparaissent, puis le compte et toutes ses données sont effacés.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if not private.is_permanent_user() then
    raise exception 'Non connecté';
  end if;

  update public.challenges c
  set created_by = (
    select m.user_id from public.challenge_members m
    where m.challenge_id = c.id and m.user_id <> uid
    order by m.joined_at
    limit 1
  )
  where c.created_by = uid
    and exists (select 1 from public.challenge_members m where m.challenge_id = c.id and m.user_id <> uid);

  delete from public.challenges where created_by = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.leave_challenge(uuid) from public, anon;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.leave_challenge(uuid) to authenticated;
grant execute on function public.delete_account() to authenticated;

-- Le créateur peut effacer toutes les photos de son défi avant de le supprimer.
create policy "Le créateur efface les photos du défi" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and private.is_permanent_user()
    and exists (
      select 1 from public.challenges c
      where c.id::text = (storage.foldername(name))[1] and c.created_by = (select auth.uid())
    )
  );
