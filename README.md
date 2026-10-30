# La Bande

Des défis sportifs entre amis : chacun son objectif, une date commune, et le groupe valide.

Web app React (Vite + TypeScript), données et connexion sur Supabase, hébergée sur Cloudflare Pages (`labande.pages.dev`).

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir l'URL et la clé publishable Supabase
npm run dev
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
