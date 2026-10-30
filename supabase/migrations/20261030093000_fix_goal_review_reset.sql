-- Les avis appartiennent aux autres membres : sans security definer, la RLS
-- empêchait le trigger d'effacer les avis quand on modifie son objectif.
alter function public.reset_goal_reviews() security definer;
alter function public.reset_goal_reviews() set schema private;
revoke execute on function private.reset_goal_reviews() from public, anon, authenticated;
