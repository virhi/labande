-- Comptes Alice et Bob pour les tests Playwright, sur le projet de TEST uniquement.
-- Remplacer :password par la valeur de E2E_PASSWORD (.env.test.local) avant de lancer.
-- Rejouable : recrée les deux comptes et efface leurs défis précédents.

delete from auth.users where email in ('alice@labande.test', 'bob@labande.test');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt(:'password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000e2a1'::uuid, 'alice@labande.test', 'Alice'),
  ('00000000-0000-0000-0000-00000000e2b1'::uuid, 'bob@labande.test', 'Bob')
) as u (id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users where email in ('alice@labande.test', 'bob@labande.test');
