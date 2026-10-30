# La Bande

Des défis sportifs entre amis : chacun son objectif, une date commune, et le groupe valide.

Web app React (Vite + TypeScript), données et connexion sur Supabase, hébergée sur Cloudflare Pages (`labande.pages.dev`).

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir l'URL et la clé publishable Supabase
npm run dev
```

## Tests

| Commande | Ce qui est testé |
|---|---|
| `npm test` | Tests unitaires (Vitest) : dates, état du défi, mots de passe, écran de connexion |
| `npm run test:e2e` | Tests fonctionnels (Playwright) dans un navigateur mobile, sur le projet Supabase de **test** |
| `supabase/tests/rls_test.sql` | Règles d'accès de la base : qui voit et modifie quoi |

### Sur GitHub

Le workflow [.github/workflows/tests.yml](.github/workflows/tests.yml) lance tout à chaque push sur `main`, à
chaque pull request, et à la demande (onglet Actions › Tests › Run workflow) :

1. **Lint, tests unitaires et build** : sans configuration.
2. **Tests fonctionnels (Playwright)** : demande le secret `E2E_PASSWORD`.
3. **Règles d'accès (SQL)** : demande le secret `SUPABASE_TEST_DB_URL`.

Les secrets se règlent dans GitHub › Settings › Secrets and variables › Actions › New repository secret :

- `E2E_PASSWORD` : la valeur de `E2E_PASSWORD` dans `.env.test.local`.
- `SUPABASE_TEST_DB_URL` : l'adresse de connexion du projet **labande-test** (Supabase › Connect ›
  Session pooler › URI), avec le mot de passe de la base à la place de `[YOUR-PASSWORD]`. Si ce mot de
  passe est perdu, le réinitialiser dans Project Settings › Database.

Un secret manquant fait échouer son job avec un message qui l'indique.

### Tests fonctionnels (Playwright)

Ils tournent sur le projet Supabase `labande-test` (configuré dans `.env.test`), jamais sur la vraie base.
Ils se connectent avec deux comptes, Alice et Bob, dont le mot de passe est dans `.env.test.local`
(non versionné) :

```
E2E_PASSWORD=...
```

Pour créer ou recréer ces comptes, lancer `supabase/tests/seed_e2e_users.sql` sur le projet de test,
avec ce mot de passe. Chaque passage crée un nouveau défi « Défi e2e … » ; relancer le seed les efface.

Première fois : `npx playwright install chromium`.

### Règles d'accès (SQL)

`supabase/tests/rls_test.sql` simule plusieurs comptes (créateur, invité, inconnu, anonyme, visiteur non
connecté) dans une transaction jamais validée : rien ne reste dans la base. La dernière requête liste chaque
vérification, toutes doivent avoir `ok = true`. Le lancer dans l'éditeur SQL de Supabase, ou :

```bash
psql "$DATABASE_URL" -f supabase/tests/rls_test.sql
```

## Base de données

Les migrations SQL sont dans `supabase/migrations/`, dans l'ordre de leur nom. Elles créent les tables
(profils, défis, membres, objectifs, avis, séances, preuves, votes), les fonctions `create_challenge`,
`get_invite` et `join_challenge`, et les règles d'accès (RLS) : on ne voit que les défis dont on est membre.

## Connexion

Connexion par lien envoyé par email (Supabase Auth). Dans Supabase › Authentication › URL Configuration :

- **Site URL** : `https://labande.pages.dev`
- **Redirect URLs** : `http://localhost:5173`

Les comptes anonymes sont refusés : l'option « Allow anonymous sign-ins » doit rester désactivée, et la base
bloque de toute façon les comptes anonymes (migration `block_anonymous`).

L'envoi d'emails intégré à Supabase est limité à quelques emails par heure : pour plus de monde,
configurer un SMTP (par exemple Resend) dans Authentication › Emails.

## Déployer sur Cloudflare Pages

Une fois connecté à Cloudflare (`npx wrangler login`) :

```bash
npm run deploy
```

Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont lues dans `.env.local` au moment du build.
