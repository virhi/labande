-- Le créateur d'un défi peut le modifier (nom, date de fin, enjeu) et le supprimer.

-- Seules ces trois colonnes sont modifiables depuis l'appli.
revoke update on public.challenges from authenticated;
grant update (name, end_date, stake) on public.challenges to authenticated;

-- Une nouvelle date de fin doit rester dans le futur.
create function private.check_challenge_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.end_date is distinct from old.end_date and new.end_date <= current_date then
    raise exception 'La date de fin doit être dans le futur';
  end if;
  new.name := trim(new.name);
  new.stake := nullif(trim(new.stake), '');
  return new;
end;
$$;

revoke execute on function private.check_challenge_update() from public, anon, authenticated;

create trigger challenges_check_update
  before update on public.challenges
  for each row execute function private.check_challenge_update();

-- Supprimer un défi efface aussi ses membres, objectifs, avis, séances, preuves et votes (cascade).
create policy "Le créateur supprime le défi" on public.challenges
  for delete to authenticated using (created_by = (select auth.uid()));
