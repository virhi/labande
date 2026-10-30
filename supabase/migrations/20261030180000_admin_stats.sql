-- Page Stats réservée aux admins : uniquement des totaux, jamais le contenu des membres.

-- Liste des admins. Hors de portée de l'app (schéma private, aucun droit) :
-- on s'y ajoute seulement en SQL depuis Supabase, par exemple
--   insert into private.admins (user_id) select id from auth.users where email = '…';
create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_permanent_user()
     and exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;

create function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  this_week date := date_trunc('week', current_date)::date;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé';
  end if;

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'challenges', (select count(*) from public.challenges),
      'ongoing', (select count(*) from public.challenges where end_date >= current_date),
      'finished', (select count(*) from public.challenges where end_date < current_date),
      'sessions', (select count(*) from public.training_sessions),
      'avg_members', (select round(avg(n), 1) from (select count(*) n from public.challenge_members group by challenge_id) m),
      'solo_challenges', (select count(*) from (select 1 from public.challenge_members group by challenge_id having count(*) = 1) s)
    ),
    -- Défis terminés où au moins une preuve a été envoyée : la bande est allée au bout.
    'finale', jsonb_build_object(
      'finished', (select count(*) from public.challenges where end_date < current_date),
      'with_proof', (select count(*) from public.challenges c
                     where c.end_date < current_date
                       and exists (select 1 from public.proofs p where p.challenge_id = c.id))
    ),
    -- Actif = a noté au moins une séance dans la semaine (date d'enregistrement).
    'retention', jsonb_build_object(
      'active_this_week', (select count(distinct user_id) from public.training_sessions where created_at >= this_week),
      'active_last_week', (select count(distinct user_id) from public.training_sessions
                           where created_at >= this_week - 7 and created_at < this_week),
      'returning', (select count(*) from (
                      select user_id from public.training_sessions where created_at >= this_week - 7 and created_at < this_week
                      intersect
                      select user_id from public.training_sessions where created_at >= this_week) r)
    ),
    'weeks', (
      select jsonb_agg(jsonb_build_object(
        'week', w::date,
        'signups', (select count(*) from public.profiles where created_at >= w and created_at < w + interval '7 days'),
        'challenges', (select count(*) from public.challenges where created_at >= w and created_at < w + interval '7 days'),
        'sessions', (select count(*) from public.training_sessions where created_at >= w and created_at < w + interval '7 days'),
        'active_users', (select count(distinct user_id) from public.training_sessions where created_at >= w and created_at < w + interval '7 days')
      ) order by w)
      from generate_series(this_week - 49, this_week, interval '7 days') w
    )
  );
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;
