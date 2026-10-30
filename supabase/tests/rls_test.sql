-- Tests des règles d'accès (RLS) et des fonctions de La Bande.
--
-- Tout se passe dans une transaction jamais validée : rien ne reste dans la base.
-- La dernière requête liste chaque vérification (ok = true attendu partout).
--
-- Lancer : psql "$DATABASE_URL" -f supabase/tests/rls_test.sql
-- (ou coller le fichier dans l'éditeur SQL de Supabase)

begin;

-- Comptes de test -----------------------------------------------------------
-- alice crée le défi, bob le rejoint, eve est une inconnue, anon un compte anonyme.
insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'rls-alice@labande.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'rls-bob@labande.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}'),
  ('00000000-0000-0000-0000-0000000000e1', 'rls-eve@labande.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}');
insert into auth.users (id, aud, role, instance_id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', true);

create temp table t_res (n serial, test text, ok boolean, detail text) on commit drop;
create temp table t_ctx (k text primary key, v text) on commit drop;
grant all on t_res, t_ctx to authenticated, anon;
grant usage on sequence t_res_n_seq to authenticated, anon;

-- Inscription : le pseudo saisi devient le nom du profil ---------------------
insert into t_res (test, ok, detail)
select 'inscription : pseudo repris dans le profil', display_name = 'Alice', display_name
from public.profiles where id = '00000000-0000-0000-0000-0000000000a1';
insert into t_res (test, ok, detail)
select 'inscription : sans pseudo, début de l''email', display_name = 'rls-bob', display_name
from public.profiles where id = '00000000-0000-0000-0000-0000000000b1';

-- Alice crée un défi et écrit son objectif ----------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","is_anonymous":false}', true);

insert into t_ctx select 'cid', public.create_challenge('Défi test', current_date + 30, 'resto')::text;
insert into t_ctx select 'code', invite_code from public.challenges where id = (select v::uuid from t_ctx where k = 'cid');
insert into public.goals (challenge_id, user_id, title)
select v::uuid, '00000000-0000-0000-0000-0000000000a1', 'Semi en 1h50' from t_ctx where k = 'cid';
insert into t_ctx select 'goal_a', id::text from public.goals;

insert into t_res (test, ok, detail)
select 'créateur : membre de son défi', count(*) = 1, count(*)::text from public.challenge_members;

do $$ begin
  perform public.create_challenge('Passé', current_date - 1, null);
  insert into t_res (test, ok) values ('création : date passée refusée', false);
exception when others then
  insert into t_res (test, ok, detail) values ('création : date passée refusée', true, sqlerrm);
end $$;

do $$ begin
  insert into public.goal_reviews (goal_id, reviewer_id, verdict)
  values ((select v::uuid from t_ctx where k = 'goal_a'), '00000000-0000-0000-0000-0000000000a1', 'ok');
  insert into t_res (test, ok) values ('avis : impossible sur son propre objectif', false);
exception when others then
  insert into t_res (test, ok, detail) values ('avis : impossible sur son propre objectif', true, sqlerrm);
end $$;

-- Eve, inconnue, ne voit rien -------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","is_anonymous":false}', true);

insert into t_res (test, ok, detail) select 'inconnu : ne voit pas le défi', count(*) = 0, count(*)::text from public.challenges;
insert into t_res (test, ok, detail) select 'inconnu : ne voit pas les membres', count(*) = 0, count(*)::text from public.challenge_members;
insert into t_res (test, ok, detail) select 'inconnu : ne voit pas les objectifs', count(*) = 0, count(*)::text from public.goals;
insert into t_res (test, ok, detail) select 'inconnu : ne voit que son profil', count(*) = 1, count(*)::text from public.profiles;
insert into t_res (test, ok, detail)
select 'inconnu : voit l''aperçu avec le code', count(*) = 1, count(*)::text
from public.get_invite((select v from t_ctx where k = 'code'));

do $$ begin
  insert into public.goals (challenge_id, user_id, title)
  values ((select v::uuid from t_ctx where k = 'cid'), '00000000-0000-0000-0000-0000000000e1', 'Intrus');
  insert into t_res (test, ok) values ('inconnu : ne peut pas écrire d''objectif', false);
exception when others then
  insert into t_res (test, ok, detail) values ('inconnu : ne peut pas écrire d''objectif', true, sqlerrm);
end $$;

do $$ begin
  insert into public.challenge_members (challenge_id, user_id)
  values ((select v::uuid from t_ctx where k = 'cid'), '00000000-0000-0000-0000-0000000000e1');
  insert into t_res (test, ok) values ('inconnu : ne peut pas s''ajouter sans le code', false);
exception when others then
  insert into t_res (test, ok, detail) values ('inconnu : ne peut pas s''ajouter sans le code', true, sqlerrm);
end $$;

do $$ begin
  perform public.join_challenge('code-faux');
  insert into t_res (test, ok) values ('invitation : mauvais code refusé', false);
exception when others then
  insert into t_res (test, ok, detail) values ('invitation : mauvais code refusé', sqlerrm = 'Invitation introuvable', sqlerrm);
end $$;

-- Bob rejoint avec le code ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","is_anonymous":false}', true);

select public.join_challenge((select v from t_ctx where k = 'code'));
select public.join_challenge((select v from t_ctx where k = 'code')); -- deux fois : sans effet

insert into t_res (test, ok, detail) select 'invité : voit le défi', count(*) = 1, count(*)::text from public.challenges;
insert into t_res (test, ok, detail) select 'invité : rejoindre deux fois ne crée pas de doublon', count(*) = 2, count(*)::text from public.challenge_members;
insert into t_res (test, ok, detail) select 'invité : voit le profil d''Alice', count(*) = 2, string_agg(display_name, ', ') from public.profiles;
insert into t_res (test, ok, detail) select 'invité : voit l''objectif d''Alice', count(*) = 1, count(*)::text from public.goals;

do $$ begin
  insert into public.goals (challenge_id, user_id, title)
  values ((select v::uuid from t_ctx where k = 'cid'), '00000000-0000-0000-0000-0000000000a1', 'Faux objectif');
  insert into t_res (test, ok) values ('invité : ne peut pas écrire au nom d''un autre', false);
exception when others then
  insert into t_res (test, ok, detail) values ('invité : ne peut pas écrire au nom d''un autre', true, sqlerrm);
end $$;

with u as (update public.goals set title = 'Piraté' where user_id = '00000000-0000-0000-0000-0000000000a1' returning 1)
insert into t_res (test, ok, detail) select 'invité : ne peut pas modifier l''objectif d''un autre', count(*) = 0, count(*)::text from u;

with u as (update public.challenges set name = 'Piraté' returning 1)
insert into t_res (test, ok, detail) select 'invité : ne peut pas modifier le défi', count(*) = 0, count(*)::text from u;

insert into public.goal_reviews (goal_id, reviewer_id, verdict, comment)
select v::uuid, '00000000-0000-0000-0000-0000000000b1', 'too_easy', 'vise 1h45' from t_ctx where k = 'goal_a';

insert into public.training_sessions (challenge_id, user_id, kind, duration_min)
select v::uuid, '00000000-0000-0000-0000-0000000000b1', 'Course', 45 from t_ctx where k = 'cid';
insert into t_res (test, ok, detail) select 'séance : on marque la sienne', count(*) = 1, count(*)::text from public.training_sessions;

do $$ begin
  insert into public.votes (challenge_id, voter_id, target_id, verdict)
  values ((select v::uuid from t_ctx where k = 'cid'), '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'success');
  insert into t_res (test, ok) values ('vote : impossible pour soi-même', false);
exception when others then
  insert into t_res (test, ok, detail) values ('vote : impossible pour soi-même', true, sqlerrm);
end $$;

insert into public.votes (challenge_id, voter_id, target_id, verdict)
select v::uuid, '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'success' from t_ctx where k = 'cid';
insert into t_res (test, ok, detail) select 'vote : on vote pour un autre membre', count(*) = 1, count(*)::text from public.votes;

-- Alice voit l'avis, puis change son objectif : l'avis est effacé --------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","is_anonymous":false}', true);

insert into t_res (test, ok, detail) select 'avis : visible par la personne concernée', count(*) = 1, count(*)::text from public.goal_reviews;

with d as (delete from public.training_sessions returning 1)
insert into t_res (test, ok, detail) select 'séance : impossible de supprimer celle d''un autre', count(*) = 0, count(*)::text from d;

update public.goals set title = 'Semi en 1h47' where user_id = '00000000-0000-0000-0000-0000000000a1';
insert into t_res (test, ok, detail) select 'avis : effacés quand l''objectif change', count(*) = 0, count(*)::text from public.goal_reviews;

-- Eve ne voit toujours rien et ne peut pas voter --------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","is_anonymous":false}', true);

insert into t_res (test, ok, detail) select 'inconnu : ne voit pas les séances', count(*) = 0, count(*)::text from public.training_sessions;
insert into t_res (test, ok, detail) select 'inconnu : ne voit pas les votes', count(*) = 0, count(*)::text from public.votes;

do $$ begin
  insert into public.votes (challenge_id, voter_id, target_id, verdict)
  values ((select v::uuid from t_ctx where k = 'cid'), '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'fail');
  insert into t_res (test, ok) values ('inconnu : ne peut pas voter', false);
exception when others then
  insert into t_res (test, ok, detail) values ('inconnu : ne peut pas voter', true, sqlerrm);
end $$;

-- Compte anonyme : bloqué partout -----------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated","is_anonymous":true}', true);

insert into t_res (test, ok, detail) select 'anonyme : aucun profil visible', count(*) = 0, count(*)::text from public.profiles;
insert into t_res (test, ok, detail)
select 'anonyme : pas d''aperçu d''invitation', count(*) = 0, count(*)::text
from public.get_invite((select v from t_ctx where k = 'code'));

do $$ begin
  perform public.join_challenge((select v from t_ctx where k = 'code'));
  insert into t_res (test, ok) values ('anonyme : ne peut pas rejoindre', false);
exception when others then
  insert into t_res (test, ok, detail) values ('anonyme : ne peut pas rejoindre', true, sqlerrm);
end $$;

do $$ begin
  perform public.create_challenge('Anonyme', current_date + 5, null);
  insert into t_res (test, ok) values ('anonyme : ne peut pas créer de défi', false);
exception when others then
  insert into t_res (test, ok, detail) values ('anonyme : ne peut pas créer de défi', true, sqlerrm);
end $$;

-- Visiteur non connecté (rôle anon) ---------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ begin
  perform public.get_invite((select v from t_ctx where k = 'code'));
  insert into t_res (test, ok) values ('non connecté : pas d''accès aux invitations', false);
exception when others then
  insert into t_res (test, ok, detail) values ('non connecté : pas d''accès aux invitations', true, sqlerrm);
end $$;

insert into t_res (test, ok, detail) select 'non connecté : ne voit aucun défi', count(*) = 0, count(*)::text from public.challenges;
insert into t_res (test, ok, detail) select 'non connecté : ne voit aucun profil', count(*) = 0, count(*)::text from public.profiles;

reset role;

-- Résultat -----------------------------------------------------------------------
select n, ok, test, detail from t_res order by ok, n;

-- Fait échouer le script (et la CI) si une vérification n'est pas bonne.
do $$
declare
  failed text;
begin
  select string_agg(test, ' | ' order by n) into failed from t_res where ok is not true;
  if failed is not null then
    raise exception 'Règles d''accès en échec : %', failed;
  end if;
end;
$$;
