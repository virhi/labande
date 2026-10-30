-- Le pseudo saisi à l'inscription (métadonnée display_name) devient le nom du profil.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 40), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Moi'
    )
  );
  return new;
end;
$$;
