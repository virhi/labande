-- Séances, récap sur le site, fin du défi (preuves avec photo et vote final).

-- Dernière visite de chaque membre : l'accueil signale les nouvelles séances.
alter table public.challenge_members add column last_seen_at timestamptz not null default now();
revoke update on public.challenge_members from authenticated;
grant update (last_seen_at) on public.challenge_members to authenticated;
create policy "Noter sa visite" on public.challenge_members
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Séances : on les supprime et on les recrée, sans modification.
drop policy "Modifier ses séances" on public.training_sessions;
revoke update on public.training_sessions from authenticated;

-- Une séance n'est ni dans le futur ni après la fin du défi.
-- Un jour de marge : la base compte en UTC, les membres en heure locale.
create function private.check_training_session()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_end date;
begin
  select end_date into v_end from public.challenges where id = new.challenge_id;
  if new.done_on > current_date + 1 then
    raise exception 'Une séance ne peut pas être dans le futur';
  end if;
  if new.done_on > v_end then
    raise exception 'Le défi est terminé à cette date';
  end if;
  new.kind := nullif(trim(new.kind), '');
  new.note := nullif(trim(new.note), '');
  return new;
end;
$$;
revoke execute on function private.check_training_session() from public, anon, authenticated;
create trigger training_sessions_check
  before insert on public.training_sessions
  for each row execute function private.check_training_session();

-- Preuves et votes n'ouvrent que le jour de la fin du défi (même marge d'un jour).
create function private.check_finale_open()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_end date;
begin
  select end_date into v_end from public.challenges where id = new.challenge_id;
  if v_end > current_date + 1 then
    raise exception 'Les preuves et les votes ouvrent le jour de la fin du défi';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_finale_open() from public, anon, authenticated;

-- Une preuve a un texte ou une photo, rangée dans le dossier du défi et de son auteur.
create function private.check_proof()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.note := nullif(trim(new.note), '');
  if new.note is null and new.photo_path is null then
    raise exception 'Ajoute un mot ou une photo';
  end if;
  if new.photo_path is not null
     and new.photo_path not like new.challenge_id::text || '/' || new.user_id::text || '/%' then
    raise exception 'Photo invalide';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_proof() from public, anon, authenticated;

create trigger proofs_open before insert or update on public.proofs
  for each row execute function private.check_finale_open();
create trigger proofs_check before insert or update on public.proofs
  for each row execute function private.check_proof();
create trigger votes_open before insert or update on public.votes
  for each row execute function private.check_finale_open();

revoke update on public.proofs from authenticated;
grant update (note, photo_path) on public.proofs to authenticated;
create policy "Retirer sa preuve" on public.proofs
  for delete to authenticated using (user_id = (select auth.uid()));

-- On ne vote que pour un membre du défi, et on ne change que son verdict.
drop policy "Voter" on public.votes;
create policy "Voter" on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and private.is_member(challenge_id)
    and exists (
      select 1 from public.challenge_members m
      where m.challenge_id = votes.challenge_id and m.user_id = votes.target_id
    )
  );
revoke update on public.votes from authenticated;
grant update (verdict) on public.votes to authenticated;

-- Photos des preuves : privées, visibles par la bande du défi.
-- Chemin : <id du défi>/<id de l'auteur>/<fichier>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Voir les photos de ses défis" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proofs'
    and private.is_permanent_user()
    and exists (
      select 1 from public.challenge_members m
      where m.challenge_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
    )
  );
create policy "Envoyer ses photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and private.is_permanent_user()
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.challenge_members m
      where m.challenge_id::text = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
    )
  );
create policy "Supprimer ses photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and private.is_permanent_user()
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
