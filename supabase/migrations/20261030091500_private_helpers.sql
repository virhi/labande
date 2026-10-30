-- Sort les fonctions internes du schéma exposé par l'API.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_member(uuid) set schema private;
alter function public.shares_challenge(uuid) set schema private;
alter function public.handle_new_user() set schema private;

revoke execute on function private.is_member(uuid) from public, anon;
revoke execute on function private.shares_challenge(uuid) from public, anon;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.shares_challenge(uuid) to authenticated;
