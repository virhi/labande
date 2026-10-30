-- Le créateur peut retirer un membre de son défi (quelqu'un qui a rejoint par erreur).
-- Retirer et quitter effacent les mêmes traces : on partage le nettoyage.

create function private.purge_member(p_challenge_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
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

revoke execute on function private.purge_member(uuid, uuid) from public, anon, authenticated;

create or replace function public.leave_challenge(p_challenge_id uuid)
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

  perform private.purge_member(p_challenge_id, uid);
end;
$$;

create function public.remove_member(p_challenge_id uuid, p_user_id uuid)
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
  if not exists (select 1 from public.challenges where id = p_challenge_id and created_by = uid) then
    raise exception 'Seul le créateur du défi peut retirer un membre';
  end if;
  if p_user_id = uid then
    raise exception 'Le créateur ne peut pas se retirer : il peut supprimer le défi';
  end if;
  if not exists (select 1 from public.challenge_members where challenge_id = p_challenge_id and user_id = p_user_id) then
    raise exception 'Cette personne ne fait pas partie du défi';
  end if;

  perform private.purge_member(p_challenge_id, p_user_id);
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
